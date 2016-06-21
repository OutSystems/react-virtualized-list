var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "react", "react-dom", "extensions"], function (require, exports, React, ReactDOM, Extensions) {
    "use strict";
    var ANIMATION_ENTER = "-enter";
    var ANIMATION_LEAVE = "-leave";
    var ANIMATION_ACTIVE = "-active";
    var TICK = 17;
    var AnimatedGroup = (function (_super) {
        __extends(AnimatedGroup, _super);
        function AnimatedGroup() {
            _super.apply(this, arguments);
        }
        AnimatedGroup.prototype.wrapChild = function (child) {
            var childAttributes = {
                shouldSuspendAnimations: this.props.shouldSuspendAnimations,
                transitionName: this.props.transitionName
            };
            return React.createElement(AnimatedItem, Extensions.assign({}, child.props, childAttributes), child);
        };
        AnimatedGroup.prototype.render = function () {
            return React.createElement(React.addons.TransitionGroup, Extensions.assign({}, this.props, { childFactory: this.wrapChild.bind(this) }), this.props.children);
        };
        return AnimatedGroup;
    }(React.Component));
    exports.AnimatedGroup = AnimatedGroup;
    var AnimatedItem = (function (_super) {
        __extends(AnimatedItem, _super);
        function AnimatedItem() {
            _super.apply(this, arguments);
            this.transitionTimeouts = [];
        }
        AnimatedItem.prototype.getAnimationClassName = function () {
            return this.props.transitionName;
        };
        AnimatedItem.prototype.queueAction = function (action, timeout) {
            var timeoutHandle = setTimeout(action, timeout);
            this.transitionTimeouts.push(timeoutHandle);
        };
        AnimatedItem.prototype.transition = function (transitionName, done) {
            var _this = this;
            if (this.props.shouldSuspendAnimations()) {
                done();
                return;
            }
            var node = ReactDOM.findDOMNode(this);
            var animationClassName = this.getAnimationClassName() + transitionName;
            node.classList.add(animationClassName);
            this.queueAction(function () {
                node.classList.add(animationClassName + ANIMATION_ACTIVE);
                var nodeStyle = getComputedStyle(node);
                var animationDuration = parseFloat(nodeStyle.transitionDelay) + parseFloat(nodeStyle.transitionDuration);
                var animationEnd = function () {
                    node.classList.remove(animationClassName);
                    node.classList.remove(animationClassName + ANIMATION_ACTIVE);
                    done();
                };
                _this.queueAction(animationEnd, animationDuration * 1000);
            }, TICK);
        };
        AnimatedItem.prototype.componentWillEnter = function (done) {
            this.transition(ANIMATION_ENTER, done);
        };
        AnimatedItem.prototype.componentWillLeave = function (done) {
            this.transition(ANIMATION_LEAVE, done);
        };
        AnimatedItem.prototype.componentWillUnmount = function () {
            this.transitionTimeouts.forEach(function (t) { return clearTimeout(t); });
            this.transitionTimeouts = [];
        };
        AnimatedItem.prototype.render = function () {
            return this.props.children;
        };
        return AnimatedItem;
    }(React.Component));
});
