import * as React from "react";
import * as ReactDOM from "react-dom";
import { VirtualizedList } from "virtualized-list";

class App extends React.Component<{}, { items: number}> {
    
    constructor() {
        super();
        this.state = {
            items: 0
        };
    }
    
    refresh() {
        this.setState({ 
            items: parseInt((this.refs["itemsCount"] as HTMLInputElement).value)
        });
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
                <button onClick={this.refresh.bind(this)}>Refresh</button>
                <br/>
                <VirtualizedList list={list}/>
            </div>);
    }
}

ReactDOM.render(React.createElement(App), document.getElementById("container"));