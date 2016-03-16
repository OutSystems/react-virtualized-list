// TODO:
// - auto detect scroll direction
// - if list size chnages and scroll is over last item, empty space will be shown


import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Extensions from "extensions";

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";
const PIXEL_UNITS = "px";

export interface IScrollViewerProperties {
    length: number;
    renderItem: (index: number) => JSX.Element;
    verticalScrollVirtualization?: boolean; // TODO auto detect
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
    private scrollHost: HTMLElement | Window;
    private updateQueued = false;
    
    constructor(props: IScrollViewerProperties, context: any) {
        super(props, context);
        this.scrollHandler = this.handleScroll.bind(this);
        this.state = {
            firstVisibleItemIndex: 0,
            lastVisibleItemIndex: 1,
            averageItemSize: 1,
            scrollOffset: 0
        };
    }
    
    /**
     * The element that owns the scrollbars
     */
    private getScrollHost(): HTMLElement | Window {
        if (!this.scrollHost) {
            this.scrollHost = Extensions.getScrollHost(ReactDOM.findDOMNode(this) as HTMLElement);
        }

        return this.scrollHost;
    }
    
    /**
     * Scroll information: the element that has the scrollbar, its viewport size and the scroll position
     */
    private getScrollInfo(): IScrollInfo {
        let scrollHost = this.getScrollHost();
        let scrollInfo: IScrollInfo;
        
        if (scrollHost instanceof Window) {
            scrollInfo = {
                scrollHost: scrollHost,
                scrollOffset: this.getDimension(scrollHost.scrollY, scrollHost.scrollX),
                viewportSize: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
                viewportLowerBound: this.getDimension(0, 0),
                viewportUpperBound: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth)
            };
        } else if (scrollHost instanceof HTMLElement) {
            let bounds = scrollHost.getBoundingClientRect();
            scrollInfo = {
                scrollHost: scrollHost,
                scrollOffset: this.getDimension(scrollHost.scrollTop, scrollHost.scrollLeft),
                viewportSize: this.getDimension(scrollHost.clientHeight, scrollHost.clientWidth),
                viewportLowerBound: this.getDimension(bounds.top, bounds.left),
                viewportUpperBound: this.getDimension(bounds.bottom, bounds.right)
            };
        }

