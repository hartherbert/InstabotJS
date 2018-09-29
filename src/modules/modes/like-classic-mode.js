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
    }
    start() {
    }
    loadMediaPage(shortcode) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // only downloading page, so instagram nows we went there
            const result = yield this.bot.apiService.getMediaPostPage(shortcode);
            const success = yield this.bot.isSuccess(result);
            return success === true ? result.data : null;
        });
    }
    startAutoLikeByTagMode() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            do {
                // check if new posts should be cached
                if (this.cachedMediaPosts.length <= 0) {
                    this.triedPosts = 0;
                    // download more random posts
                    // get any hashtag from map
                    const hashtag = this.bot.getRandomHashtag();
                    // get posts for this hashtag
                    utils_1.Utils.writeLog('Selected new hashtag: ' + hashtag);
                    const result = yield this.bot.apiService.getMediaByHashtag(hashtag);
                    const success = yield this.bot.isSuccess(result);
                    if (success === true) {
                        // like all posts
                        this.cachedMediaPosts = result.data;
                    }
                    else {
                        // getting posts wasn't successful
                        yield utils_1.Utils.sleepSecs(this.bot.failedRequestSleepTime); // chills
                    }
                }
                // quick delay
                yield utils_1.Utils.quickSleep();
                let currentPost;
                // select post
                if (this.cachedMediaPosts.length > 0) {
                    // select post and get explicit site
                    const selectedPostToLoad = this.cachedMediaPosts.splice(utils_1.Utils.getRandomInt(0, this.cachedMediaPosts.length - 1), 1)[0];
                    currentPost = yield this.loadMediaPage(selectedPostToLoad.shortcode);
                }
                yield utils_1.Utils.quickSleep();
                // like post
                if (this.bot.likesCountCurrentDay < this.bot.config.maxLikesPerDay) {
                    if (currentPost != null && currentPost.canLike() === true) {
                        // like post now
                        const result = yield this.bot.apiService.like(currentPost.id);
                        const success = yield this.bot.isSuccess(result);
                        if (success === false) {
                            utils_1.Utils.writeLog(`Failed to like post: https://www.instagram.com/p/${currentPost.shortcode}`);
                            yield this.bot.startLikeSleep();
                            continue;
                        }
                        else {
                            this.bot.likedNewMedia(currentPost);
                        }
                    }
                    else {
                        this.cachedMediaPosts = [];
                    }
                }
                else {
                    // if todays limit is reached, just return
                    utils_1.Utils.writeLog('Todays Like limit is reached, pausing now.', 'startAutoLikeByTagMode');
                    utils_1.Utils.sleepSecs(this.bot.slee);
                }
                if (this.cachedMediaPosts.length < 9) {
                    this.cachedMediaPosts = [];
                }
            } while (true);
            try {
                // Utils.writeLog('Called startAutoLikeByTagMode');
                this.registerRoutine('startAutoLikeByTagMode', this.startAutoLikeByTagMode);
                if (this.botIsAsleep === true) {
                    return Promise.resolve();
                }
                if (!this.isLoggedIn) {
                    yield this.initBot();
                }
                if (this.bot.likesCountCurrentDay >= this.bot.config.maxLikesPerDay) {
                    // if todays limit is reached, just return
                    utils_1.Utils.writeLog('Todays Like limit is reached, pausing now.', 'startAutoLikeByTagMode');
                    return Promise.resolve();
                }
                else {
                    // get any hashtag from map
                    const hashtag = this.getRandomHashtag();
                    // get posts for this hashtag
                    utils_1.Utils.writeLog('Selected new hashtag: ' + hashtag);
                    const result = yield this.apiService.getMediaByHashtag(hashtag);
                    const success = yield this.isSuccess(result);
                    if (success === true) {
                        // like all posts
                        yield this.likeAllExistingMedia(result.data);
                        yield utils_1.Utils.sleep(this.getLikeSleepTime() * utils_1.Utils.getRandomInt(4, 8), 'After likeallExistingMedia');
                        if (this.likesCountCurrentDay < this.config.maxLikesPerDay) {
                            return this.startAutoLikeByTagMode();
                        }
                        else {
                            utils_1.Utils.writeLog('Todays Like limit is reached, pausing now.', 'startAutoLikeByTagMode');
                            return Promise.resolve();
                        }
                    }
                    else {
                        // getting posts wasn't successful
                        utils_1.Utils.writeLog(`Selecting new hashtag failed, sleeping for ${this
                            .failedRequestSleepTime / 60} mins`);
                        yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime); // chills
                        return this.startAutoLikeByTagMode();
                    }
                }
                yield this.getStartRoutineSleepTime();
                // get any hashtag from map
                const hashtag = this.getRandomHashtag();
                // get posts for this hashtag
                utils_1.Utils.writeLog('Selected new hashtag: ' + hashtag);
                const result = yield this.apiService.getMediaByHashtag(hashtag);
                const success = yield this.isSuccess(result);
                if (success === true) {
                    // like all posts
                    yield this.likeAllExistingMedia(result.data);
                    yield utils_1.Utils.sleep(this.getLikeSleepTime() * utils_1.Utils.getRandomInt(4, 8), 'After likeallExistingMedia');
                    if (this.likesCountCurrentDay < this.config.maxLikesPerDay) {
                        return this.startAutoLikeByTagMode();
                    }
                    else {
                        utils_1.Utils.writeLog('Todays Like limit is reached, pausing now.', 'startAutoLikeByTagMode');
                        return Promise.resolve();
                    }
                }
                else {
                    // getting posts wasn't successful
                    utils_1.Utils.writeLog(`Selecting new hashtag failed, sleeping for ${this
                        .failedRequestSleepTime / 60} mins`);
                    yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime); // chills
                    return this.startAutoLikeByTagMode();
                }
            }
            catch (e) {
                utils_1.Utils.writeLogError('Error while performing startAutoLikeByTagMode', 'startAutoLikeByTagMode');
                yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                return this.startAutoLikeByTagMode();
            }
        });
    }
}
exports.LikeClassicMode = LikeClassicMode;
//# sourceMappingURL=like-classic-mode.js.map