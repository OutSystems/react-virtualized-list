define(["require", "exports"], function (require, exports) {
    "use strict";
    var OVERFLOW_REGEX = /(auto|scroll)/;
    (function (ScrollDirection) {
        ScrollDirection[ScrollDirection["Horizontal"] = 0] = "Horizontal";
        ScrollDirection[ScrollDirection["Vertical"] = 1] = "Vertical";
    })(exports.ScrollDirection || (exports.ScrollDirection = {}));
    var ScrollDirection = exports.ScrollDirection;
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
                return {
                    scrollHost: element,
                    scrollDirection: OVERFLOW_REGEX.test(elementComputedStyle.overflowY) ? ScrollDirection.Vertical : ScrollDirection.Horizontal
                };
            }
        }
        return getScrollHostInfo(element.parentElement, excludeStaticParent);
    }
    exports.getScrollHostInfo = getScrollHostInfo;
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
    exports.assign = assign;
});
