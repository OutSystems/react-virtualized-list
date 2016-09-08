import * as React from "react";
import * as ReactDOM from "react-dom";
import { ScrollExtensions } from "virtualized-scroll-viewer-extensions";

function insideiOSWebView(): boolean {
    return !(<any> navigator).standalone && /(iPad)|(iPhone)/i.test(navigator.userAgent) && !/safari/i.test(navigator.userAgent);    
}

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";
const PIXEL_UNITS = "px";
const FLEXBOX_DISPLAY = document.createElement("p").style.flex === undefined ? "-webkit-flex" : "flex"; // support ios under 9
const DEFAULT_BUFFER_SIZE = 3; // default number of extra viewports to render
const BUFFER_MULTIPLIER = insideiOSWebView() ? 4 : 1; // inside iOS webview use 4x the buffer size (due to scrolling limitations) 

export interface IScrollViewerProperties extends React.Props<VirtualizedScrollViewer> {
    length: number;
    renderItems: (startIndex: number, length: number) => React.ReactFragment;
    scrollChanged?: () => void;
    renderWrapper: (children: React.ReactFragment) => JSX.Element;
    pageBufferSize?: number; // number of pages buffered  
}

interface IScrollInfo {
    scrollHost: Element | Window;
    viewportSize: number;
    scrollOffset: number;
    viewportLowerBound: number;
    viewportUpperBound: number;
}

export interface IScrollViewerState {
    firstRenderedItemIndex: number;
    lastRenderedItemIndex: number;
    averageItemSize: number;
    scrollOffset: number; // scroll compensation for missing items
    offScreenItemsCount: number; 
}

type Rect = {
    width: number,
    height: number,
    top: number,
    bottom: number,
    left: number,
    right: number,
};

export class VirtualizedScrollViewer extends React.Component<IScrollViewerProperties, IScrollViewerState> {
    
    private scrollHandler: () => void;
    private scrollHostInfo: ScrollExtensions.IScrollHostInfo;
    private scrollDirection: ScrollExtensions.ScrollDirection = ScrollExtensions.ScrollDirection.Vertical;
    private hasPendingPropertiesUpdate: boolean = false;
    private pendingScrollAsyncUpdateHandle: number;
    private itemsContainer: HTMLElement;
    private isScrollOngoing: boolean = false; // true when rendering to due scroll changes
    private isComponentInitialized: boolean = false;
    private setPendingScroll: () => void;
    
    constructor(props: IScrollViewerProperties, context: any) {
        super(props, context);
        this.scrollHandler = this.handleScroll.bind(this);
        this.state = {
            firstRenderedItemIndex: 0,
            lastRenderedItemIndex: 1,
            averageItemSize: 0,
            scrollOffset: 0,
            offScreenItemsCount: 0,
        };
    }

    /**
     * The element that owns the scrollbars
     */
    private getScrollHostInfo(): ScrollExtensions.IScrollHostInfo {
        if (!this.scrollHostInfo) {
            this.scrollHostInfo = ScrollExtensions.getScrollHostInfo(this.itemsContainer);
        }

        return this.scrollHostInfo;
    }
    
    /**
     * Scroll information: the element that has the scrollbar, its viewport size and the scroll position
     */
    private getScrollInfo(): IScrollInfo {
        let scrollHostInfo = this.getScrollHostInfo();
        let scrollHost = scrollHostInfo.scrollHost;
        let scrollInfo = ScrollExtensions.getScrollInfo(scrollHost);
        let result = {
            scrollHost: scrollHost,
            scrollOffset: this.getDimension(scrollInfo.scroll.y, scrollInfo.scroll.x),
            viewportSize: this.getDimension(scrollInfo.viewport.height, scrollInfo.viewport.width),
            viewportLowerBound: 0,
            viewportUpperBound: 0,
        };
        
        if (scrollHost instanceof Window) {
            result.viewportLowerBound = this.getDimension(scrollInfo.viewport.y, scrollInfo.viewport.x);
            result.viewportUpperBound = this.getDimension(scrollInfo.viewport.height, scrollInfo.viewport.width);
        } else if (scrollHost instanceof HTMLElement) {
            let bounds = scrollHost.getBoundingClientRect();
            result.viewportLowerBound = this.getDimension(bounds.top, bounds.left);
            result.viewportUpperBound = this.getDimension(bounds.bottom, bounds.right);
        }
        
        return result;
    }
    
