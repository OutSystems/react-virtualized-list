import * as React from "react";
import * as ReactDOM from "react-dom";
import { ScrollExtensions } from "./virtualized-scroll-viewer-extensions";
import { Spacer } from "./spacer";

function insideiOSWebView(): boolean {
    return !(navigator as any).standalone && /(iPad)|(iPhone)/i.test(navigator.userAgent) && !/safari/i.test(navigator.userAgent);
}

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";
const PIXEL_UNITS = "px";
const DEFAULT_BUFFER_SIZE = 3; // default number of extra viewports to render
const BUFFER_MULTIPLIER = insideiOSWebView() ? 4 : 1; // inside iOS webview use 4x the buffer size (due to scrolling limitations)
const MIN_ITEM_SIZE = 10; // minimum items size (because when items are animating height/width we might get very small values) 

export interface IScrollViewerProperties extends React.Props<VirtualizedScrollViewer> {
    length: number;
    renderItems: (startIndex: number, length: number) => React.ReactFragment;
    scrollChanged?: () => void;
    renderWrapper: (children: React.ReactFragment) => JSX.Element;
    pageBufferSize?: number; // number of pages buffered
    initializationCompleted?: () => void;
    viewportSafetyMarginBefore?: number;
    viewportSafetyMarginAfter?: number;
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
    effectiveScrollOffset: number; // stores the scroll offset of the scroll host
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
        this.state = {
            firstRenderedItemIndex: 0,
            lastRenderedItemIndex: 1,
            averageItemSize: 0,
            scrollOffset: 0,
            offScreenItemsCount: 0,
            effectiveScrollOffset: Number.MIN_VALUE,
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
        scrollHost.addEventListener(SCROLL_EVENT_NAME, this.onScroll);
        window.addEventListener(RESIZE_EVENT_NAME, this.onScroll);
        this.scrollDirection = scrollHostInfo.scrollDirection; // won't be updated later if changes (case not supported now)
    }

    private removeScrollHandler(): void {
        let scrollHost = this.getScrollHostInfo().scrollHost;
        scrollHost.removeEventListener(SCROLL_EVENT_NAME, this.onScroll);
        window.removeEventListener(RESIZE_EVENT_NAME, this.onScroll);
    }

    private onWindowScrollOrResize = (): void => {
        this.removeWindowScrollHandlers();
        this.addScrollHandler();
    }

    private removeWindowScrollHandlers() {
        window.removeEventListener(SCROLL_EVENT_NAME, this.onWindowScrollOrResize, true);
        window.removeEventListener(RESIZE_EVENT_NAME, this.onWindowScrollOrResize, true);
    }

    public componentDidMount(): void {
        this.itemsContainer = ReactDOM.findDOMNode(this) as HTMLElement;

        requestAnimationFrame(() => {
            if (!this.isDisposed) {
                // loading css might take some time, that's why we wait for user interaction 
                // (hoping that he acts after things are ready)
                // and defer attaching of scroll listener events  until a scroll event is fired
                window.addEventListener(SCROLL_EVENT_NAME, this.onWindowScrollOrResize, true);
                window.addEventListener(RESIZE_EVENT_NAME, this.onWindowScrollOrResize, true);
            }
        });

        // rerender with the right amount of items in the viewport
        // we first rendered only just 2 elements, now lets render the remaining visible elements
        this.setState(this.getCurrentScrollViewerState(this.props.length));
    }

    public componentWillUnmount(): void {
        this.removeWindowScrollHandlers();
        this.removeScrollHandler();
        this.scrollHostInfo = null;
        this.itemsContainer = null;
    }

    public componentWillReceiveProps(nextProps: IScrollViewerProperties): void {
        this.setState(this.getCurrentScrollViewerState(nextProps.length)); // rerender with the right amount of items in the viewport
        this.hasPendingPropertiesUpdate = true;
    }

    public setState<K extends keyof IScrollViewerState>(state: IScrollViewerState | ((prevState: IScrollViewerState, props: IScrollViewerProperties) => Pick<IScrollViewerState, K>),
        callback?: () => any): void {
        // using set state callback instead of componentDidUpdate because when using transition group
        // removed nodes will still be present when component did update is called
        super.setState(state as any, () => {
            this.onDidUpdate();
            if (callback) {
                callback();
            }
        });
    }

