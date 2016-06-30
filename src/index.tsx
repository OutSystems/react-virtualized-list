import * as React from "react";
import * as ReactDOM from "react-dom";
import { VirtualizedList } from "virtualized-list";

class App extends React.Component<{}, { items: number }> {
    
    constructor() {
        super();
        this.state = {
            items: 100
        };
    }
    
    refresh() {
        this.setState({ 
            items: parseInt((this.refs["itemsCount"] as HTMLInputElement).value)
        });
    }
    
    setScroll() {
        let offset = parseInt( (this.refs["scrollOffset"] as HTMLInputElement).value);
        (this.refs["list"] as VirtualizedList).setScrollOffset(offset);
    }
    
    render() {
        let list: number[] = [];
        for (let i = 0; i < this.state.items; i++) {
            list.push(i);
        }
        return (
            <div>
                <h1>Virtualized list example</h1>
                <br/>
                <input ref="itemsCount" placeholder="Number of items" defaultValue={this.state.items + ""} />
                <button onClick={this.refresh.bind(this)}>Set Items</button>
                <br/>
                <br/>
                <input ref="scrollOffset" placeholder="Scroll offset" defaultValue={this.state.items + ""} />
                <button onClick={this.setScroll.bind(this)}>Set Scroll</button>
                <br/>
                <br/>
                <VirtualizedList ref="list" list={list}/>
            </div>);
    }
}

ReactDOM.render(React.createElement(App), document.getElementById("container"));