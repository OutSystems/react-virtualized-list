import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Extensions from "extensions";
import { ComponentWithPreRender, IComponentWithPreRender } from "component-with-prerender";

const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";

export interface IVirtualizedScrollViewerProperties {
    length: number;
    renderItem: (index: number) => JSX.Element;
}

interface IScrollInfo {
    scrollHost: HTMLElement | Window;
    viewportHeight: number;
    viewportWidth: number;
    scrollY: number;
    scrollX: number;
}

@ComponentWithPreRender
export class VirtualizedScrollViewer extends React.Component<IVirtualizedScrollViewerProperties, {}> implements IComponentWithPreRender {
    
    private scrollHandler: () => void;
    private scrollHost: HTMLElement | Window;
    
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
            scrollY: 0,
            scrollX: 0,
            viewportHeight: 0,
            viewportWidth: 0
        };
        
        if (scrollHost instanceof Window) {
            scrollInfo.scrollX = scrollHost.scrollX;
            scrollInfo.scrollY = scrollHost.scrollY;
            scrollInfo.viewportHeight = scrollHost.innerHeight;
            scrollInfo.viewportWidth = scrollHost.innerWidth;
        } else if (scrollHost instanceof HTMLElement) {
            scrollInfo.scrollX = scrollHost.scrollLeft;
            scrollInfo.scrollY = scrollHost.scrollTop;
            scrollInfo.viewportHeight = scrollHost.clientHeight;
            scrollInfo.viewportWidth = scrollHost.clientWidth;
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
        requestAnimationFrame(() => this.forceUpdate());
    }
    
    private renderList(firstItemVisible: number, numberOfVisibleItems: number, scrollY: number = 0, height: number = NaN) {
        let items: JSX.Element[] = [];
        let length = Math.min(this.props.length, firstItemVisible + numberOfVisibleItems);
        for (let i = firstItemVisible; i < length; i++) {
            items.push(this.props.renderItem(i));
        }
        return (
            <div style={{paddingTop: scrollY, height: isNaN(height) ? undefined : height - scrollY}}>
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
        let listItemHeight = Math.max(1, listItemElement.getBoundingClientRect().height);
        let numberOfVisibleItems = Math.ceil(scrollInfo.viewportHeight / listItemHeight) + 1;
        
        let scrollY: number;
        let scrollViewerParentElement = scrollViewerElement.parentElement;
        if (scrollInfo.scrollHost === scrollViewerParentElement) {
            scrollY = scrollInfo.scrollY;
        } else {
            scrollY = Math.max(0, -scrollViewerParentElement.getBoundingClientRect().top);
        }
        let firstItemVisible = Math.floor(scrollY / listItemHeight);
        scrollY = scrollY - (scrollY  % listItemHeight);

        return this.renderList(firstItemVisible, numberOfVisibleItems, scrollY, listItemHeight * this.props.length);
    }
}