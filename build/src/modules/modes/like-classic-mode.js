"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("../utils/utils");
const state_manager_1 = require("../state-manager");
class LikeClassicMode extends state_manager_1.StateManager {
    constructor(bot) {
        super();
        this.bot = bot;
        this.cachedMediaPosts = [];
        this.numberOfPostsToLike = 0;
        this.likedPosts = 0;
        this.stateName = 'Like-Mode Classic';
    }
    start() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            utils_1.Utils.writeLog('Started the service', this.stateName);
            do {
                if (this.bot.shouldBotSleep(new Date(Date.now())) === true || this.bot.likesCountCurrentDay >= this.bot.config.maxLikesPerDay) {
                    utils_1.Utils.writeLog('Bot is sleeping or reached limit for today', this.stateName);
                    yield utils_1.Utils.sleepSecs(utils_1.Utils.getRandomInt(30 * 60, 90 * 60));
                    continue;
                }
                if (this.cachedMediaPosts.length <= 0) {
                    const hashtag = this.bot.getRandomHashtag();
                    utils_1.Utils.writeLog('Selected new hashtag: ' + hashtag, this.stateName);
                    const result = yield this.bot.apiService.getMediaByHashtag(hashtag);
                    const success = yield this.bot.isSuccess(result);
                    if (success === true) {
                        this.cachedMediaPosts = result.data;
                        this.numberOfPostsToLike = utils_1.Utils.getRandomInt(Math.floor(0.8 * this.bot.config.maxLikesPerHashtag), Math.floor(1.2 * this.bot.config.maxLikesPerHashtag));
                        this.likedPosts = 0;
                        yield utils_1.Utils.sleep();
                    }
                    else {
                        yield utils_1.Utils.sleepSecs(this.bot.failedRequestSleepTime);
                        continue;
                    }
                }
                let currentPost;
                if (this.cachedMediaPosts.length > 0) {
                    const selectedPostToLoad = this.cachedMediaPosts.splice(utils_1.Utils.getRandomInt(0, this.cachedMediaPosts.length - 1), 1)[0];
                    currentPost = yield this.loadMediaPage(selectedPostToLoad.shortcode);
                    yield utils_1.Utils.quickSleep();
                }
                if (currentPost != null && currentPost.canLike() === true) {
                    const result = yield this.bot.apiService.like(currentPost.id);
                    const success = yield this.bot.isSuccess(result);
                    if (success === false) {
                        utils_1.Utils.writeLog(`Failed to like post: https://www.instagram.com/p/${currentPost.shortcode}`, this.stateName);
                        yield utils_1.Utils.sleep();
                        continue;
                    }
                    else {
                        this.likedPosts++;
                        this.bot.likedNewMedia(currentPost, this.stateName);
                        yield utils_1.Utils.sleepSecs(this.getLikeSleepTime());
                    }
                }
                else {
                    yield utils_1.Utils.quickSleep();
                }
                if (this.cachedMediaPosts.length < 9 || this.numberOfPostsToLike <= this.likedPosts) {
                    this.cachedMediaPosts = [];
                }
            } while (true);
        });
    }
    loadMediaPage(shortcode) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const result = yield this.bot.apiService.getMediaPostPage(shortcode);
            const success = yield this.bot.isSuccess(result);
            return success === true ? result.data : null;
        });
    }
    getLikeSleepTime() {
        if (this.likedPosts % 8 === 0) {
            return utils_1.Utils.getRandomInt(240, 560);
        }
        else {
            return utils_1.Utils.getRandomInt(22, 51);
        }
    }
    startAutoLikeByTagMode() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
        });
    }
}
exports.LikeClassicMode = LikeClassicMode;
