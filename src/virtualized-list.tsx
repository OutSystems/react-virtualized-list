import * as React from "react";
import { VirtualizedScrollViewer } from "virtualized-scroll-viewer";

export interface IVirtualizedListProperties {
    list: number[]
}

export class VirtualizedList extends React.Component<IVirtualizedListProperties, {}> {
        
    private renderItem(index: number) {
        let className = "list-item " + (index % 2 === 0 ? "even" : "odd");
        return <div className={className}>Item {this.props.list[index]}</div>;
    }
    
    public render() {
        return (
            <div className="list">
                <VirtualizedScrollViewer renderItem={this.renderItem.bind(this)} length={this.props.list.length}/>
            </div>);
    }
}