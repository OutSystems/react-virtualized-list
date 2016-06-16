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
            this.pendingPropertiesUpdate = false;
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
                this.scrollHostInfo = extensions_1.getScrollHostInfo(this.itemsContainer);
            }
            return this.scrollHostInfo;
        };
        VirtualizedScrollViewer.prototype.getScrollInfo = function () {
            var scrollHostInfo = this.getScrollHostInfo();
            var scrollInfo;
            var scrollHost = scrollHostInfo.scrollHost;
            if (scrollHost instanceof Window) {
                return {
                    scrollHost: scrollHost,
                    scrollOffset: this.getDimension(scrollHost.scrollY, scrollHost.scrollX),
                    viewportSize: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
                    viewportLowerBound: this.getDimension(0, 0),
                    viewportUpperBound: this.getDimension(scrollHost.innerHeight, scrollHost.innerWidth),
                };
            }
            else if (scrollHost instanceof HTMLElement) {
                var bounds = scrollHost.getBoundingClientRect();
                return {
                    scrollHost: scrollHost,
                    scrollOffset: this.getDimension(scrollHost.scrollTop, scrollHost.scrollLeft),
                    viewportSize: this.getDimension(scrollHost.clientHeight, scrollHost.clientWidth),
                    viewportLowerBound: this.getDimension(bounds.top, bounds.left),
                    viewportUpperBound: this.getDimension(bounds.bottom, bounds.right),
                };
            }
            return null;
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
            this.itemsContainer = ReactDOM.findDOMNode(this);
            this.addScrollHandler();
            this.scrollDirection = this.getScrollHostInfo().scrollDirection;
            this.setState(this.getCurrentScrollViewerState(this.props.length));
        };
        VirtualizedScrollViewer.prototype.componentWillUnmount = function () {
            cancelAnimationFrame(this.pendingScrollAsyncUpdateHandle);
            this.removeScrollHandler();
            this.scrollHostInfo = null;
            this.itemsContainer = null;
        };
        VirtualizedScrollViewer.prototype.componentWillReceiveProps = function (nextProps) {
            this.setState(this.getCurrentScrollViewerState(nextProps.length));
            this.pendingPropertiesUpdate = true;
        };
        VirtualizedScrollViewer.prototype.componentDidUpdate = function () {
            this.itemsContainer = ReactDOM.findDOMNode(this);
            if (this.pendingPropertiesUpdate) {
                this.setState(this.getCurrentScrollViewerState(this.props.length));
                this.pendingPropertiesUpdate = false;
            }
            else if (this.state.itemsEnteringCount > 0) {
                var items = this.getListItems(this.itemsContainer);
                var sizeOfItemsEnteringViewport = this.getSizeOfItems(items[0], items[this.state.itemsEnteringCount - 1]);
                var newState = {};
                newState.itemsEnteringCount = 0;
                newState.scrollOffset = this.state.scrollOffset - sizeOfItemsEnteringViewport;
                this.setState(newState);
            }
        };
        VirtualizedScrollViewer.prototype.handleScroll = function () {
            var _this = this;
            if (this.pendingScrollAsyncUpdateHandle) {
                return;
            }
            this.pendingScrollAsyncUpdateHandle = requestAnimationFrame(function () {
                var newState = _this.getCurrentScrollViewerState(_this.props.length);
                if (_this.shallUpdateState(newState)) {
                    _this.setState(newState);
                    console.log(newState.firstVisibleItemIndex + " " + newState.scrollOffset + " " + newState.averageItemSize);
                }
                _this.pendingScrollAsyncUpdateHandle = 0;
                if (_this.props.scrollChanged) {
                    _this.props.scrollChanged();
                }
            });
        };
        VirtualizedScrollViewer.prototype.shallUpdateState = function (state) {
            return state.firstVisibleItemIndex !== this.state.firstVisibleItemIndex ||
                state.lastVisibleItemIndex !== this.state.lastVisibleItemIndex;
        };
        VirtualizedScrollViewer.prototype.renderList = function (firstItemVisibleIndex, lastVisibleItemIndex) {
            var scrollOffset = this.state.scrollOffset;
            var averageItemSize = this.state.averageItemSize;
            var scrollSize = averageItemSize * this.props.length;
            var length = Math.min(this.props.length, lastVisibleItemIndex - firstItemVisibleIndex + 1);
            var items = this.props.renderItems(firstItemVisibleIndex, length);
            var remainingSize = 0;
            if (scrollOffset <= 1 || firstItemVisibleIndex === 0) {
                firstItemVisibleIndex = 0;
                scrollOffset = 0;
            }
            if (lastVisibleItemIndex < (this.props.length - 1)) {
                remainingSize = scrollSize - ((averageItemSize * length) + scrollOffset);
            }
            var listChildren = [];
            listChildren.push(this.renderSpacer("first-spacer", scrollOffset));
            listChildren.push(items);
            listChildren.push(this.renderSpacer("last-spacer", remainingSize));
            return this.props.renderWrapper(listChildren);
        };
        VirtualizedScrollViewer.prototype.renderSpacer = function (key, dimension) {
            var FILL_SPACE = "100%";
            var style = {
                display: "inline-block"
            };
            if (this.scrollDirection === extensions_1.ScrollDirection.Horizontal) {
                style.width = Math.round(dimension) + PIXEL_UNITS;
                style.height = FILL_SPACE;
            }
            else {
                style.width = FILL_SPACE;
                style.height = Math.round(dimension) + PIXEL_UNITS;
            }
            return React.createElement("script", {key: key, style: style});
        };
        VirtualizedScrollViewer.prototype.render = function () {
            return this.renderList(this.state.firstVisibleItemIndex, this.state.lastVisibleItemIndex);
        };
        VirtualizedScrollViewer.prototype.getDimension = function (vertical, horizontal) {
            return this.scrollDirection === extensions_1.ScrollDirection.Horizontal ? horizontal : vertical;
        };
        VirtualizedScrollViewer.prototype.getListItems = function (itemsContainer) {
            var items = [];
            for (var i = 1; i < itemsContainer.children.length - 1; i++) {
                items.push(itemsContainer.children[i]);
            }
            return items;
        };
        VirtualizedScrollViewer.prototype.areElementsStacked = function (items) {
            if (items.length < 2) {
                return false;
            }
            var firstElement = items[0];
            var secondElement = items[1];
            var firstElementBounds = firstElement.getBoundingClientRect();
            var secondElementBounds = secondElement.getBoundingClientRect();
            return this.getDimension(secondElementBounds.top, 0) >= this.getDimension(firstElementBounds.bottom, 1);
        };
        VirtualizedScrollViewer.prototype.calculateAverageItemsSize = function (items) {
            var firstItemBounds = items[0].getBoundingClientRect();
            var lastItemBounds = items[items.length - 1].getBoundingClientRect();
            var visibleItemsSize = this.getDimension(lastItemBounds.bottom, lastItemBounds.right) - this.getDimension(firstItemBounds.top, firstItemBounds.left);
            return visibleItemsSize / (items.length * 1.0);
        };
        VirtualizedScrollViewer.prototype.getSizeOfItems = function (firstItem, lastItem) {
            var firstItemBounds = firstItem.getBoundingClientRect();
            var lastItemBounds = lastItem.getBoundingClientRect();
            return this.getDimension(lastItemBounds.bottom, lastItemBounds.right) - this.getDimension(firstItemBounds.top, firstItemBounds.left);
        };
        VirtualizedScrollViewer.prototype.getCurrentScrollViewerState = function (listLength) {
            var items = this.getListItems(this.itemsContainer);
            if (!this.areElementsStacked(items)) {
                return {
                    firstVisibleItemIndex: 0,
                    lastVisibleItemIndex: Math.max(1, this.props.length - 1),
                    averageItemSize: 0,
                    scrollOffset: 0
                };
            }
            var viewportAbsolutePosition = 0;
            var scrollInfo = this.getScrollInfo();
            var itemsContainerIsScrollHost = scrollInfo.scrollHost === this.itemsContainer;
            if (!itemsContainerIsScrollHost) {
            }
            var averageItemSize = this.calculateAverageItemsSize(items);
            if (this.state.averageItemSize !== 0) {
                averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
            }
            var numberOfVisibleItems = Math.ceil(scrollInfo.viewportSize / averageItemSize);
            var numberOfSafetyItems = Math.ceil((scrollInfo.viewportSize * 0.5) / averageItemSize);
            var scrollOffset = this.state.scrollOffset;
            var firstVisibleItemIndex = this.state.firstVisibleItemIndex;
            var itemsEnteringCount = 0;
            var largeScrollChange = false;
            if (scrollInfo.scrollOffset > this.state.scrollOffset) {
                var firstItemInViewport = -1;
                for (var i = 0; i < items.length; i++) {
                    var itemBounds = items[i].getBoundingClientRect();
                    if (this.getDimension(itemBounds.bottom, itemBounds.right) > scrollInfo.viewportLowerBound) {
                        firstItemInViewport = i;
                        break;
                    }
                }
                if (firstItemInViewport > 0) {
                    var sizeOfItemsLeavingOnNextRender = this.getSizeOfItems(items[0], items[firstItemInViewport - 1]);
                    firstVisibleItemIndex += firstItemInViewport;
                    scrollOffset += sizeOfItemsLeavingOnNextRender;
                }
                else if (firstItemInViewport === -1) {
                    largeScrollChange = true;
                }
            }
            else if (scrollInfo.scrollOffset < this.state.scrollOffset) {
                var scrollDelta = this.state.scrollOffset - scrollInfo.scrollOffset;
                itemsEnteringCount = Math.min(firstVisibleItemIndex, Math.ceil(scrollDelta / averageItemSize));
                firstVisibleItemIndex = firstVisibleItemIndex - itemsEnteringCount;
                if (itemsEnteringCount > numberOfVisibleItems) {
                    itemsEnteringCount = 0;
                    largeScrollChange = true;
                }
            }
            if (largeScrollChange) {
                firstVisibleItemIndex = Math.max(0, Math.floor(scrollInfo.scrollOffset / averageItemSize));
                scrollOffset = Math.round(firstVisibleItemIndex * averageItemSize);
            }
            var lastVisibleItemIndex = Math.min(listLength - 1, firstVisibleItemIndex + numberOfVisibleItems);
            return {
                firstVisibleItemIndex: firstVisibleItemIndex,
                lastVisibleItemIndex: lastVisibleItemIndex,
                averageItemSize: averageItemSize,
                scrollOffset: scrollOffset,
                itemsEnteringCount: itemsEnteringCount
            };
        };
        return VirtualizedScrollViewer;
    }(React.Component));
    exports.VirtualizedScrollViewer = VirtualizedScrollViewer;
});
//# sourceMappingURL=virtualized-scroll-viewer.js.map