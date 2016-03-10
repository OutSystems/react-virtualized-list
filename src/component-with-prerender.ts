import * as React from "react";

export interface IComponentWithPreRender extends React.Component<any, any> {
    preRender(): React.ReactElement<any>;    
}

export function ComponentWithPreRender(component: typeof React.Component): void {
    let originalRenderMethod = component.prototype.render;
    (<any> component.prototype).preRenderExecuted = false;
    component.prototype.render = function (): React.DOMElement<any> {
        if (this.preRenderExecuted) {
            return originalRenderMethod.call(this, arguments);
        }

        let result = (<IComponentWithPreRender> component.prototype).preRender.call(this, arguments);
        this.preRenderExecuted = true;
        component.prototype.forceUpdate.call(this);
        return result;
    };
}