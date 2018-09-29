"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http_service_1 = require("./services/http.service");
const storage_service_1 = require("./services/storage.service");
const utils_1 = require("./modules/utils/utils");
class Instabot {
    constructor(options) {
        this.defaultConfig = {
            botModes: 'like-classic-mode',
            maxLikesPerDay: 1000,
            maxDislikesPerDay: 0,
            maxFollowsPerDay: 300,
            maxUnfollowsPerDay: 300,
            minUnfollowWaitTime: 1440,
            minDislikeWaitTime: 1440,
            maxFollowsPerHashtag: 20,
            hashtags: ['follow4follow', 'f4f', 'beer', 'l4l', 'like4like'],
            maxLikesPerHashtag: 50,
            sleepStart: '0:00',
            sleepEnd: '7:00',
            waitTimeBeforeDelete: 10080,
            followerOptions: {
                unwantedUsernames: [],
                followFakeUsers: false,
                followSelebgramUsers: false,
                followPassiveUsers: false,
            },
            postOptions: {
                maxLikesToLikeMedia: 600,
                minLikesToLikeMedia: 5,
            },
            isTesting: false,
        };
        this.failedRequestSleepTime = 120;
        this.banCountToBeBanned = 3;
        this.banSleepTime = 2 * 60 * 60;
        this.isLoggedIn = false;
        this.followCountCurrentDay = 0;
        this.unfollowCountCurrentDay = 0;
        this.likesCountCurrentDay = 0;
        this.dislikesCountCurrentDay = 0;
        this.banCount = 0;
        this.isBanned = false;
        if (options == null ||
            options['username'] == null ||
            options['password'] == null) {
            this.canStart = false;
            return;
        }
        this.canStart = true;
        this.username = options.username;
        this.password = options.password;
        this.config = Object.assign({}, this.defaultConfig, options.config);
        if (this.config.isTesting === true) {
            this.isLoggedIn = true;
        }
        this.apiService = new http_service_1.HttpService({
            followerOptions: this.config.followerOptions,
            postOptions: this.config.postOptions,
        });
        this.storageService = new storage_service_1.StorageService({
            waitTimeBeforeDeleteData: this.config.waitTimeBeforeDelete,
            unfollowWaitTime: this.config.minUnfollowWaitTime,
        });
        utils_1.Utils.writeLog('----------------------- INSTABOT JS -----------------------', 'START');
        utils_1.Utils.writeLog('Started the bot');
    }
    initBot() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.canStart !== true) {
                return this.shutDown(utils_1.Utils.getShutdownMessage('Username or/and Password are missing. You need to provide your credentials inside the bot-config.json file!'));
            }
            try {
                this.collectPreviousData();
                process.on('SIGINT', () => {
                    console.log('Trying to log out the bot, please wait...');
                    if (this.isLoggedIn === true) {
                        this.logout()
                            .then(() => {
                            utils_1.Utils.writeLog('Logged out the bot successfully');
                            this.updateMessage(true);
                            this.shutDown();
                        })
                            .catch(err => {
                            utils_1.Utils.writeLog(err);
                            this.updateMessage(true);
                            this.shutDown();
                        });
                    }
                    else {
                        utils_1.Utils.writeLog('Logged out the bot successfully');
                        this.updateMessage(true);
                        this.shutDown();
                    }
                });
                yield this.login();
                yield this.startSelectedMode();
                return Promise.resolve();
            }
            catch (e) {
                return Promise.reject(e);
            }
        });
    }
    startSelectedMode() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const strategies = require('./modules/modes/strategies');
            const modes = this.config.botModes.split(',');
            yield modes.forEach(modeName => {
                const mode = strategies[modeName.trim()];
                if (mode == null) {
                    utils_1.Utils.writeLog(`startSelectedMode: mode ${modeName} does not exist`);
                }
                else {
                    new mode(this).start();
                }
            });
        });
    }
    collectPreviousData() {
        const followers = this.storageService.getFollowers();
        const likes = this.storageService.getLikes();
        const dislikes = this.storageService.getDisLikes();
        const unfollows = this.storageService.getUnfollowed();
        const todayFollowers = Object.keys(followers).filter(key => {
            try {
                return (new Date(followers[key]).setHours(0, 0, 0, 0) ==
                    new Date(Date.now()).setHours(0, 0, 0, 0));
            }
            catch (e) {
                return false;
            }
        });
        const todayLikes = Object.keys(likes).filter(key => {
            try {
                return (new Date(likes[key]).setHours(0, 0, 0, 0) ==
                    new Date(Date.now()).setHours(0, 0, 0, 0));
            }
            catch (e) {
                return false;
            }
        });
        const todayDisLikes = Object.keys(dislikes).filter(key => {
            try {
                return (new Date(dislikes[key]).setHours(0, 0, 0, 0) ==
                    new Date(Date.now()).setHours(0, 0, 0, 0));
            }
            catch (e) {
                return false;
            }
        });
        const todayUnfollows = Object.keys(unfollows).filter(key => {
            try {
                return (new Date(unfollows[key]).setHours(0, 0, 0, 0) ==
                    new Date(Date.now()).setHours(0, 0, 0, 0));
            }
            catch (e) {
                return false;
            }
        });
        this.followCountCurrentDay = todayFollowers.length;
        this.likesCountCurrentDay = todayLikes.length;
        this.unfollowCountCurrentDay = todayUnfollows.length;
        this.dislikesCountCurrentDay = todayDisLikes.length;
        console.log('Already did today:', 'Follows:', this.followCountCurrentDay, 'Likes:', this.likesCountCurrentDay, 'Unfollows:', this.unfollowCountCurrentDay, 'Dislikes:', this.dislikesCountCurrentDay);
    }
    login() {
        if (this.isLoggedIn === true)
            return Promise.resolve(true);
        return new Promise((resolve, reject) => {
            utils_1.Utils.writeLog('trying to login as ' + this.username + '...', 'Login');
            this.apiService
                .getCsrfToken()
                .then(result => {
                this.isSuccess(result).then(success => {
                    if (success === false) {
                        return reject('Could not get CSRF-Token from Instagram... Is your IP blocked by Instagram ?');
                    }
                    utils_1.Utils.writeLog('Successfully got the CSRF-Token', 'Login');
                    utils_1.Utils.quickSleep().then(() => {
                        this.apiService
                            .login({
                            username: this.username,
                            password: this.password,
                        })
                            .then(result => {
                            this.isSuccess(result).then(success => {
                                if (success === false) {
                                    return reject(`Could not login with the provided credentials... Username: ${this.username} , Password: ${this.password}`);
                                }
                                utils_1.Utils.writeLog('Only one step left...', 'Login');
                                utils_1.Utils.quickSleep().then(() => {
                                    this.apiService
                                        .getUserInfo(this.username)
                                        .then(result => {
                                        this.isSuccess(result).then(success => {
                                            if (success === false) {
                                                return reject('Failed to get your profile information...');
                                            }
                                            else {
                                                this.user_id = result.data.user_id;
                                                this.isLoggedIn = true;
                                                utils_1.Utils.writeLog('Login was successful', 'Login');
                                                return resolve(true);
                                            }
                                        });
                                    })
                                        .catch(() => {
                                        return reject('Could not get user info, couldnt login...');
                                    });
                                });
                            });
                        })
                            .catch(err => {
                            return reject(err);
                        });
                    });
                });
            })
                .catch(err => {
                return reject(err);
            });
        });
    }
    logout() {
        if (this.isLoggedIn === false) {
            return Promise.resolve(true);
        }
        return new Promise((resolve, reject) => {
            this.apiService
                .logout()
                .then(result => {
                this.isSuccess(result).then(success => {
                    if (success === false) {
                        return reject('Could not logout of Instagram... ');
                    }
                    this.isLoggedIn = false;
                    return resolve(true);
                });
            })
                .catch(() => {
                return reject('Could not logout of Instagram...');
            });
        });
    }
    startBanSleep() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.banCount >= this.banCountToBeBanned) {
                utils_1.Utils.writeLog('Bot is probably getting banned, sleeping now for ' +
                    this.banSleepTime / 3600 +
                    'h', 'Ban');
                this.isBanned = true;
                this.banCount = 0;
                yield utils_1.Utils.sleepSecs(this.banSleepTime);
                this.isBanned = false;
                return Promise.resolve();
            }
            else {
                return Promise.resolve();
            }
        });
    }
    isSuccess(result) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (result.success !== true) {
                if (result.status >= 400 && result.status <= 403) {
                    this.banCount++;
                    utils_1.Utils.writeLog('Request ended with status: ' +
                        result.status +
                        ', Ban-Count is now on: ' +
                        this.banCount +
                        ' of total: ' +
                        this.banCountToBeBanned +
                        ', when reached, then bot will sleep for ' +
                        this.banSleepTime / 3600 +
                        ' hours');
                    yield this.startBanSleep();
                    return Promise.resolve(false);
                }
                else {
                    yield utils_1.Utils.sleep();
                    return Promise.resolve(false);
                }
            }
            else {
                return Promise.resolve(true);
            }
        });
    }
    likedNewMedia(post, prefix) {
        utils_1.Utils.writeLog(`Liked new post: https://www.instagram.com/p/${post.shortcode}`, prefix);
        this.likesCountCurrentDay++;
        this.storageService.addLike(post.id);
        this.updateMessage();
    }
    followedNewUser(user, prefix) {
        utils_1.Utils.writeLog(`Followed new user: ${user.username}`, prefix);
        this.followCountCurrentDay++;
        this.storageService.addFollower(user.user_id);
        this.updateMessage();
    }
    unfollowedNewUser(user, prefix) {
        utils_1.Utils.writeLog(`Unfollowed user: username: ${user.user_id}`, prefix);
        this.unfollowCountCurrentDay++;
        this.storageService.unFollowed(user.user_id);
        this.updateMessage();
    }
    dislikedNewMedia(postId, prefix) {
        utils_1.Utils.writeLog(`Disliked new media: ID: ${postId}`, prefix);
        this.dislikesCountCurrentDay++;
        this.storageService.disLiked(postId);
        this.updateMessage();
    }
    updateMessage(newLine = false) {
        if (newLine === true) {
            utils_1.Utils.writeLog(`Likes: ${this.storageService.getLikesLength()} / ${this.storageService.getDisLikesLength()}; Follows: ${this.storageService.getFollowersLength()} / ${this.storageService.getUnFollowsLength()};`);
        }
        else {
            utils_1.Utils.writeProgress(`Likes: ${this.storageService.getLikesLength()} / ${this.storageService.getDisLikesLength()}; Follows: ${this.storageService.getFollowersLength()} / ${this.storageService.getUnFollowsLength()};`);
        }
    }
    getRandomHashtag() {
        return this.config.hashtags[utils_1.Utils.getRandomInt(0, this.config.hashtags.length - 1)];
    }
    startNewDay() {
        this.followCountCurrentDay = 0;
        this.unfollowCountCurrentDay = 0;
        this.likesCountCurrentDay = 0;
        this.dislikesCountCurrentDay = 0;
        this.storageService.cleanUp();
    }
    shutDown(message) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (message) {
                utils_1.Utils.writeLog(message);
            }
            yield utils_1.Utils.sleepSecs(1);
            process.exit();
        });
    }
    shouldBotSleep(now) {
        const { nowHour, nowMinutes } = {
            nowHour: Number(now.getHours()),
            nowMinutes: Number(now.getMinutes()),
        };
        const { startHour, startMinutes } = {
            startHour: Number(this.config.sleepStart.split(':')[0]),
            startMinutes: Number(this.config.sleepStart.split(':')[1]),
        };
        const { endHour, endMinutes } = {
            endHour: Number(this.config.sleepEnd.split(':')[0]),
            endMinutes: Number(this.config.sleepEnd.split(':')[1]),
        };
        const shouldBotSleep = nowHour >= startHour &&
            nowHour * 60 + nowMinutes >= startHour * 60 + startMinutes &&
            nowHour <= endHour &&
            nowHour * 60 + nowMinutes <= endHour * 60 + endMinutes;
        if (shouldBotSleep === true) {
            this.startNewDay();
        }
        return shouldBotSleep || this.isBanned;
    }
}
exports.Instabot = Instabot;
