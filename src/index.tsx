import * as React from "react";
import * as ReactDOM from "react-dom";
import { Images } from "./images";
import { VirtualizedList } from "./virtualized-list";

class App extends React.Component<{}, { items: number, pageBufferSize: number }> {

    constructor(props: any) {
        super(props);
        this.state = {
            items: 100,
            pageBufferSize: 4,
        };
    }

    private refresh(): void {
        this.setState({
            items: parseInt((this.refs.itemsCount as HTMLInputElement).value, 10),
            pageBufferSize: parseInt((this.refs.pageBufferSize as HTMLInputElement).value, 10),
        });
    }

    private setScroll(): void {
        let offset = parseInt((this.refs.scrollOffset as HTMLInputElement).value, 10);
        (this.refs.list as VirtualizedList).scrollToOffset(offset);
    }

    private scrollToIndex(): void {
        let offset = parseInt((this.refs.scrollToIndex as HTMLInputElement).value, 10);
        (this.refs.list as VirtualizedList).scrollToIndex(offset);
    }

    public render(): JSX.Element {
        let imagesCount = Images.length;
        let list: Array<{ index: number, image: string }> = [];
        for (let i = 0; i < this.state.items; i++) {
            list.push({ image: Images[i % imagesCount], index: i });
        }
        return (
            <div>
                <h1>Virtualized list example</h1>
                <br />
                <input ref="itemsCount" placeholder="Number of items" defaultValue={this.state.items + ""} />
                <button onClick={this.refresh.bind(this)}>Set Items</button>
                <br />
                <br />
                <input ref="pageBufferSize" placeholder="Number extra invisible of items rendered" defaultValue={this.state.pageBufferSize + ""} />
                <button onClick={this.refresh.bind(this)}>Set Buffer Size</button>
                <br />
                <br />
                <input ref="scrollOffset" placeholder="Scroll offset" />
                <button onClick={this.setScroll.bind(this)}>Set Scroll</button>
                <br />
                <br />
                <input ref="scrollToIndex" placeholder="Scroll to index" />
                <button onClick={this.scrollToIndex.bind(this)}>Scroll to index</button>
                <br />
                <br />
                <VirtualizedList ref="list" list={list} pageBufferSize={this.state.pageBufferSize} />
            </div>);
    }
}

ReactDOM.render(React.createElement(App), document.getElementById("container"));
