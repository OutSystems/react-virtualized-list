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
define(["require", "exports", "react", "react-dom", "extensions", "component-with-prerender"], function (require, exports, React, ReactDOM, Extensions, component_with_prerender_1) {
    var SLIDER_REF_NAME = "slider";
    var SCROLL_EVENT_NAME = "scroll";
    var RESIZE_EVENT_NAME = "resize";
    var VirtualizedList = (function (_super) {
        __extends(VirtualizedList, _super);
        function VirtualizedList(props, context) {
            _super.call(this, props, context);
            this.scrollHandler = this.handleScroll.bind(this);
        }
        VirtualizedList.prototype.getScrollHost = function () {
            if (!this.scrollHost) {
                this.scrollHost = Extensions.getScrollHost(ReactDOM.findDOMNode(this));
            }
            return this.scrollHost;
        };
        VirtualizedList.prototype.getScrollInfo = function () {
            var scrollHost = this.getScrollHost();
            var scrollInfo = {
                scrollHost: scrollHost,
                scrollY: 0,
                scrollX: 0,
                viewportHeight: 0,
                viewportWidth: 0
            };
            if (scrollHost instanceof Window) {
                scrollInfo.scrollX = scrollHost.scrollX;
                scrollInfo.scrollY = scrollHost.scrollY;
                scrollInfo.viewportHeight = scrollHost.innerHeight;
                scrollInfo.viewportWidth = scrollHost.innerWidth;
            }
            else if (scrollHost instanceof HTMLElement) {
                scrollInfo.scrollX = scrollHost.scrollLeft;
                scrollInfo.scrollY = scrollHost.scrollTop;
                scrollInfo.viewportHeight = scrollHost.clientHeight;
                scrollInfo.viewportWidth = scrollHost.clientWidth;
            }
            return scrollInfo;
        };
        VirtualizedList.prototype.addScrollHandler = function () {
            var scrollHost = this.getScrollHost();
            scrollHost.addEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
            scrollHost.addEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
        };
        VirtualizedList.prototype.removeScrollHandler = function () {
            var scrollHost = this.getScrollHost();
            scrollHost.removeEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
            scrollHost.removeEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
        };
        VirtualizedList.prototype.componentDidMount = function () {
            this.addScrollHandler();
        };
        VirtualizedList.prototype.componentWillUnmount = function () {
            this.removeScrollHandler();
            this.scrollHost = null;
        };
        VirtualizedList.prototype.handleScroll = function () {
            var _this = this;
            requestAnimationFrame(function () { return _this.forceUpdate(); });
        };
        VirtualizedList.prototype.renderList = function (firstItemVisible, numberOfVisibleItems, scrollY, height) {
            var _this = this;
            if (scrollY === void 0) { scrollY = 0; }
            if (height === void 0) { height = NaN; }
            var list = this.props.list.slice(firstItemVisible, Math.min(firstItemVisible + numberOfVisibleItems, this.props.list.length));
            var items = list.map(function (value, index) { return _this.renderItem(value, index); });
            return (React.createElement("div", {"className": "list"}, React.createElement("div", {"ref": SLIDER_REF_NAME, "style": { paddingTop: scrollY, height: isNaN(height) ? undefined : height - scrollY }}, items)));
        };
        VirtualizedList.prototype.renderItem = function (index, containerIndex) {
            return React.createElement("div", {"className": "list-item"}, "Item ", index);
        };
        VirtualizedList.prototype.preRender = function () {
            return this.renderList(0, 1);
        };
        VirtualizedList.prototype.render = function () {
            if (this.props.list.length === 0) {
                return this.renderList(0, 0);
            }
            var sourceList = this.props.list;
            var scrollInfo = this.getScrollInfo();
            var listNode = ReactDOM.findDOMNode(this);
            var listItemNode = ReactDOM.findDOMNode(this.refs[SLIDER_REF_NAME]).firstChild;
            var listItemHeight = Math.max(1, listItemNode.getBoundingClientRect().height);
            var numberOfVisibleItems = Math.ceil(scrollInfo.viewportHeight / listItemHeight) + 1;
            var scrollY;
            if (scrollInfo.scrollHost === listNode) {
                scrollY = scrollInfo.scrollY;
            }
            else {
                scrollY = Math.max(0, -listNode.getBoundingClientRect().top);
            }
            var firstItemVisible = Math.floor(scrollY / listItemHeight);
            scrollY = scrollY - (scrollY % listItemHeight);
            return this.renderList(firstItemVisible, numberOfVisibleItems, scrollY, listItemHeight * sourceList.length);
        };
        VirtualizedList = __decorate([
            component_with_prerender_1.ComponentWithPreRender
        ], VirtualizedList);
        return VirtualizedList;
    })(React.Component);
    exports.VirtualizedList = VirtualizedList;
});
//# sourceMappingURL=virtualized-list.js.map