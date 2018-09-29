import {EventEmitter} from 'events';

export enum State {
  OK= 'ok',
  ERROR= 'error',
  READY= 'ready',
  STOP_BOT= 'stopbot',
  OK_NEXT_VERIFY= 'ok_next_verify',
  START= 'start'
}

export enum StateEvents {
  CHANGE_STATUS = 'change_status'
}

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
export class StateManager extends EventEmitter {

  private _status: State;
  public stateName: string; // only used to log

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
  public getState(): State {
    return this._status;
  }

  /**
   * Check is ready status
   * @return {boolean}
   */
  public isReady() : boolean{
    return this._status === State.READY;
  }

  /**
   * Check is not ready status
   * @return {boolean}
   */
  public isNotReady(): boolean {
    return this._status !== State.READY;
  }

  /**
   * Check is 'ok' status
   * @return {boolean}
   */
  public isOk(): boolean {
    return this._status === State.OK;
  }

  /**
   * Check is 'error' status
   * @return {boolean}
   */
  public isError(): boolean {
    return this._status === State.ERROR;
  }

  /**
   * Check is 'stop bot' status
   * @return {boolean}
   */
  public isStopBot(): boolean {
    return this._status === State.STOP_BOT;
  }

  /**
   * Check is 'ok next verify' status
   * @return {boolean}
   */
  public isOkNextVerify(): boolean {
    return this._status === State.OK_NEXT_VERIFY;
  }

  /**
   * Check is 'start' status
   * @return {boolean}
   */
  public isStart(): boolean {
    return this._status === State.START;
  }
}
