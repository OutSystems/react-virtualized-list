var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "react", "virtualized-scroll-viewer"], function (require, exports, React, virtualized_scroll_viewer_1) {
    var VirtualizedList = (function (_super) {
        __extends(VirtualizedList, _super);
        function VirtualizedList() {
            _super.apply(this, arguments);
        }
        VirtualizedList.prototype.renderItem = function (index) {
            return React.createElement("div", {"className": "list-item"}, "Item ", this.props.list[index]);
        };
        VirtualizedList.prototype.render = function () {
            return (React.createElement("div", {"className": "list"}, React.createElement(virtualized_scroll_viewer_1.VirtualizedScrollViewer, {"renderItem": this.renderItem.bind(this), "length": this.props.list.length})));
        };
        return VirtualizedList;
    })(React.Component);
    exports.VirtualizedList = VirtualizedList;
});
//# sourceMappingURL=virtualized-list.js.map