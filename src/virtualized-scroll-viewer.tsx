import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Extensions from "extensions";
import { ComponentWithPreRender, IComponentWithPreRender } from "component-with-prerender";

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";

export interface IVirtualizedScrollViewerProperties {
    length: number;
    renderItem: (index: number) => JSX.Element;
    verticalScrollVirtualization?: boolean;
}

interface IScrollInfo {
    scrollHost: HTMLElement | Window;
    viewportSize: number;
    scrollOffset: number;
}

@ComponentWithPreRender
export class VirtualizedScrollViewer extends React.Component<IVirtualizedScrollViewerProperties, {}> implements IComponentWithPreRender {
    
    private scrollHandler: () => void;
    private scrollHost: HTMLElement | Window;
    private updateQueued = false;
    
    constructor(props: IVirtualizedScrollViewerProperties, context: any) {
        super(props, context);
        this.scrollHandler = this.handleScroll.bind(this);
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
        let scrollInfo: IScrollInfo = {
            scrollHost: scrollHost,
            scrollOffset: 0,
            viewportSize: 0,
        };
        
        if (scrollHost instanceof Window) {
            scrollInfo.scrollOffset = this.getDimension(scrollHost.scrollY, scrollHost.scrollX);
            scrollInfo.viewportSize = this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth);
        } else if (scrollHost instanceof HTMLElement) {
            scrollInfo.scrollOffset = this.getDimension(scrollHost.scrollTop, scrollHost.scrollLeft);
            scrollInfo.viewportSize = this.getDimension(scrollHost.clientHeight, scrollHost.clientWidth);
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
            this.forceUpdate()
            this.updateQueued = false;
        });
    }
    
    private renderList(firstItemVisible: number, numberOfVisibleItems: number, scrollOffset: number = 0, size: number = NaN) {
        let items: JSX.Element[] = [];
        let length = Math.min(this.props.length, firstItemVisible + numberOfVisibleItems);
        for (let i = firstItemVisible; i < length; i++) {
            items.push(this.props.renderItem(i));
        }
        
        size = isNaN(size) ? undefined : size - scrollOffset;
        
        let style: React.CSSProperties = {
            paddingTop: this.getDimension(scrollOffset, undefined),
            paddingLeft: this.getDimension(undefined, scrollOffset),
            minHeight: this.getDimension(size, undefined),
            minWidth: this.getDimension(undefined, size) 
        };
         
        return (
            <div style={style}>
                {items}
            </div>);
    }
    
    public preRender() {
        // on first render, just render 1 list item, to allow getting its height on the render
        return this.renderList(0, 1);
    }
    
    public render() {
        if (this.props.length === 0) {
            return this.renderList(0, 0);
        }
        let scrollInfo = this.getScrollInfo();
        let scrollViewerElement: HTMLElement = ReactDOM.findDOMNode(this) as HTMLElement;
        let listItemElement = scrollViewerElement.firstElementChild; // get first list item
        let listItemElementBounds = listItemElement.getBoundingClientRect(); 
        let listItemDimension = Math.max(1, this.getDimension(listItemElementBounds.height, listItemElementBounds.width));
        let numberOfVisibleItems = Math.ceil(scrollInfo.viewportSize / listItemDimension) + 1;
        
        let scrollOffset: number;
        let scrollViewerParentElement = scrollViewerElement.parentElement;
        if (scrollInfo.scrollHost === scrollViewerParentElement) {
            scrollOffset = scrollInfo.scrollOffset;
        } else {
            let scrollViewerParentBounds = scrollViewerParentElement.getBoundingClientRect();
            scrollOffset = Math.max(0, - this.getDimension(scrollViewerParentBounds.top, scrollViewerParentBounds.left));
        }
        let firstItemVisible = Math.floor(scrollOffset / listItemDimension);
        scrollOffset = scrollOffset - (scrollOffset  % listItemDimension);

        return this.renderList(firstItemVisible, numberOfVisibleItems, scrollOffset, listItemDimension * this.props.length);
    }
    
    private getDimension(vertical: number, horizontal: number) {
        return this.props.verticalScrollVirtualization !== false ? vertical : horizontal;
    }
}