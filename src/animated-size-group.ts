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
    
    protected getAnimationClassName(element: HTMLElement): string {
        let animationClassName = super.getAnimationClassName(element);
        let style = getComputedStyle(element);
        if (this.isDisplayInline(style)) {
            // inline* elements will have a different class (usually scale horizontally instead of vertically)
            animationClassName += "-inline";
        }
        return animationClassName;
    }
    
    private storeStyleSize(element: HTMLElement) {
        this.previousStyleWidth = element.style.width;
        this.previousStyleHeight = element.style.height;
    }
    
    private restorePreviousStyleSize(element: HTMLElement) {
        element.style.width = this.previousStyleWidth;
        element.style.height = this.previousStyleHeight;
    }
    
    protected startEnter(element: HTMLElement): void {
        // store current size
        let elementBounds = element.getBoundingClientRect();
        this.previousWidth = elementBounds.width;
        this.previousHeight = elementBounds.height;    
    }
    
    protected startEnterTransition(element: HTMLElement): void {
        // store inline style size to allow restoring it after animation ends
        this.storeStyleSize(element);
        
        // set the size of the element to be the same as when we started
        // ... to make width/height transitions work properly 
        let elementBounds = element.getBoundingClientRect();
        if (elementBounds.width !== this.previousWidth) {
            // width changed - should be animating width
            element.style.width = this.previousWidth + PIXELS_UNIT;
        }
        if (elementBounds.height !== this.previousHeight) {
            // height changed - should be animating height
            element.style.height = this.previousHeight + PIXELS_UNIT;
        }
    }
    
    protected endEnter(element: HTMLElement): void {
        // revert the changes applied prior to animation
        this.restorePreviousStyleSize(element);
    }
    
    protected startLeave(element: HTMLElement): void {
        // store inline style size to allow restoring it after animation ends
        this.storeStyleSize(element);
        
        // set inline size ... to make width/height transitions work properly
        let elementBounds = element.getBoundingClientRect();
        element.style.width = elementBounds.width + PIXELS_UNIT;
        element.style.height = elementBounds.height + PIXELS_UNIT;
    }
    
    protected startLeaveTransition(element: HTMLElement): void {
        // revert the changes applied prior to animation
        this.restorePreviousStyleSize(element);
    }
}