    private onDidUpdate(): void {
        // console.log(this.state);
        this.itemsContainer = ReactDOM.findDOMNode(this) as HTMLElement;

        this.renderOffScreenBuffer();

        if (this.setPendingScroll) {
            requestAnimationFrame(() => {
                // execute inside raf to make sure scroll events are already attached 
                if (!this.isDisposed && this.setPendingScroll) {
                    this.setPendingScroll();
                    this.setPendingScroll = null;
                }
            });
        }

        if (!this.isComponentInitialized) {
            this.isComponentInitialized = true; // we render twice before initialization complete
            if (this.props.initializationCompleted) {
                this.props.initializationCompleted();
            }
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

        if (this.scrollDirection !== ScrollExtensions.ScrollDirection.Vertical) {
            if (this.state.offScreenItemsCount > 0) {
                console.warn("Virtualization attempting offscreen items with horizontal stacking...");
            }
            return;
        }

        this.itemsContainer.style.position = "relative";

        let items = this.itemsContainer.children;
        let itemsCount = this.itemsContainer.childElementCount;

        let topPad = items.item(0) as HTMLElement;
        let bottomPad = items.item(itemsCount - 1) as HTMLElement;

        topPad.style.height = this.state.scrollOffset + PIXEL_UNITS;
        bottomPad.style.height =
            this.getRemainingSize(this.state.firstRenderedItemIndex, this.state.lastRenderedItemIndex)
            + PIXEL_UNITS;

        for (var i = 1; i < this.state.offScreenItemsCount + 1; i++) {
            let child = items.item(i) as HTMLElement;
            if (child.style !== undefined) {
                // move element offscreen
                if (!child.style.width) {
                    child.style.width = "100%";
                }
                child.style.position = "absolute";
                child.style.top = "-10000" + PIXEL_UNITS;
            }
        }

        for (var i = this.state.offScreenItemsCount + 1; i < itemsCount - 1; i++) {
            let child = items.item(i) as HTMLElement;
            if (child.style !== undefined) {
                child.style.position = "";
                child.style.top = "";
                child.style.width = "";
            }
        }
    }

    private onScroll = (scrollEvent: UIEvent): void => {
        if (this.pendingScrollAsyncUpdateHandle) {
            return; // an update already queued, skip
        }

        // delay any updates until render time
        this.pendingScrollAsyncUpdateHandle = requestAnimationFrame(() => {
            if (this.isDisposed) {
                return;
            }

            try {
                // return same state when doing small scroll changes (resizing case not optimized)
                let newState = this.getCurrentScrollViewerState(this.props.length, scrollEvent.type !== RESIZE_EVENT_NAME);

                if (newState !== this.state) {
                    this.isScrollOngoing = true;
                    this.setState(newState, () => this.isScrollOngoing = false);
                }
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

    private getRemainingSize(firstRenderedItemIndex: number, lastRenderedItemIndex: number): number {
        let length = Math.min(this.props.length, lastRenderedItemIndex - firstRenderedItemIndex + 1);

        let remainingSize = 0;
        let averageItemSize = Math.max(MIN_ITEM_SIZE, this.state.averageItemSize);
        if (lastRenderedItemIndex < (this.props.length - 1)) {
            let scrollSize = averageItemSize * this.props.length;
            // give remaining space at the end if end of list as not been reached
            remainingSize = scrollSize - ((averageItemSize * (length - this.state.offScreenItemsCount)) + this.state.scrollOffset);
        }
        return remainingSize;
    }

    private renderList(firstRenderedItemIndex: number, lastRenderedItemIndex: number): JSX.Element {
        let length = Math.min(this.props.length, lastRenderedItemIndex - firstRenderedItemIndex + 1);

        let scrollOffset = this.state.scrollOffset;
        let remainingSize = this.getRemainingSize(firstRenderedItemIndex, lastRenderedItemIndex);
        // render only visible items
        let items = this.props.renderItems(firstRenderedItemIndex, length);
        let averageItemSize = Math.max(MIN_ITEM_SIZE, this.state.averageItemSize);

        let listChildren: any = [];
        if (this.scrollDirection !== ScrollExtensions.ScrollDirection.None) {
            listChildren.push(this.renderSpacer("first-spacer", scrollOffset, averageItemSize)); // compensate scroll offset
        }
        listChildren.push(items);
        if (this.scrollDirection !== ScrollExtensions.ScrollDirection.None) {
            listChildren.push(this.renderSpacer("last-spacer", remainingSize, averageItemSize)); // compensate scroll height/width
        }

        return this.props.renderWrapper(listChildren);
    }

    /**
     * Render a spacer element used to give blank space at the beginning or end of the list
     */
    private renderSpacer(key: string, dimension: number, averageItemSize: number): JSX.Element {
        return <Spacer key={key} childKey={key}
            dimension={dimension}
            averageItemSize={averageItemSize}
            scrollDirection={this.scrollDirection} />;
    }

    public render(): JSX.Element {
        return this.renderList(this.state.firstRenderedItemIndex, this.state.lastRenderedItemIndex);
    }

    /**
     * Returns the appropriate dimension according to the scroll direction
     */
    private getDimension(vertical: number, horizontal: number): number {
        return this.scrollDirection === ScrollExtensions.ScrollDirection.Vertical ? vertical : horizontal;
    }

    /**
     * Returns the list items html elements 
     */
    private getListItems(itemsContainer: HTMLElement): Element[] {
        let items: Element[] = [];
        let children = itemsContainer.children;

        // ignore spacer elements
        let start_idx = children.length > 0 && Spacer.isSpacer(children[0]) ? 1 : 0;
        let end_idx = children.length > 0 && Spacer.isSpacer(children[children.length - 1]) ? children.length - 2 : children.length - 1;
        for (let i = start_idx; i < end_idx; i++) {
            var elem = itemsContainer.children[i];
            if (!Spacer.isSpacer(elem)) {
                items.push(elem);
            }
        }
        return items;
    }

    private getItemBounds(item: Element): Rect {
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
            if (rect.width < MIN_ITEM_SIZE) {
                rect.width = MIN_ITEM_SIZE;
                rect.right = rect.left + rect.width;
            }
        } else if (this.scrollDirection === ScrollExtensions.ScrollDirection.Vertical) {
            if (rect.height < MIN_ITEM_SIZE) {
                rect.height = MIN_ITEM_SIZE;
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
        return Math.floor(this.getDimension(secondElementBounds.top, 0)) >= Math.floor(this.getDimension(firstElementBounds.bottom, 1));
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
    private getCurrentScrollViewerState(listLength: number, returnSameStateOnSmallChanges = false): IScrollViewerState {
        let scrollInfo = this.getScrollInfo();
        // the value 7500 was chosen as it's aproximately the maximum scroll a user can do in a single
        // screen swipe
        let viewportSafetyMarginBefore = this.props.viewportSafetyMarginBefore || 7500;
        viewportSafetyMarginBefore = Math.min(scrollInfo.scrollOffset, viewportSafetyMarginBefore);
        let viewportSafetyMarginAfter = this.props.viewportSafetyMarginAfter || 7500;
        let forceRecalculate = false;
        // if (returnSameStateOnSmallChanges && 
        //     Math.abs(scrollInfo.scrollOffset - this.state.effectiveScrollOffset) < (viewportSafetyMargin * 0.5)) {
        //     // scroll changes are small, skip computations ahead
        //     return this.state;
        // }

        if (scrollInfo.scrollOffset < (scrollInfo.viewportSize / 4) && (this.state.firstRenderedItemIndex > 0 || this.state.offScreenItemsCount > 0)) {
            forceRecalculate = true;
        }

        let items = this.getListItems(this.itemsContainer);

        // We need at least 2 elements to find the stacking direction
        if (items.length >= 2 && !this.areElementsStacked(items)) {
            // disable virtualization if list elements do not stack (not supported)
            this.scrollDirection = ScrollExtensions.ScrollDirection.None;
        }

        if (this.scrollDirection !== ScrollExtensions.ScrollDirection.Vertical // horizontal stacking not supported anyway
            || items.length < 2) { // Also abort if there isn't at least 2 elements
            return {
                firstRenderedItemIndex: 0,
                lastRenderedItemIndex: Math.max(1, this.props.length - 1),
                averageItemSize: 0,
                scrollOffset: 0,
                offScreenItemsCount: 0,
                effectiveScrollOffset: scrollInfo.scrollOffset,
            };
        }

        let lastSpacerBounds = this.itemsContainer.lastElementChild.getBoundingClientRect();
        if (this.getDimension(lastSpacerBounds.bottom, lastSpacerBounds.right) < -100) {
            // list is out-of-viewport, no need to compute new state
            return this.state;
        }

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

        let itemsFittingViewportCount = Math.ceil(scrollInfo.viewportSize / averageItemSize);
        let maxOffScreenItemsCount = itemsFittingViewportCount; // place an extra viewport of items offscreen

        // number of extra items to render before/after viewport bounds that
        // helps avoiding showing blank space specially when scrolling fast
        let safetyItemsCountBefore = Math.ceil(viewportSafetyMarginBefore / averageItemSize);
        let safetyItemsCountAfter = Math.ceil(viewportSafetyMarginAfter / averageItemSize);

        // rendered items = items in viewport + safety items + off screen items
        let renderedItemsCountNew = Math.min(listLength, itemsFittingViewportCount + safetyItemsCountBefore + safetyItemsCountAfter + offScreenItemsCount);

        let scrollOffset = this.state.scrollOffset;
        let firstRenderedItemIndex = this.state.firstRenderedItemIndex;
        let viewportLowerMargin = scrollInfo.viewportLowerBound - viewportSafetyMarginBefore;

        // get first spacer bounds instead of picking first item due to items rendered offscreen which have wrong coordinates
        let firstSpacerBounds = this.itemsContainer.firstElementChild.getBoundingClientRect();
        let firstItemOffset = this.getDimension(firstSpacerBounds.bottom, firstSpacerBounds.right);

        if (!forceRecalculate && Math.abs(firstItemOffset - viewportLowerMargin) <= onScreenItemsSize) {
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
                        let leavingItemsCount = offScreenItemsCount - maxOffScreenItemsCount;
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
                firstRenderedItemIndex = Math.max(0, firstRenderedItemIndex - Math.ceil(viewportSafetyMarginBefore / averageItemSize));
            }
            firstRenderedItemIndex = Math.max(0, Math.min(firstRenderedItemIndex, listLength - 1 - renderedItemsCountNew));
            scrollOffset = firstRenderedItemIndex * averageItemSize;
        }

        if (firstRenderedItemIndex === 0 && offScreenItemsCount === 0) {
            // prevent offset > 0 when reached beginning of the list
            scrollOffset = 0;
        }

        let beforeCount = Math.max(Math.ceil(scrollOffset / averageItemSize), 0);
        let newRenderedItemsCountNew = Math.min(listLength, itemsFittingViewportCount + Math.min(safetyItemsCountBefore, beforeCount) + safetyItemsCountAfter + offScreenItemsCount);
        let lastRenderedItemIndex = Math.min(listLength - 1, firstRenderedItemIndex + newRenderedItemsCountNew);

        return {
            firstRenderedItemIndex: firstRenderedItemIndex,
            lastRenderedItemIndex: lastRenderedItemIndex,
            averageItemSize: averageItemSize,
            scrollOffset: scrollOffset,
            offScreenItemsCount: offScreenItemsCount,
            effectiveScrollOffset: scrollInfo.scrollOffset,
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

    public scrollToIndex(index: number): void {
        this.internalSetScrollOffset(() => {
            let scrollInfo = this.getScrollInfo();
            let scrollHost = scrollInfo.scrollHost;

            let scrollOffset = this.state.averageItemSize * index;
            let firstVisibleItemOffset = scrollInfo.scrollOffset;
            let needsScroll = false;

            if (scrollOffset < firstVisibleItemOffset) {
                // target is before first visible
                needsScroll = true;
            } else {
                let lastVisibleItemOffset = firstVisibleItemOffset + scrollInfo.viewportSize - this.state.averageItemSize;
                if (scrollOffset > lastVisibleItemOffset) {
                    // target is after last visible
                    scrollOffset = scrollOffset - (lastVisibleItemOffset - firstVisibleItemOffset);
                    needsScroll = true;
                }
            }

            if (!needsScroll) {
                // target is visible, don't scroll
                return;
            }

            let scrollX = this.getDimension(undefined, scrollOffset);
            let scrollY = this.getDimension(scrollOffset, undefined);

            ScrollExtensions.setScrollOffset(scrollHost, scrollX, scrollY, false);
        });
    }

    public scrollToOffset(x: number, y: number): void {
        this.internalSetScrollOffset(() => {
            let scrollInfo = this.getScrollInfo();
            let scrollHost = scrollInfo.scrollHost;
            let scrollX = this.getDimension(undefined, x);
            let scrollY = this.getDimension(y, undefined);
            ScrollExtensions.setScrollOffset(scrollHost, scrollX, scrollY);
        });
    }

    public setScrollOffset = this.scrollToOffset;

    private internalSetScrollOffset(setScroll: () => void): void {
        if (this.isInitialized) {
            setScroll();
        } else {
            // not all items rendered yet, schedule scroll updates for later
            this.setPendingScroll = setScroll;
        }
    }
}
