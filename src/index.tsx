import * as React from "react";
import * as ReactDOM from "react-dom";
import { VirtualizedList } from "virtualized-list";

class App extends React.Component<{}, {}> {
    
    render() {
        let list: number[] = [];
        for (let i = 1; i <= 100; i++) {
            list.push(i);
        }
        return (
            <div>
                This is a virtualized list:
                <VirtualizedList list={list}/>
            </div>);
    }
}

ReactDOM.render(React.createElement(App), document.getElementById("container"));