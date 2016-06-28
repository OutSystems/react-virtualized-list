var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "react", "react-dom", "virtualized-scroll-viewer-extensions"], function (require, exports, React, ReactDOM, virtualized_scroll_viewer_extensions_1) {
    "use strict";
    var SCROLL_EVENT_NAME = "scroll";
    var RESIZE_EVENT_NAME = "resize";
    var PIXEL_UNITS = "px";
    var VirtualizedScrollViewer = (function (_super) {
        __extends(VirtualizedScrollViewer, _super);
        function VirtualizedScrollViewer(props, context) {
            _super.call(this, props, context);
            this.scrollDirection = virtualized_scroll_viewer_extensions_1.ScrollExtensions.ScrollDirection.Vertical;
            this.pendingPropertiesUpdate = false;
            this.isScrollOngoing = false;
            this.scrollHandler = this.handleScroll.bind(this);
            this.state = {
                firstVisibleItemIndex: 0,
                lastVisibleItemIndex: 1,
                averageItemSize: 0,
                scrollOffset: 0,
                effectiveScrollValue: 0,
                itemsEnteringCount: 0
            };
        }
        VirtualizedScrollViewer.prototype.getScrollHostInfo = function () {
            if (!this.scrollHostInfo) {
                this.scrollHostInfo = virtualized_scroll_viewer_extensions_1.ScrollExtensions.getScrollHostInfo(this.itemsContainer);
            }
            return this.scrollHostInfo;
        };
        VirtualizedScrollViewer.prototype.getScrollInfo = function () {
            var scrollInfo = virtualized_scroll_viewer_extensions_1.ScrollExtensions.getScrollInfo(this.getScrollHostInfo());
            var scrollHost = scrollInfo.scrollHost;
            var result = {
                scrollHost: scrollHost,
                scrollOffset: this.getDimension(scrollInfo.scrollY, scrollInfo.scrollX),
                viewportSize: this.getDimension(scrollInfo.viewport.height, scrollInfo.viewport.width),
                viewportLowerBound: 0,
                viewportUpperBound: 0,
            };
            if (scrollHost instanceof Window) {
                result.viewportLowerBound = this.getDimension(scrollInfo.viewport.y, scrollInfo.viewport.x);
                result.viewportUpperBound = this.getDimension(scrollInfo.viewport.height, scrollInfo.viewport.width);
            }
            else if (scrollHost instanceof HTMLElement) {
                var bounds = scrollHost.getBoundingClientRect();
                result.viewportLowerBound = this.getDimension(bounds.top, bounds.left);
                result.viewportUpperBound = this.getDimension(bounds.bottom, bounds.right);
            }
            return result;
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
            if (this.pendingPropertiesUpdate || this.state.itemsEnteringCount > 0) {
                this.setState(this.getCurrentScrollViewerState(this.props.length));
                this.pendingPropertiesUpdate = false;
            }
        };
        VirtualizedScrollViewer.prototype.handleScroll = function () {
            var _this = this;
            if (this.pendingScrollAsyncUpdateHandle) {
                return;
            }
            this.pendingScrollAsyncUpdateHandle = requestAnimationFrame(function () {
                _this.isScrollOngoing = true;
                var newState = _this.getCurrentScrollViewerState(_this.props.length);
                if (_this.shallUpdateState(newState)) {
                    _this.setState(newState, function () { return _this.isScrollOngoing = false; });
                }
                else {
                    _this.isScrollOngoing = false;
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
            var length = Math.min(this.props.length, lastVisibleItemIndex - firstItemVisibleIndex + 1);
            var items = this.props.renderItems(firstItemVisibleIndex, length);
            var remainingSize = 0;
            if (lastVisibleItemIndex < (this.props.length - 1)) {
                var averageItemSize = this.state.averageItemSize;
                var scrollSize = averageItemSize * this.props.length;
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
            if (this.scrollDirection === virtualized_scroll_viewer_extensions_1.ScrollExtensions.ScrollDirection.Horizontal) {
                style.width = Math.round(dimension) + PIXEL_UNITS;
                style.height = FILL_SPACE;
            }
            else {
                style.width = FILL_SPACE;
                style.height = Math.round(dimension) + PIXEL_UNITS;
            }
            return React.DOM.script({ key: key, style: style });
        };
        VirtualizedScrollViewer.prototype.render = function () {
            return this.renderList(this.state.firstVisibleItemIndex, this.state.lastVisibleItemIndex);
        };
        VirtualizedScrollViewer.prototype.getDimension = function (vertical, horizontal) {
            return this.scrollDirection === virtualized_scroll_viewer_extensions_1.ScrollExtensions.ScrollDirection.Horizontal ? horizontal : vertical;
        };
        VirtualizedScrollViewer.prototype.getListItems = function (itemsContainer) {
            var items = [];
            for (var i = 1; i < itemsContainer.children.length - 1; i++) {
                items.push(itemsContainer.children[i]);
            }
            return items;
        };
        VirtualizedScrollViewer.prototype.getItemBounds = function (item) {
            var MIN_SIZE = 20;
            var bounds = item.getBoundingClientRect();
            var rect = {
                width: bounds.width,
                height: bounds.height,
                left: bounds.left,
                right: bounds.right,
                top: bounds.top,
                bottom: bounds.bottom
            };
            if (this.scrollDirection === virtualized_scroll_viewer_extensions_1.ScrollExtensions.ScrollDirection.Horizontal) {
                if (rect.width < MIN_SIZE) {
                    rect.width = MIN_SIZE;
                    rect.right = rect.left + rect.width;
                }
            }
            else {
                if (rect.height < MIN_SIZE) {
                    rect.height = MIN_SIZE;
                    rect.bottom = rect.top + rect.height;
                }
            }
            return rect;
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
            var visibleItemsSize = this.calculateItemsSize(items, 0, items.length - 1);
            return visibleItemsSize / (items.length * 1.0);
        };
        VirtualizedScrollViewer.prototype.calculateItemsSize = function (items, firstItemIndex, lastItemIndex) {
            var size = 0;
            for (var i = firstItemIndex; i <= lastItemIndex; i++) {
                var itemBounds = this.getItemBounds(items[i]);
                size += this.getDimension(itemBounds.height, itemBounds.width);
            }
            return size;
        };
        VirtualizedScrollViewer.prototype.getCurrentScrollViewerState = function (listLength) {
            var items = this.getListItems(this.itemsContainer);
            if (!this.areElementsStacked(items)) {
                return {
                    firstVisibleItemIndex: 0,
                    lastVisibleItemIndex: Math.max(1, this.props.length - 1),
                    averageItemSize: 0,
                    scrollOffset: 0,
                    effectiveScrollValue: 0,
                    itemsEnteringCount: 0
                };
            }
            var scrollInfo = this.getScrollInfo();
            var averageItemSize = this.calculateAverageItemsSize(items);
            if (this.state.averageItemSize !== 0) {
                averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
            }
            var viewportSafetyMargin = scrollInfo.viewportSize * 0.5;
            var numberOfSafetyItems = Math.ceil((viewportSafetyMargin * 2) / averageItemSize);
            var numberOfVisibleItems = Math.ceil(scrollInfo.viewportSize / averageItemSize) + numberOfSafetyItems;
            var scrollOffset = this.state.scrollOffset;
            var firstVisibleItemIndex = this.state.firstVisibleItemIndex;
            var viewportLowerMargin = scrollInfo.viewportLowerBound - viewportSafetyMargin;
            var itemsEnteringViewportCount = 0;
            var largeScrollChange = false;
            if (this.state.itemsEnteringCount === 0) {
                if (scrollInfo.scrollOffset > this.state.effectiveScrollValue) {
                    var firstItemIndexInViewport = -1;
                    var viewportLowerMargin_1 = scrollInfo.viewportLowerBound - viewportSafetyMargin;
                    for (var i = 0; i < items.length; i++) {
                        var itemBounds = this.getItemBounds(items[i]);
                        if (this.getDimension(itemBounds.bottom, itemBounds.right) > viewportLowerMargin_1) {
                            firstItemIndexInViewport = i;
                            break;
                        }
                    }
                    if (firstItemIndexInViewport > 0) {
                        var sizeOfItemsLeavingOnNextRender = this.calculateItemsSize(items, 0, firstItemIndexInViewport - 1);
                        firstVisibleItemIndex += firstItemIndexInViewport;
                        scrollOffset += sizeOfItemsLeavingOnNextRender;
                    }
                    else if (firstItemIndexInViewport === -1) {
                        largeScrollChange = true;
                    }
                }
                else if (scrollInfo.scrollOffset < this.state.effectiveScrollValue) {
                    var firstItemBounds = this.getItemBounds(items[0]);
                    var firstItemOffset = this.getDimension(firstItemBounds.top - viewportLowerMargin, firstItemBounds.left - viewportLowerMargin);
                    if (firstItemOffset > 0) {
                        itemsEnteringViewportCount = Math.min(firstVisibleItemIndex, Math.ceil(firstItemOffset / averageItemSize));
                        firstVisibleItemIndex = firstVisibleItemIndex - itemsEnteringViewportCount;
                        if (itemsEnteringViewportCount > numberOfVisibleItems) {
                            itemsEnteringViewportCount = 0;
                            largeScrollChange = true;
                        }
                    }
                }
                if (largeScrollChange) {
                    firstVisibleItemIndex = Math.max(0, Math.floor(scrollInfo.scrollOffset / averageItemSize));
                    scrollOffset = Math.round(firstVisibleItemIndex * averageItemSize);
                }
            }
            else {
                var lastItemEnteringViewport = Math.min(items.length - 1, this.state.itemsEnteringCount - 1);
                var sizeOfItemsEnteringViewport = this.calculateItemsSize(items, 0, lastItemEnteringViewport);
                scrollOffset = Math.max(0, scrollOffset - sizeOfItemsEnteringViewport);
            }
            if (firstVisibleItemIndex === 0 || scrollInfo.scrollOffset < averageItemSize) {
                scrollOffset = 0;
                firstVisibleItemIndex = 0;
            }
            var lastVisibleItemIndex = Math.min(listLength - 1, firstVisibleItemIndex + numberOfVisibleItems);
            return {
                firstVisibleItemIndex: firstVisibleItemIndex,
                lastVisibleItemIndex: lastVisibleItemIndex,
                averageItemSize: averageItemSize,
                scrollOffset: scrollOffset,
                effectiveScrollValue: scrollInfo.scrollOffset,
                itemsEnteringCount: itemsEnteringViewportCount
            };
        };
        Object.defineProperty(VirtualizedScrollViewer.prototype, "isScrolling", {
            get: function () {
                return this.isScrollOngoing;
            },
            enumerable: true,
            configurable: true
        });
        VirtualizedScrollViewer.prototype.setScrollOffset = function (x, y) {
            var scrollInfo = this.getScrollInfo();
            var scrollHost = scrollInfo.scrollHost;
            var scrollX = this.getDimension(0, x);
            var scrollY = this.getDimension(y, 0);
            virtualized_scroll_viewer_extensions_1.ScrollExtensions.setScrollOffset(scrollHost, scrollX, scrollY);
        };
        return VirtualizedScrollViewer;
    }(React.Component));
    exports.VirtualizedScrollViewer = VirtualizedScrollViewer;
});
