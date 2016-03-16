// returns the first DOM element that is scrollable
// implementation copied from jquery .scrollParent()
const OVERFLOW_REGEX: RegExp = /(auto|scroll)/;

export enum ScrollDirection {
    Horizontal,
    Vertical
}

export interface IScrollHostInfo {
    scrollHost: HTMLElement | Window;
    scrollDirection: ScrollDirection;
}

export function getScrollHostInfo(element: HTMLElement, excludeStaticParent?: boolean): IScrollHostInfo {
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