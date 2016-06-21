import * as React from "react";
import { VirtualizedScrollViewer } from "virtualized-scroll-viewer";
import { AnimatedGroup, IAnimatedAttributes } from "animated-group";

const SCROLL_VIEWER_COMPONENT_REF = "scrollViewer";

export interface IVirtualizedListProperties {
    list: number[]
}

export class VirtualizedList extends React.Component<IVirtualizedListProperties, {}> {
    
    private scrollViewer: VirtualizedScrollViewer;
    
    private renderItem(index: number) {
        let className = "list-item " + (index % 2 === 0 ? "even" : "odd");
        return <div key={"i-" + index} className={className}>Item {this.props.list[index]}</div>;
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
    
    private createScrollViewerContainer(children: React.ReactFragment): JSX.Element {
        let listAttributes: IAnimatedAttributes = {
            className: "list",
            component: "div",
            shouldSuspendAnimations: () => this.getScrollViewer().isScrolling,
            transitionName: "example"
         };
        return React.createElement(AnimatedGroup, listAttributes, children);
    }
    
    public render() {
        return (
            <VirtualizedScrollViewer renderItems={(start, length) => this.renderItems(start, length)} 
                                     renderWrapper={(children) => this.createScrollViewerContainer(children)}
                                     length={this.props.list.length}
                                     ref={SCROLL_VIEWER_COMPONENT_REF} />
        );
    }
}