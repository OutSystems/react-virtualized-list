import * as React from "react";
import * as ReactDOM from "react-dom";
import { ScrollDirection, IScrollHostInfo, getScrollHostInfo } from "extensions";

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";
const PIXEL_UNITS = "px";

export interface IScrollViewerProperties {
    length: number;
    renderItem: (index: number) => JSX.Element;
    scrollChanged?: () => void;
}

interface IScrollInfo {
    scrollHost: HTMLElement | Window;
    viewportSize: number;
    scrollOffset: number;
    viewportLowerBound: number;
    viewportUpperBound: number;
}

interface IScrollViewerState {
    firstVisibleItemIndex: number,
    lastVisibleItemIndex: number,
    averageItemSize: number,
    scrollOffset: number
}

export class VirtualizedScrollViewer extends React.Component<IScrollViewerProperties, IScrollViewerState> {
    
    private scrollHandler: () => void;
    private scrollHostInfo: IScrollHostInfo;
    private scrollDirection: ScrollDirection = ScrollDirection.Vertical;
    private updateQueued = false;
    
    constructor(props: IScrollViewerProperties, context: any) {
        super(props, context);
        this.scrollHandler = this.handleScroll.bind(this);
        this.state = {
            firstVisibleItemIndex: 0,
            lastVisibleItemIndex: 1,
            averageItemSize: 0,
            scrollOffset: 0
        };
    }
    
    /**
     * The element that owns the scrollbars
     */
    private getScrollHostInfo(): IScrollHostInfo {
        if (!this.scrollHostInfo) {
            this.scrollHostInfo = getScrollHostInfo(ReactDOM.findDOMNode(this) as HTMLElement);
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
            scrollInfo = {
                scrollHost: scrollHost,
                scrollOffset: this.getDimension(scrollHost.scrollY, scrollHost.scrollX),
                viewportSize: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
                viewportLowerBound: this.getDimension(0, 0),
                viewportUpperBound: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
            };
        } else if (scrollHost instanceof HTMLElement) {
            let bounds = scrollHost.getBoundingClientRect();
            scrollInfo = {
                scrollHost: scrollHost,
                scrollOffset: this.getDimension(scrollHost.scrollTop, scrollHost.scrollLeft),
                viewportSize: this.getDimension(scrollHost.clientHeight, scrollHost.clientWidth),
                viewportLowerBound: this.getDimension(bounds.top, bounds.left),
                viewportUpperBound: this.getDimension(bounds.bottom, bounds.right),
            };
        }

        return scrollInfo;
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
        this.addScrollHandler();
        this.scrollDirection = this.getScrollHostInfo().scrollDirection; // won't be updated later if changes (case not supported now)
        this.setState(this.getCurrentScrollViewerState(this.props.length)); // rerender with the right amount of items in the viewport
    }
    
    public componentWillUnmount(): void {
        this.removeScrollHandler();
        this.scrollHostInfo = null;
    }
    
    public componentWillReceiveProps(nextProps: IScrollViewerProperties) {
        this.setState(this.getCurrentScrollViewerState(nextProps.length)); // rerender with the right amount of items in the viewport
    }
    
    private handleScroll(): void {
        if(this.updateQueued) {
            return; // an update already queued, skip
        }
        this.updateQueued = true;
        
        // delay any updates until render time
        requestAnimationFrame(() => {
            this.setState(this.getCurrentScrollViewerState(this.props.length));
            this.updateQueued = false;
            if (this.props.scrollChanged) {
                this.props.scrollChanged();
            }
        });
    }
    
    private renderList(firstItemVisibleIndex: number, lastVisibleItemIndex: number, scrollOffset: number = 0, size: number = NaN): JSX.Element {
        let items: JSX.Element[] = [];
        let length = Math.min(this.props.length, lastVisibleItemIndex + 1);
        
        // render only visible items
        for (let i = firstItemVisibleIndex; i < length; i++) {
            items.push(this.props.renderItem(i));
        }
        
        size = isNaN(size) ? undefined : (size - scrollOffset);
        
        let style: React.CSSProperties = {
            transform: "translate(" + this.getDimension(0, scrollOffset) + PIXEL_UNITS + "," + this.getDimension(scrollOffset, 0) + PIXEL_UNITS + ")", // gpu accelerated
            minHeight: this.getDimension(size, undefined),
            minWidth: this.getDimension(undefined, size) 
        };
         
        return (
            <div style={style}>
                {items}
            </div>);
    }
    
