var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "react", "react-dom", "virtualized-list"], function (require, exports, React, ReactDOM, virtualized_list_1) {
    var App = (function (_super) {
        __extends(App, _super);
        function App() {
            _super.apply(this, arguments);
        }
        App.prototype.render = function () {
            var list = [];
            for (var i = 1; i <= 100; i++) {
                list.push(i);
            }
            return (React.createElement("div", null, "This is a virtualized list:", React.createElement(virtualized_list_1.VirtualizedList, {"list": list})));
        };
        return App;
    })(React.Component);
    ReactDOM.render(React.createElement(App), document.getElementById("container"));
});
