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
    firstVisibleItemIndex: number,
    lastVisibleItemIndex: number,
    averageItemSize: number,
    scrollOffset: number,
    wrapperElementIsScrollHost: boolean // TODO needed?
}

export class VirtualizedScrollViewer extends React.Component<IScrollViewerProperties, IScrollViewerState> {
    
    private scrollHandler: () => void;
    private scrollHostInfo: IScrollHostInfo;
    private scrollDirection: ScrollDirection = ScrollDirection.Vertical;
    private pendingPropertiesUpdate: boolean = false;
    private pendingScrollAsyncUpdateHandle: number;
    //private itemsContainer: HTMLElement;
    
    constructor(props: IScrollViewerProperties, context: any) {
        super(props, context);
        this.scrollHandler = this.handleScroll.bind(this);
        this.state = {
            firstVisibleItemIndex: 0,
            lastVisibleItemIndex: 1,
            averageItemSize: 0,
            scrollOffset: 0,
            wrapperElementIsScrollHost: true,
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
    }
    
    public componentWillReceiveProps(nextProps: IScrollViewerProperties): void {
        this.setState(this.getCurrentScrollViewerState(nextProps.length)); // rerender with the right amount of items in the viewport
        this.pendingPropertiesUpdate = true;
    }
    
    public componentDidUpdate(): void {
        if (this.pendingPropertiesUpdate) {
            // set state won't have effect if state is the same
            // updated with list changes, let's compute the visible items
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
                
                console.log(newState.firstVisibleItemIndex + " " + newState.scrollOffset + " " + newState.averageItemSize);
            
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
    
    private renderList(firstItemVisibleIndex: number, lastVisibleItemIndex: number, scrollOffset: number = 0, size: number = NaN): JSX.Element {
        let length = Math.min(this.props.length, lastVisibleItemIndex - firstItemVisibleIndex + 1);
        
        // render only visible items
        let items = this.props.renderItems(firstItemVisibleIndex, length);
        
        size = isNaN(size) ? undefined : size - ((this.state.averageItemSize * length) + scrollOffset);
        
        let attributes: React.Props<any>;
        let style: React.CSSProperties;
        
        /*if (false && this.state.wrapperElementIsScrollHost) {
            // needs wrapper div around items to set scroll properties
            attributes = this.props.attributes;
            style = {};
            //React.createElement(this.props.component as any, attributes, items); // TODO typings
            items = React.DOM.div( { style: style, ref: (c) => this.itemsContainer = c }, items);
        } else {
            // merge attributes with style
            attributes = this.props.attributes || {};
            attributes.ref = (c) => this.itemsContainer = ReactDOM.findDOMNode(c) as HTMLElement;
            style = (attributes as any).style || {};
            (attributes as any).style = style;
        }*/
        
        // can't use transform, otherwise we might overlap other elements on the page
        //style.paddingLeft = this.getDimension(0, scrollOffset) + PIXEL_UNITS;
        //style.paddingTop = Math.round(this.getDimension(scrollOffset, 0)) % 300 + PIXEL_UNITS;
        //style.paddingBottom = this.getDimension(size, undefined);
        //style.minHeight = this.getDimension(size, undefined);
        //style.minWidth = this.getDimension(undefined, size);
        //style.maxHeight = "300px";
        //(style as any).boxSizing = "border-box";
        //let startSpacer = <script style={display:}></script>;
        //let endSpacer = 
        let listChildren: any = [];
        listChildren.push(this.renderSpacer("first-spacer", scrollOffset));
        listChildren.push(items);
        listChildren.push(this.renderSpacer("last-spacer", size));
        
        return this.props.renderWrapper(listChildren);
        //return React.createElement(this.props.component as any, attributes, items); // TODO typings
    }
    
    /**
     * Render a spacer element used to give blank space at the beginning or end of the list
     */
    private renderSpacer(key: string, dimension: number): JSX.Element {
        let style: React.CSSProperties = {
            display: "inline-block"
        };
        if (this.scrollDirection === ScrollDirection.Horizontal) {
            style.width = Math.round(dimension) + PIXEL_UNITS;
            style.height = "100%";
        } else {
            style.width = "100%";
            style.height = Math.round(dimension) + PIXEL_UNITS;
        }
        return <script key={key} style={style}></script>;
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
    
    private calculateAverageItemsSize(items: Element[]): number {
        let firstItemBounds = items[0].getBoundingClientRect();
        let lastItemBounds = items[items.length - 1].getBoundingClientRect();
        let visibleItemsSize = this.getDimension(lastItemBounds.bottom, lastItemBounds.right) - this.getDimension(firstItemBounds.top, firstItemBounds.left);
        return visibleItemsSize / (items.length * 1.0);  
    }
    
    /**
     * Calculate first and last visible items for the current scroll state, as well as the scroll offset
     */
    private getCurrentScrollViewerState(listLength: number): IScrollViewerState {
        let wrapperElement = ReactDOM.findDOMNode(this) as HTMLElement;
        let itemsContainer: HTMLElement = /*this.itemsContainer ||*/ wrapperElement;
        let items = this.getListItems(itemsContainer);
        let scrollInfo = this.getScrollInfo();
        let wrapperElementIsScrollHost: boolean = scrollInfo.scrollHost === wrapperElement;
        
        if (!this.areElementsStacked(items)) {
            // disable virtualization if list elements do not stack (not supported)
            return {
                firstVisibleItemIndex: 0,
                lastVisibleItemIndex: Math.max(1, this.props.length - 1), // we need at least 2 elements to find the stacking direction
                averageItemSize: 0,
                scrollOffset: 0,
                wrapperElementIsScrollHost: wrapperElementIsScrollHost
            };
        }
        
        let viewportAbsolutePosition = 0;
        
        if (!wrapperElementIsScrollHost) {
            // TODO is this still needed?
            //let scrollViewerParentBounds = itemsContainer.parentElement.getBoundingClientRect();
            // list (parent) element absolute position
            //viewportAbsolutePosition = scrollInfo.scrollOffset + this.getDimension(scrollViewerParentBounds.top, scrollViewerParentBounds.left);
        }
        
        let averageItemSize = this.calculateAverageItemsSize(items);
        
        if (this.state.averageItemSize !== 0) {
            // to avoid great oscillation, give more weight to aggregated averageItemSize
            averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
        }
        
        // number of items that fit in the viewport
        let numberOfVisibleItems = Math.ceil(scrollInfo.viewportSize / averageItemSize);
        
        // number of extra items to render before/after viewport bounds for performance and safety (don't show blank space) reasons
        let numberOfSafetyItems = Math.ceil((scrollInfo.viewportSize * 0.5) / averageItemSize);
        
        //let firstVisibleItemIndex = Math.max(0, Math.floor(scrollInfo.scrollOffset / averageItemSize) - numberOfSafetyItems - Math.ceil(viewportAbsolutePosition / averageItemSize));  
        let firstVisibleItemIndex = Math.max(0, Math.floor(scrollInfo.scrollOffset / averageItemSize) - numberOfSafetyItems);
        let lastVisibleItemIndex = firstVisibleItemIndex + numberOfVisibleItems + (numberOfSafetyItems * 2);
        if (lastVisibleItemIndex >= listLength) {
            // last calculated visible index is > last possible index
            lastVisibleItemIndex = Math.min(listLength - 1, lastVisibleItemIndex);
        }
        
        let scrollOffset = 0;
        scrollOffset = averageItemSize * firstVisibleItemIndex;
        /*if (firstVisibleItemIndex > this.state.firstVisibleItemIndex) {
            // try to sum the size of the items to disappear on next render to the current scroll offset for smooth scroll
            let firstItemToDisappearOnNextRender = items[0].getBoundingClientRect();
            let numberOfItemsToDisappearOnNextRender = (firstVisibleItemIndex - 1) - this.state.firstVisibleItemIndex;
            if (numberOfItemsToDisappearOnNextRender < items.length) {
                let lastItemToDisappearOnNextRender = items[numberOfItemsToDisappearOnNextRender].getBoundingClientRect();
            
                let sizeOfItemsToDisappearOnNextRender = this.getDimension(lastItemToDisappearOnNextRender.bottom, lastItemToDisappearOnNextRender.right) - this.getDimension(firstItemToDisappearOnNextRender.top, firstItemToDisappearOnNextRender.left);
                scrollOffset = this.state.scrollOffset + sizeOfItemsToDisappearOnNextRender;
            } else {
                // if # items to disappear is > # visible items in the viewport, give an approximate scroll offset
                scrollOffset = averageItemSize * firstVisibleItemIndex;
            }
        } else if (firstVisibleItemIndex < this.state.firstVisibleItemIndex) {
            // new items will appear, we don't know their sizes yet, give an approximate scroll offset
            scrollOffset = averageItemSize * firstVisibleItemIndex;
        } else {
            scrollOffset = this.state.scrollOffset; // nothing changed
        }*/
        
        return {
            firstVisibleItemIndex: firstVisibleItemIndex,
            lastVisibleItemIndex: lastVisibleItemIndex,
            averageItemSize: averageItemSize,
            scrollOffset: scrollOffset,
            wrapperElementIsScrollHost: wrapperElementIsScrollHost
        };
    }
}