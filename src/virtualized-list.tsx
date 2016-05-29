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
    
    /*private createScrollViewerContainer(): JSX.Element {
        return React.createElement((React as any).CSSTransitionGroup);
    }*/
    
    public render() {
        let listAttributes: React.HTMLAttributes = {
            className: "list"
         };
        return (
            <VirtualizedScrollViewer renderItems={this.renderItems.bind(this)} 
                                     length={this.props.list.length}
                                     attributes={listAttributes}
                                     //component={(React as any).addons.CSSTransitionGroup}/>
                                     component={"div"} />
        );
    }
}