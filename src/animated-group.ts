import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Extensions from "extensions";

const ANIMATION_ENTER = "-enter";
const ANIMATION_LEAVE = "-leave";
const ANIMATION_ACTIVE = "-active";

export interface IAnimatedAttributes extends React.HTMLProps<any>, React.TransitionGroupProps {
    shouldSuspendAnimations: () => boolean;
    animationClassName: string;
}

export class AnimatedGroup extends React.Component<IAnimatedAttributes, any> {

    private wrapChild(child: any): React.ReactElement<any> {
        let childAttributes : IAnimatedAttributes = {
          shouldSuspendAnimations: this.props.shouldSuspendAnimations,
          animationClassName: this.props.animationClassName  
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
    //private transitionRAF: number;
    //private animationClassName: string;

    private getAnimationClassName(): string {
        return this.props.animationClassName;
    }

    private transition(transitionName: string, done: Function) {
        if (this.props.shouldSuspendAnimations()) {
            done();
            return;
        }

        let node = <HTMLElement>ReactDOM.findDOMNode(this);
        let animationClassName = this.getAnimationClassName() + transitionName;
        node.classList.add(animationClassName);
        
        /*if (this.transitionRAF) {
            cancelAnimationFrame(this.transitionRAF);
        }*/
        
        requestAnimationFrame(() => {
            node.classList.add(animationClassName + ANIMATION_ACTIVE);
            // TODO missing transition delay
            let animationDuration = parseFloat(getComputedStyle(node).transitionDuration) * 1000;
            
            let animationEnd = () => {
                node.classList.remove(animationClassName);
                node.classList.remove(animationClassName + ANIMATION_ACTIVE);
                done();
            };
            
            let timeout = setTimeout(animationEnd, animationDuration);
            this.transitionTimeouts.push(timeout);
        });
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