    /**
     * Adds hooks to capture scroll events of the scrollable parent
     */
    private addScrollHandler(): void {
        if (this.isDisposed) {
            return;
        }
        this.scrollHostInfo = null; // clear previously cached scroll host info (might be wrong)
        let scrollHostInfo = this.getScrollHostInfo();
        let scrollHost = scrollHostInfo.scrollHost;
        scrollHost.addEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
        scrollHost.addEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
        this.scrollDirection = scrollHostInfo.scrollDirection; // won't be updated later if changes (case not supported now)
    }
    
    private removeScrollHandler(): void {
        let scrollHost = this.getScrollHostInfo().scrollHost;
        scrollHost.removeEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
        scrollHost.removeEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
    }
    
    public componentDidMount(): void {
        this.itemsContainer = ReactDOM.findDOMNode(this) as HTMLElement;

        let onWindowScroll = () => { 
            window.removeEventListener(SCROLL_EVENT_NAME, onWindowScroll);
            this.addScrollHandler();
        };

        requestAnimationFrame(() => {
            // loading css might take some time, that's why we wait for user interaction 
            // (hoping that he acts after things are ready)
            // and delay scroll listener events attach until a scroll event is fired
            window.addEventListener(SCROLL_EVENT_NAME, onWindowScroll, true);
        });

        // rerender with the right amount of items in the viewport
        // we first rendered only just 2 elements, now lets render the remaining visible elements
        this.setState(this.getCurrentScrollViewerState(this.props.length));
    }
    
    public componentWillUnmount(): void {
        this.removeScrollHandler();
        this.scrollHostInfo = null;
        this.itemsContainer = null;
    }
    
    public componentWillReceiveProps(nextProps: IScrollViewerProperties): void {
        this.setState(this.getCurrentScrollViewerState(nextProps.length)); // rerender with the right amount of items in the viewport
        this.hasPendingPropertiesUpdate = true;
    }
    
    public setState(state: IScrollViewerState | ((prevState: IScrollViewerState, props: IScrollViewerProperties) => IScrollViewerState), 
                    callback?: () => any): void {
        // using set state callback instead of componentDidUpdate because when using transition group
        // removed nodes will still be present when component did update is called
        super.setState(<any> state, () => {
            this.onDidUpdate();
            if (callback) {
                callback();
            }
        });
    }
    
    private onDidUpdate(): void {
        // console.log(this.state);
        this.isComponentInitialized = true; // we render twice before initialization complete
        this.itemsContainer = ReactDOM.findDOMNode(this) as HTMLElement;
        
        this.renderOffScreenBuffer();
        
        if (this.setPendingScroll) {
            this.setPendingScroll();
            this.setPendingScroll = null;
        } 
        
        if (this.hasPendingPropertiesUpdate) {
            // updated with list changes, let's compute the visible items
            // or new items entering (in this render frame), calculate scroll compensation based on items real size
            this.hasPendingPropertiesUpdate = false;
            this.setState(this.getCurrentScrollViewerState(this.props.length));
        }
    }
    
    /**
     * Adjust off screen elements' coordinates
     */
    private renderOffScreenBuffer() {
        this.itemsContainer.style.position = "relative";
        let items = this.getListItems(this.itemsContainer);
        for (let item of items.slice(0, this.state.offScreenItemsCount)) {
            let child = <HTMLElement> item;
            if (child.style !== undefined) {
                // move element offscreen
                child.style.position = "absolute";
                child.style.top = "-10000" + PIXEL_UNITS;
            }
        }
        for (let item of items.slice(this.state.offScreenItemsCount)) {
            let child = <HTMLElement> item;
            if (child.style !== undefined) {
                child.style.position = "";
                child.style.top = "";
            }
        }
    }

    private handleScroll(scrollEvent: UIEvent): void {
        if (this.pendingScrollAsyncUpdateHandle) {
            return; // an update already queued, skip
        }
        
        // delay any updates until render time
        this.pendingScrollAsyncUpdateHandle = requestAnimationFrame(() => {
            if (this.isDisposed) {
                return;
            }
            
            try {
                let newState = this.getCurrentScrollViewerState(this.props.length);
                
                this.isScrollOngoing = true;
                this.setState(newState, () => this.isScrollOngoing = false);
            } finally {
                this.pendingScrollAsyncUpdateHandle = 0;
            }
            
            if (this.props.scrollChanged) {
                this.props.scrollChanged();
            }
        });
    }
    
    public shouldComponentUpdate(nextProps: IScrollViewerProperties, nextState: IScrollViewerState): boolean {
        // only render when visible items change -> smooth scroll
        return nextState.firstRenderedItemIndex !== this.state.firstRenderedItemIndex ||
               nextState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex ||
               nextState.scrollOffset !== this.state.scrollOffset ||
               nextProps !== this.props;
    }
    
