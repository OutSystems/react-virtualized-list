var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("react-virtualized-list/virtualized-scroll-viewer-extensions", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ScrollExtensions;
    (function (ScrollExtensions) {
        var OVERFLOW_REGEX = /(auto|scroll)/;
        var NON_SCROLLABLE_ELEMENT_ATRIBUTE = "data-not-scrollable";
        var ScrollDirection;
        (function (ScrollDirection) {
            ScrollDirection[ScrollDirection["Horizontal"] = 0] = "Horizontal";
            ScrollDirection[ScrollDirection["Vertical"] = 1] = "Vertical";
            ScrollDirection[ScrollDirection["None"] = 2] = "None";
        })(ScrollDirection = ScrollExtensions.ScrollDirection || (ScrollExtensions.ScrollDirection = {}));
        function getScrollHostInfo(element, excludeStaticParent) {
            if (element === null || element === undefined || element instanceof Document) {
                return {
                    scrollHost: window,
                    scrollDirection: ScrollDirection.Vertical,
                };
            }
            var elementComputedStyle = getComputedStyle(element);
            excludeStaticParent = excludeStaticParent || elementComputedStyle.position === "absolute";
            if (!excludeStaticParent || elementComputedStyle.position !== "static") {
                var isOverFlow = OVERFLOW_REGEX.test(elementComputedStyle.overflow +
                    elementComputedStyle.overflowY +
                    elementComputedStyle.overflowX);
                if (isOverFlow) {
                    if (!element.hasAttribute(NON_SCROLLABLE_ELEMENT_ATRIBUTE)) {
                        return {
                            scrollHost: element,
                            scrollDirection: OVERFLOW_REGEX.test(elementComputedStyle.overflowY) ? ScrollDirection.Vertical :
                                ScrollDirection.Horizontal,
                        };
                    }
                }
            }
            return getScrollHostInfo(element.parentElement, excludeStaticParent);
        }
        ScrollExtensions.getScrollHostInfo = getScrollHostInfo;
        function getScrollInfo(scrollHost) {
            if (scrollHost instanceof Window) {
                return {
                    scrollHost: scrollHost,
                    scroll: {
                        x: document.body.scrollLeft,
                        y: document.body.scrollTop,
                        height: document.body.scrollHeight,
                        width: document.body.scrollWidth,
                    },
                    viewport: {
                        x: 0,
                        y: 0,
                        height: scrollHost.innerHeight,
                        width: scrollHost.innerWidth,
                    },
                };
            }
            else if (scrollHost instanceof HTMLElement) {
                return {
                    scrollHost: scrollHost,
                    scroll: {
                        x: scrollHost.scrollLeft,
                        y: scrollHost.scrollTop,
                        height: scrollHost.scrollHeight,
                        width: scrollHost.scrollWidth,
                    },
                    viewport: {
                        x: 0,
                        y: 0,
                        height: scrollHost.clientHeight,
                        width: scrollHost.clientWidth,
                    },
                };
            }
            return null;
        }
        ScrollExtensions.getScrollInfo = getScrollInfo;
        function setScrollOffset(scrollHost, x, y, increment) {
            if (increment === void 0) { increment = false; }
            if (scrollHost instanceof Window) {
                scrollHost = document.body;
            }
            var scrollHostElement = scrollHost;
            if (!isNaN(y)) {
                if (increment) {
                    y += scrollHostElement.scrollTop;
                }
                scrollHostElement.scrollTop = y;
            }
            if (!isNaN(x)) {
                if (increment) {
                    x += scrollHostElement.scrollLeft;
                }
                scrollHostElement.scrollLeft = x;
            }
        }
        ScrollExtensions.setScrollOffset = setScrollOffset;
    })(ScrollExtensions = exports.ScrollExtensions || (exports.ScrollExtensions = {}));
    var ObjectExtensions;
    (function (ObjectExtensions) {
        function assign(target) {
            var sources = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                sources[_i - 1] = arguments[_i];
            }
            if (target == null) {
                throw new TypeError("Cannot convert undefined or null to object");
            }
            target = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var source = arguments[index];
                if (source != null) {
                    for (var key in source) {
                        if (Object.prototype.hasOwnProperty.call(source, key)) {
                            target[key] = source[key];
                        }
                    }
                }
            }
            return target;
        }
        ObjectExtensions.assign = assign;
    })(ObjectExtensions = exports.ObjectExtensions || (exports.ObjectExtensions = {}));
});
define("react-virtualized-list/animated-group", ["require", "exports", "react", "react-dom", "react-virtualized-list/virtualized-scroll-viewer-extensions"], function (require, exports, React, ReactDOM, virtualized_scroll_viewer_extensions_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ANIMATION_APPEAR = "-appear";
    var ANIMATION_ENTER = "-enter";
    var ANIMATION_LEAVE = "-leave";
    var ANIMATION_ACTIVE = "-active";
    var TICK = 17;
    var AnimatedGroup = (function (_super) {
        __extends(AnimatedGroup, _super);
        function AnimatedGroup() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        AnimatedGroup.prototype.getDefaultTransitionName = function () {
            return "";
        };
        AnimatedGroup.prototype.getAnimatedItem = function () {
            return AnimatedItem;
        };
        AnimatedGroup.prototype.wrapChild = function (child) {
            var childAttributes = {
                shouldSuspendAnimations: this.props.shouldSuspendAnimations,
                transitionName: this.props.transitionName || this.getDefaultTransitionName(),
                onEnter: this.props.onEnter,
                onEnterStarted: this.props.onEnterStarted,
                onLeave: this.props.onLeave,
                onLeaveStarted: this.props.onLeaveStarted
            };
            return React.createElement(this.getAnimatedItem(), virtualized_scroll_viewer_extensions_1.ObjectExtensions.assign({}, child.props, childAttributes), child);
        };
        AnimatedGroup.prototype.render = function () {
            return React.createElement(React.addons.TransitionGroup, virtualized_scroll_viewer_extensions_1.ObjectExtensions.assign({}, this.props, { childFactory: this.wrapChild.bind(this) }), this.props.children);
        };
        return AnimatedGroup;
    }(React.Component));
    exports.AnimatedGroup = AnimatedGroup;
    var AnimatedItem = (function (_super) {
        __extends(AnimatedItem, _super);
        function AnimatedItem() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.transitionTimeouts = [];
            return _this;
        }
        AnimatedItem.prototype.getAnimationClassName = function (element) {
            return this.props.transitionName;
        };
        AnimatedItem.prototype.queueAction = function (action, timeout) {
            var timeoutHandle = setTimeout(action, timeout);
            this.transitionTimeouts.push(timeoutHandle);
        };
        AnimatedItem.prototype.transition = function (transitionName, done, onStart, onStartTransition, onEnd) {
            var _this = this;
            if (this.props.shouldSuspendAnimations && this.props.shouldSuspendAnimations()) {
                done();
                return;
            }
            var element = ReactDOM.findDOMNode(this);
            var animationClassName = this.getAnimationClassName(element) + transitionName;
            onStart(element);
            element.classList.add(animationClassName);
            this.queueAction(function () {
                element.classList.add(animationClassName + ANIMATION_ACTIVE);
                var elementStyle = getComputedStyle(element);
                var animationDuration = parseFloat(elementStyle.transitionDelay) + parseFloat(elementStyle.transitionDuration);
                onStartTransition(element);
                var animationEnd = function () {
                    element.classList.remove(animationClassName);
                    element.classList.remove(animationClassName + ANIMATION_ACTIVE);
                    onEnd(element);
                    done();
                };
                _this.queueAction(animationEnd, animationDuration * 1000);
            }, TICK);
        };
        AnimatedItem.prototype.componentWillAppear = function (done) {
            var _this = this;
            this.transition(ANIMATION_APPEAR, done, function (element) { return _this.startEnter(element); }, function (element) { return _this.startEnterTransition(element); }, function (element) { return _this.endEnter(element); });
        };
        AnimatedItem.prototype.componentWillEnter = function (done) {
            var _this = this;
            this.transition(ANIMATION_ENTER, done, function (element) { return _this.startEnter(element); }, function (element) { return _this.startEnterTransition(element); }, function (element) { return _this.endEnter(element); });
        };
        AnimatedItem.prototype.startEnter = function (element) { };
        AnimatedItem.prototype.startEnterTransition = function (element) {
            if (this.props.onEnterStarted) {
                this.props.onEnterStarted();
            }
        };
        AnimatedItem.prototype.endEnter = function (element) { };
        AnimatedItem.prototype.componentWillLeave = function (done) {
            var _this = this;
            this.transition(ANIMATION_LEAVE, done, function (element) { return _this.startLeave(element); }, function (element) { return _this.startLeaveTransition(element); }, function (element) { return _this.endLeave(element); });
        };
        AnimatedItem.prototype.startLeave = function (element) { };
        AnimatedItem.prototype.startLeaveTransition = function (element) {
            if (this.props.onLeaveStarted) {
                this.props.onLeaveStarted();
            }
        };
        AnimatedItem.prototype.endLeave = function (element) { };
        AnimatedItem.prototype.componentWillUnmount = function () {
            this.transitionTimeouts.forEach(function (t) { return clearTimeout(t); });
            this.transitionTimeouts = [];
        };
        AnimatedItem.prototype.componentDidAppear = function () {
            if (this.props.onEnter) {
                this.props.onEnter();
            }
        };
        AnimatedItem.prototype.componentDidEnter = function () {
            if (this.props.onEnter) {
                this.props.onEnter();
            }
        };
        AnimatedItem.prototype.componentDidLeave = function () {
            if (this.props.onLeave) {
                this.props.onLeave();
            }
        };
        AnimatedItem.prototype.render = function () {
            return React.Children.only(this.props.children);
        };
        return AnimatedItem;
    }(React.Component));
    exports.AnimatedItem = AnimatedItem;
});
define("react-virtualized-list/animated-size-group", ["require", "exports", "react-virtualized-list/animated-group"], function (require, exports, animated_group_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PIXELS_UNIT = "px";
    var AnimatedSizeGroup = (function (_super) {
        __extends(AnimatedSizeGroup, _super);
        function AnimatedSizeGroup() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        AnimatedSizeGroup.prototype.getAnimatedItem = function () {
            return AnimatedSizeItem;
        };
        return AnimatedSizeGroup;
    }(animated_group_1.AnimatedGroup));
    exports.AnimatedSizeGroup = AnimatedSizeGroup;
    var AnimatedSizeItem = (function (_super) {
        __extends(AnimatedSizeItem, _super);
        function AnimatedSizeItem() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        AnimatedSizeItem.prototype.isDisplayInline = function (style) {
            return style && style.display.indexOf("inline") === 0;
        };
        AnimatedSizeItem.prototype.getAnimationClassName = function (element) {
            var animationClassName = _super.prototype.getAnimationClassName.call(this, element);
            var style = getComputedStyle(element);
            if (this.isDisplayInline(style)) {
                animationClassName += "-inline";
            }
            return animationClassName;
        };
        AnimatedSizeItem.prototype.storeStyleSize = function (element) {
            this.previousStyleWidth = element.style.width;
            this.previousStyleHeight = element.style.height;
        };
        AnimatedSizeItem.prototype.restorePreviousStyleSize = function (element) {
            element.style.width = this.previousStyleWidth;
            element.style.height = this.previousStyleHeight;
        };
        AnimatedSizeItem.prototype.startEnter = function (element) {
            _super.prototype.startEnter.call(this, element);
            var elementBounds = element.getBoundingClientRect();
            this.previousWidth = elementBounds.width;
            this.previousHeight = elementBounds.height;
        };
        AnimatedSizeItem.prototype.startEnterTransition = function (element) {
            _super.prototype.startEnterTransition.call(this, element);
            this.storeStyleSize(element);
            var elementBounds = element.getBoundingClientRect();
            if (elementBounds.width !== this.previousWidth) {
                element.style.width = this.previousWidth + PIXELS_UNIT;
            }
            if (elementBounds.height !== this.previousHeight) {
                element.style.height = this.previousHeight + PIXELS_UNIT;
            }
        };
        AnimatedSizeItem.prototype.endEnter = function (element) {
            _super.prototype.endEnter.call(this, element);
            this.restorePreviousStyleSize(element);
        };
        AnimatedSizeItem.prototype.startLeave = function (element) {
            _super.prototype.startLeave.call(this, element);
            this.storeStyleSize(element);
            var elementBounds = element.getBoundingClientRect();
            element.style.width = elementBounds.width + PIXELS_UNIT;
            element.style.height = elementBounds.height + PIXELS_UNIT;
        };
        AnimatedSizeItem.prototype.startLeaveTransition = function (element) {
            _super.prototype.startLeaveTransition.call(this, element);
            this.restorePreviousStyleSize(element);
        };
        return AnimatedSizeItem;
    }(animated_group_1.AnimatedItem));
    exports.AnimatedSizeItem = AnimatedSizeItem;
});
define("react-virtualized-list/spacer", ["require", "exports", "react", "react-virtualized-list/virtualized-scroll-viewer-extensions"], function (require, exports, React, virtualized_scroll_viewer_extensions_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FLEXBOX_DISPLAY = document.createElement("p").style.flex === undefined ? "-webkit-flex" : "flex";
    var PIXEL_UNITS = "px";
    var Spacer = (function (_super) {
        __extends(Spacer, _super);
        function Spacer() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Spacer.prototype.render = function () {
            var FILL_SPACE = "100%";
            var style = {
                display: FLEXBOX_DISPLAY,
            };
            var _a = this.props, scrollDirection = _a.scrollDirection, dimension = _a.dimension, averageItemSize = _a.averageItemSize, childKey = _a.childKey;
            if (scrollDirection === virtualized_scroll_viewer_extensions_2.ScrollExtensions.ScrollDirection.Horizontal) {
                style.width = dimension + PIXEL_UNITS;
                style.height = FILL_SPACE;
            }
            else if (scrollDirection === virtualized_scroll_viewer_extensions_2.ScrollExtensions.ScrollDirection.Vertical) {
                style.height = dimension + PIXEL_UNITS;
                style.width = FILL_SPACE;
            }
            return React.DOM.script({ key: childKey, style: style });
        };
        return Spacer;
    }(React.Component));
    exports.Spacer = Spacer;
});
define("react-virtualized-list/virtualized-scroll-viewer", ["require", "exports", "react", "react-dom", "react-virtualized-list/virtualized-scroll-viewer-extensions", "react-virtualized-list/spacer"], function (require, exports, React, ReactDOM, virtualized_scroll_viewer_extensions_3, spacer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function insideiOSWebView() {
        return !navigator.standalone && /(iPad)|(iPhone)/i.test(navigator.userAgent) && !/safari/i.test(navigator.userAgent);
    }
    var SCROLL_EVENT_NAME = "scroll";
    var RESIZE_EVENT_NAME = "resize";
    var PIXEL_UNITS = "px";
    var DEFAULT_BUFFER_SIZE = 3;
    var BUFFER_MULTIPLIER = insideiOSWebView() ? 4 : 1;
    var MIN_ITEM_SIZE = 10;
    var VirtualizedScrollViewer = (function (_super) {
        __extends(VirtualizedScrollViewer, _super);
        function VirtualizedScrollViewer(props, context) {
            var _this = _super.call(this, props, context) || this;
            _this.scrollDirection = virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.Vertical;
            _this.hasPendingPropertiesUpdate = false;
            _this.isScrollOngoing = false;
            _this.isComponentInitialized = false;
            _this.onWindowScrollOrResize = function () {
                _this.removeWindowScrollHandlers();
                _this.addScrollHandler();
            };
            _this.onScroll = function (scrollEvent) {
                if (_this.pendingScrollAsyncUpdateHandle) {
                    return;
                }
                _this.pendingScrollAsyncUpdateHandle = requestAnimationFrame(function () {
                    if (_this.isDisposed) {
                        return;
                    }
                    try {
                        var newState = _this.getCurrentScrollViewerState(_this.props.length, scrollEvent.type !== RESIZE_EVENT_NAME);
                        if (newState !== _this.state) {
                            _this.isScrollOngoing = true;
                            _this.setState(newState, function () { return _this.isScrollOngoing = false; });
                        }
                    }
                    finally {
                        _this.pendingScrollAsyncUpdateHandle = 0;
                    }
                    if (_this.props.scrollChanged) {
                        _this.props.scrollChanged();
                    }
                });
            };
            _this.setScrollOffset = _this.scrollToOffset;
            _this.state = {
                firstRenderedItemIndex: 0,
                lastRenderedItemIndex: 1,
                averageItemSize: 0,
                scrollOffset: 0,
                offScreenItemsCount: 0,
                effectiveScrollOffset: Number.MIN_VALUE,
            };
            return _this;
        }
        VirtualizedScrollViewer.prototype.getScrollHostInfo = function () {
            if (!this.scrollHostInfo) {
                this.scrollHostInfo = virtualized_scroll_viewer_extensions_3.ScrollExtensions.getScrollHostInfo(this.itemsContainer);
            }
            return this.scrollHostInfo;
        };
        VirtualizedScrollViewer.prototype.getScrollInfo = function () {
            var scrollHostInfo = this.getScrollHostInfo();
            var scrollHost = scrollHostInfo.scrollHost;
            var scrollInfo = virtualized_scroll_viewer_extensions_3.ScrollExtensions.getScrollInfo(scrollHost);
            var result = {
                scrollHost: scrollHost,
                scrollOffset: this.getDimension(scrollInfo.scroll.y, scrollInfo.scroll.x),
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
            if (this.isDisposed) {
                return;
            }
            this.scrollHostInfo = null;
            var scrollHostInfo = this.getScrollHostInfo();
            var scrollHost = scrollHostInfo.scrollHost;
            scrollHost.addEventListener(SCROLL_EVENT_NAME, this.onScroll);
            window.addEventListener(RESIZE_EVENT_NAME, this.onScroll);
            this.scrollDirection = scrollHostInfo.scrollDirection;
        };
        VirtualizedScrollViewer.prototype.removeScrollHandler = function () {
            var scrollHost = this.getScrollHostInfo().scrollHost;
            scrollHost.removeEventListener(SCROLL_EVENT_NAME, this.onScroll);
            window.removeEventListener(RESIZE_EVENT_NAME, this.onScroll);
        };
        VirtualizedScrollViewer.prototype.removeWindowScrollHandlers = function () {
            window.removeEventListener(SCROLL_EVENT_NAME, this.onWindowScrollOrResize, true);
            window.removeEventListener(RESIZE_EVENT_NAME, this.onWindowScrollOrResize, true);
        };
        VirtualizedScrollViewer.prototype.componentDidMount = function () {
            var _this = this;
            this.itemsContainer = ReactDOM.findDOMNode(this);
            requestAnimationFrame(function () {
                if (!_this.isDisposed) {
                    window.addEventListener(SCROLL_EVENT_NAME, _this.onWindowScrollOrResize, true);
                    window.addEventListener(RESIZE_EVENT_NAME, _this.onWindowScrollOrResize, true);
                }
            });
            this.setState(this.getCurrentScrollViewerState(this.props.length));
        };
        VirtualizedScrollViewer.prototype.componentWillUnmount = function () {
            this.removeWindowScrollHandlers();
            this.removeScrollHandler();
            this.scrollHostInfo = null;
            this.itemsContainer = null;
        };
        VirtualizedScrollViewer.prototype.componentWillReceiveProps = function (nextProps) {
            this.setState(this.getCurrentScrollViewerState(nextProps.length));
            this.hasPendingPropertiesUpdate = true;
        };
        VirtualizedScrollViewer.prototype.setState = function (state, callback) {
            var _this = this;
            _super.prototype.setState.call(this, state, function () {
                _this.onDidUpdate();
                if (callback) {
                    callback();
                }
            });
        };
        VirtualizedScrollViewer.prototype.onDidUpdate = function () {
            var _this = this;
            this.itemsContainer = ReactDOM.findDOMNode(this);
            this.renderOffScreenBuffer();
            if (this.setPendingScroll) {
                requestAnimationFrame(function () {
                    if (!_this.isDisposed && _this.setPendingScroll) {
                        _this.setPendingScroll();
                        _this.setPendingScroll = null;
                    }
                });
            }
            if (!this.isComponentInitialized) {
                this.isComponentInitialized = true;
                if (this.props.initializationCompleted) {
                    this.props.initializationCompleted();
                }
            }
            if (this.hasPendingPropertiesUpdate) {
                this.hasPendingPropertiesUpdate = false;
                this.setState(this.getCurrentScrollViewerState(this.props.length));
            }
        };
        VirtualizedScrollViewer.prototype.renderOffScreenBuffer = function () {
            if (this.scrollDirection !== virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.Vertical) {
                if (this.state.offScreenItemsCount > 0) {
                    console.warn("Virtualization attempting offscreen items with horizontal stacking...");
                }
                return;
            }
            this.itemsContainer.style.position = "relative";
            var items = this.itemsContainer.children;
            var itemsCount = this.itemsContainer.childElementCount;
            var topPad = items.item(0);
            var bottomPad = items.item(itemsCount - 1);
            topPad.style.height = this.state.scrollOffset + PIXEL_UNITS;
            bottomPad.style.height =
                this.getRemainingSize(this.state.firstRenderedItemIndex, this.state.lastRenderedItemIndex)
                    + PIXEL_UNITS;
            for (var i = 1; i < this.state.offScreenItemsCount + 1; i++) {
                var child = items.item(i);
                if (child.style !== undefined) {
                    if (!child.style.width) {
                        child.style.width = "100%";
                    }
                    child.style.position = "absolute";
                    child.style.top = "-10000" + PIXEL_UNITS;
                }
            }
            for (var i = this.state.offScreenItemsCount + 1; i < itemsCount - 1; i++) {
                var child = items.item(i);
                if (child.style !== undefined) {
                    child.style.position = "";
                    child.style.top = "";
                    child.style.width = "";
                }
            }
        };
        VirtualizedScrollViewer.prototype.shouldComponentUpdate = function (nextProps, nextState) {
            return nextState.firstRenderedItemIndex !== this.state.firstRenderedItemIndex ||
                nextState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex ||
                nextState.scrollOffset !== this.state.scrollOffset ||
                nextProps !== this.props;
        };
        VirtualizedScrollViewer.prototype.getRemainingSize = function (firstRenderedItemIndex, lastRenderedItemIndex) {
            var length = Math.min(this.props.length, lastRenderedItemIndex - firstRenderedItemIndex + 1);
            var remainingSize = 0;
            var averageItemSize = Math.max(MIN_ITEM_SIZE, this.state.averageItemSize);
            if (lastRenderedItemIndex < (this.props.length - 1)) {
                var scrollSize = averageItemSize * this.props.length;
                remainingSize = scrollSize - ((averageItemSize * (length - this.state.offScreenItemsCount)) + this.state.scrollOffset);
            }
            return remainingSize;
        };
        VirtualizedScrollViewer.prototype.renderList = function (firstRenderedItemIndex, lastRenderedItemIndex) {
            var length = Math.min(this.props.length, lastRenderedItemIndex - firstRenderedItemIndex + 1);
            var scrollOffset = this.state.scrollOffset;
            var remainingSize = this.getRemainingSize(firstRenderedItemIndex, lastRenderedItemIndex);
            var items = this.props.renderItems(firstRenderedItemIndex, length);
            var averageItemSize = Math.max(MIN_ITEM_SIZE, this.state.averageItemSize);
            var listChildren = [];
            if (this.scrollDirection !== virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.None) {
                listChildren.push(this.renderSpacer("first-spacer", scrollOffset, averageItemSize));
            }
            listChildren.push(items);
            if (this.scrollDirection !== virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.None) {
                listChildren.push(this.renderSpacer("last-spacer", remainingSize, averageItemSize));
            }
            return this.props.renderWrapper(listChildren);
        };
        VirtualizedScrollViewer.prototype.renderSpacer = function (key, dimension, averageItemSize) {
            return React.createElement(spacer_1.Spacer, { key: key, childKey: key, dimension: dimension, averageItemSize: averageItemSize, scrollDirection: this.scrollDirection });
        };
        VirtualizedScrollViewer.prototype.render = function () {
            return this.renderList(this.state.firstRenderedItemIndex, this.state.lastRenderedItemIndex);
        };
        VirtualizedScrollViewer.prototype.getDimension = function (vertical, horizontal) {
            return this.scrollDirection === virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.Vertical ? vertical : horizontal;
        };
        VirtualizedScrollViewer.prototype.getListItems = function (itemsContainer) {
            var items = [];
            for (var i = 1; i < itemsContainer.children.length - 1; i++) {
                items.push(itemsContainer.children[i]);
            }
            return items;
        };
        VirtualizedScrollViewer.prototype.getItemBounds = function (item) {
            var bounds = item.getBoundingClientRect();
            var rect = {
                width: bounds.width,
                height: bounds.height,
                left: bounds.left,
                right: bounds.right,
                top: bounds.top,
                bottom: bounds.bottom,
            };
            if (this.scrollDirection === virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.Horizontal) {
                if (rect.width < MIN_ITEM_SIZE) {
                    rect.width = MIN_ITEM_SIZE;
                    rect.right = rect.left + rect.width;
                }
            }
            else if (this.scrollDirection === virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.Vertical) {
                if (rect.height < MIN_ITEM_SIZE) {
                    rect.height = MIN_ITEM_SIZE;
                    rect.bottom = rect.top + rect.height;
                }
            }
            return rect;
        };
        VirtualizedScrollViewer.prototype.areElementsStacked = function (items) {
            if (items.length < 2) {
                return false;
            }
            var firstElement = items[items.length - 2];
            var secondElement = items[items.length - 1];
            var firstElementBounds = firstElement.getBoundingClientRect();
            var secondElementBounds = secondElement.getBoundingClientRect();
            return Math.floor(this.getDimension(secondElementBounds.top, 0)) >= Math.floor(this.getDimension(firstElementBounds.bottom, 1));
        };
        VirtualizedScrollViewer.prototype.calculateItemsSize = function (items, firstItemIndex, lastItemIndex) {
            if (firstItemIndex === void 0) { firstItemIndex = 0; }
            if (lastItemIndex === void 0) { lastItemIndex = items.length - 1; }
            var total = 0;
            var sizes = new Array(lastItemIndex - firstItemIndex + 1);
            for (var i = firstItemIndex; i <= lastItemIndex; i++) {
                var itemBounds = this.getItemBounds(items[i]);
                var size = this.getDimension(itemBounds.height, itemBounds.width);
                total += size;
                sizes[i - firstItemIndex] = size;
            }
            return { total: total, sizes: sizes };
        };
        VirtualizedScrollViewer.prototype.countItemsAndSizeThatFitIn = function (itemsSizes, sizeToFit, allowOverflow, countBackwards) {
            if (allowOverflow === void 0) { allowOverflow = false; }
            if (countBackwards === void 0) { countBackwards = false; }
            var i = 0;
            var itemsSize = 0;
            var getIndex = countBackwards ? function (idx) { return itemsSizes.length - 1 - idx; } : function (idx) { return idx; };
            for (; i < itemsSizes.length; i++) {
                var itemSize = itemsSizes[getIndex(i)];
                if ((itemsSize + itemSize) > sizeToFit) {
                    if (allowOverflow) {
                        i++;
                        itemsSize += itemSize;
                    }
                    break;
                }
                itemsSize += itemSize;
            }
            return { size: itemsSize, count: i };
        };
        VirtualizedScrollViewer.prototype.getCurrentScrollViewerState = function (listLength, returnSameStateOnSmallChanges) {
            if (returnSameStateOnSmallChanges === void 0) { returnSameStateOnSmallChanges = false; }
            var scrollInfo = this.getScrollInfo();
            var viewportSafetyMarginBefore = this.props.viewportSafetyMarginBefore || 7500;
            var viewportSafetyMarginAfter = this.props.viewportSafetyMarginAfter || 7500;
            var forceRecalculate = false;
            if (scrollInfo.scrollOffset < (scrollInfo.viewportSize / 4) && (this.state.firstRenderedItemIndex > 0 || this.state.offScreenItemsCount > 0)) {
                forceRecalculate = true;
            }
            var items = this.getListItems(this.itemsContainer);
            if (this.scrollDirection !== virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.Vertical
                || !this.areElementsStacked(items)) {
                this.scrollDirection = virtualized_scroll_viewer_extensions_3.ScrollExtensions.ScrollDirection.None;
                return {
                    firstRenderedItemIndex: 0,
                    lastRenderedItemIndex: Math.max(1, this.props.length - 1),
                    averageItemSize: 0,
                    scrollOffset: 0,
                    offScreenItemsCount: 0,
                    effectiveScrollOffset: scrollInfo.scrollOffset,
                };
            }
            var lastSpacerBounds = this.itemsContainer.lastElementChild.getBoundingClientRect();
            if (this.getDimension(lastSpacerBounds.bottom, lastSpacerBounds.right) < -100) {
                return this.state;
            }
            var renderedItemsSizes = this.calculateItemsSize(items);
            var offScreenItemsCount = this.state.offScreenItemsCount;
            var onScreenItems = renderedItemsSizes.sizes.slice(offScreenItemsCount);
            var onScreenItemsSize = onScreenItems.reduce(function (p, c) { return p + c; });
            var averageItemSize = onScreenItemsSize / (onScreenItems.length * 1.0);
            if (this.state.averageItemSize !== 0) {
                averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
            }
            var itemsFittingViewportCount = Math.ceil(scrollInfo.viewportSize / averageItemSize);
            var maxOffScreenItemsCount = itemsFittingViewportCount;
            var safetyItemsCountBefore = Math.ceil(viewportSafetyMarginBefore / averageItemSize);
            var safetyItemsCounteAfter = Math.ceil(viewportSafetyMarginAfter / averageItemSize);
            var renderedItemsCountNew = Math.min(listLength, itemsFittingViewportCount + safetyItemsCountBefore + safetyItemsCounteAfter + offScreenItemsCount);
            var scrollOffset = this.state.scrollOffset;
            var firstRenderedItemIndex = this.state.firstRenderedItemIndex;
            var viewportLowerMargin = Math.max(scrollInfo.viewportLowerBound - viewportSafetyMarginBefore, 0);
            var firstSpacerBounds = this.itemsContainer.firstElementChild.getBoundingClientRect();
            var firstItemOffset = this.getDimension(firstSpacerBounds.bottom, firstSpacerBounds.right);
            if (!forceRecalculate && Math.abs(firstItemOffset - viewportLowerMargin) <= onScreenItemsSize) {
                if (firstItemOffset < viewportLowerMargin) {
                    var itemsGoingOffScreen = this.countItemsAndSizeThatFitIn(onScreenItems, Math.abs(viewportLowerMargin - firstItemOffset));
                    if (itemsGoingOffScreen.count > 0) {
                        scrollOffset += itemsGoingOffScreen.size;
                        offScreenItemsCount += itemsGoingOffScreen.count;
                        if (offScreenItemsCount > maxOffScreenItemsCount) {
                            var leavingItemsCount = offScreenItemsCount - maxOffScreenItemsCount;
                            firstRenderedItemIndex += leavingItemsCount;
                            offScreenItemsCount = maxOffScreenItemsCount;
                        }
                    }
                }
                else if (firstItemOffset > viewportLowerMargin) {
                    var availableSpace = Math.abs(firstItemOffset - viewportLowerMargin);
                    var offScreenItems = renderedItemsSizes.sizes.slice(0, offScreenItemsCount);
                    var itemsGoingOnScreen = this.countItemsAndSizeThatFitIn(offScreenItems, availableSpace, true, true);
                    if (itemsGoingOnScreen.count > 0) {
                        scrollOffset = Math.max(0, scrollOffset - itemsGoingOnScreen.size);
                        offScreenItemsCount -= itemsGoingOnScreen.count;
                        availableSpace -= itemsGoingOnScreen.size;
                    }
                    if (availableSpace > 0) {
                        if (offScreenItemsCount !== 0) {
                            throw "offScreenItemsCount should be 0";
                        }
                        var enteringItemsCount = Math.min(firstRenderedItemIndex, Math.ceil(availableSpace / averageItemSize));
                        firstRenderedItemIndex -= enteringItemsCount;
                        scrollOffset -= enteringItemsCount * averageItemSize;
                    }
                    if (offScreenItemsCount < maxOffScreenItemsCount) {
                        var enteringItemsCount = Math.min(firstRenderedItemIndex, maxOffScreenItemsCount - offScreenItemsCount);
                        firstRenderedItemIndex -= enteringItemsCount;
                        offScreenItemsCount += enteringItemsCount;
                    }
                }
            }
            else {
                var startOffset = this.getDimension(firstSpacerBounds.top, firstSpacerBounds.left);
                if (startOffset < scrollInfo.viewportLowerBound) {
                    startOffset = Math.abs(startOffset - scrollInfo.viewportLowerBound);
                }
                else {
                    startOffset = 0;
                }
                firstRenderedItemIndex = Math.max(0, Math.floor(startOffset / averageItemSize) - 1);
                offScreenItemsCount = 0;
                if (firstRenderedItemIndex > 0) {
                    firstRenderedItemIndex = Math.max(0, firstRenderedItemIndex - Math.ceil(viewportSafetyMarginBefore / averageItemSize));
                }
                firstRenderedItemIndex = Math.max(0, Math.min(firstRenderedItemIndex, listLength - 1 - renderedItemsCountNew));
                scrollOffset = firstRenderedItemIndex * averageItemSize;
            }
            if (firstRenderedItemIndex === 0 && offScreenItemsCount === 0) {
                scrollOffset = 0;
            }
            var beforeCount = Math.max(Math.ceil(scrollOffset / averageItemSize), 0);
            var newRenderedItemsCountNew = Math.min(listLength, itemsFittingViewportCount + Math.min(safetyItemsCountBefore, beforeCount) + safetyItemsCounteAfter + offScreenItemsCount);
            var lastRenderedItemIndex = Math.min(listLength - 1, firstRenderedItemIndex + newRenderedItemsCountNew);
            return {
                firstRenderedItemIndex: firstRenderedItemIndex,
                lastRenderedItemIndex: lastRenderedItemIndex,
                averageItemSize: averageItemSize,
                scrollOffset: scrollOffset,
                offScreenItemsCount: offScreenItemsCount,
                effectiveScrollOffset: scrollInfo.scrollOffset,
            };
        };
        Object.defineProperty(VirtualizedScrollViewer.prototype, "isScrolling", {
            get: function () {
                return this.isScrollOngoing;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(VirtualizedScrollViewer.prototype, "isInitialized", {
            get: function () {
                return this.isComponentInitialized;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(VirtualizedScrollViewer.prototype, "isDisposed", {
            get: function () {
                return !this.itemsContainer;
            },
            enumerable: true,
            configurable: true
        });
        VirtualizedScrollViewer.prototype.scrollToIndex = function (index) {
            var _this = this;
            this.internalSetScrollOffset(function () {
                var scrollInfo = _this.getScrollInfo();
                var scrollHost = scrollInfo.scrollHost;
                var scrollOffset = _this.state.averageItemSize * index;
                var firstVisibleItemOffset = scrollInfo.scrollOffset;
                var needsScroll = false;
                if (scrollOffset < firstVisibleItemOffset) {
                    needsScroll = true;
                }
                else {
                    var lastVisibleItemOffset = firstVisibleItemOffset + scrollInfo.viewportSize - _this.state.averageItemSize;
                    if (scrollOffset > lastVisibleItemOffset) {
                        scrollOffset = scrollOffset - (lastVisibleItemOffset - firstVisibleItemOffset);
                        needsScroll = true;
                    }
                }
                if (!needsScroll) {
                    return;
                }
                var scrollX = _this.getDimension(undefined, scrollOffset);
                var scrollY = _this.getDimension(scrollOffset, undefined);
                virtualized_scroll_viewer_extensions_3.ScrollExtensions.setScrollOffset(scrollHost, scrollX, scrollY, false);
            });
        };
        VirtualizedScrollViewer.prototype.scrollToOffset = function (x, y) {
            var _this = this;
            this.internalSetScrollOffset(function () {
                var scrollInfo = _this.getScrollInfo();
                var scrollHost = scrollInfo.scrollHost;
                var scrollX = _this.getDimension(undefined, x);
                var scrollY = _this.getDimension(y, undefined);
                virtualized_scroll_viewer_extensions_3.ScrollExtensions.setScrollOffset(scrollHost, scrollX, scrollY);
            });
        };
        VirtualizedScrollViewer.prototype.internalSetScrollOffset = function (setScroll) {
            if (this.isInitialized) {
                setScroll();
            }
            else {
                this.setPendingScroll = setScroll;
            }
        };
        return VirtualizedScrollViewer;
    }(React.Component));
    exports.VirtualizedScrollViewer = VirtualizedScrollViewer;
});
