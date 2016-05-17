var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "react", "react-dom", "extensions"], function (require, exports, React, ReactDOM, extensions_1) {
    "use strict";
    var SCROLL_EVENT_NAME = "scroll";
    var RESIZE_EVENT_NAME = "resize";
    var PIXEL_UNITS = "px";
    var VirtualizedScrollViewer = (function (_super) {
        __extends(VirtualizedScrollViewer, _super);
        function VirtualizedScrollViewer(props, context) {
            _super.call(this, props, context);
            this.scrollDirection = extensions_1.ScrollDirection.Vertical;
            this.updateQueued = false;
            this.scrollHandler = this.handleScroll.bind(this);
            this.state = {
                firstVisibleItemIndex: 0,
                lastVisibleItemIndex: 1,
                averageItemSize: 0,
                scrollOffset: 0
            };
        }
        VirtualizedScrollViewer.prototype.getScrollHostInfo = function () {
            if (!this.scrollHostInfo) {
                this.scrollHostInfo = extensions_1.getScrollHostInfo(ReactDOM.findDOMNode(this));
            }
            return this.scrollHostInfo;
        };
        VirtualizedScrollViewer.prototype.getScrollInfo = function () {
            var scrollHostInfo = this.getScrollHostInfo();
            var scrollInfo;
            var scrollHost = scrollHostInfo.scrollHost;
            if (scrollHost instanceof Window) {
                scrollInfo = {
                    scrollHost: scrollHost,
                    scrollOffset: this.getDimension(scrollHost.scrollY, scrollHost.scrollX),
                    viewportSize: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
                    viewportLowerBound: this.getDimension(0, 0),
                    viewportUpperBound: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
                };
            }
            else if (scrollHost instanceof HTMLElement) {
                var bounds = scrollHost.getBoundingClientRect();
                scrollInfo = {
                    scrollHost: scrollHost,
                    scrollOffset: this.getDimension(scrollHost.scrollTop, scrollHost.scrollLeft),
                    viewportSize: this.getDimension(scrollHost.clientHeight, scrollHost.clientWidth),
                    viewportLowerBound: this.getDimension(bounds.top, bounds.left),
                    viewportUpperBound: this.getDimension(bounds.bottom, bounds.right),
                };
            }
            return scrollInfo;
        };
        VirtualizedScrollViewer.prototype.addScrollHandler = function () {
            var scrollHost = this.getScrollHostInfo().scrollHost;
            scrollHost.addEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
            scrollHost.addEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
        };
        VirtualizedScrollViewer.prototype.removeScrollHandler = function () {
            var scrollHost = this.getScrollHostInfo().scrollHost;
            scrollHost.removeEventListener(SCROLL_EVENT_NAME, this.scrollHandler);
            scrollHost.removeEventListener(RESIZE_EVENT_NAME, this.scrollHandler);
        };
        VirtualizedScrollViewer.prototype.componentDidMount = function () {
            this.addScrollHandler();
            this.scrollDirection = this.getScrollHostInfo().scrollDirection;
            this.setState(this.getCurrentScrollViewerState(this.props.length));
        };
        VirtualizedScrollViewer.prototype.componentWillUnmount = function () {
            this.removeScrollHandler();
            this.scrollHostInfo = null;
        };
        VirtualizedScrollViewer.prototype.componentWillReceiveProps = function (nextProps) {
            this.setState(this.getCurrentScrollViewerState(nextProps.length));
        };
        VirtualizedScrollViewer.prototype.handleScroll = function () {
            var _this = this;
            if (this.updateQueued) {
                return;
            }
            this.updateQueued = true;
            requestAnimationFrame(function () {
                _this.setState(_this.getCurrentScrollViewerState(_this.props.length));
                _this.updateQueued = false;
                if (_this.props.scrollChanged) {
                    _this.props.scrollChanged();
                }
            });
        };
        VirtualizedScrollViewer.prototype.renderList = function (firstItemVisibleIndex, lastVisibleItemIndex, scrollOffset, size) {
            if (scrollOffset === void 0) { scrollOffset = 0; }
            if (size === void 0) { size = NaN; }
            var items = [];
            var length = Math.min(this.props.length, lastVisibleItemIndex + 1);
            for (var i = firstItemVisibleIndex; i < length; i++) {
                items.push(this.props.renderItem(i));
            }
            size = isNaN(size) ? undefined : (size - scrollOffset);
            var style = {
                transform: "translate(" + this.getDimension(0, scrollOffset) + PIXEL_UNITS + "," + this.getDimension(scrollOffset, 0) + PIXEL_UNITS + ")",
                minHeight: this.getDimension(size, undefined),
                minWidth: this.getDimension(undefined, size)
            };
            return (React.createElement("div", {style: style}, items));
        };
        VirtualizedScrollViewer.prototype.render = function () {
            if (this.props.length === 0) {
                return this.renderList(0, 0);
            }
            return this.renderList(this.state.firstVisibleItemIndex, this.state.lastVisibleItemIndex, this.state.scrollOffset, this.state.averageItemSize * this.props.length);
        };
        VirtualizedScrollViewer.prototype.getDimension = function (vertical, horizontal) {
            return this.scrollDirection === extensions_1.ScrollDirection.Horizontal ? horizontal : vertical;
        };
        VirtualizedScrollViewer.prototype.areElementsStacked = function (scrollViewerElement) {
            if (scrollViewerElement.childNodes.length < 2) {
                return false;
            }
            var firstElement = scrollViewerElement.children[0];
            var secondElement = scrollViewerElement.children[1];
            var firstElementBounds = firstElement.getBoundingClientRect();
            var secondElementBounds = secondElement.getBoundingClientRect();
            return this.getDimension(secondElementBounds.top, 0) >= this.getDimension(firstElementBounds.bottom, 1);
        };
        VirtualizedScrollViewer.prototype.getCurrentScrollViewerState = function (listLength) {
            var scrollViewerElement = ReactDOM.findDOMNode(this);
            if (!this.areElementsStacked(scrollViewerElement)) {
                return {
                    firstVisibleItemIndex: 0,
                    lastVisibleItemIndex: Math.max(1, this.props.length - 1),
                    averageItemSize: 1,
                    scrollOffset: 0
                };
            }
            var scrollInfo = this.getScrollInfo();
            var viewportAbsolutePosition = 0;
            if (scrollInfo.scrollHost !== scrollViewerElement) {
                var scrollViewerParentBounds = scrollViewerElement.parentElement.getBoundingClientRect();
                viewportAbsolutePosition = scrollInfo.scrollOffset + this.getDimension(scrollViewerParentBounds.top, scrollViewerParentBounds.left);
            }
            var firstItemBounds = scrollViewerElement.firstElementChild.getBoundingClientRect();
            var lastItemBounds = scrollViewerElement.lastElementChild.getBoundingClientRect();
            var visibleItemsSize = this.getDimension(lastItemBounds.bottom, lastItemBounds.right) - this.getDimension(firstItemBounds.top, firstItemBounds.left);
            var averageItemSize = visibleItemsSize / scrollViewerElement.children.length;
            if (this.state.averageItemSize !== 0) {
                averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
            }
            var numberOfVisibleItems = Math.ceil(scrollInfo.viewportSize / averageItemSize);
            var numberOfSafetyItems = Math.ceil((scrollInfo.viewportSize * 0.25) / averageItemSize);
            var firstVisibleItemIndex = Math.max(0, Math.floor(scrollInfo.scrollOffset / averageItemSize) - (Math.ceil(viewportAbsolutePosition / averageItemSize) + numberOfSafetyItems));
            var lastVisibleItemIndex = firstVisibleItemIndex + numberOfVisibleItems + (numberOfSafetyItems * 2);
            if (lastVisibleItemIndex >= listLength) {
                lastVisibleItemIndex = Math.min(listLength - 1, lastVisibleItemIndex);
                firstVisibleItemIndex = lastVisibleItemIndex - numberOfVisibleItems;
            }
            var scrollOffset = averageItemSize * firstVisibleItemIndex;
            return {
                firstVisibleItemIndex: firstVisibleItemIndex,
                lastVisibleItemIndex: lastVisibleItemIndex,
                averageItemSize: averageItemSize,
                scrollOffset: scrollOffset,
            };
        };
        return VirtualizedScrollViewer;
    }(React.Component));
    exports.VirtualizedScrollViewer = VirtualizedScrollViewer;
});
//# sourceMappingURL=virtualized-scroll-viewer.js.map