"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = NodeJS.EventEmitter;
var State;
(function (State) {
    State["OK"] = "ok";
    State["ERROR"] = "error";
    State["READY"] = "ready";
    State["STOP_BOT"] = "stopbot";
    State["OK_NEXT_VERIFY"] = "ok_next_verify";
    State["START"] = "start";
})(State = exports.State || (exports.State = {}));
var StateEvents;
(function (StateEvents) {
    StateEvents["CHANGE_STATUS"] = "change_status";
})(StateEvents = exports.StateEvents || (exports.StateEvents = {}));
/**
 * Manager of states
 * =====================
 * Handler of emit
 *
 * @author:     Herbert Hart [@hobbydevs] <>
 * @license:    This code and contributions have 'MIT License'
 * @version:    0.1
 * @changelog:  0.1 initial release
 *
 */
class StateManager extends EventEmitter {
    constructor() {
        super();
        this._status = State.START;
        this.registerHandler();
    }
    /**
     * register handle events in EE
     */
    registerHandler() {
        this.on(StateEvents.CHANGE_STATUS, (status) => {
            this._status = status;
        });
    }
    /**
     * Get current status
     * @return State
     */
    getState() {
        return this._status;
    }
    /**
     * Check is ready status
     * @return {boolean}
     */
    isReady() {
        return this._status === State.READY;
    }
    /**
     * Check is not ready status
     * @return {boolean}
     */
    isNotReady() {
        return this._status !== State.READY;
    }
    /**
     * Check is 'ok' status
     * @return {boolean}
     */
    isOk() {
        return this._status === State.OK;
    }
    /**
     * Check is 'error' status
     * @return {boolean}
     */
    isError() {
        return this._status === State.ERROR;
    }
    /**
     * Check is 'stop bot' status
     * @return {boolean}
     */
    isStopBot() {
        return this._status === State.STOP_BOT;
    }
    /**
     * Check is 'ok next verify' status
     * @return {boolean}
     */
    isOkNextVerify() {
        return this._status === State.OK_NEXT_VERIFY;
    }
    /**
     * Check is 'start' status
     * @return {boolean}
     */
    isStart() {
        return this._status === State.START;
    }
}
exports.StateManager = StateManager;
//# sourceMappingURL=state-manager.js.map