    private renderList(firstRenderedItemIndex: number, lastRenderedItemIndex: number): JSX.Element {
        let scrollOffset = this.state.scrollOffset;
        let length = Math.min(this.props.length, lastRenderedItemIndex - firstRenderedItemIndex + 1);
        
        // render only visible items
        let items = this.props.renderItems(firstRenderedItemIndex, length);
        
        let remainingSize = 0;
        if (lastRenderedItemIndex < (this.props.length - 1)) {
            let averageItemSize = this.state.averageItemSize;
            let scrollSize = averageItemSize * this.props.length;
            // give remaining space at the end if end of list as not been reached
            remainingSize = scrollSize - ((averageItemSize * length) + scrollOffset);
        }
        
        let listChildren: any = [];
        listChildren.push(this.renderSpacer("first-spacer", scrollOffset)); // compensate scroll offset
        listChildren.push(items);
        listChildren.push(this.renderSpacer("last-spacer", remainingSize)); // compensate scroll height/width
        
        return this.props.renderWrapper(listChildren);
    }
    
    /**
     * Render a spacer element used to give blank space at the beginning or end of the list
     */
    private renderSpacer(key: string, dimension: number): JSX.Element {
        const FILL_SPACE = "100%";
        let style: React.CSSProperties = {
            display: FLEXBOX_DISPLAY,
        };
        if (this.scrollDirection === ScrollExtensions.ScrollDirection.Horizontal) {
            style.width = Math.round(dimension) + PIXEL_UNITS;
            style.height = FILL_SPACE;
        } else {
            style.width = FILL_SPACE;
            style.height = Math.round(dimension) + PIXEL_UNITS;
        }
        return React.DOM.script({ key: key, style: style });
    }
    
    public render(): JSX.Element {
        return this.renderList(this.state.firstRenderedItemIndex, this.state.lastRenderedItemIndex);
    }
    
    /**
     * Returns the appropriate dimension according to the scroll direction
     */
    private getDimension(vertical: number, horizontal: number): number {
        return this.scrollDirection === ScrollExtensions.ScrollDirection.Horizontal ? horizontal : vertical;
    }
    
    /**
     * Returns the list items html elements 
     */
    private getListItems(itemsContainer: HTMLElement): Element[] {
        let items: Element[] = [];
        // ignore spacer elements
        for (let i = 1; i < itemsContainer.children.length - 1; i++) {
            items.push(itemsContainer.children[i]);
        }
        return items;
    }
    
    private getItemBounds(item: Element): Rect {
        const MIN_SIZE = 20; // minimum items size (because when items are animating height/width we might get very small values)
        let bounds = item.getBoundingClientRect();
        let rect: Rect = {
            width: bounds.width,
            height: bounds.height,
            left: bounds.left,
            right: bounds.right,
            top: bounds.top,
            bottom: bounds.bottom,
        };
        if (this.scrollDirection === ScrollExtensions.ScrollDirection.Horizontal) {
            if (rect.width < MIN_SIZE) {
                rect.width = MIN_SIZE;
                rect.right = rect.left + rect.width;
            }
        } else {
            if (rect.height < MIN_SIZE) {
                rect.height = MIN_SIZE;
                rect.bottom = rect.top + rect.height;
            }
        }
        return rect;
    }
    
    /**
     * Returns true if the list elements stack (vertically or horizontally)
     */
    private areElementsStacked(items: Element[]): boolean {
        if (items.length < 2) {
            return false;
        }

        // use elements from last positions to avoid off screen elements (because they overlap)
        let firstElement = items[items.length - 2];
        let secondElement = items[items.length - 1];
        
        // get elements original dimensions (do not use the getDimension function here)
        let firstElementBounds = firstElement.getBoundingClientRect();
        let secondElementBounds = secondElement.getBoundingClientRect();

        // elements stacked vertically; horizontal stacking not supported yet
        return this.getDimension(secondElementBounds.top, 0) >= this.getDimension(firstElementBounds.bottom, 1); 
    }
    
