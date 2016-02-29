var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "react", "react-dom", "component-with-prerender"], function (require, exports, React, ReactDOM, component_with_prerender_1) {
    var VirtualizedList = (function (_super) {
        __extends(VirtualizedList, _super);
        function VirtualizedList() {
            _super.apply(this, arguments);
        }
        VirtualizedList.prototype.renderList = function (items, scrollY, height) {
            return (React.createElement("div", {"ref": VirtualizedList.ListRefName, "className": "list", "onScroll": this.handleScroll.bind(this)}, React.createElement("div", {"ref": VirtualizedList.SliderRefName, "style": { paddingTop: scrollY, height: height - scrollY }}, items)));
        };
        VirtualizedList.prototype.preRender = function () {
            return this.renderList(this.renderItem(this.props.list[0], 0), 0, 1);
        };
        VirtualizedList.prototype.render = function () {
            var _this = this;
            var sourceList = this.props.list;
            var wrapperNode = this.getWrapperNode();
            var listItemNode = ReactDOM.findDOMNode(this.refs[this.getItemRef(0)]);
            var listItemHeight = listItemNode.clientHeight;
            var numberOfVisibleItems = Math.ceil(wrapperNode.clientHeight / listItemHeight) + 1;
            var firstItemVisible = wrapperNode.scrollTop / listItemHeight;
            var scrollY = wrapperNode.scrollTop - (wrapperNode.scrollTop % listItemHeight);
            var filteredList = sourceList.slice(firstItemVisible, firstItemVisible + numberOfVisibleItems);
            return this.renderList(filteredList.map(function (item, index) { return _this.renderItem(item, index); }), scrollY, listItemHeight * sourceList.length);
        };
        VirtualizedList.prototype.handleScroll = function () {
            this.forceUpdate();
        };
        VirtualizedList.prototype.renderItem = function (index, containerIndex) {
            return React.createElement("div", {"ref": this.getItemRef(containerIndex), "className": "list-item"}, "Item ", index);
        };
        VirtualizedList.prototype.getItemRef = function (index) {
            return "i-" + index;
        };
        VirtualizedList.prototype.getWrapperNode = function () {
            return ReactDOM.findDOMNode(this.refs[VirtualizedList.ListRefName]);
        };
        VirtualizedList.ListRefName = "list";
        VirtualizedList.SliderRefName = "slider";
        VirtualizedList = __decorate([
            component_with_prerender_1.ComponentWithPreRender
        ], VirtualizedList);
        return VirtualizedList;
    })(React.Component);
    exports.VirtualizedList = VirtualizedList;
});
