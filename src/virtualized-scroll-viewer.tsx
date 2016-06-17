import * as React from "react";
import * as ReactDOM from "react-dom";
import { ScrollDirection, IScrollHostInfo, getScrollHostInfo } from "extensions";

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";
const PIXEL_UNITS = "px";

export interface IScrollViewerProperties {
    length: number;
    renderItems: (startIndex: number, length: number) => React.ReactFragment;
    scrollChanged?: () => void;
    renderWrapper: (children: React.ReactFragment) => JSX.Element; 
}

interface IScrollInfo {
    scrollHost: HTMLElement | Window;
    viewportSize: number;
    scrollOffset: number;
    viewportLowerBound: number;
    viewportUpperBound: number;
}

interface IScrollViewerState {
    firstVisibleItemIndex: number;
    lastVisibleItemIndex: number;
    averageItemSize: number;
    scrollOffset: number; // scroll compensation for missing items
    effectiveScrollValue: number; // scroll value of the scroll host
    itemsEnteringCount: number // stores the number entering viewport in the last render frame
}

export class VirtualizedScrollViewer extends React.Component<IScrollViewerProperties, IScrollViewerState> {
    
    private scrollHandler: () => void;
    private scrollHostInfo: IScrollHostInfo;
    private scrollDirection: ScrollDirection = ScrollDirection.Vertical;
    private pendingPropertiesUpdate: boolean = false;
    private pendingScrollAsyncUpdateHandle: number;
    private itemsContainer: HTMLElement;
    
    constructor(props: IScrollViewerProperties, context: any) {
        super(props, context);
        this.scrollHandler = this.handleScroll.bind(this);
        this.state = {
            firstVisibleItemIndex: 0,
            lastVisibleItemIndex: 1,
            averageItemSize: 0,
            scrollOffset: 0,
            effectiveScrollValue: 0,
            itemsEnteringCount: 0
        };
    }
    
    /**
     * The element that owns the scrollbars
     */
    private getScrollHostInfo(): IScrollHostInfo {
        if (!this.scrollHostInfo) {
            this.scrollHostInfo = getScrollHostInfo(this.itemsContainer);
        }

        return this.scrollHostInfo;
    }
    
    /**
     * Scroll information: the element that has the scrollbar, its viewport size and the scroll position
     */
    private getScrollInfo(): IScrollInfo {
        let scrollHostInfo = this.getScrollHostInfo();
        let scrollInfo: IScrollInfo;
        let scrollHost = scrollHostInfo.scrollHost;
        
        if (scrollHost instanceof Window) {
            return {
                scrollHost: scrollHost,
                scrollOffset: this.getDimension(scrollHost.scrollY, scrollHost.scrollX),
                viewportSize: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
                viewportLowerBound: this.getDimension(0, 0),
                viewportUpperBound: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
            };
        } else if (scrollHost instanceof HTMLElement) {
            let bounds = scrollHost.getBoundingClientRect();
            return {
                scrollHost: scrollHost,
                scrollOffset: this.getDimension(scrollHost.scrollTop, scrollHost.scrollLeft),
                viewportSize: this.getDimension(scrollHost.clientHeight, scrollHost.clientWidth),
                viewportLowerBound: this.getDimension(bounds.top, bounds.left),
                viewportUpperBound: this.getDimension(bounds.bottom, bounds.right),
            };
        }
        
        return null;
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
        this.addScrollHandler();
        this.scrollDirection = this.getScrollHostInfo().scrollDirection; // won't be updated later if changes (case not supported now)
        
        // rerender with the right amount of items in the viewport
        // we first rendered only just 2 elements, now lets render the remaining visible elements
        this.setState(this.getCurrentScrollViewerState(this.props.length));
    }
    
    public componentWillUnmount(): void {
        cancelAnimationFrame(this.pendingScrollAsyncUpdateHandle);
        this.removeScrollHandler();
        this.scrollHostInfo = null;
        this.itemsContainer = null;
    }
    
    public componentWillReceiveProps(nextProps: IScrollViewerProperties): void {
        this.setState(this.getCurrentScrollViewerState(nextProps.length)); // rerender with the right amount of items in the viewport
        this.pendingPropertiesUpdate = true;
    }
    
    public componentDidUpdate(): void {
        this.itemsContainer = ReactDOM.findDOMNode(this) as HTMLElement;
        if (this.pendingPropertiesUpdate || this.state.itemsEnteringCount > 0) {
            // updated with list changes, let's compute the visible items
            // or new items entering (in this render frame), calculate scroll compensation based on items real size
            this.setState(this.getCurrentScrollViewerState(this.props.length));
            this.pendingPropertiesUpdate = false;
        }
    }
    
    private handleScroll(): void {
        if (this.pendingScrollAsyncUpdateHandle) {
            return; // an update already queued, skip
        }
        
        // delay any updates until render time
        this.pendingScrollAsyncUpdateHandle = requestAnimationFrame(() => {
            let newState = this.getCurrentScrollViewerState(this.props.length);
            if (this.shallUpdateState(newState)) {
                // only update when visible items change -> smooth scroll
                this.setState(newState);
                // console.log(newState.firstVisibleItemIndex + " " + newState.scrollOffset + " " + newState.averageItemSize);
            }
            
            this.pendingScrollAsyncUpdateHandle = 0;
            if (this.props.scrollChanged) {
                this.props.scrollChanged();
            }
        });
    }
    
