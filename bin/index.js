var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define("virtualized-scroll-viewer-extensions", ["require", "exports"], function (require, exports) {
    "use strict";
    var ScrollExtensions;
    (function (ScrollExtensions) {
        var OVERFLOW_REGEX = /(auto|scroll)/;
        var NON_SCROLLABLE_ELEMENT_ATRIBUTE = "data-not-scrollable";
        (function (ScrollDirection) {
            ScrollDirection[ScrollDirection["Horizontal"] = 0] = "Horizontal";
            ScrollDirection[ScrollDirection["Vertical"] = 1] = "Vertical";
        })(ScrollExtensions.ScrollDirection || (ScrollExtensions.ScrollDirection = {}));
        var ScrollDirection = ScrollExtensions.ScrollDirection;
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
define("animated-group", ["require", "exports", "react", "react-dom", "virtualized-scroll-viewer-extensions"], function (require, exports, React, ReactDOM, virtualized_scroll_viewer_extensions_1) {
    "use strict";
    var ANIMATION_APPEAR = "-appear";
    var ANIMATION_ENTER = "-enter";
    var ANIMATION_LEAVE = "-leave";
    var ANIMATION_ACTIVE = "-active";
    var TICK = 17;
    var AnimatedGroup = (function (_super) {
        __extends(AnimatedGroup, _super);
        function AnimatedGroup() {
            _super.apply(this, arguments);
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
            _super.apply(this, arguments);
            this.transitionTimeouts = [];
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
define("animated-size-group", ["require", "exports", "animated-group"], function (require, exports, animated_group_1) {
    "use strict";
    var PIXELS_UNIT = "px";
    var AnimatedSizeGroup = (function (_super) {
        __extends(AnimatedSizeGroup, _super);
        function AnimatedSizeGroup() {
            _super.apply(this, arguments);
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
            _super.apply(this, arguments);
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
define("images", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.Images = [
        "http://24.media.tumblr.com/tumblr_m3sdvsBdJU1qzzim1o1_500.jpg",
        "http://25.media.tumblr.com/tumblr_m1zlwpDjAh1qze0hyo1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_m1wlprhmJY1qjmz65o1_500.gif",
        "http://25.media.tumblr.com/tumblr_lkvj1aVSQg1qbe5pxo1_1280.jpg",
        "http://24.media.tumblr.com/Jjkybd3nSk6rkrg7VU07HTxGo1_500.jpg",
        "http://29.media.tumblr.com/tumblr_lr64gw71Ag1qjqdfao1_500.png",
        "http://25.media.tumblr.com/tumblr_m3jfavG5eN1r73wdao1_500.jpg",
        "http://24.media.tumblr.com/tumblr_m35g24e4z11qzex9io1_1280.jpg",
        "http://24.media.tumblr.com/tumblr_m1nmoduuK21qzex9io1_1280.jpg",
        "http://24.media.tumblr.com/YyXwbMbaOoa3u0trL7uZedmPo1_400.gif",
        "http://25.media.tumblr.com/tumblr_lh0dypa6W21qgnva2o1_500.jpg",
        "http://24.media.tumblr.com/tumblr_m2o12tB0pn1qze0hyo1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_kp3d65xe3l1qz9bf5o1_500.jpg",
        "http://24.media.tumblr.com/tumblr_lycrqshTFf1r38hk2o1_400.jpg",
        "http://26.media.tumblr.com/tumblr_ly9qoi8doW1qbt33io1_500.jpg",
        "http://24.media.tumblr.com/tumblr_m1um2sieES1qzex9io1_1280.jpg",
        "http://26.media.tumblr.com/tumblr_ltwqocDfjo1qdvbl3o1_1280.jpg",
        "http://29.media.tumblr.com/tumblr_m0r6hmzVYx1qbhms5o1_500.jpg",
        "http://30.media.tumblr.com/tumblr_m1pggypRMz1qjahcpo1_500.jpg",
        "http://25.media.tumblr.com/tumblr_m2u72wnvk11qhwmnpo1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_lrcyxlchQZ1qfpssto1_r1_500.gif",
        "http://25.media.tumblr.com/tumblr_ln2uaqQ5Rz1qdvbl3o1_1280.jpg",
        "http://29.media.tumblr.com/tumblr_lyvsgqn1H51qbvr04o1_500.gif",
        "http://24.media.tumblr.com/tumblr_ly2lzj9yzP1qk4s2co1_1280.jpg",
        "http://24.media.tumblr.com/tumblr_lz032duhSH1qa10uwo1_1280.png",
        "http://24.media.tumblr.com/tumblr_m1fvvw2cS71qz5dg8o1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_lz920fsYPB1rowplqo1_1280.jpg",
        "http://27.media.tumblr.com/tumblr_m0xhjbRFCp1r6b7kmo1_500.gif",
        "http://24.media.tumblr.com/tumblr_m2p47tjFdg1qa7xfro1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_m4ilt9rDjh1r6jd7fo1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_m3fdtouawb1qhwmnpo1_1280.jpg",
        "http://24.media.tumblr.com/tumblr_m0iuyhHhwD1qbe5pxo1_500.jpg",
        "http://26.media.tumblr.com/tumblr_ly17xkVXnc1qbt33io1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_m8im7ptqs81rdogh7o1_1280.jpg",
        "http://27.media.tumblr.com/tumblr_m1pgyeuGDs1qjahcpo1_250.jpg",
        "http://24.media.tumblr.com/tumblr_lvbpb9op931qc1sduo1_500.jpg",
        "http://26.media.tumblr.com/tumblr_lhzo4g1ZiG1qfyzelo1_500.jpg",
        "http://24.media.tumblr.com/tumblr_luowrcYoTj1qdth8zo1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_lee9o3ssrv1qcn249o1_400.gif",
        "http://24.media.tumblr.com/Jjkybd3nSbuwu42gf8MzkTik_500.jpg",
        "http://25.media.tumblr.com/tumblr_m4ijv28wlO1r6jd7fo1_500.jpg",
        "http://26.media.tumblr.com/tumblr_m20fbkANHa1qzex9io1_1280.jpg",
        "http://24.media.tumblr.com/tumblr_m0uo7n1nA01qzv52ko1_1280.jpg",
        "http://25.media.tumblr.com/tumblr_loxwm8v8fH1qjmniro1_400.gif",
        "http://25.media.tumblr.com/tumblr_m0oki3v6RC1qi9p54o1_500.jpg",
        "http://25.media.tumblr.com/tumblr_m7gbozreKr1qzex9io1_1280.jpg",
        "http://29.media.tumblr.com/tumblr_lrftlutgUt1qgn992o1_500.jpg",
        "http://25.media.tumblr.com/tumblr_m109jwrekN1qjc1a7o1_500.jpg",
        "http://24.media.tumblr.com/tumblr_m4mi59MLm91qz5l2xo1_500.png",
        "http://24.media.tumblr.com/tumblr_m4r5g38v4z1qh66wqo1_1280.jpg"
    ];
});
define("virtualized-scroll-viewer", ["require", "exports", "react", "react-dom", "virtualized-scroll-viewer-extensions"], function (require, exports, React, ReactDOM, virtualized_scroll_viewer_extensions_2) {
    "use strict";
    function insideiOSWebView() {
        return !navigator.standalone && /(iPad)|(iPhone)/i.test(navigator.userAgent) && !/safari/i.test(navigator.userAgent);
    }
    var SCROLL_EVENT_NAME = "scroll";
    var RESIZE_EVENT_NAME = "resize";
    var PIXEL_UNITS = "px";
    var FLEXBOX_DISPLAY = document.createElement("p").style.flex === undefined ? "-webkit-flex" : "flex";
    var DEFAULT_BUFFER_SIZE = 3;
    var BUFFER_MULTIPLIER = insideiOSWebView() ? 4 : 1;
    var VirtualizedScrollViewer = (function (_super) {
        __extends(VirtualizedScrollViewer, _super);
        function VirtualizedScrollViewer(props, context) {
            _super.call(this, props, context);
            this.scrollDirection = virtualized_scroll_viewer_extensions_2.ScrollExtensions.ScrollDirection.Vertical;
            this.hasPendingPropertiesUpdate = false;
            this.isScrollOngoing = false;
            this.isComponentInitialized = false;
            this.scrollHandler = this.handleScroll.bind(this);
            this.state = {
                firstRenderedItemIndex: 0,
                lastRenderedItemIndex: 1,
                averageItemSize: 0,
                scrollOffset: 0,
                offScreenItemsCount: 0,
            };
        }
        VirtualizedScrollViewer.prototype.getScrollHostInfo = function () {
            if (!this.scrollHostInfo) {
                this.scrollHostInfo = virtualized_scroll_viewer_extensions_2.ScrollExtensions.getScrollHostInfo(this.itemsContainer);
            }
            return this.scrollHostInfo;
        };
        VirtualizedScrollViewer.prototype.getScrollInfo = function () {
            var scrollHostInfo = this.getScrollHostInfo();
            var scrollHost = scrollHostInfo.scrollHost;
            var scrollInfo = virtualized_scroll_viewer_extensions_2.ScrollExtensions.getScrollInfo(scrollHost);
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
            var _this = this;
            this.itemsContainer = ReactDOM.findDOMNode(this);
            var attachScrollListener = function () {
                if (_this.isDisposed) {
                    return;
                }
                _this.addScrollHandler();
                _this.scrollDirection = _this.getScrollHostInfo().scrollDirection;
            };
            if (this.props.length === 0) {
                requestAnimationFrame(function () { return setTimeout(attachScrollListener, 1); });
            }
            else {
                attachScrollListener();
            }
            this.setState(this.getCurrentScrollViewerState(this.props.length));
        };
        VirtualizedScrollViewer.prototype.componentWillUnmount = function () {
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
            this.isComponentInitialized = true;
            this.itemsContainer = ReactDOM.findDOMNode(this);
            this.renderOffScreenBuffer();
            if (this.setPendingScroll) {
                this.setPendingScroll();
                this.setPendingScroll = null;
            }
            if (this.hasPendingPropertiesUpdate) {
                this.hasPendingPropertiesUpdate = false;
                this.setState(this.getCurrentScrollViewerState(this.props.length));
            }
        };
        VirtualizedScrollViewer.prototype.renderOffScreenBuffer = function () {
            this.itemsContainer.style.position = "relative";
            var items = this.getListItems(this.itemsContainer);
            for (var _i = 0, _a = items.slice(0, this.state.offScreenItemsCount); _i < _a.length; _i++) {
                var item = _a[_i];
                var child = item;
                if (child.style !== undefined) {
                    child.style.position = "absolute";
                    child.style.top = "-10000" + PIXEL_UNITS;
                }
            }
            for (var _b = 0, _c = items.slice(this.state.offScreenItemsCount); _b < _c.length; _b++) {
                var item = _c[_b];
                var child = item;
                if (child.style !== undefined) {
                    child.style.position = "";
                    child.style.top = "";
                }
            }
        };
        VirtualizedScrollViewer.prototype.handleScroll = function (scrollEvent) {
            var _this = this;
            if (this.pendingScrollAsyncUpdateHandle) {
                return;
            }
            this.pendingScrollAsyncUpdateHandle = requestAnimationFrame(function () {
                if (_this.isDisposed) {
                    return;
                }
                try {
                    var newState = _this.getCurrentScrollViewerState(_this.props.length);
                    _this.isScrollOngoing = true;
                    _this.setState(newState, function () { return _this.isScrollOngoing = false; });
                }
                finally {
                    _this.pendingScrollAsyncUpdateHandle = 0;
                }
                if (_this.props.scrollChanged) {
                    _this.props.scrollChanged();
                }
            });
        };
        VirtualizedScrollViewer.prototype.shouldComponentUpdate = function (nextProps, nextState) {
            return nextState.firstRenderedItemIndex !== this.state.firstRenderedItemIndex ||
                nextState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex ||
                nextState.scrollOffset !== this.state.scrollOffset ||
                nextProps !== this.props;
        };
        VirtualizedScrollViewer.prototype.renderList = function (firstRenderedItemIndex, lastRenderedItemIndex) {
            var scrollOffset = this.state.scrollOffset;
            var length = Math.min(this.props.length, lastRenderedItemIndex - firstRenderedItemIndex + 1);
            var items = this.props.renderItems(firstRenderedItemIndex, length);
            var remainingSize = 0;
            if (lastRenderedItemIndex < (this.props.length - 1)) {
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
                display: FLEXBOX_DISPLAY,
            };
            if (this.scrollDirection === virtualized_scroll_viewer_extensions_2.ScrollExtensions.ScrollDirection.Horizontal) {
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
            return this.renderList(this.state.firstRenderedItemIndex, this.state.lastRenderedItemIndex);
        };
        VirtualizedScrollViewer.prototype.getDimension = function (vertical, horizontal) {
            return this.scrollDirection === virtualized_scroll_viewer_extensions_2.ScrollExtensions.ScrollDirection.Horizontal ? horizontal : vertical;
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
                bottom: bounds.bottom,
            };
            if (this.scrollDirection === virtualized_scroll_viewer_extensions_2.ScrollExtensions.ScrollDirection.Horizontal) {
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
            var firstElement = items[items.length - 2];
            var secondElement = items[items.length - 1];
            var firstElementBounds = firstElement.getBoundingClientRect();
            var secondElementBounds = secondElement.getBoundingClientRect();
            return this.getDimension(secondElementBounds.top, 0) >= this.getDimension(firstElementBounds.bottom, 1);
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
        VirtualizedScrollViewer.prototype.getCurrentScrollViewerState = function (listLength) {
            var items = this.getListItems(this.itemsContainer);
            if (!this.areElementsStacked(items)) {
                return {
                    firstRenderedItemIndex: 0,
                    lastRenderedItemIndex: Math.max(1, this.props.length - 1),
                    averageItemSize: 0,
                    scrollOffset: 0,
                    offScreenItemsCount: 0,
                };
            }
            var scrollInfo = this.getScrollInfo();
            var renderedItemsSizes = this.calculateItemsSize(items);
            var offScreenItemsCount = this.state.offScreenItemsCount;
            var onScreenItems = renderedItemsSizes.sizes.slice(offScreenItemsCount);
            var onScreenItemsSize = onScreenItems.reduce(function (p, c) { return p + c; });
            var averageItemSize = onScreenItemsSize / (onScreenItems.length * 1.0);
            if (this.state.averageItemSize !== 0) {
                averageItemSize = (0.8 * this.state.averageItemSize) + (0.2 * averageItemSize);
            }
            var pageBufferSize = (this.props.pageBufferSize || DEFAULT_BUFFER_SIZE) * BUFFER_MULTIPLIER;
            var viewportSafetyMargin = scrollInfo.viewportSize * (pageBufferSize / 2);
            var itemsFittingViewportCount = Math.ceil(scrollInfo.viewportSize / averageItemSize);
            var maxOffScreenItemsCount = Math.ceil(scrollInfo.viewportSize * 1.5 / averageItemSize);
            var safetyItemsCount = Math.ceil(viewportSafetyMargin * 2) / averageItemSize;
            var renderedItemsCount = itemsFittingViewportCount + safetyItemsCount + maxOffScreenItemsCount;
            var scrollOffset = this.state.scrollOffset;
            var firstRenderedItemIndex = this.state.firstRenderedItemIndex;
            var viewportLowerMargin = scrollInfo.viewportLowerBound - viewportSafetyMargin;
            var firstSpacerBounds = this.itemsContainer.children[0].getBoundingClientRect();
            var firstItemOffset = this.getDimension(firstSpacerBounds.bottom, firstSpacerBounds.right);
            if (Math.abs(firstItemOffset - viewportLowerMargin) <= onScreenItemsSize) {
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
                    firstRenderedItemIndex = Math.max(0, firstRenderedItemIndex - Math.ceil(viewportSafetyMargin / averageItemSize));
                }
                scrollOffset = firstRenderedItemIndex * averageItemSize;
            }
            if (firstRenderedItemIndex === 0 && offScreenItemsCount === 0) {
                scrollOffset = 0;
            }
            var lastRenderedItemIndex = Math.min(listLength - 1, firstRenderedItemIndex + renderedItemsCount);
            return {
                firstRenderedItemIndex: firstRenderedItemIndex,
                lastRenderedItemIndex: lastRenderedItemIndex,
                averageItemSize: averageItemSize,
                scrollOffset: scrollOffset,
                offScreenItemsCount: offScreenItemsCount,
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
        VirtualizedScrollViewer.prototype.setScrollOffset = function (x, y) {
            var scrollInfo = this.getScrollInfo();
            var scrollHost = scrollInfo.scrollHost;
            var scrollX = this.getDimension(undefined, x);
            var scrollY = this.getDimension(y, undefined);
            var updateScroll = function () { virtualized_scroll_viewer_extensions_2.ScrollExtensions.setScrollOffset(scrollHost, scrollX, scrollY); };
            if (this.isInitialized) {
                updateScroll();
            }
            else {
                this.setPendingScroll = updateScroll;
            }
        };
        return VirtualizedScrollViewer;
    }(React.Component));
    exports.VirtualizedScrollViewer = VirtualizedScrollViewer;
});
define("virtualized-list", ["require", "exports", "react", "virtualized-scroll-viewer", "animated-size-group"], function (require, exports, React, virtualized_scroll_viewer_1, animated_size_group_1) {
    "use strict";
    var SCROLL_VIEWER_COMPONENT_REF = "scrollViewer";
    var VirtualizedList = (function (_super) {
        __extends(VirtualizedList, _super);
        function VirtualizedList() {
            _super.apply(this, arguments);
        }
        VirtualizedList.prototype.renderItem = function (index) {
            var even = index % 2 === 0;
            var className = "list-item " + (even ? "even" : "odd");
            var item = this.props.list[index];
            return (React.createElement("div", {key: "i-" + index, className: className}, "Item ", item.index, React.createElement("img", {src: item.image})));
        };
        VirtualizedList.prototype.componentDidMount = function () {
            this.getScrollViewer().setScrollOffset(0, 1000);
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
        Object.defineProperty(VirtualizedList.prototype, "shouldSuspendAnimations", {
            get: function () {
                var scrollViewer = this.getScrollViewer();
                return !scrollViewer || !scrollViewer.isInitialized || scrollViewer.isScrolling;
            },
            enumerable: true,
            configurable: true
        });
        VirtualizedList.prototype.createScrollViewerContainer = function (children) {
            var _this = this;
            var listAttributes = {
                className: "list",
                component: "div",
                shouldSuspendAnimations: function () { return _this.shouldSuspendAnimations; },
                transitionName: "example",
            };
            return React.createElement(animated_size_group_1.AnimatedSizeGroup, listAttributes, children);
        };
        VirtualizedList.prototype.render = function () {
            var _this = this;
            return (React.createElement(virtualized_scroll_viewer_1.VirtualizedScrollViewer, {renderItems: function (start, length) { return _this.renderItems(start, length); }, renderWrapper: function (children) { return _this.createScrollViewerContainer(children); }, length: this.props.list.length, pageBufferSize: this.props.pageBufferSize, ref: SCROLL_VIEWER_COMPONENT_REF}));
        };
        VirtualizedList.prototype.setScrollOffset = function (offset) {
            this.getScrollViewer().setScrollOffset(undefined, offset);
        };
        return VirtualizedList;
    }(React.Component));
    exports.VirtualizedList = VirtualizedList;
});
define("index", ["require", "exports", "react", "react-dom", "virtualized-list", "images"], function (require, exports, React, ReactDOM, virtualized_list_1, images_1) {
    "use strict";
    var App = (function (_super) {
        __extends(App, _super);
        function App() {
            _super.call(this);
            this.state = {
                items: 100,
                pageBufferSize: 4
            };
        }
        App.prototype.refresh = function () {
            this.setState({
                items: parseInt(this.refs["itemsCount"].value),
                pageBufferSize: parseInt(this.refs["pageBufferSize"].value)
            });
        };
        App.prototype.setScroll = function () {
            var offset = parseInt(this.refs["scrollOffset"].value);
            this.refs["list"].setScrollOffset(offset);
        };
        App.prototype.render = function () {
            var imagesCount = images_1.Images.length;
            var list = [];
            for (var i = 0; i < this.state.items; i++) {
                list.push({ image: images_1.Images[i % imagesCount], index: i });
            }
            return (React.createElement("div", null, React.createElement("h1", null, "Virtualized list example"), React.createElement("br", null), React.createElement("input", {ref: "itemsCount", placeholder: "Number of items", defaultValue: this.state.items + ""}), React.createElement("button", {onClick: this.refresh.bind(this)}, "Set Items"), React.createElement("br", null), React.createElement("br", null), React.createElement("input", {ref: "pageBufferSize", placeholder: "Number extra invisible of items rendered", defaultValue: this.state.pageBufferSize + ""}), React.createElement("button", {onClick: this.refresh.bind(this)}, "Set Buffer Size"), React.createElement("br", null), React.createElement("br", null), React.createElement("input", {ref: "scrollOffset", placeholder: "Scroll offset", defaultValue: this.state.items + ""}), React.createElement("button", {onClick: this.setScroll.bind(this)}, "Set Scroll"), React.createElement("br", null), React.createElement("br", null), React.createElement(virtualized_list_1.VirtualizedList, {ref: "list", list: list, pageBufferSize: this.state.pageBufferSize})));
        };
        return App;
    }(React.Component));
    ReactDOM.render(React.createElement(App), document.getElementById("container"));
});
