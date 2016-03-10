import * as React from "react";
import * as ReactDOM from "react-dom";
import { VirtualizedScrollViewer } from "virtualized-scroll-viewer";

export interface IVirtualizedListProperties {
    list: number[]
}

export class VirtualizedList extends React.Component<IVirtualizedListProperties, {}> {
        
    private renderItem(index: number) {
        return <div className="list-item">Item {this.props.list[index]}</div>;
    }
    
    public render() {
        return (
            <div className="list">
                <VirtualizedScrollViewer renderItem={this.renderItem.bind(this)} length={this.props.list.length}/>
            </div>);
    }
}