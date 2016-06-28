
export module ScrollExtensions {
    const OVERFLOW_REGEX: RegExp = /(auto|scroll)/;
    const NON_SCROLLABLE_ELEMENT_ATRIBUTE: string = "data-not-scrollable";

    export enum ScrollDirection {
        Horizontal,
        Vertical
    }

    export interface IScrollHostInfo {
        scrollHost: Element | Window;
        scrollDirection: ScrollDirection;
    }
    
    export interface IScrollInfo {
        scrollHost: Element | Window;
        viewport: { x: number, y: number, height: number, width: number };
        scrollX: number;
        scrollY: number;
    }

    // returns the first DOM element that is scrollable implementation copied from jquery .scrollParent()
    export function getScrollHostInfo(element: Element, excludeStaticParent?: boolean): IScrollHostInfo {
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
                // some elements are special and should not be scrollable
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
    
    export function getScrollInfo(scrollHostInfo: IScrollHostInfo): IScrollInfo {
        let scrollHost = scrollHostInfo.scrollHost;
        
        if (scrollHost instanceof Window) {
            return {
                scrollHost: scrollHost,
                scrollX: scrollHost.scrollX,
                scrollY: scrollHost.scrollY, 
                viewport: { x: 0, y: 0, height: scrollHost.innerHeight, width: scrollHost.innerWidth }
            };
        } else if (scrollHost instanceof HTMLElement) {
            return {
                scrollHost: scrollHost,
                scrollX:  scrollHost.scrollLeft,
                scrollY: scrollHost.scrollTop,
                viewport: { x: 0, y: 0, height: scrollHost.clientHeight, width: scrollHost.clientWidth }
            };
        }
        
        return null;
    }
    
    export function setScrollOffset(scrollHost: Element | Window, x: number, y: number): void {
        if (scrollHost instanceof Window) {
            scrollHost.scroll(scrollX, scrollY);
        } else {
            scrollHost.scrollTop = y;
            scrollHost.scrollLeft = x;
        }
    }
}

export module ObjectExtensions {
    export function assign(target: any, ...sources: any[]): Object {
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
}