        return scrollInfo;
    }
    
    /**
     * Adds hooks to capture scroll events of the scrollable parent
     */
    private addScrollHandler(): void {
        let scrollHost = this.getScrollHost();
        scrollHost.addEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
        scrollHost.addEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
    }
    
    private removeScrollHandler(): void {
        let scrollHost = this.getScrollHost();
        scrollHost.removeEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
        scrollHost.removeEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
    }
    
    public componentDidMount(): void {
        this.addScrollHandler();
        this.setState(this.getCurrentScrollViewerState(this.props.length)); // rerender with the right amount of items in the viewport
    }
    
    public componentWillUnmount(): void {
        this.removeScrollHandler();
        this.scrollHost = null;
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
        return this.props.verticalScrollVirtualization !== false ? vertical : horizontal;
    }
    
    /**
     * Calculate first and last visible items for the current scroll state, as well as the scroll offset
     */
    private getCurrentScrollViewerState(listLength: number): IScrollViewerState {
        let scrollInfo = this.getScrollInfo();
        let scrollViewerElement: HTMLElement = ReactDOM.findDOMNode(this) as HTMLElement;
        
        let viewportSafetyMargin = 0.5 * scrollInfo.viewportSize; // safety margin to avoid showing blank space
        let sizeAvailableAtBeginning = 0;
        let sizeAvailableAtEnd = 0;
        let scrollCompensation = 0;
        
         // find the first item index inside viewport with safety margin
        let firstVisibleItemIndex = 0;
        let viewportLowerBound = scrollInfo.viewportLowerBound - viewportSafetyMargin;
        for (let i = 0; i < scrollViewerElement.children.length; i++) {
            let listItemElement = scrollViewerElement.children[i];
            let listItemElementBounds = listItemElement.getBoundingClientRect();
            
            if (this.getDimension(listItemElementBounds.bottom, listItemElementBounds.right) >= viewportLowerBound) {
                // item is inside viewport with safety margin
                
                // calculate space available for more items at the beginning of the list
                sizeAvailableAtBeginning = Math.max(0, this.getDimension(listItemElementBounds.top, listItemElementBounds.left) - viewportLowerBound);
                firstVisibleItemIndex = i;
                break;
            } else {
                // item is going to be discarded -> its height must be compensated
                scrollCompensation += this.getDimension(listItemElementBounds.height, listItemElementBounds.width); 
            }
        }
        
        // find the last item index inside viewport with safety margin
        let lastVisibleItemIndex = 0;
        let viewportUpperBound = scrollInfo.viewportUpperBound + viewportSafetyMargin;
        for (let i = scrollViewerElement.children.length - 1; i >= 0; i--) {
            let listItemElement = scrollViewerElement.children[i];
            let listItemElementBounds = listItemElement.getBoundingClientRect();
             
            if (this.getDimension(listItemElementBounds.top, listItemElementBounds.left) <= viewportUpperBound) {
                // item is outside viewport with safety margin
                
                // calculate space available for more items at the end of the list
                sizeAvailableAtEnd = Math.max(0, viewportUpperBound - this.getDimension(listItemElementBounds.bottom, listItemElementBounds.right));
                lastVisibleItemIndex = i;
                break;
            }
        }
        
        // calculate average item size
        let firstItemBounds = scrollViewerElement.firstElementChild.getBoundingClientRect();
        let lastItemBounds = scrollViewerElement.lastElementChild.getBoundingClientRect();
        let averageItemSize = (this.getDimension(lastItemBounds.bottom, lastItemBounds.right) - this.getDimension(firstItemBounds.top, firstItemBounds.left)) / scrollViewerElement.children.length;  
        
        // calculate the number of items that fit the remaining available space (both at begining and end of the list)
        let numberOfItemsThatFitRemainingSpaceAtBeginning = Math.ceil(sizeAvailableAtBeginning / averageItemSize);
        firstVisibleItemIndex = Math.max(0, this.state.firstVisibleItemIndex + firstVisibleItemIndex - numberOfItemsThatFitRemainingSpaceAtBeginning);
        let numberOfItemsThatFitRemainingSpaceAtEnd = Math.ceil(sizeAvailableAtEnd / averageItemSize);
        lastVisibleItemIndex = Math.max(0, this.state.firstVisibleItemIndex + lastVisibleItemIndex + numberOfItemsThatFitRemainingSpaceAtEnd);
        
        let scrollOffset = 0;
        
        if (lastVisibleItemIndex >= listLength) {
            // number of list items changed, coerce indexes to be within list bounds
            let numberOfVisibleItems = lastVisibleItemIndex - firstVisibleItemIndex;
            lastVisibleItemIndex = listLength;
            firstVisibleItemIndex = Math.max(0, lastVisibleItemIndex - numberOfVisibleItems);
        } else {
            // calculate scroll compensation for the items removed/added
            if (scrollCompensation > 0) {
                scrollOffset = scrollCompensation; // compensate scroll with height of elements removed
            } else if (firstVisibleItemIndex < this.state.firstVisibleItemIndex) {
                scrollOffset = (firstVisibleItemIndex - this.state.firstVisibleItemIndex) * averageItemSize; // compensate scroll with the estimated height of elements inserted
            }
            scrollOffset = Math.max(0, this.state.scrollOffset + scrollOffset);
        }
        
        return {
            firstVisibleItemIndex: firstVisibleItemIndex,
            lastVisibleItemIndex: lastVisibleItemIndex,
            averageItemSize: averageItemSize,
            scrollOffset: scrollOffset,
        };
    }
}