import * as React from "react";
import { VirtualizedScrollViewer } from "virtualized-scroll-viewer";
import { AnimatedGroup, IAnimatedAttributes } from "animated-group";

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
        return this.refs["scrollViewer"] as VirtualizedScrollViewer;
    }
    
    private createScrollViewerContainer(children: React.ReactFragment): JSX.Element {
        let listAttributes: IAnimatedAttributes = {
            className: "list",
            component: "div",
            shouldSuspendAnimations: () => this.getScrollViewer().isScrolling,
            animationClassName: "example"
            /*transitionName: "example",
            transitionAppear: true,
            transitionAppearTimeout: 10000,
            transitionEnterTimeout: 10000,
            transitionLeaveTimeout: 10000*/
         };
         //return React.createElement(AnimatedGroup, listAttributes, children);
        //return React.createElement((React as any).addons.CSSTransitionGroup, listAttributes, children);
        return React.createElement(AnimatedGroup, listAttributes, children);
        //return React.DOM.div(listAttributes, children);
    }
    
    public render() {
        
        return (
            <VirtualizedScrollViewer renderItems={(start, length) => this.renderItems(start, length)} 
                                     length={this.props.list.length}
                                     renderWrapper={(children) => this.createScrollViewerContainer(children)}
                                     ref="scrollViewer" />
                                     //ref={(element) => this.scrollViewer = element} />
        );
    }
}