    public render(): JSX.Element {
        if (this.props.length === 0) {
            return this.renderList(0, 0);
        }
        
        return this.renderList(this.state.firstVisibleItemIndex, 
                               this.state.lastVisibleItemIndex, 
                               this.state.scrollOffset, 
                               this.state.averageItemSize * this.props.length);
    }
    
    /**
     * Returns the appropriate dimension according to the scroll direction
     */
    private getDimension(vertical: number, horizontal: number): number {
        return this.scrollDirection === ScrollDirection.Horizontal ? horizontal : vertical;
    }
    
    private areElementsStacked(scrollViewerElement: HTMLElement): boolean {
        if (scrollViewerElement.childNodes.length < 2) {
            return false;
        }

        let firstElement = scrollViewerElement.children[0];
        let secondElement = scrollViewerElement.children[1];

        let firstElementBounds = firstElement.getBoundingClientRect();
        let secondElementBounds = secondElement.getBoundingClientRect();

        return this.getDimension(secondElementBounds.top, 0) >= this.getDimension(firstElementBounds.bottom, 1); // elements stacked vertically; horizontal stacking not supported yet
    }
    
    /**
     * Calculate first and last visible items for the current scroll state, as well as the scroll offset
     */
    private getCurrentScrollViewerState(listLength: number): IScrollViewerState {
        let scrollViewerElement: HTMLElement = ReactDOM.findDOMNode(this) as HTMLElement;
        
        if (!this.areElementsStacked(scrollViewerElement)) {
            // disable virtualization if list elements are not block (not supported)
            return {
                firstVisibleItemIndex: 0,
                lastVisibleItemIndex: Math.max(1, this.props.length - 1), // we need at least 2 elements to find the stacking direction
                averageItemSize: 1,
                scrollOffset: 0  
            };
        }
        let scrollInfo = this.getScrollInfo();
        
        let viewportAbsolutePosition = 0;
        
        if (scrollInfo.scrollHost !== scrollViewerElement) {
            let scrollViewerParentBounds = scrollViewerElement.parentElement.getBoundingClientRect();
            // list (parent) element absolute position
            viewportAbsolutePosition = scrollInfo.scrollOffset + this.getDimension(scrollViewerParentBounds.top, scrollViewerParentBounds.left);
        }
        
        // calculate average item size
        let firstItemBounds = scrollViewerElement.firstElementChild.getBoundingClientRect();
        let lastItemBounds = scrollViewerElement.lastElementChild.getBoundingClientRect();
        let visibleItemsSize = this.getDimension(lastItemBounds.bottom, lastItemBounds.right) - this.getDimension(firstItemBounds.top, firstItemBounds.left);
        let averageItemSize = visibleItemsSize / scrollViewerElement.children.length;  
        
        if (this.state.averageItemSize !== 0) {
            // to avoid great oscillation, give more weight to aggregated averageItemSize
            averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
        } 
        
        // number of items that fit in the viewport
        let numberOfVisibleItems = Math.ceil(scrollInfo.viewportSize / averageItemSize);
        
        // number of extra items to render before/after viewport bounds for performance and safety (don't show blank space) reasons
        let numberOfSafetyItems = Math.ceil((scrollInfo.viewportSize * 0.25) / averageItemSize);
        
        let firstVisibleItemIndex = Math.max(0, Math.floor(scrollInfo.scrollOffset / averageItemSize) - (Math.ceil(viewportAbsolutePosition / averageItemSize) + numberOfSafetyItems));  
        let lastVisibleItemIndex = firstVisibleItemIndex + numberOfVisibleItems + (numberOfSafetyItems * 2);
        if (lastVisibleItemIndex >= listLength) {
            // last calculated visible index is > last possible index
            lastVisibleItemIndex = Math.min(listLength - 1, lastVisibleItemIndex);
            firstVisibleItemIndex = lastVisibleItemIndex - numberOfVisibleItems
        }
        
        let scrollOffset = averageItemSize * firstVisibleItemIndex; // estimated scroll offset based on average item size
        
        return {
            firstVisibleItemIndex: firstVisibleItemIndex,
            lastVisibleItemIndex: lastVisibleItemIndex,
            averageItemSize: averageItemSize,
            scrollOffset: scrollOffset,
        };
    }
}