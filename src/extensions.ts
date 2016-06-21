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
                scrollDirection: OVERFLOW_REGEX.test(elementComputedStyle.overflowY) ? ScrollDirection.Vertical : ScrollDirection.Horizontal
            };
        }
    }

    return getScrollHostInfo(element.parentElement, excludeStaticParent);
}

export function assign(target: any, ...sources: any[]) {
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