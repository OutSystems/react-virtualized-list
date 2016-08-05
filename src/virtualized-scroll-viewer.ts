import * as React from "react";
import * as ReactDOM from "react-dom";
import { ScrollExtensions, ObjectExtensions } from "virtualized-scroll-viewer-extensions";

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";
const PIXEL_UNITS = "px";
const FLEXBOX_DISPLAY = document.createElement("p").style.flex === undefined ? "-webkit-flex" : "flex"; // support ios under 9
const SENTINEL_POLLING_DURATION = 500; // time in ms to watch sentinel element position to compensate any scroll jumps

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
    firstVisibleItemIndex: number;
    lastVisibleItemIndex: number;
    averageItemSize: number;
    scrollOffset: number; // scroll compensation for missing items
    effectiveScrollOffset: number; // scroll value of the scroll host
    itemsEnteringCount: number; // stores the number entering viewport in the last render frame 
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
            firstVisibleItemIndex: 0,
            lastVisibleItemIndex: 1,
            averageItemSize: 0,
            scrollOffset: 0,
            effectiveScrollOffset: 0,
            itemsEnteringCount: 0
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
        let scrollInfo = ScrollExtensions.getScrollInfo(this.getScrollHostInfo());
        let scrollHost = scrollInfo.scrollHost;
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
        let scrollHost = this.getScrollHostInfo().scrollHost;
        scrollHost.addEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
        scrollHost.addEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
    }
    
    private removeScrollHandler(): void {
        let scrollHost = this.getScrollHostInfo().scrollHost;
        scrollHost.removeEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
        scrollHost.removeEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
    }
    
    public componentDidMount(): void {
        this.itemsContainer = ReactDOM.findDOMNode(this) as HTMLElement;
        let attachScrollListener = () => {
            if (this.isDisposed) {
                return;
            }
            this.addScrollHandler();
            this.scrollDirection = this.getScrollHostInfo().scrollDirection; // won't be updated later if changes (case not supported now)
        };
        if (this.props.length === 0) {
            // avoid forcing sync layout computation when there's no items, postpone for improved performance 
            requestAnimationFrame(() => setTimeout(attachScrollListener, 1));
        } else {
            attachScrollListener();
        }

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
    
    public componentDidUpdate(): void {
        this.isComponentInitialized = true; // we render twice before initialization complete
        this.itemsContainer = ReactDOM.findDOMNode(this) as HTMLElement;
        
        //console.log(this.state);
        
        if (this.setPendingScroll) {
            this.setPendingScroll();
            this.setPendingScroll = null;
        } 
        
        if (this.hasPendingPropertiesUpdate || this.state.itemsEnteringCount > 0) {
            // updated with list changes, let's compute the visible items
            // or new items entering (in this render frame), calculate scroll compensation based on items real size
            this.setState(this.getCurrentScrollViewerState(this.props.length));
            this.hasPendingPropertiesUpdate = false;
        }
    }
    
    private pollingScrollChangesHandle = 0;
    
    private pollScrollChanges() {
        let startTime = Date.now();
        let initialSentinelItemOffset = 0;
        let initialScrollOffset = this.state.effectiveScrollOffset; // use last scroll value used to render
         
        let execute = () => {
            this.pollingScrollChangesHandle = 0;
            
            if ((Date.now() - startTime) > SENTINEL_POLLING_DURATION) {
                // prevent infinite execution
                return;
            }
            
            let sentinelItemBounds = this.getItemBounds(this.itemsContainer.lastElementChild); // use the last element has sentinel (safer as its always present)
            let sentinelItemOffset = Math.round(this.getDimension(sentinelItemBounds.top, sentinelItemBounds.left));
            initialSentinelItemOffset = initialSentinelItemOffset || sentinelItemOffset;
             
            let sentinelDelta = sentinelItemOffset - initialSentinelItemOffset;
            let scrollDelta = -(this.getScrollInfo().scrollOffset - initialScrollOffset);
            
            let delta = scrollDelta - sentinelDelta;
            if (delta !== 0) {
                // sentinel element moved more than expected (didn't match the scroll change)
                // because probably the new items entering grew in size during their initial render
                // eg: when list items have images and those images arrive later (due to network or cache latency) items will grow in size
                // pushing the items above/right and users will notice that as a scroll jump
                // console.log("fixing scroll " + delta);
                let newState = <IScrollViewerState> ObjectExtensions.assign({}, this.state);
                if (newState.scrollOffset === 0) {
                    // reached the beginning of the list, nothing to do
                    return;
                }
                // try to compensate the scroll offset with the movement delta of the sentinel item
                // and move items to the place they where should be (avoid scroll jumps) 
                newState.scrollOffset = newState.scrollOffset + delta;
                this.setState(newState, () => {
                    execute();
                });
            } else {
                // sentinel is in the place where it should be but keep watching until defined time elapsed
                this.pollingScrollChangesHandle = requestAnimationFrame(execute);
            }
        };
        execute();
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
                this.setState(newState, () => {    
                    this.isScrollOngoing = false;
                    
                    if (this.pollingScrollChangesHandle) {
                        // scroll changed clear any scheduled work
                        cancelAnimationFrame(this.pollingScrollChangesHandle);
                        this.pollingScrollChangesHandle = 0;
                    }
                    
                    if (newState.itemsEnteringCount > 0) {
                        // new items are entering in the beginning of the list (due to scroll up/left)
                        // watch for changes in their size and try to compensate any chnages to avoid scroll jumps  
                        this.pollScrollChanges();
                    }
                });    
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
        return nextState.firstVisibleItemIndex !== this.state.firstVisibleItemIndex ||
               nextState.lastVisibleItemIndex !== this.state.lastVisibleItemIndex ||
               nextState.scrollOffset !== this.state.scrollOffset ||
               nextProps !== this.props;
    }
    
    private renderList(firstItemVisibleIndex: number, lastVisibleItemIndex: number): JSX.Element {
        let scrollOffset = this.state.scrollOffset;
        let length = Math.min(this.props.length, lastVisibleItemIndex - firstItemVisibleIndex + 1);
        
        // render only visible items
        let items = this.props.renderItems(firstItemVisibleIndex, length);
        
        let remainingSize = 0;
        if (lastVisibleItemIndex < (this.props.length - 1)) {
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
        // console.log(this.state.firstVisibleItemIndex + " " + this.state.scrollOffset + " " + this.state.averageItemSize);
        return this.renderList(this.state.firstVisibleItemIndex, this.state.lastVisibleItemIndex);
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
            bottom: bounds.bottom
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

        let firstElement = items[0];
        let secondElement = items[1];
        
        // get elements original dimensions (do not use the getDimension function here)
        let firstElementBounds = firstElement.getBoundingClientRect();
        let secondElementBounds = secondElement.getBoundingClientRect();

        return this.getDimension(secondElementBounds.top, 0) >= this.getDimension(firstElementBounds.bottom, 1); // elements stacked vertically; horizontal stacking not supported yet
    }
    
    /**
     * Calculate the average size (height or width) of the items given
     */
    private calculateAverageItemsSize(items: Element[]): number {
        let visibleItemsSize = this.calculateItemsSize(items, 0, items.length - 1);
        return visibleItemsSize / (items.length * 1.0);  
    }
    
    /**
     * Calculate the total size (height or width) of the items given
     */
    private calculateItemsSize(items: Element[], firstItemIndex: number, lastItemIndex: number): number {
        let size = 0;
        // we have to iterate over all items and consider a minimum size for each
        for (let i = firstItemIndex; i <= lastItemIndex; i++) {
            let itemBounds = this.getItemBounds(items[i]);
            size += this.getDimension(itemBounds.height, itemBounds.width);
        }
    
        return size;
    }
    
    /**
     * Calculate first and last visible items for the current scroll state, as well as the scroll offset
     */
    private getCurrentScrollViewerState(listLength: number): IScrollViewerState {
        let items = this.getListItems(this.itemsContainer);

        if (!this.areElementsStacked(items)) {
            // disable virtualization if list elements do not stack (not supported)
            return {
                firstVisibleItemIndex: 0,
                lastVisibleItemIndex: Math.max(1, this.props.length - 1), // we need at least 2 elements to find the stacking direction
                averageItemSize: 0,
                scrollOffset: 0,
                effectiveScrollOffset: 0,
                itemsEnteringCount: 0
            };
        }
        
        let scrollInfo = this.getScrollInfo();
        
        let averageItemSize = this.calculateAverageItemsSize(items);
        
        if (this.state.averageItemSize !== 0) {
            // to avoid great oscillation, give more weight to aggregated averageItemSize
            averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
        }
        
        let viewportSafetyMargin = scrollInfo.viewportSize * ((this.props.pageBufferSize || 1) / 2); // extra safety space for some more items
        
        // number of extra items to render before/after viewport bounds that
        // helps avoiding showing blank space specially when scrolling fast
        let numberOfSafetyItems = Math.ceil((viewportSafetyMargin * 2) / averageItemSize);
        
        // number of items that fit in the viewport
        let numberOfVisibleItems = Math.ceil(scrollInfo.viewportSize / averageItemSize) + numberOfSafetyItems;
        
        let scrollOffset = this.state.scrollOffset;
        let firstVisibleItemIndex = this.state.firstVisibleItemIndex;
        let viewportLowerMargin = scrollInfo.viewportLowerBound - viewportSafetyMargin;
        let itemsEnteringViewportCount = 0;
        let largeScrollChange = false;
        
        if (this.state.itemsEnteringCount === 0) {
            if (scrollInfo.scrollOffset > this.state.effectiveScrollOffset) {
                // scrolling down/right
                
                let firstItemIndexInViewport = -1;
                let sizeOfItemsLeavingOnNextRender = 0;
                let viewportLowerMargin = scrollInfo.viewportLowerBound - viewportSafetyMargin;
                let firstItemBounds = this.getItemBounds(items[0]);
                let firstItemLowerBound = this.getDimension(firstItemBounds.top, firstItemBounds.left);
                
                // find the first element that intersects the viewport
                // and calculate the size of the items that will leave viewport
                for (let i = 0; i < items.length; i++) {
                    let itemBounds = this.getItemBounds(items[i]); // consider a minimum size for each item
                    let itemSize = this.getDimension(itemBounds.height, itemBounds.width);
                     
                    if ((firstItemLowerBound + sizeOfItemsLeavingOnNextRender + itemSize) > viewportLowerMargin) {
                        firstItemIndexInViewport = i;
                        break;
                    }
                    
                    sizeOfItemsLeavingOnNextRender += itemSize;
                }
                 
                if (firstItemIndexInViewport > 0) {
                    firstVisibleItemIndex += firstItemIndexInViewport;
                    scrollOffset += sizeOfItemsLeavingOnNextRender; // compensate scroll with the size of the items leaving
                } else if (firstItemIndexInViewport === -1) {
                    // scroll changes are too big that no elements intersect viewport
                    largeScrollChange = true;
                }
            } else if (scrollInfo.scrollOffset < this.state.effectiveScrollOffset) {
                // scrolling up/left
                let firstItemBounds = this.getItemBounds(items[0]);
                // calculate the distance from first item to the viewport lower margin
                let firstItemOffset = this.getDimension(firstItemBounds.top - viewportLowerMargin, firstItemBounds.left - viewportLowerMargin);
                                    
                if (firstItemOffset > 0) {
                    // calculate the number of items entering based on average size (must be at most the number of items before first)
                    itemsEnteringViewportCount = Math.min(firstVisibleItemIndex, Math.ceil(firstItemOffset / averageItemSize));
                    firstVisibleItemIndex = firstVisibleItemIndex - itemsEnteringViewportCount;
                    if (itemsEnteringViewportCount > numberOfVisibleItems) {
                        // number of items entering does not fit in the viewport - big scroll change
                        itemsEnteringViewportCount = 0;
                        largeScrollChange = true;
                    }
                }
            }
            
            if (largeScrollChange) {
                // calculate first item in viewport based on the average item size (and some margin)
                firstVisibleItemIndex = Math.max(0, Math.floor((scrollInfo.scrollOffset - viewportSafetyMargin) / averageItemSize));
                scrollOffset = Math.round(firstVisibleItemIndex * averageItemSize);
            }
        } else {
            let lastItemEnteringViewport = Math.min(items.length - 1, this.state.itemsEnteringCount - 1);
            let sizeOfItemsEnteringViewport = this.calculateItemsSize(items, 0, lastItemEnteringViewport);
            scrollOffset = Math.max(0, scrollOffset - sizeOfItemsEnteringViewport);
        }
        
        if (firstVisibleItemIndex === 0 || scrollInfo.scrollOffset < averageItemSize) {
            // reached the beginning of the list
            scrollOffset = 0;
            firstVisibleItemIndex = 0;
        }
        
        let lastVisibleItemIndex = Math.min(listLength - 1, firstVisibleItemIndex + numberOfVisibleItems);
        
        return {
            firstVisibleItemIndex: firstVisibleItemIndex,
            lastVisibleItemIndex: lastVisibleItemIndex,
            averageItemSize: averageItemSize,
            scrollOffset: scrollOffset,
            effectiveScrollOffset: scrollInfo.scrollOffset,
            itemsEnteringCount: itemsEnteringViewportCount
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
