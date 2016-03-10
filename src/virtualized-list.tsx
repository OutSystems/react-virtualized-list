import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Extensions from "extensions";
import { ComponentWithPreRender, IComponentWithPreRender } from "component-with-prerender";

const SLIDER_REF_NAME = "slider"; // container to enable sliding items properly
const SCROLL_EVENT_NAME = "scroll";
const RESIZE_EVENT_NAME = "resize";

export interface IVirtualizedListProperties {
    list: number[]
}

interface IScrollInfo {
    scrollHost: HTMLElement | Window;
    viewportHeight: number;
    viewportWidth: number;
    scrollY: number;
    scrollX: number;
}

@ComponentWithPreRender
export class VirtualizedList extends React.Component<IVirtualizedListProperties, {}> implements IComponentWithPreRender {
    
    private scrollHandler: () => void;
    private scrollHost: HTMLElement | Window;
    
    constructor(props: IVirtualizedListProperties, context: any) {
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
        let list = this.props.list.slice(firstItemVisible, Math.min(firstItemVisible + numberOfVisibleItems, this.props.list.length));
        let items = list.map((value, index) => this.renderItem(value, index));
        return (
            <div className="list">
                <div ref={SLIDER_REF_NAME} style={{paddingTop: scrollY, height: isNaN(height) ? undefined : height - scrollY}}>
                    {items}
                </div>
            </div>);
    }
        
    private renderItem(index: number, containerIndex: number) {
        return <div className="list-item">Item {index}</div>;
    }
    
    public preRender() {
        // on first render, just render 1 list item, to allow getting its height on the render
        return this.renderList(0, 1);
    }
    
    public render() {
        if (this.props.list.length === 0) {
            return this.renderList(0, 0);
        }
        let sourceList = this.props.list;
        let scrollInfo = this.getScrollInfo();
        let listNode: HTMLElement = ReactDOM.findDOMNode(this) as HTMLElement;
        let listItemNode = ReactDOM.findDOMNode(this.refs[SLIDER_REF_NAME]).firstChild as HTMLElement;
        let listItemHeight = Math.max(1, listItemNode.getBoundingClientRect().height);
        let numberOfVisibleItems = Math.ceil(scrollInfo.viewportHeight / listItemHeight) + 1;
        
        let scrollY: number;
        if (scrollInfo.scrollHost === listNode) {
            scrollY = scrollInfo.scrollY;    
        } else {
            scrollY = Math.max(0, -listNode.getBoundingClientRect().top);
        }
        let firstItemVisible = Math.floor(scrollY / listItemHeight);
        scrollY = scrollY - (scrollY  % listItemHeight);

        return this.renderList(firstItemVisible, numberOfVisibleItems, scrollY, listItemHeight * sourceList.length);
    }
}