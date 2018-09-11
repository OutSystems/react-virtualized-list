declare module "react-virtualized-list/virtualized-scroll-viewer-extensions" {
    export module ScrollExtensions {
        enum ScrollDirection {
            Horizontal = 0,
            Vertical = 1,
            None = 2,
        }
        interface IScrollHostInfo {
            scrollHost: Element | Window;
            scrollDirection: ScrollDirection;
        }
        type Rect = {
            x: number;
            y: number;
            height: number;
            width: number;
        };
        interface IScrollInfo {
            scrollHost: Element | Window;
            viewport: Rect;
            scroll: Rect;
        }
        function getScrollHostInfo(element: Element, excludeStaticParent?: boolean): IScrollHostInfo;
        function getScrollInfo(scrollHost: Element | Window): IScrollInfo;
        function setScrollOffset(scrollHost: Element | Window, x?: number, y?: number, increment?: boolean): void;
    }
    export module ObjectExtensions {
        function assign(target: any, ...sources: any[]): Object;
    }
}
declare module "react-virtualized-list/animated-group" {
    import * as React from "react";
    export interface IAnimatedAttributes extends React.HTMLProps<any>, React.TransitionGroupProps {
        shouldSuspendAnimations?: () => boolean;
        transitionName?: string;
        onEnter?: () => void;
        onEnterStarted?: () => void;
        onLeave?: () => void;
        onLeaveStarted?: () => void;
    }
    export class AnimatedGroup extends React.Component<IAnimatedAttributes, any> {
        protected getDefaultTransitionName(): string;
        protected getAnimatedItem(): React.ComponentClass<IAnimatedAttributes>;
        private wrapChild(child);
        render(): any;
    }
    export class AnimatedItem extends React.Component<IAnimatedAttributes, any> {
        private transitionTimeouts;
        protected getAnimationClassName(element: HTMLElement): string;
        private queueAction(action, timeout);
        private transition(transitionName, done, onStart, onStartTransition, onEnd);
        componentWillAppear(done: Function): void;
        componentWillEnter(done: Function): void;
        protected startEnter(element: HTMLElement): void;
        protected startEnterTransition(element: HTMLElement): void;
        protected endEnter(element: HTMLElement): void;
        componentWillLeave(done: Function): void;
        protected startLeave(element: HTMLElement): void;
        protected startLeaveTransition(element: HTMLElement): void;
        protected endLeave(element: HTMLElement): void;
        componentWillUnmount(): void;
        componentDidAppear(): void;
        componentDidEnter(): void;
        componentDidLeave(): void;
        render(): JSX.Element;
    }
}
declare module "react-virtualized-list/animated-size-group" {
    import { AnimatedItem, AnimatedGroup, IAnimatedAttributes } from "react-virtualized-list/animated-group";
    export class AnimatedSizeGroup extends AnimatedGroup {
        protected getAnimatedItem(): React.ComponentClass<IAnimatedAttributes>;
    }
    export class AnimatedSizeItem extends AnimatedItem {
        private previousWidth;
        private previousHeight;
        private previousStyleWidth;
        private previousStyleHeight;
        private isDisplayInline(style);
        protected getAnimationClassName(element: HTMLElement): string;
        private storeStyleSize(element);
        private restorePreviousStyleSize(element);
        protected startEnter(element: HTMLElement): void;
        protected startEnterTransition(element: HTMLElement): void;
        protected endEnter(element: HTMLElement): void;
        protected startLeave(element: HTMLElement): void;
        protected startLeaveTransition(element: HTMLElement): void;
    }
}
declare module "react-virtualized-list/spacer" {
    import * as React from "react";
    import { ScrollExtensions } from "react-virtualized-list/virtualized-scroll-viewer-extensions";
    export interface SpacerProps extends React.Props<{}> {
        childKey: string;
        dimension: number;
        averageItemSize: number;
        scrollDirection: ScrollExtensions.ScrollDirection;
    }
    export class Spacer extends React.Component<SpacerProps, {}> {
        render(): React.DOMElement<React.HTMLProps<HTMLElement>>;
    }
}
declare module "react-virtualized-list/virtualized-scroll-viewer" {
    import * as React from "react";
    export interface IScrollViewerProperties extends React.Props<VirtualizedScrollViewer> {
        length: number;
        renderItems: (startIndex: number, length: number) => React.ReactFragment;
        scrollChanged?: () => void;
        renderWrapper: (children: React.ReactFragment) => JSX.Element;
        pageBufferSize?: number;
        initializationCompleted?: () => void;
        viewportSafetyMarginBefore?: number;
        viewportSafetyMarginAfter?: number;
    }
    export interface IScrollViewerState {
        firstRenderedItemIndex: number;
        lastRenderedItemIndex: number;
        averageItemSize: number;
        scrollOffset: number;
        offScreenItemsCount: number;
        effectiveScrollOffset: number;
    }
    export class VirtualizedScrollViewer extends React.Component<IScrollViewerProperties, IScrollViewerState> {
        private scrollHostInfo;
        private scrollDirection;
        private hasPendingPropertiesUpdate;
        private pendingScrollAsyncUpdateHandle;
        private itemsContainer;
        private isScrollOngoing;
        private isComponentInitialized;
        private setPendingScroll;
        private firstSpacer;
        private lastSpacer;
        constructor(props: IScrollViewerProperties, context: any);
        private getScrollHostInfo();
        private getScrollInfo();
        private addScrollHandler();
        private removeScrollHandler();
        private onWindowScrollOrResize;
        private removeWindowScrollHandlers();
        componentDidMount(): void;
        componentWillUnmount(): void;
        componentWillReceiveProps(nextProps: IScrollViewerProperties): void;
        setState<K extends keyof IScrollViewerState>(state: IScrollViewerState | ((prevState: IScrollViewerState, props: IScrollViewerProperties) => Pick<IScrollViewerState, K>), callback?: () => any): void;
        private onDidUpdate();
        private renderOffScreenBuffer();
        private onScroll;
        shouldComponentUpdate(nextProps: IScrollViewerProperties, nextState: IScrollViewerState): boolean;
        private getRemainingSize(firstRenderedItemIndex, lastRenderedItemIndex);
        private renderList(firstRenderedItemIndex, lastRenderedItemIndex);
        private renderSpacer(key, dimension, averageItemSize, storeRef);
        render(): JSX.Element;
        private getDimension(vertical, horizontal);
        private getListItems(itemsContainer);
        private isSpacer(element);
        private getItemBounds(item);
        private areElementsStacked(items);
        private calculateItemsSize(items, firstItemIndex?, lastItemIndex?);
        private countItemsAndSizeThatFitIn(itemsSizes, sizeToFit, allowOverflow?, countBackwards?);
        private getCurrentScrollViewerState(listLength, returnSameStateOnSmallChanges?);
        readonly isScrolling: boolean;
        readonly isInitialized: boolean;
        private readonly isDisposed;
        scrollToIndex(index: number): void;
        scrollToOffset(x: number, y: number): void;
        setScrollOffset: (x: number, y: number) => void;
        private internalSetScrollOffset(setScroll);
    }
}
