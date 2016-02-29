import * as React from "react";

export interface IComponentWithPreRender extends React.Component<any, any> {
    preRender(): React.ReactElement<any>;    
}

export function ComponentWithPreRender(component: typeof React.Component) {
    let originalRenderMethod = component.prototype.render;
    let preRenderExecuted = false;
    component.prototype.render = function() {
        if (preRenderExecuted) {
            return originalRenderMethod.call(this, arguments);
        }
        
        let result = (component.prototype as IComponentWithPreRender).preRender.call(this, arguments);
        preRenderExecuted = true;
        component.prototype.forceUpdate.call(this);
        return result;
    };
}