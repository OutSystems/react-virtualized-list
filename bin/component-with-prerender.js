define(["require", "exports"], function (require, exports) {
    function ComponentWithPreRender(component) {
        var originalRenderMethod = component.prototype.render;
        var preRenderExecuted = false;
        component.prototype.render = function () {
            if (preRenderExecuted) {
                return originalRenderMethod.call(this, arguments);
            }
            var result = component.prototype.preRender.call(this, arguments);
            preRenderExecuted = true;
            component.prototype.forceUpdate.call(this);
            return result;
        };
    }
    exports.ComponentWithPreRender = ComponentWithPreRender;
});
