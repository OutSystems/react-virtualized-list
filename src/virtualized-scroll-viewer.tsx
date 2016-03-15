import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Extensions from "extensions";
import { ComponentWithPreRender, IComponentWithPreRender } from "component-with-prerender";

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";
const PIXEL_UNITS = "px";

export interface IVirtualizedScrollViewerProperties {
    length: number;
    renderItem: (index: number) => JSX.Element;
    verticalScrollVirtualization?: boolean;
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
    scrollOffset: number,
}

//@ComponentWithPreRender
export class VirtualizedScrollViewer extends React.Component<IVirtualizedScrollViewerProperties, IScrollViewerState> /*implements IComponentWithPreRender*/ {
    
    private scrollHandler: () => void;
    private scrollHost: HTMLElement | Window;
    private updateQueued = false;
    
    constructor(props: IVirtualizedScrollViewerProperties, context: any) {
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
     * The element that owns the scrolling behavior
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
    
    public componentDidMount() {
        this.addScrollHandler();
        this.setState(this.getCurrentScrollViewerState());
        this.updateScrollOffset();
    }
    
    public componentDidUpdate() {
        this.updateScrollOffset();
        //console.log("after: " + ReactDOM.findDOMNode(this).firstElementChild.getBoundingClientRect().top);
    }
    
    public componentWillUnmount() {
        this.removeScrollHandler();
        this.scrollHost = null;
    }
    
    private handleScroll() {
        if(this.updateQueued) {
            return; // an update already queued, skip
        }
        this.updateQueued = true;
        requestAnimationFrame(() => {
            //setTimeout(() => {
                let newState = this.getCurrentScrollViewerState();
                //console.log(JSON.stringify(newState));
                
                // TODO log
                let scrollHost = this.getScrollHost();
                /*console.log("before: " + ReactDOM.findDOMNode(this).firstElementChild.getBoundingClientRect().top + " | scroll:" + (scrollHost as HTMLElement).scrollTop + " | " + 
                    "translate: " + newState.averageItemSize * newState.firstVisibleItemIndex);*/
                // TODO end log
                
                this.setState(newState);
                //this.forceUpdate();
                this.updateQueued = false;    
            //}, 1);
        });
    }
    
    private renderList(firstItemVisibleIndex: number, lastVisibleItemIndex: number, scrollOffset: number = 0, size: number = NaN) {
        let items: JSX.Element[] = [];
        let length = Math.min(this.props.length, lastVisibleItemIndex + 1);
        for (let i = firstItemVisibleIndex; i < length; i++) {
            items.push(this.props.renderItem(i));
        }
        
        size = isNaN(size) ? undefined : size - scrollOffset;
        
        let style: React.CSSProperties = {
            transform: "translate(" + this.getDimension(0, scrollOffset) + PIXEL_UNITS + "," + this.getDimension(scrollOffset, 0) + PIXEL_UNITS + ")", // gpu accelerated
            //paddingTop: this.getDimension(-scrollOffset, 0) + PIXEL_UNITS,
            //paddingLeft: this.getDimension(0, -scrollOffset) + PIXEL_UNITS,
            minHeight: this.getDimension(size, undefined),
            minWidth: this.getDimension(undefined, size) 
        };
         
        return (
            <div style={style}>
                {items}
            </div>);
    }
    
    private updateScrollOffset() {
        /*let scrollViewerElement: HTMLElement = ReactDOM.findDOMNode(this) as HTMLElement;
        let firstListItemElement = scrollViewerElement.firstElementChild;
        if (!firstListItemElement) {
            return;
        }
        
        let firstListItemElementBounds = firstListItemElement.getBoundingClientRect();
        let firstItemOffset = this.getDimension(firstListItemElementBounds.top, firstListItemElementBounds.left);
        let targetScrollOffset = firstListItemElementBounds.height
        
        scrollViewerElement.style.paddingTop = 0;*/
    }
    
    /*public preRender() {
        // on first render, just render 1 list item, to allow getting its height on the render
        return this.renderList(0, 1);
    }*/
    
    //private scrollOffset: number = 0;
    //private firstVisibleItemIndex: number = 0;
    
    public render() {
        // TODO if we delete all records this might not work
        if (this.props.length === 0) {
            return this.renderList(0, 0);
        }
       
        /*let visibleItemsInfo = this.getVisibleItemsInfo(scrollInfo, scrollViewerElement);
        
        let scrollOffset: number;
        let scrollViewerParentElement = scrollViewerElement.parentElement;*/
        /*if (scrollInfo.scrollHost === scrollViewerParentElement) {
            scrollOffset = scrollInfo.scrollOffset;
        } else {
            let scrollViewerParentBounds = scrollViewerParentElement.getBoundingClientRect();
            scrollOffset = Math.max(0, - this.getDimension(scrollViewerParentBounds.top, scrollViewerParentBounds.left));
        }*/
        //scrollOffset = scrollOffset - visibleItemsIndexes.scrollOffset; //this.scrollOffset; // (scrollOffset  % listItemDimension);
        //scrollOffset = visibleItemsInfo.firstVisibleItemIndex * visibleItemsInfo.averageItemSize;
        
        //this.scrollOffset = scrollOffset; // this.getDimension(listItemElementBounds.top, listItemElementBounds.left);
        //this.firstVisibleItemIndex = visibleItemsInfo.firstVisibleItemIndex;
        
        //let scrollOffset = this.state.firstVisibleItemIndex * this.state.averageItemSize;
        
        return this.renderList(this.state.firstVisibleItemIndex, 
                               this.state.lastVisibleItemIndex, 
                               this.state.scrollOffset, 
                               this.state.averageItemSize * this.props.length);
    }
    
    private getDimension(vertical: number, horizontal: number): number {
        return this.props.verticalScrollVirtualization !== false ? vertical : horizontal;
    }
    
    private getCurrentScrollViewerState(): IScrollViewerState {
        let scrollInfo = this.getScrollInfo();
        let scrollViewerElement: HTMLElement = ReactDOM.findDOMNode(this) as HTMLElement;
        
        let viewportSafetyMargin = 0.5 * scrollInfo.viewportSize;
        let sizeAvailableAtBeginning = 0;
        let sizeAvailableAtEnd = 0;
        
         // find the first item index inside viewport with safety margin
        let firstVisibleItemIndex = 0;
        let viewportLowerBound = scrollInfo.viewportLowerBound - viewportSafetyMargin;
        for (let i = 0; i < scrollViewerElement.children.length; i++) {
            let listItemElement = scrollViewerElement.children[i];
            let listItemElementBounds = listItemElement.getBoundingClientRect();
            
            if (this.getDimension(listItemElementBounds.bottom, listItemElementBounds.right) >= viewportLowerBound) {
                // item is inside viewport with safety margin
                
                // calculate space available for more items at the beginning of the list
                //console.log("size available: " + (this.getDimension(listItemElementBounds.top, listItemElementBounds.left) - viewportLowerBound));
                sizeAvailableAtBeginning = Math.max(0, this.getDimension(listItemElementBounds.top, listItemElementBounds.left) - viewportLowerBound);
                firstVisibleItemIndex = i;
                break;
            } else {
                //scrollOffset += this.getDimension(listItemElementBounds.height, listItemElementBounds.width) ; // item is going to be discarded, add its size to the scroll
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
        
        // calculate the number of items that fit the remainging available space (both at begining and end of the list)
        let numberOfItemsThatFitRemainingSpaceAtBeginning = Math.ceil(sizeAvailableAtBeginning / averageItemSize);
        firstVisibleItemIndex = Math.max(0, this.state.firstVisibleItemIndex + firstVisibleItemIndex - numberOfItemsThatFitRemainingSpaceAtBeginning);
        let numberOfItemsThatFitRemainingSpaceAtEnd = Math.ceil(sizeAvailableAtEnd / averageItemSize);
        lastVisibleItemIndex = Math.max(0, this.state.firstVisibleItemIndex + lastVisibleItemIndex + numberOfItemsThatFitRemainingSpaceAtEnd);
        
        let scrollOffset = firstVisibleItemIndex * averageItemSize;
        if (scrollOffset >= scrollInfo.scrollOffset) {
            console.log("fixing scroll");
            scrollOffset = scrollInfo.scrollOffset; // avoid translation above scroll offset otherwise it will show white space 
        }
        
        return {
            firstVisibleItemIndex: firstVisibleItemIndex,
            lastVisibleItemIndex: lastVisibleItemIndex,
            averageItemSize: averageItemSize,
            scrollOffset: scrollOffset,
        };
    }
}