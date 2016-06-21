import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Extensions from "extensions";

const ANIMATION_ENTER = "-enter";
const ANIMATION_LEAVE = "-leave";
const ANIMATION_ACTIVE = "-active";

const TICK = 17; // same as CSS Transition group

export interface IAnimatedAttributes extends React.HTMLProps<any>, React.TransitionGroupProps {
    shouldSuspendAnimations: () => boolean;
    transitionName: string;
}

export class AnimatedGroup extends React.Component<IAnimatedAttributes, any> {

    private wrapChild(child: any): React.ReactElement<any> {
        let childAttributes : IAnimatedAttributes = {
          shouldSuspendAnimations: this.props.shouldSuspendAnimations,
          transitionName: this.props.transitionName  
        };
        return React.createElement(
            AnimatedItem, 
            Extensions.assign({}, child.props, childAttributes),
            child);
    }

    public render(): any {
        return React.createElement(
            React.addons.TransitionGroup,
            Extensions.assign({}, this.props, { childFactory: this.wrapChild.bind(this) }), 
            this.props.children);
    }

}

class AnimatedItem extends React.Component<IAnimatedAttributes, any> {
    
    private transitionTimeouts: number[] = [];

    private getAnimationClassName(): string {
        return this.props.transitionName;
    }

    private queueAction(action: Function, timeout: number) {
        let timeoutHandle = setTimeout(action, timeout);
        this.transitionTimeouts.push(timeoutHandle);
    }
    
    private transition(transitionName: string, done: Function) {
        if (this.props.shouldSuspendAnimations()) {
            done();
            return;
        }

        let node = <HTMLElement>ReactDOM.findDOMNode(this);
        let animationClassName = this.getAnimationClassName() + transitionName;
        node.classList.add(animationClassName);
        
        this.queueAction(
            () => {
                node.classList.add(animationClassName + ANIMATION_ACTIVE);
                
                let nodeStyle = getComputedStyle(node);
                let animationDuration = parseFloat(nodeStyle.transitionDelay) + parseFloat(nodeStyle.transitionDuration);
                
                let animationEnd = () => {
                    node.classList.remove(animationClassName);
                    node.classList.remove(animationClassName + ANIMATION_ACTIVE);
                    done();
                };
                
                this.queueAction(animationEnd, animationDuration * 1000);
            }, 
            TICK);
    }
    
    public componentWillEnter(done: Function): void {
        this.transition(ANIMATION_ENTER, done);
    }

    public componentWillLeave(done: Function): void {
        this.transition(ANIMATION_LEAVE, done);
    }

    public componentWillUnmount(): void {
        this.transitionTimeouts.forEach((t: number) => clearTimeout(t));
        this.transitionTimeouts = [];
    }

    public render(): any {
        return this.props.children;
    }
}