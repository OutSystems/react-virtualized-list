import { AnimatedItem, AnimatedGroup, IAnimatedAttributes } from "animated-group";

const PIXELS_UNIT = "px";

export class AnimatedSizeGroup extends AnimatedGroup {

    protected getAnimatedItem(): React.ComponentClass<IAnimatedAttributes> {
        return AnimatedSizeItem;
    }
}

export class AnimatedSizeItem extends AnimatedItem {
    
    private previousWidth: number;
    private previousHeight: number;
    
    private previousStyleWidth: string;
    private previousStyleHeight: string;
    
    private isDisplayInline(style: CSSStyleDeclaration) {
        return style && style.display.indexOf("inline") === 0;
    }
    
    protected getAnimationClassName(style: CSSStyleDeclaration): string {
        let animationClassName = super.getAnimationClassName(style);
        if (this.isDisplayInline(style)) {
            // inline* elements will have a different class (usually scale horizontally instead of vertically)
            animationClassName += "-inline";
        }
        return animationClassName;
    }
    
    private storeSize(element: HTMLElement) {
        let elementBounds = element.getBoundingClientRect();
        this.previousWidth = elementBounds.width;
        this.previousHeight = elementBounds.height;
    }
    
    private setExplicitSize(element: HTMLElement, width: number, height: number) {
        let elementBounds = element.getBoundingClientRect();
        if (elementBounds.width !== width) {
            // width changed - should be animating width
            this.previousStyleWidth = element.style.width;
            element.style.width = width + PIXELS_UNIT;
        }
        if (elementBounds.height !== height) {
            // height changed - should be animating height
            this.previousStyleHeight = element.style.height;
            element.style.height = height + PIXELS_UNIT;
        }
    }
    
    private restorePreviousSize(element: HTMLElement) {
        element.style.width = this.previousStyleWidth;
        element.style.height = this.previousStyleHeight;
    }
    
    protected startEnter(element: HTMLElement, style: CSSStyleDeclaration): void {
        this.storeSize(element);    
    }
    
    protected startEnterTransition(element: HTMLElement, style: CSSStyleDeclaration): void {
        // set the size of the element to be the same as when we started 
        this.setExplicitSize(element, this.previousWidth, this.previousHeight);
    }
    
    protected endEnter(element: HTMLElement): void { 
        this.restorePreviousSize(element);
    }
    
    protected startLeave(element: HTMLElement): void {
        let elementBounds = element.getBoundingClientRect();
        this.previousStyleWidth = element.style.width;
        this.previousStyleHeight = element.style.height;
        element.style.width = elementBounds.width + PIXELS_UNIT;
        element.style.height = elementBounds.height + PIXELS_UNIT;
    }
    
    protected startLeaveTransition(element: HTMLElement, style: CSSStyleDeclaration): void {
        //this.restorePreviousSize(element);
        element.style.width = "";
        element.style.height = "";
    }
    
    protected endLeave(element: HTMLElement): void { 
    }
}