import * as React from "react";
import { VirtualizedScrollViewer } from "virtualized-scroll-viewer";

export interface IVirtualizedListProperties {
    list: number[]
}

export class VirtualizedList extends React.Component<IVirtualizedListProperties, {}> {
        
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
    
    private createScrollViewerContainer(children: React.ReactFragment): JSX.Element {
        let listAttributes = {
            className: "list",
            component: "div",
            transitionName: "example",
            transitionAppear: true,
            transitionAppearTimeout: 1000,
            transitionEnterTimeout: 1000,
            transitionLeaveTimeout: 1000,
            paddingBottom: 10000,
         };
        //return React.createElement((React as any).addons.CSSTransitionGroup, listAttributes, children);
        return React.DOM.div(listAttributes, children);
    }
    
    public render() {
        
        return (
            <VirtualizedScrollViewer renderItems={(start, end) => this.renderItems(start, end)} 
                                     length={this.props.list.length}
                                     renderWrapper={(children) => this.createScrollViewerContainer(children)} />
                                     //attributes={listAttributes}
                                     //component={(React as any).addons.CSSTransitionGroup}/>
                                     //component={"div"} />
        );
    }
}