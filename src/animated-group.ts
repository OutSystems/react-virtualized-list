import * as React from "react";
import * as ReactDOM from "react-dom";
import { ObjectExtensions } from "virtualized-scroll-viewer-extensions";

const ANIMATION_ENTER = "-enter";
const ANIMATION_LEAVE = "-leave";
const ANIMATION_ACTIVE = "-active";

const TICK = 17; // same as CSS Transition group

type TransitionCallback = (element: HTMLElement, style: CSSStyleDeclaration) => void;

export interface IAnimatedAttributes extends React.HTMLProps<any>, React.TransitionGroupProps {
    shouldSuspendAnimations: () => boolean;
    transitionName: string;
}

export class AnimatedGroup extends React.Component<IAnimatedAttributes, any> {

    protected getAnimatedItem(): React.ComponentClass<IAnimatedAttributes> {
        return AnimatedItem;
    }
    
    private wrapChild(child: any): React.ReactElement<any> {
        let childAttributes: IAnimatedAttributes = {
            shouldSuspendAnimations: this.props.shouldSuspendAnimations,
            transitionName: this.props.transitionName  
        };
        return React.createElement(
            this.getAnimatedItem(), 
            <IAnimatedAttributes> ObjectExtensions.assign({}, child.props, childAttributes),
            child);
    }

    public render(): any {
        return React.createElement(
            React.addons.TransitionGroup,
            ObjectExtensions.assign({}, this.props, { childFactory: this.wrapChild.bind(this) }), 
            this.props.children);
    }

}

export class AnimatedItem extends React.Component<IAnimatedAttributes, any> {
    
    private transitionTimeouts: number[] = [];

    protected getAnimationClassName(style: CSSStyleDeclaration): string {
        return this.props.transitionName;
    }

    private queueAction(action: Function, timeout: number): void {
        let timeoutHandle = setTimeout(action, timeout);
        this.transitionTimeouts.push(timeoutHandle);
    }
    
    private transition(transitionName: string, 
                       done: Function, 
                       onStart: TransitionCallback,
                       onStartTransition: TransitionCallback, 
                       onEnd: TransitionCallback): void {
                           
        if (this.props.shouldSuspendAnimations()) {
            done();
            return;
        }

        let element = <HTMLElement> ReactDOM.findDOMNode(this);
        let initialElementStyle = getComputedStyle(element);
        let animationClassName = this.getAnimationClassName(initialElementStyle) + transitionName;
        onStart(element, initialElementStyle);
        element.classList.add(animationClassName);
        
        this.queueAction(
            () => {
                element.classList.add(animationClassName + ANIMATION_ACTIVE);
                
                let elementStyle = getComputedStyle(element);
                let animationDuration = parseFloat(elementStyle.transitionDelay) + parseFloat(elementStyle.transitionDuration);
                
                onStartTransition(element, elementStyle);
                
                let animationEnd = () => {
                    element.classList.remove(animationClassName);
                    element.classList.remove(animationClassName + ANIMATION_ACTIVE);
                    onEnd(element, elementStyle);
                    done();
                };
                
                this.queueAction(animationEnd, animationDuration * 1000);
            }, 
            TICK);
    }
    
    public componentWillEnter(done: Function): void {
        this.transition(ANIMATION_ENTER, 
                        done, 
                        (element: HTMLElement, style: CSSStyleDeclaration): void => this.startEnter(element, style),
                        (element: HTMLElement, style: CSSStyleDeclaration): void => this.startEnterTransition(element, style),
                        (element: HTMLElement, style: CSSStyleDeclaration): void => this.endEnter(element, style));
    }
    
    protected startEnter(element: Element, style: CSSStyleDeclaration): void { }
    
    protected startEnterTransition(element: Element, style: CSSStyleDeclaration): void { }
    
    protected endEnter(element: Element, style: CSSStyleDeclaration): void { }

    public componentWillLeave(done: Function): void {
        this.transition(ANIMATION_LEAVE, 
                        done, 
                        (element: HTMLElement, style: CSSStyleDeclaration) => this.startLeave(element, style),
                        (element: HTMLElement, style: CSSStyleDeclaration): void => this.startLeaveTransition(element, style),
                        (element: HTMLElement, style: CSSStyleDeclaration) => this.endLeave(element, style));
    }
    
    protected startLeave(element: HTMLElement, style: CSSStyleDeclaration): void { }
    
    protected startLeaveTransition(element: HTMLElement, style: CSSStyleDeclaration): void { }
    
    protected endLeave(element: HTMLElement, style: CSSStyleDeclaration): void { }

    public componentWillUnmount(): void {
        this.transitionTimeouts.forEach((t: number) => clearTimeout(t));
        this.transitionTimeouts = [];
    }

    public render(): JSX.Element {
        return React.Children.only(this.props.children);
    }
}
