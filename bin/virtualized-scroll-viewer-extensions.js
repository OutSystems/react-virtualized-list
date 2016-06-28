define(["require", "exports"], function (require, exports) {
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
                    scrollDirection: ScrollDirection.Vertical
                };
            }
            var elementComputedStyle = getComputedStyle(element);
            excludeStaticParent = excludeStaticParent || elementComputedStyle.position === "absolute";
            if (!excludeStaticParent || elementComputedStyle.position !== "static") {
                var isOverFlow = OVERFLOW_REGEX.test(elementComputedStyle.overflow + elementComputedStyle.overflowY + elementComputedStyle.overflowX);
                if (isOverFlow) {
                    if (!element.hasAttribute(NON_SCROLLABLE_ELEMENT_ATRIBUTE)) {
                        return {
                            scrollHost: element,
                            scrollDirection: OVERFLOW_REGEX.test(elementComputedStyle.overflowY) ? ScrollDirection.Vertical : ScrollDirection.Horizontal
                        };
                    }
                }
            }
            return getScrollHostInfo(element.parentElement, excludeStaticParent);
        }
        ScrollExtensions.getScrollHostInfo = getScrollHostInfo;
        function getScrollInfo(scrollHostInfo) {
            var scrollHost = scrollHostInfo.scrollHost;
            if (scrollHost instanceof Window) {
                return {
                    scrollHost: scrollHost,
                    scrollX: scrollHost.scrollX,
                    scrollY: scrollHost.scrollY,
                    viewport: { x: 0, y: 0, height: scrollHost.innerHeight, width: scrollHost.innerWidth }
                };
            }
            else if (scrollHost instanceof HTMLElement) {
                return {
                    scrollHost: scrollHost,
                    scrollX: scrollHost.scrollLeft,
                    scrollY: scrollHost.scrollTop,
                    viewport: { x: 0, y: 0, height: scrollHost.clientHeight, width: scrollHost.clientWidth }
                };
            }
            return null;
        }
        ScrollExtensions.getScrollInfo = getScrollInfo;
        function setScrollOffset(scrollHost, x, y) {
            if (scrollHost instanceof Window) {
                scrollHost.scroll(scrollX, scrollY);
            }
            else {
                scrollHost.scrollTop = y;
                scrollHost.scrollLeft = x;
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
                throw new TypeError('Cannot convert undefined or null to object');
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
