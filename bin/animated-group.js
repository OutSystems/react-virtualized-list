var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "react", "react-dom", "virtualized-scroll-viewer-extensions"], function (require, exports, React, ReactDOM, virtualized_scroll_viewer_extensions_1) {
    "use strict";
    var ANIMATION_APPEAR = "-appear";
    var ANIMATION_ENTER = "-enter";
    var ANIMATION_LEAVE = "-leave";
    var ANIMATION_ACTIVE = "-active";
    var TICK = 17;
    var AnimatedGroup = (function (_super) {
        __extends(AnimatedGroup, _super);
        function AnimatedGroup() {
            _super.apply(this, arguments);
        }
        AnimatedGroup.prototype.getDefaultTransitionName = function () {
            return "";
        };
        AnimatedGroup.prototype.getAnimatedItem = function () {
            return AnimatedItem;
        };
        AnimatedGroup.prototype.wrapChild = function (child) {
            var childAttributes = {
                shouldSuspendAnimations: this.props.shouldSuspendAnimations,
                transitionName: this.props.transitionName || this.getDefaultTransitionName(),
                onEnter: this.props.onEnter,
                onEnterStarted: this.props.onEnterStarted,
                onLeave: this.props.onLeave,
                onLeaveStarted: this.props.onLeaveStarted
            };
            return React.createElement(this.getAnimatedItem(), virtualized_scroll_viewer_extensions_1.ObjectExtensions.assign({}, child.props, childAttributes), child);
        };
        AnimatedGroup.prototype.render = function () {
            return React.createElement(React.addons.TransitionGroup, virtualized_scroll_viewer_extensions_1.ObjectExtensions.assign({}, this.props, { childFactory: this.wrapChild.bind(this) }), this.props.children);
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
        AnimatedItem.prototype.getAnimationClassName = function (element) {
            return this.props.transitionName;
        };
        AnimatedItem.prototype.queueAction = function (action, timeout) {
            var timeoutHandle = setTimeout(action, timeout);
            this.transitionTimeouts.push(timeoutHandle);
        };
        AnimatedItem.prototype.transition = function (transitionName, done, onStart, onStartTransition, onEnd) {
            var _this = this;
            if (this.props.shouldSuspendAnimations && this.props.shouldSuspendAnimations()) {
                done();
                return;
            }
            var element = ReactDOM.findDOMNode(this);
            var animationClassName = this.getAnimationClassName(element) + transitionName;
            onStart(element);
            element.classList.add(animationClassName);
            this.queueAction(function () {
                element.classList.add(animationClassName + ANIMATION_ACTIVE);
                var elementStyle = getComputedStyle(element);
                var animationDuration = parseFloat(elementStyle.transitionDelay) + parseFloat(elementStyle.transitionDuration);
                onStartTransition(element);
                var animationEnd = function () {
                    element.classList.remove(animationClassName);
                    element.classList.remove(animationClassName + ANIMATION_ACTIVE);
                    onEnd(element);
                    done();
                };
                _this.queueAction(animationEnd, animationDuration * 1000);
            }, TICK);
        };
        AnimatedItem.prototype.componentWillAppear = function (done) {
            var _this = this;
            this.transition(ANIMATION_APPEAR, done, function (element) { return _this.startEnter(element); }, function (element) { return _this.startEnterTransition(element); }, function (element) { return _this.endEnter(element); });
        };
        AnimatedItem.prototype.componentWillEnter = function (done) {
            var _this = this;
            this.transition(ANIMATION_ENTER, done, function (element) { return _this.startEnter(element); }, function (element) { return _this.startEnterTransition(element); }, function (element) { return _this.endEnter(element); });
        };
        AnimatedItem.prototype.startEnter = function (element) { };
        AnimatedItem.prototype.startEnterTransition = function (element) {
            if (this.props.onEnterStarted) {
                this.props.onEnterStarted();
            }
        };
        AnimatedItem.prototype.endEnter = function (element) { };
        AnimatedItem.prototype.componentWillLeave = function (done) {
            var _this = this;
            this.transition(ANIMATION_LEAVE, done, function (element) { return _this.startLeave(element); }, function (element) { return _this.startLeaveTransition(element); }, function (element) { return _this.endLeave(element); });
        };
        AnimatedItem.prototype.startLeave = function (element) { };
        AnimatedItem.prototype.startLeaveTransition = function (element) {
            if (this.props.onLeaveStarted) {
                this.props.onLeaveStarted();
            }
        };
        AnimatedItem.prototype.endLeave = function (element) { };
        AnimatedItem.prototype.componentWillUnmount = function () {
            this.transitionTimeouts.forEach(function (t) { return clearTimeout(t); });
            this.transitionTimeouts = [];
        };
        AnimatedItem.prototype.componentDidAppear = function () {
            if (this.props.onEnter) {
                this.props.onEnter();
            }
        };
        AnimatedItem.prototype.componentDidEnter = function () {
            if (this.props.onEnter) {
                this.props.onEnter();
            }
        };
        AnimatedItem.prototype.componentDidLeave = function () {
            if (this.props.onLeave) {
                this.props.onLeave();
            }
        };
        AnimatedItem.prototype.render = function () {
            return React.Children.only(this.props.children);
        };
        return AnimatedItem;
    }(React.Component));
    exports.AnimatedItem = AnimatedItem;
});
