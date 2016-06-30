import * as React from "react";
import * as ReactDOM from "react-dom";
import { ObjectExtensions } from "virtualized-scroll-viewer-extensions";

const ANIMATION_APPEAR = "-appear";
const ANIMATION_ENTER = "-enter";
const ANIMATION_LEAVE = "-leave";
const ANIMATION_ACTIVE = "-active";

const TICK = 17; // same as CSS Transition group

type TransitionCallback = (element: HTMLElement) => void;

export interface IAnimatedAttributes extends React.HTMLProps<any>, React.TransitionGroupProps {
    shouldSuspendAnimations: () => boolean;
    transitionName?: string;
}

export class AnimatedGroup extends React.Component<IAnimatedAttributes, any> {

    protected getDefaultTransitionName(): string {
        return "";
    }
    
    protected getAnimatedItem(): React.ComponentClass<IAnimatedAttributes> {
        return AnimatedItem;
    }
    
    private wrapChild(child: any): React.ReactElement<any> {
        let childAttributes: IAnimatedAttributes = {
            shouldSuspendAnimations: this.props.shouldSuspendAnimations,
            transitionName: this.props.transitionName || this.getDefaultTransitionName()
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

    protected getAnimationClassName(element: HTMLElement): string {
        return this.props.transitionName;
    }

    private queueAction(action: Function, timeout: number): void {
        let timeoutHandle = setTimeout(action, timeout);
        this.transitionTimeouts.push(timeoutHandle);
    }
    
    private transition(transitionName: string, done: Function, onStart: TransitionCallback, onStartTransition: TransitionCallback, onEnd: TransitionCallback): void {
        if (this.props.shouldSuspendAnimations && this.props.shouldSuspendAnimations()) {
            done();
            return;
        }

        let element = <HTMLElement> ReactDOM.findDOMNode(this);
        let animationClassName = this.getAnimationClassName(element) + transitionName;
        onStart(element);
        element.classList.add(animationClassName);
        
        this.queueAction(
            () => {
                element.classList.add(animationClassName + ANIMATION_ACTIVE);
                
                let elementStyle = getComputedStyle(element);
                let animationDuration = parseFloat(elementStyle.transitionDelay) + parseFloat(elementStyle.transitionDuration);
                
                onStartTransition(element);
                
                let animationEnd = () => {
                    element.classList.remove(animationClassName);
                    element.classList.remove(animationClassName + ANIMATION_ACTIVE);
                    onEnd(element);
                    done();
                };
                
                this.queueAction(animationEnd, animationDuration * 1000);
            }, 
            TICK);
    }
    
    public componentWillAppear(done: Function): void {
        this.transition(ANIMATION_APPEAR, 
                        done, 
                        (element: HTMLElement): void => this.startEnter(element),
                        (element: HTMLElement): void => this.startEnterTransition(element),
                        (element: HTMLElement): void => this.endEnter(element));
    }
    
    public componentWillEnter(done: Function): void {
        this.transition(ANIMATION_ENTER, 
                        done, 
                        (element: HTMLElement): void => this.startEnter(element),
                        (element: HTMLElement): void => this.startEnterTransition(element),
                        (element: HTMLElement): void => this.endEnter(element));
    }
    
    protected startEnter(element: HTMLElement): void { }
    
    protected startEnterTransition(element: HTMLElement): void { }
    
    protected endEnter(element: HTMLElement): void { }

    public componentWillLeave(done: Function): void {
        this.transition(ANIMATION_LEAVE, 
                        done, 
                        (element: HTMLElement): void => this.startLeave(element),
                        (element: HTMLElement): void => this.startLeaveTransition(element),
                        (element: HTMLElement): void => this.endLeave(element));
    }
    
    protected startLeave(element: HTMLElement): void { }
    
    protected startLeaveTransition(element: HTMLElement): void { }
    
    protected endLeave(element: HTMLElement): void { }

    public componentWillUnmount(): void {
        this.transitionTimeouts.forEach((t: number) => clearTimeout(t));
        this.transitionTimeouts = [];
    }

    public render(): JSX.Element {
        return React.Children.only(this.props.children);
    }
}
