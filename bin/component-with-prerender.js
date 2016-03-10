define(["require", "exports"], function (require, exports) {
    function ComponentWithPreRender(component) {
        var originalRenderMethod = component.prototype.render;
        component.prototype.preRenderExecuted = false;
        component.prototype.render = function () {
            if (this.preRenderExecuted) {
                return originalRenderMethod.call(this, arguments);
            }
            var result = component.prototype.preRender.call(this, arguments);
            this.preRenderExecuted = true;
            component.prototype.forceUpdate.call(this);
            return result;
        };
    }
    exports.ComponentWithPreRender = ComponentWithPreRender;
});
//# sourceMappingURL=component-with-prerender.js.map