    /**
     * Calculate the total size (height or width) of the items given
     */
    private calculateItemsSize(items: Element[], 
                               firstItemIndex = 0, 
                               lastItemIndex: number = items.length - 1): { total: number, sizes: number[] } {
        let total = 0;
        let sizes = new Array(lastItemIndex - firstItemIndex + 1);
        // we have to iterate over all items and consider a minimum size for each
        for (let i = firstItemIndex; i <= lastItemIndex; i++) {
            let itemBounds = this.getItemBounds(items[i]);
            let size = this.getDimension(itemBounds.height, itemBounds.width);
            total += size;
            sizes[i - firstItemIndex] = size;
        }
    
        return { total: total, sizes: sizes };
    }
    
    /**
     * Count the number of items that fit in the specified size and retrieve the
     * count and summing size of those items
     */
    private countItemsAndSizeThatFitIn(itemsSizes: number[], 
                                       sizeToFit: number, 
                                       allowOverflow = false, 
                                       countBackwards = false): { size: number, count: number } {
        let i = 0;
        let itemsSize = 0;
        let getIndex = countBackwards ? (idx: number): number => itemsSizes.length - 1 - idx : (idx: number): number => idx; 

        for (; i < itemsSizes.length; i++) {
            let itemSize = itemsSizes[getIndex(i)];
            if ((itemsSize + itemSize) > sizeToFit) {
                if (allowOverflow) {
                    i++;
                    itemsSize += itemSize;
                }
                break;
            }

            itemsSize += itemSize;
        }
        
        return { size: itemsSize, count: i };
    }
    
