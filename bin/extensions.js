define(["require", "exports"], function (require, exports) {
    var OVERFLOW_REGEX = /(auto|scroll)/;
    function getScrollHost(element, excludeStaticParent) {
        if (element === null || element === undefined || element instanceof Document) {
            return window;
        }
        var elementComputedStyle = getComputedStyle(element);
        excludeStaticParent = excludeStaticParent || elementComputedStyle.position === "absolute";
        if (!excludeStaticParent || elementComputedStyle.position !== "static") {
            var isOverFlow = OVERFLOW_REGEX.test(elementComputedStyle.overflow + elementComputedStyle.overflowY + elementComputedStyle.overflowX);
            if (isOverFlow) {
                return element;
            }
        }
        return getScrollHost(element.parentElement, excludeStaticParent);
    }
    exports.getScrollHost = getScrollHost;
});
//# sourceMappingURL=extensions.js.map