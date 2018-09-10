import * as React from "react";
import * as ReactDOM from "react-dom";
import { ScrollExtensions } from "./virtualized-scroll-viewer-extensions";


export interface SpacerProps extends React.Props<{}> {
    childKey: string; // key is not really passed on to in child elements
    dimension: number,
    averageItemSize: number,
    scrollDirection: ScrollExtensions.ScrollDirection,
}

const FLEXBOX_DISPLAY = document.createElement("p").style.flex === undefined ? "-webkit-flex" : "flex"; // support ios under 9
const PIXEL_UNITS = "px";
const SPACER_ATTRIBUTE = "virtualized-list-spacer";

export class Spacer extends React.Component<SpacerProps, {}>{
    render() {
        const FILL_SPACE = "100%";
        let style: React.CSSProperties = {
            display: FLEXBOX_DISPLAY,
        };

        let { scrollDirection, dimension, averageItemSize, childKey } = this.props;

        if (scrollDirection === ScrollExtensions.ScrollDirection.Horizontal) {
            style.width = dimension + PIXEL_UNITS;
            style.height = FILL_SPACE;
        } else if (scrollDirection === ScrollExtensions.ScrollDirection.Vertical) {
            style.height = dimension + PIXEL_UNITS;
            style.width = FILL_SPACE;
        }

        return React.DOM.script({ key: childKey, style: style, data: SPACER_ATTRIBUTE });
    }

    static isSpacer(element: Element): boolean {
        return element instanceof HTMLScriptElement && element.getAttribute("data") === SPACER_ATTRIBUTE;
    }
}