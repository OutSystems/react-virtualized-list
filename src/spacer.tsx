import * as React from "react";
import * as ReactDOM from "react-dom";
import { ScrollExtensions } from "virtualized-scroll-viewer-extensions";


interface SpacerProps extends React.Props<{}> {
    key: string,
    dimension: number,
    averageItemSize: number,
    scrollDirection: ScrollExtensions.ScrollDirection,
}

const FLEXBOX_DISPLAY = document.createElement("p").style.flex === undefined ? "-webkit-flex" : "flex"; // support ios under 9
const PIXEL_UNITS = "px";



export class Spacer extends React.Component<SpacerProps, {}>{
    render() {
        const FILL_SPACE = "100%";
        let style: React.CSSProperties = {
            display: FLEXBOX_DISPLAY,
        };
        let backgroundWidth = 0;
        let backgroundHeight = 0;

        let { scrollDirection, dimension, averageItemSize, key } = this.props;

        if (scrollDirection === ScrollExtensions.ScrollDirection.Horizontal) {
            style.width = Math.round(dimension) + PIXEL_UNITS;
            style.height = FILL_SPACE;
            backgroundWidth = averageItemSize;
        } else {
            style.width = FILL_SPACE;
            style.height = Math.round(dimension) + PIXEL_UNITS;
            backgroundHeight = averageItemSize;
        }
        // fill space with list items stripes for improved user experience (when scrolling fast)
        // style.backgroundImage = `url(${this.getItemsPlaceholdersImage(backgroundWidth, backgroundHeight)})`;
        style.backgroundColor = "#f0f";
        style.backgroundRepeat = "repeat";

        return React.DOM.script({ key: key, style: style });
    }
}