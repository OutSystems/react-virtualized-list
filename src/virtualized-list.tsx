import * as React from "react";
import { VirtualizedScrollViewer } from "virtualized-scroll-viewer";
import { IAnimatedAttributes } from "animated-group";
import { AnimatedSizeGroup } from "animated-size-group";

const SCROLL_VIEWER_COMPONENT_REF = "scrollViewer";

export interface IVirtualizedListProperties {
    list: { image: string, index: number }[];
    pageBufferSize: number;
}

export class VirtualizedList extends React.Component<IVirtualizedListProperties, {}> {
    
    private renderItem(index: number) {
        let even = index % 2 === 0;
        let className = "list-item " + (even ? "even" : "odd");
        let item = this.props.list[index];
        return (
            <div key={"i-" + index} className={className}>
                Item {item.index}
                <img src={item.image}></img>
            </div>);
    }
    
    public componentDidMount() {
        this.getScrollViewer().scrollToOffset(0, 1000);
    }
    
    private renderItems(startIndex: number, length: number) {
        let items: JSX.Element[] = [];
        for (let i = startIndex; i < startIndex + length; i++) {
            items.push(this.renderItem(i));
        }
        return items;
    }
    
    private getScrollViewer(): VirtualizedScrollViewer {
        return this.refs[SCROLL_VIEWER_COMPONENT_REF] as VirtualizedScrollViewer;
    }
    
    private get shouldSuspendAnimations(): boolean {
        let scrollViewer = this.getScrollViewer();
        return !scrollViewer || !scrollViewer.isInitialized || scrollViewer.isScrolling;
    }
    
    private createScrollViewerContainer(children: React.ReactFragment): JSX.Element {
        let listAttributes: IAnimatedAttributes = {
            className: "list",
            component: "div",
            shouldSuspendAnimations: () => this.shouldSuspendAnimations,
            transitionName: "example",
        };
        return React.createElement(AnimatedSizeGroup, listAttributes, children);
    }
    
    public render() {
        return (
            <VirtualizedScrollViewer renderItems={(start, length) => this.renderItems(start, length)} 
                                     renderWrapper={(children) => this.createScrollViewerContainer(children)}
                                     length={this.props.list.length}
                                     pageBufferSize={this.props.pageBufferSize}
                                     ref={SCROLL_VIEWER_COMPONENT_REF} />
        );
    }
    
    public scrollToOffset(offset: number): void {
        this.getScrollViewer().scrollToOffset(undefined, offset);
    }

    public scrollToIndex(index: number): void {
        this.getScrollViewer().scrollToIndex(index);
    }
}