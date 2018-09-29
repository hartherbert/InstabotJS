"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("../utils/utils");
const state_manager_1 = require("../state-manager");
class UnfollowClassicMode extends state_manager_1.StateManager {
    constructor(bot) {
        super();
        this.bot = bot;
        this.cachedUnfollowUserIds = [];
        this.stateName = 'Unfollow-Classic';
    }
    start() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            utils_1.Utils.writeLog('Started the service', this.stateName);
            do {
                if (this.bot.shouldBotSleep(new Date(Date.now())) === true ||
                    this.bot.unfollowCountCurrentDay >=
                        this.bot.config.maxUnfollowsPerDay ||
                    this.bot.storageService.getUnfollowableLength() < 1) {
                    utils_1.Utils.writeLog('Bot is sleeping or reached limit for today or has nobody to unfollow', this.stateName);
                    yield utils_1.Utils.sleepSecs(utils_1.Utils.getRandomInt(30 * 60, 180 * 60));
                    continue;
                }
                if (this.cachedUnfollowUserIds.length <= 0) {
                    this.cachedUnfollowUserIds = Object.keys(this.bot.storageService.getUnfollowable());
                }
                let currentUser = null;
                if (this.cachedUnfollowUserIds.length > 0) {
                    const selectedUserToUnfollow = this.cachedUnfollowUserIds.splice(utils_1.Utils.getRandomInt(0, this.cachedUnfollowUserIds.length - 1), 1)[0];
                    const result = yield this.bot.apiService.getUserInfoById(selectedUserToUnfollow);
                    const success = yield this.bot.isSuccess(result);
                    if (success === true) {
                        currentUser = result.data;
                        yield utils_1.Utils.sleep();
                    }
                    else {
                        yield utils_1.Utils.sleepSecs(this.bot.failedRequestSleepTime);
                    }
                    yield utils_1.Utils.quickSleep();
                }
                if (currentUser != null && currentUser.canBeUnfollowed === true) {
                    const result = yield this.bot.apiService.follow(currentUser.user_id, true);
                    const success = yield this.bot.isSuccess(result);
                    if (success === false) {
                        utils_1.Utils.writeLog(`Failed to unfollow user: username: ${currentUser.username}`, this.stateName);
                        yield utils_1.Utils.sleepSecs(this.bot.failedRequestSleepTime);
                    }
                    else {
                        this.bot.unfollowedNewUser(currentUser, this.stateName);
                        yield utils_1.Utils.sleepSecs(this.getUnfollowSleepTime());
                    }
                }
                else {
                    yield utils_1.Utils.quickSleep();
                }
            } while (true);
        });
    }
    getUnfollowSleepTime() {
        return utils_1.Utils.getRandomInt(90, 560);
    }
}
exports.UnfollowClassicMode = UnfollowClassicMode;
