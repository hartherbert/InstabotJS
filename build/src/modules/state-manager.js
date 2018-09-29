"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
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
class StateManager extends events_1.EventEmitter {
    constructor() {
        super();
        this._status = State.START;
        this.registerHandler();
    }
    registerHandler() {
        this.on(StateEvents.CHANGE_STATUS, (status) => {
            this._status = status;
        });
    }
    getState() {
        return this._status;
    }
    isReady() {
        return this._status === State.READY;
    }
    isNotReady() {
        return this._status !== State.READY;
    }
    isOk() {
        return this._status === State.OK;
    }
    isError() {
        return this._status === State.ERROR;
    }
    isStopBot() {
        return this._status === State.STOP_BOT;
    }
    isOkNextVerify() {
        return this._status === State.OK_NEXT_VERIFY;
    }
    isStart() {
        return this._status === State.START;
    }
}
exports.StateManager = StateManager;
