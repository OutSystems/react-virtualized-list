var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "animated-group"], function (require, exports, animated_group_1) {
    "use strict";
    var PIXELS_UNIT = "px";
    var AnimatedSizeGroup = (function (_super) {
        __extends(AnimatedSizeGroup, _super);
        function AnimatedSizeGroup() {
            _super.apply(this, arguments);
        }
        AnimatedSizeGroup.prototype.getAnimatedItem = function () {
            return AnimatedSizeItem;
        };
        return AnimatedSizeGroup;
    }(animated_group_1.AnimatedGroup));
    exports.AnimatedSizeGroup = AnimatedSizeGroup;
    var AnimatedSizeItem = (function (_super) {
        __extends(AnimatedSizeItem, _super);
        function AnimatedSizeItem() {
            _super.apply(this, arguments);
        }
        AnimatedSizeItem.prototype.isDisplayInline = function (style) {
            return style && style.display.indexOf("inline") === 0;
        };
        AnimatedSizeItem.prototype.getAnimationClassName = function (element) {
            var animationClassName = _super.prototype.getAnimationClassName.call(this, element);
            var style = getComputedStyle(element);
            if (this.isDisplayInline(style)) {
                animationClassName += "-inline";
            }
            return animationClassName;
        };
        AnimatedSizeItem.prototype.storeStyleSize = function (element) {
            this.previousStyleWidth = element.style.width;
            this.previousStyleHeight = element.style.height;
        };
        AnimatedSizeItem.prototype.restorePreviousStyleSize = function (element) {
            element.style.width = this.previousStyleWidth;
            element.style.height = this.previousStyleHeight;
        };
        AnimatedSizeItem.prototype.startEnter = function (element) {
            _super.prototype.startEnter.call(this, element);
            var elementBounds = element.getBoundingClientRect();
            this.previousWidth = elementBounds.width;
            this.previousHeight = elementBounds.height;
        };
        AnimatedSizeItem.prototype.startEnterTransition = function (element) {
            _super.prototype.startEnterTransition.call(this, element);
            this.storeStyleSize(element);
            var elementBounds = element.getBoundingClientRect();
            if (elementBounds.width !== this.previousWidth) {
                element.style.width = this.previousWidth + PIXELS_UNIT;
            }
            if (elementBounds.height !== this.previousHeight) {
                element.style.height = this.previousHeight + PIXELS_UNIT;
            }
        };
        AnimatedSizeItem.prototype.endEnter = function (element) {
            _super.prototype.endEnter.call(this, element);
            this.restorePreviousStyleSize(element);
        };
        AnimatedSizeItem.prototype.startLeave = function (element) {
            _super.prototype.startLeave.call(this, element);
            this.storeStyleSize(element);
            var elementBounds = element.getBoundingClientRect();
            element.style.width = elementBounds.width + PIXELS_UNIT;
            element.style.height = elementBounds.height + PIXELS_UNIT;
        };
        AnimatedSizeItem.prototype.startLeaveTransition = function (element) {
            _super.prototype.startLeaveTransition.call(this, element);
            this.restorePreviousStyleSize(element);
        };
        return AnimatedSizeItem;
    }(animated_group_1.AnimatedItem));
    exports.AnimatedSizeItem = AnimatedSizeItem;
});
