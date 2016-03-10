// returns the first DOM element that is scrollable
// implementation copied from jquery .scrollParent()
const OVERFLOW_REGEX: RegExp = /(auto|scroll)/;

export function getScrollHost(element: HTMLElement, excludeStaticParent?: boolean): HTMLElement | Window {
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