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
            this.updateQueued = false;
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
                scrollDelta: 0,
                viewportSize: 0,
            };
            if (scrollHost instanceof Window) {
                scrollInfo.scrollDelta = this.getDimension(scrollHost.scrollY, scrollHost.scrollX);
                scrollInfo.viewportSize = this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth);
            }
            else if (scrollHost instanceof HTMLElement) {
                scrollInfo.scrollDelta = this.getDimension(scrollHost.scrollTop, scrollHost.scrollLeft);
                scrollInfo.viewportSize = this.getDimension(scrollHost.clientHeight, scrollHost.clientWidth);
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
            if (this.updateQueued) {
                return;
            }
            this.updateQueued = true;
            requestAnimationFrame(function () {
                _this.forceUpdate();
                _this.updateQueued = false;
            });
        };
        VirtualizedScrollViewer.prototype.renderList = function (firstItemVisible, numberOfVisibleItems, scrollDelta, size) {
            if (scrollDelta === void 0) { scrollDelta = 0; }
            if (size === void 0) { size = NaN; }
            var items = [];
            var length = Math.min(this.props.length, firstItemVisible + numberOfVisibleItems);
            for (var i = firstItemVisible; i < length; i++) {
                items.push(this.props.renderItem(i));
            }
            size = isNaN(size) ? undefined : size - scrollDelta;
            var style = {
                paddingTop: this.getDimension(scrollDelta, undefined),
                paddingLeft: this.getDimension(undefined, scrollDelta),
                height: this.getDimension(size, undefined),
                width: this.getDimension(undefined, size)
            };
            return (React.createElement("div", {"style": style}, items));
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
            var listItemElementBounds = listItemElement.getBoundingClientRect();
            var listItemDimension = Math.max(1, this.getDimension(listItemElementBounds.height, listItemElementBounds.width));
            var numberOfVisibleItems = Math.ceil(scrollInfo.viewportSize / listItemDimension) + 1;
            var scrollDelta;
            var scrollViewerParentElement = scrollViewerElement.parentElement;
            if (scrollInfo.scrollHost === scrollViewerParentElement) {
                scrollDelta = scrollInfo.scrollDelta;
            }
            else {
                var scrollViewerParentBounds = scrollViewerParentElement.getBoundingClientRect();
                scrollDelta = Math.max(0, -this.getDimension(scrollViewerParentBounds.top, scrollViewerParentBounds.left));
            }
            var firstItemVisible = Math.floor(scrollDelta / listItemDimension);
            scrollDelta = scrollDelta - (scrollDelta % listItemDimension);
            return this.renderList(firstItemVisible, numberOfVisibleItems, scrollDelta, listItemDimension * this.props.length);
        };
        VirtualizedScrollViewer.prototype.getDimension = function (vertical, horizontal) {
            return (this.props.verticalScrollVirtualization === undefined || this.props.verticalScrollVirtualization) ? vertical : horizontal;
        };
        VirtualizedScrollViewer = __decorate([
            component_with_prerender_1.ComponentWithPreRender
        ], VirtualizedScrollViewer);
        return VirtualizedScrollViewer;
    })(React.Component);
    exports.VirtualizedScrollViewer = VirtualizedScrollViewer;
});
//# sourceMappingURL=virtualized-scroll-viewer.js.map