import * as React from "react";
import * as ReactDOM from "react-dom";
import { ComponentWithPreRender, IComponentWithPreRender } from "component-with-prerender";

@ComponentWithPreRender
export class VirtualizedList extends React.Component<{list: number[]}, {}> implements IComponentWithPreRender {
    
    private static ListRefName = "list";
    private static SliderRefName = "slider"; // container to enable sliding items properly
    
    private renderList(items: React.ReactNode, scrollY: number, height: number) {
        return (
            <div ref={VirtualizedList.ListRefName} className="list" onScroll={this.handleScroll.bind(this)}>
                <div ref={VirtualizedList.SliderRefName} style={{paddingTop: scrollY, height: height - scrollY}}>
                    {items}
                </div>
            </div>);
    }
    
    preRender() {
        // on first render, just render 1 list item, to allow getting its height on the render
        return this.renderList(this.renderItem(this.props.list[0], 0), 0, 1);
    }
    
    render() {
        let sourceList = this.props.list;
        let wrapperNode = this.getWrapperNode();
        let listItemNode = ReactDOM.findDOMNode(this.refs[this.getItemRef(0)]);
        let listItemHeight = listItemNode.clientHeight;
        let numberOfVisibleItems = Math.ceil(wrapperNode.clientHeight / listItemHeight) + 1;
        let firstItemVisible = wrapperNode.scrollTop / listItemHeight;
        let scrollY = wrapperNode.scrollTop - (wrapperNode.scrollTop % listItemHeight);
        let filteredList = sourceList.slice(firstItemVisible, firstItemVisible + numberOfVisibleItems); // limit the list to the number of visible items
        return this.renderList(
            filteredList.map((item: number, index: number) => this.renderItem(item, index)), 
            scrollY,
            listItemHeight * sourceList.length);
    }
    
    private handleScroll() {
        this.forceUpdate();
    }
    
    private renderItem(index: number, containerIndex: number) {
        return <div ref={this.getItemRef(containerIndex)} className="list-item">Item {index}</div>;
    }
    
    private getItemRef(index: number) {
        return "i-" + index;
    }
    
    private getWrapperNode() {
        return ReactDOM.findDOMNode(this.refs[VirtualizedList.ListRefName]);
    }
}