    /**
     * Calculate first and last visible items for the current scroll state, as well as the scroll offset
     */
    private getCurrentScrollViewerState(listLength: number): IScrollViewerState {
        let items = this.getListItems(this.itemsContainer);

        if (!this.areElementsStacked(items)) {
            // disable virtualization if list elements do not stack (not supported)
            return {
                firstRenderedItemIndex: 0,
                lastRenderedItemIndex: Math.max(1, this.props.length - 1), // we need at least 2 elements to find the stacking direction
                averageItemSize: 0,
                scrollOffset: 0,
                offScreenItemsCount: 0,
            };
        }
        
        let scrollInfo = this.getScrollInfo();
        
        // get rendered items sizes
        let renderedItemsSizes = this.calculateItemsSize(items);
        let offScreenItemsCount = this.state.offScreenItemsCount;
        let onScreenItems = renderedItemsSizes.sizes.slice(offScreenItemsCount);
        let onScreenItemsSize = onScreenItems.reduce((p, c) => p + c);
        let averageItemSize = onScreenItemsSize / (onScreenItems.length * 1.0); // consider only on screen items for average item size
        
        if (this.state.averageItemSize !== 0) {
            // to avoid great oscillation, give more weight to aggregated averageItemSize
            averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
        }
        
        let pageBufferSize = (this.props.pageBufferSize || DEFAULT_BUFFER_SIZE) * BUFFER_MULTIPLIER;
        let viewportSafetyMargin = scrollInfo.viewportSize * (pageBufferSize / 2); // extra safety space for some more items
        let itemsFittingViewportCount = Math.ceil(scrollInfo.viewportSize / averageItemSize);
        let maxOffScreenItemsCount = Math.ceil(scrollInfo.viewportSize * 1.5 / averageItemSize); // place an extra viewport of items offscreen

        // number of extra items to render before/after viewport bounds that
        // helps avoiding showing blank space specially when scrolling fast
        let safetyItemsCount = Math.ceil(viewportSafetyMargin * 2) / averageItemSize;
        
        // rendered items = items in viewport + safety items + off screen items
        let renderedItemsCount = itemsFittingViewportCount + safetyItemsCount + maxOffScreenItemsCount;
        
        let scrollOffset = this.state.scrollOffset;
        let firstRenderedItemIndex = this.state.firstRenderedItemIndex;
        let viewportLowerMargin = scrollInfo.viewportLowerBound - viewportSafetyMargin;

        // get first spacer bounds instead of picking first item due to items rendered offscreen which have wrong coordinates
        let firstSpacerBounds = this.itemsContainer.children[0].getBoundingClientRect();
        let firstItemOffset = this.getDimension(firstSpacerBounds.bottom, firstSpacerBounds.right);
                    
        if (Math.abs(firstItemOffset - viewportLowerMargin) <= onScreenItemsSize) {
            if (firstItemOffset < viewportLowerMargin) {
                // find the onscreen items that will go offscreen
                let itemsGoingOffScreen = this.countItemsAndSizeThatFitIn(onScreenItems, Math.abs(viewportLowerMargin - firstItemOffset));
                
                if (itemsGoingOffScreen.count > 0) {
                    // compensate scroll with the size of the items going offscreen
                    scrollOffset += itemsGoingOffScreen.size;
                    // move onscreen items to offscreen
                    offScreenItemsCount += itemsGoingOffScreen.count;
                    
                    if (offScreenItemsCount > maxOffScreenItemsCount) {
                        // offscreen items overflowing, discard some
                        let leavingItemsCount =  offScreenItemsCount - maxOffScreenItemsCount;
                        // TODO we must check if firstRenderedItemIndex does not go behond limits 
                        firstRenderedItemIndex += leavingItemsCount;
                        offScreenItemsCount = maxOffScreenItemsCount;
                    }
                }
            } else if (firstItemOffset > viewportLowerMargin) {
                let availableSpace = Math.abs(firstItemOffset - viewportLowerMargin);
                let offScreenItems = renderedItemsSizes.sizes.slice(0, offScreenItemsCount);
                // find the items that will go onscreen
                let itemsGoingOnScreen = this.countItemsAndSizeThatFitIn(offScreenItems, availableSpace, true, true);
                if (itemsGoingOnScreen.count > 0) {
                    // compensate scroll with the size of the items going onscreen
                    scrollOffset = Math.max(0, scrollOffset - itemsGoingOnScreen.size);
                    // move offscreen items to onscreen
                    offScreenItemsCount -= itemsGoingOnScreen.count;
                    availableSpace -= itemsGoingOnScreen.size;
                }
                
                if (availableSpace > 0) {
                    // all offscreen items went onscreen but there's still room for more items
                    if (offScreenItemsCount !== 0) {
                        throw "offScreenItemsCount should be 0";
                    }
                    
                    let enteringItemsCount = Math.min(firstRenderedItemIndex, Math.ceil(availableSpace / averageItemSize));
                    firstRenderedItemIndex -= enteringItemsCount;
                    scrollOffset -= enteringItemsCount * averageItemSize; // compensate scroll with the (average) size of items entering
                }
                
                if (offScreenItemsCount < maxOffScreenItemsCount) {
                    // room for more offscreen items, add some 
                    let enteringItemsCount = Math.min(firstRenderedItemIndex, maxOffScreenItemsCount - offScreenItemsCount);
                    firstRenderedItemIndex -= enteringItemsCount;
                    offScreenItemsCount += enteringItemsCount;
                }
            }

        } else {
            // scroll delta is too large
            let startOffset = this.getDimension(firstSpacerBounds.top, firstSpacerBounds.left);
            if (startOffset < scrollInfo.viewportLowerBound) {
                // calculate the distance between the start of the list and viewport lower bound
                startOffset = Math.abs(startOffset - scrollInfo.viewportLowerBound); 
            } else {
                startOffset = 0;
            }
            
            // calculate first item in viewport based on the average item size (and some margin)
            firstRenderedItemIndex = Math.max(0, Math.floor(startOffset / averageItemSize) - 1);
            offScreenItemsCount = 0;
            if (firstRenderedItemIndex > 0) {
                firstRenderedItemIndex = Math.max(0, firstRenderedItemIndex - Math.ceil(viewportSafetyMargin / averageItemSize));
            }
            scrollOffset = firstRenderedItemIndex * averageItemSize;
        }
        
        if (firstRenderedItemIndex === 0 && offScreenItemsCount === 0) {
            // prevent offset > 0 when reached beginning of the list
            scrollOffset = 0;
        }
        
        let lastRenderedItemIndex = Math.min(listLength - 1, firstRenderedItemIndex + renderedItemsCount);
        
        return {
            firstRenderedItemIndex: firstRenderedItemIndex,
            lastRenderedItemIndex: lastRenderedItemIndex,
            averageItemSize: averageItemSize,
            scrollOffset: scrollOffset,
            offScreenItemsCount: offScreenItemsCount,
        };
    }
    
    public get isScrolling(): boolean {
        return this.isScrollOngoing;
    }
    
    public get isInitialized(): boolean {
        return this.isComponentInitialized;
    }
    
    private get isDisposed(): boolean {
        return !this.itemsContainer;
    }
    
    public setScrollOffset(x: number, y: number): void {
        let scrollInfo = this.getScrollInfo();
        let scrollHost = scrollInfo.scrollHost;
        let scrollX = this.getDimension(undefined, x);
        let scrollY = this.getDimension(y, undefined);
        let updateScroll = () => { ScrollExtensions.setScrollOffset(scrollHost, scrollX, scrollY); };
        if (this.isInitialized) {
            updateScroll();
        } else {
            // not all items rendered yet, schedule scroll updates for later
            this.setPendingScroll = updateScroll;
        }
    }
}
