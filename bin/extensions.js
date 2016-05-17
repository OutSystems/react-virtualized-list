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
                    scrollDirection: OVERFLOW_REGEX.test(elementComputedStyle.overflowX) ? ScrollDirection.Horizontal : ScrollDirection.Vertical
                };
            }
        }
        return getScrollHostInfo(element.parentElement, excludeStaticParent);
    }
    exports.getScrollHostInfo = getScrollHostInfo;
});
//# sourceMappingURL=extensions.js.map