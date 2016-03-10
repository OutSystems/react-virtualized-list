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
    var SCROLL_EVENT_NAME = "scroll";
    var RESIZE_EVENT_NAME = "resize";
    var VirtualizedScrollViewer = (function (_super) {
        __extends(VirtualizedScrollViewer, _super);
        function VirtualizedScrollViewer(props, context) {
            _super.call(this, props, context);
            this.scrollHandler = this.handleScroll.bind(this);
        }
        VirtualizedScrollViewer.prototype.getScrollHost = function () {
            if (!this.scrollHost) {
                this.scrollHost = Extensions.getScrollHost(ReactDOM.findDOMNode(this));
            }
            return this.scrollHost;
        };
        VirtualizedScrollViewer.prototype.getScrollInfo = function () {
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
        VirtualizedScrollViewer.prototype.addScrollHandler = function () {
            var scrollHost = this.getScrollHost();
            scrollHost.addEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
            scrollHost.addEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
        };
        VirtualizedScrollViewer.prototype.removeScrollHandler = function () {
            var scrollHost = this.getScrollHost();
            scrollHost.removeEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
            scrollHost.removeEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
        };
        VirtualizedScrollViewer.prototype.componentDidMount = function () {
            this.addScrollHandler();
        };
        VirtualizedScrollViewer.prototype.componentWillUnmount = function () {
            this.removeScrollHandler();
            this.scrollHost = null;
        };
        VirtualizedScrollViewer.prototype.handleScroll = function () {
            var _this = this;
            requestAnimationFrame(function () { return _this.forceUpdate(); });
        };
        VirtualizedScrollViewer.prototype.renderList = function (firstItemVisible, numberOfVisibleItems, scrollY, height) {
            if (scrollY === void 0) { scrollY = 0; }
            if (height === void 0) { height = NaN; }
            var items = [];
            var length = Math.min(this.props.length, firstItemVisible + numberOfVisibleItems);
            for (var i = firstItemVisible; i < length; i++) {
                items.push(this.props.renderItem(i));
            }
            return (React.createElement("div", {"style": { paddingTop: scrollY, height: isNaN(height) ? undefined : height - scrollY }}, items));
        };
        VirtualizedScrollViewer.prototype.preRender = function () {
            return this.renderList(0, 1);
        };
        VirtualizedScrollViewer.prototype.render = function () {
            if (this.props.length === 0) {
                return this.renderList(0, 0);
            }
            var scrollInfo = this.getScrollInfo();
            var scrollViewerElement = ReactDOM.findDOMNode(this);
            var listItemElement = scrollViewerElement.firstElementChild;
            var listItemHeight = Math.max(1, listItemElement.getBoundingClientRect().height);
            var numberOfVisibleItems = Math.ceil(scrollInfo.viewportHeight / listItemHeight) + 1;
            var scrollY;
            var scrollViewerParentElement = scrollViewerElement.parentElement;
            if (scrollInfo.scrollHost === scrollViewerParentElement) {
                scrollY = scrollInfo.scrollY;
            }
            else {
                scrollY = Math.max(0, -scrollViewerParentElement.getBoundingClientRect().top);
            }
            var firstItemVisible = Math.floor(scrollY / listItemHeight);
            scrollY = scrollY - (scrollY % listItemHeight);
            return this.renderList(firstItemVisible, numberOfVisibleItems, scrollY, listItemHeight * this.props.length);
        };
        VirtualizedScrollViewer = __decorate([
            component_with_prerender_1.ComponentWithPreRender
        ], VirtualizedScrollViewer);
        return VirtualizedScrollViewer;
    })(React.Component);
    exports.VirtualizedScrollViewer = VirtualizedScrollViewer;
});
//# sourceMappingURL=virtualized-scroll-viewer.js.map