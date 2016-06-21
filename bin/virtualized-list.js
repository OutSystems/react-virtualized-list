var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "react", "virtualized-scroll-viewer", "animated-group"], function (require, exports, React, virtualized_scroll_viewer_1, animated_group_1) {
    "use strict";
    var SCROLL_VIEWER_COMPONENT_REF = "scrollViewer";
    var VirtualizedList = (function (_super) {
        __extends(VirtualizedList, _super);
        function VirtualizedList() {
            _super.apply(this, arguments);
        }
        VirtualizedList.prototype.renderItem = function (index) {
            var className = "list-item " + (index % 2 === 0 ? "even" : "odd");
            return React.createElement("div", {key: "i-" + index, className: className}, "Item ", this.props.list[index]);
        };
        VirtualizedList.prototype.renderItems = function (startIndex, length) {
            var items = [];
            for (var i = startIndex; i < startIndex + length; i++) {
                items.push(this.renderItem(i));
            }
            return items;
        };
        VirtualizedList.prototype.getScrollViewer = function () {
            return this.refs[SCROLL_VIEWER_COMPONENT_REF];
        };
        VirtualizedList.prototype.createScrollViewerContainer = function (children) {
            var _this = this;
            var listAttributes = {
                className: "list",
                component: "div",
                shouldSuspendAnimations: function () { return _this.getScrollViewer().isScrolling; },
                transitionName: "example"
            };
            return React.createElement(animated_group_1.AnimatedGroup, listAttributes, children);
        };
        VirtualizedList.prototype.render = function () {
            var _this = this;
            return (React.createElement(virtualized_scroll_viewer_1.VirtualizedScrollViewer, {renderItems: function (start, length) { return _this.renderItems(start, length); }, renderWrapper: function (children) { return _this.createScrollViewerContainer(children); }, length: this.props.list.length, ref: SCROLL_VIEWER_COMPONENT_REF}));
        };
        return VirtualizedList;
    }(React.Component));
    exports.VirtualizedList = VirtualizedList;
});