    private shallUpdateState(state: IScrollViewerState) {
        return state.firstVisibleItemIndex !== this.state.firstVisibleItemIndex ||
               state.lastVisibleItemIndex !== this.state.lastVisibleItemIndex;
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
        listChildren.push(this.renderSpacer("first-spacer", scrollOffset));
        listChildren.push(items);
        listChildren.push(this.renderSpacer("last-spacer", remainingSize));
        
        return this.props.renderWrapper(listChildren);
    }
    
    /**
     * Render a spacer element used to give blank space at the beginning or end of the list
     */
    private renderSpacer(key: string, dimension: number): JSX.Element {
        const FILL_SPACE = "100%";
        let style: React.CSSProperties = {
            display: "inline-block"
        };
        if (this.scrollDirection === ScrollDirection.Horizontal) {
            style.width = Math.round(dimension) + PIXEL_UNITS;
            style.height = FILL_SPACE;
        } else {
            style.width = FILL_SPACE;
            style.height = Math.round(dimension) + PIXEL_UNITS;
        }
        return <script key={key} style={style}></script>;
    }
    
    public render(): JSX.Element {
        return this.renderList(this.state.firstVisibleItemIndex, this.state.lastVisibleItemIndex);
    }
    
    /**
     * Returns the appropriate dimension according to the scroll direction
     */
    private getDimension(vertical: number, horizontal: number): number {
        return this.scrollDirection === ScrollDirection.Horizontal ? horizontal : vertical;
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
    
    /**
     * Returns true if the list elements stack (vertically or horizontally)
     */
    private areElementsStacked(items: Element[]): boolean {
        if (items.length < 2) {
            return false;
        }

        let firstElement = items[0];
        let secondElement = items[1];

        let firstElementBounds = firstElement.getBoundingClientRect();
        let secondElementBounds = secondElement.getBoundingClientRect();

        return this.getDimension(secondElementBounds.top, 0) >= this.getDimension(firstElementBounds.bottom, 1); // elements stacked vertically; horizontal stacking not supported yet
    }
    
    /**
     * Calculate the average size (height or width) of the items given
     */
    private calculateAverageItemsSize(items: Element[]): number {
        let visibleItemsSize = this.calculateItemsSize(items[0], items[items.length - 1]);
        return visibleItemsSize / (items.length * 1.0);  
    }
    
    /**
     * Calculate the total size (height or width) of the items given
     */
    private calculateItemsSize(firstItem: Element, lastItem: Element): number {
        let firstItemBounds = firstItem.getBoundingClientRect();
        let lastItemBounds = lastItem.getBoundingClientRect();
    
        return this.getDimension(lastItemBounds.bottom, lastItemBounds.right) - this.getDimension(firstItemBounds.top, firstItemBounds.left);    
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
                effectiveScrollValue: 0,
                itemsEnteringCount: 0
            };
        }
        
        let viewportAbsolutePosition = 0;
        let scrollInfo = this.getScrollInfo();
        
        let averageItemSize = this.calculateAverageItemsSize(items);
        
        if (this.state.averageItemSize !== 0) {
            // to avoid great oscillation, give more weight to aggregated averageItemSize
            averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
        }
        
        let viewportSafetyMargin = scrollInfo.viewportSize * 0.5; // extra safety space for some more items
        
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
            if (scrollInfo.scrollOffset > this.state.effectiveScrollValue) {
                // scrolling down/right
                
                // find the first element that intersects the viewport
                let firstItemIndexInViewport = -1;
                let viewportLowerMargin = scrollInfo.viewportLowerBound - viewportSafetyMargin;
                for (let i = 0; i < items.length; i++) {
                    let itemBounds = items[i].getBoundingClientRect();
                    if (this.getDimension(itemBounds.bottom, itemBounds.right) > viewportLowerMargin) {
                        firstItemIndexInViewport = i;
                        break;
                    }
                }
                 
                if (firstItemIndexInViewport > 0) {
                    // calculate the size of the items that will leave viewport
                    let sizeOfItemsLeavingOnNextRender = this.calculateItemsSize(items[0], items[firstItemIndexInViewport - 1]);
                    
                    firstVisibleItemIndex += firstItemIndexInViewport;
                    scrollOffset += sizeOfItemsLeavingOnNextRender; // compensate scroll with the size of the items leaving
                } else if (firstItemIndexInViewport === -1) {
                    // scroll changes are too big that no elements intersect viewport
                    largeScrollChange = true;
                }
            } else if (scrollInfo.scrollOffset < this.state.effectiveScrollValue) {
                // scrolling up/left
                let firstItemBounds = items[0].getBoundingClientRect();
                // calculate the distance from first item to the viewport lower margin
                let firstItemOffset = this.getDimension(firstItemBounds.top - viewportLowerMargin, firstItemBounds.left - viewportLowerMargin);
                
                if (firstItemOffset > 0) {
                    // calculate the number of items entering (must be at most the number of items before first)
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
                // calculate first item in viewport based on the average item size
                firstVisibleItemIndex = Math.max(0, Math.floor(scrollInfo.scrollOffset / averageItemSize));
                scrollOffset = Math.round(firstVisibleItemIndex * averageItemSize);
            }
        } else {
            let sizeOfItemsEnteringViewport = this.calculateItemsSize(items[0], items[this.state.itemsEnteringCount - 1]);
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
            effectiveScrollValue: scrollInfo.scrollOffset,
            itemsEnteringCount: itemsEnteringViewportCount
        };
    }
}