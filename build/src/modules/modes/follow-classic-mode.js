"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("../utils/utils");
const state_manager_1 = require("../state-manager");
class FollowClassicMode extends state_manager_1.StateManager {
    constructor(bot) {
        super();
        this.bot = bot;
        this.cachedFollowUserIds = [];
        this.numberOfUsersToFollow = 0;
        this.followedUsers = 0;
        this.stateName = 'Follow-Classic';
    }
    start() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            utils_1.Utils.writeLog('Started the service', this.stateName);
            do {
                if (this.bot.shouldBotSleep(new Date(Date.now())) === true || this.bot.followCountCurrentDay >= this.bot.config.maxFollowsPerDay) {
                    utils_1.Utils.writeLog('Bot is sleeping or reached limit for today', this.stateName);
                    yield utils_1.Utils.sleepSecs(utils_1.Utils.getRandomInt(30 * 60, 180 * 60));
                    continue;
                }
                if (this.cachedFollowUserIds.length <= 0) {
                    const hashtag = this.bot.getRandomHashtag();
                    utils_1.Utils.writeLog('Selected new hashtag: ' + hashtag, this.stateName);
                    const result = yield this.bot.apiService.getMediaByHashtag(hashtag);
                    const success = yield this.bot.isSuccess(result);
                    if (success === true) {
                        this.cachedFollowUserIds = result.data.map((post) => post.ownerId);
                        this.cachedFollowUserIds = this.cachedFollowUserIds.filter((userId) => {
                            return this.bot.storageService.canFollow(userId) && this.bot.user_id.toString() !== userId.toString();
                        });
                        this.numberOfUsersToFollow = utils_1.Utils.getRandomInt(Math.floor(0.8 * this.bot.config.maxFollowsPerHashtag), Math.floor(1.2 * this.bot.config.maxFollowsPerHashtag));
                        this.followedUsers = 0;
                        yield utils_1.Utils.sleep();
                    }
                    else {
                        yield utils_1.Utils.sleepSecs(this.bot.failedRequestSleepTime);
                        continue;
                    }
                }
                let currentUser = null;
                if (this.cachedFollowUserIds.length > 0) {
                    const selectedUserToLoad = this.cachedFollowUserIds.splice(utils_1.Utils.getRandomInt(0, this.cachedFollowUserIds.length - 1), 1)[0];
                    const result = yield this.bot.apiService.getUserInfoById(selectedUserToLoad);
                    const success = yield this.bot.isSuccess(result);
                    if (success === true) {
                        currentUser = result.data;
                    }
                    else {
                        yield utils_1.Utils.sleepSecs(this.bot.failedRequestSleepTime);
                    }
                    yield utils_1.Utils.quickSleep();
                }
                if (currentUser != null && currentUser.canBeFollowed === true) {
                    const result = yield this.bot.apiService.follow(currentUser.user_id, false);
                    const success = yield this.bot.isSuccess(result);
                    if (success === false) {
                        utils_1.Utils.writeLog(`Failed to follow user: username: ${currentUser.username}`, this.stateName);
                        yield utils_1.Utils.sleepSecs(this.bot.failedRequestSleepTime);
                        continue;
                    }
                    else {
                        this.followedUsers++;
                        this.bot.followedNewUser(currentUser, this.stateName);
                        yield utils_1.Utils.sleepSecs(this.getFollowSleepTime());
                    }
                }
                else {
                    yield utils_1.Utils.quickSleep();
                }
                if (this.numberOfUsersToFollow <= this.followedUsers) {
                    this.cachedFollowUserIds = [];
                }
            } while (true);
        });
    }
    getFollowSleepTime() {
        return utils_1.Utils.getRandomInt(90, 560);
    }
}
exports.FollowClassicMode = FollowClassicMode;
