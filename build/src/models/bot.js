"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("../utils/utils");
class Instabot {
    constructor(apiService, storageService, options) {
        this.apiService = apiService;
        this.storageService = storageService;
        this.isLoggedIn = false;
        this.defaultConfig = {
            maxLikesPerDay: 1000,
            maxDislikesPerDay: 1000,
            maxFollowsPerDay: 300,
            maxUnfollowsPerDay: 300,
            minUnfollowWaitTime: 4320,
            minDislikeWaitTime: 1440,
            maxFollowsPerHashtag: 20,
            maxLikesToLikeMedia: 600,
            minLikesToLikeMedia: 5,
            hashtags: ['follow4follow', 'f4f', 'beer', 'l4l', 'like4like'],
            maxLikesPerHashtag: 50,
            sleepTime: 4,
            waitTimeBeforeDelete: 10080,
            followerOptions: {
                unwantedUsernames: [],
                followFakeUsers: false,
                followSelebgramUsers: false,
                followPassiveUsers: false,
            },
        };
        this.timeInDay = 24 * 60 * 60;
        this.failedRequestSleepTime = 120;
        this.banCountToBeBanned = 3;
        this.banSleepTime = 2 * 60 * 60;
        this.userIdOfLikedPosts = [];
        this.botIsAsleep = false;
        this.followCountCurrentDay = 0;
        this.unfollowCountCurrentDay = 0;
        this.likesCountCurrentDay = 0;
        this.dislikesCountCurrentDay = 0;
        this.banCount = 0;
        this.isDisliking = false;
        this.isUnfollowing = false;
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
        this.registeredRoutines = {};
        this.sleepTimeInSecs = Math.floor(this.config.sleepTime * 60 * 60);
        this.likeSleep = Math.floor((this.timeInDay - this.sleepTimeInSecs) / this.config.maxLikesPerDay);
        this.followSleep = Math.floor((this.timeInDay - this.sleepTimeInSecs) / this.config.maxFollowsPerDay);
        this.unfollowWaitTime = Math.floor(this.config.minUnfollowWaitTime * 60);
        this.dislikeWaitTime = Math.floor(this.config.minDislikeWaitTime * 60);
        this.storageService.setWaitTimeBeforeDelete(this.config.waitTimeBeforeDelete);
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
                this.registerBotSleep();
                return Promise.resolve();
            }
            catch (e) {
                return Promise.reject(e);
            }
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
    registerBotSleep() {
        if (this.sleepTimeInSecs <= 0) {
            return;
        }
        const worktime = (this.timeInDay - this.sleepTimeInSecs) * 1000;
        const botStartSleep = worktime * 0.9 + worktime * 0.2 * Math.random();
        const sleepTime = new Date(Date.now() + botStartSleep);
        utils_1.Utils.writeLog(`Registered bot to sleep at ${utils_1.Utils.getDateString(sleepTime)}`);
        utils_1.Utils.sleep(botStartSleep).then(() => {
            this.getBotToSleep();
        });
    }
    login() {
        return new Promise((resolve, reject) => {
            utils_1.Utils.writeLog('trying to login as ' + this.username + '...', 'Login');
            this.apiService
                .getCsrfToken()
                .then(result => {
                this.isSuccess(result).then(success => {
                    if (success === false) {
                        return reject('Could not get CSRF-Token from Instagram... Is your IP blocked by Instagram ?');
                    }
                    utils_1.Utils.sleep().then(() => {
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
                                utils_1.Utils.sleep().then(() => {
                                    this.apiService
                                        .getUserInfo(this.username, Object.assign({}, this.config.followerOptions))
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
    registerRoutine(id, routine) {
        if (this.registeredRoutines[id] == null) {
            this.registeredRoutines[id] = routine;
        }
    }
    startAutoLikeByTagMode() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                this.registerRoutine('startAutoLikeByTagMode', this.startAutoLikeByTagMode);
                if (this.botIsAsleep === true) {
                    return Promise.resolve();
                }
                if (!this.isLoggedIn) {
                    yield this.initBot();
                }
                if (this.likesCountCurrentDay >= this.config.maxLikesPerDay) {
                    utils_1.Utils.writeLog('Todays Like limit is reached, pausing now.', 'startAutoLikeByTagMode');
                    return Promise.resolve();
                }
                const hashtag = this.getRandomHashtag();
                utils_1.Utils.writeLog('Selected new hashtag: ' + hashtag);
                const result = yield this.apiService.getMediaByHashtag(hashtag);
                const success = yield this.isSuccess(result);
                if (success === true) {
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
                    utils_1.Utils.writeLog(`Selecting new hashtag failed, sleeping for ${this
                        .failedRequestSleepTime / 60} mins`);
                    yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
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
    startAutoCheckOwnProfileMode() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
        });
    }
    startAutoFollow(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                this.registerRoutine('startAutoFollow', this.startAutoFollow);
                if (this.botIsAsleep === true) {
                    return Promise.resolve();
                }
                if (!this.isLoggedIn) {
                    yield this.initBot();
                }
                if (this.userIdOfLikedPosts.length > 5 &&
                    this.followCountCurrentDay < this.config.maxFollowsPerDay) {
                    yield this.followAllUsersById(this.userIdOfLikedPosts);
                    yield utils_1.Utils.sleep(this.getFollowSleepTime() * 4);
                    if (this.followCountCurrentDay < this.config.maxFollowsPerDay) {
                        return this.startAutoFollow();
                    }
                    else {
                        return Promise.resolve();
                    }
                }
                else if (this.followCountCurrentDay < this.config.maxFollowsPerDay) {
                    const hashtag = this.getRandomHashtag();
                    const result = yield this.apiService.getMediaByHashtag(hashtag);
                    const success = yield this.isSuccess(result);
                    if (success === false) {
                        yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                        return this.startAutoFollow();
                    }
                    const userIds = result.data.map(post => post.ownerId);
                    yield this.followAllUsersById(userIds, withSleep);
                    yield utils_1.Utils.sleep(this.getFollowSleepTime() * 4);
                    return this.startAutoFollow();
                }
                else {
                    utils_1.Utils.writeLog('Stopped following people for today', 'startAutoFollow');
                    this.updateMessage();
                    return Promise.resolve();
                }
            }
            catch (e) {
                utils_1.Utils.writeLogError('Error while performing startAutoFollow', 'startAutoFollow');
                yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                return this.startAutoFollow();
            }
        });
    }
    startAutoUnfollow(withSleep = true, isAutoStarted = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                if (this.botIsAsleep === true) {
                    return Promise.resolve();
                }
                if (this.isUnfollowing === true) {
                    return Promise.resolve();
                }
                if (this.isLoggedIn !== true) {
                    yield this.initBot();
                }
                if (isAutoStarted === false) {
                    this.registerRoutine('startAutoUnfollow', this.startAutoUnfollow);
                }
                if (this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
                    this.storageService.getUnfollowableLength(this.unfollowWaitTime) > 0) {
                    yield this.startUnfollowFollowed(withSleep);
                    yield utils_1.Utils.sleep(this.getFollowSleepTime() * utils_1.Utils.getRandomInt(5, 10));
                    if (this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
                        this.storageService.getUnfollowableLength(this.unfollowWaitTime) > 0) {
                        return this.startAutoUnfollow(withSleep, isAutoStarted);
                    }
                    else {
                        return Promise.resolve();
                    }
                }
                else if (this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay) {
                    if (this.followCountCurrentDay < this.config.maxFollowsPerDay) {
                        yield utils_1.Utils.sleep(this.getFollowSleepTime() * utils_1.Utils.getRandomInt(3, 8));
                        return this.startAutoUnfollow(withSleep, isAutoStarted);
                    }
                    else {
                        return Promise.resolve();
                    }
                }
                else {
                    utils_1.Utils.writeLog('Stopped to unfollow people today, limit has been reached');
                    return Promise.resolve();
                }
            }
            catch (e) {
                utils_1.Utils.writeLogError('Error while performing startAutoUnfollow', 'startAutoUnfollow');
                yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                return this.startAutoUnfollow(withSleep, isAutoStarted);
            }
        });
    }
    startAutoDislike(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                if (this.botIsAsleep === true) {
                    return Promise.resolve();
                }
                if (this.isDisliking === true) {
                    return Promise.resolve();
                }
                if (this.isLoggedIn !== true) {
                    yield this.initBot();
                }
                this.registerRoutine('startAutoDislike', this.startAutoDislike);
                if (this.dislikesCountCurrentDay < this.config.maxDislikesPerDay &&
                    this.storageService.getDislikeableLength(this.dislikeWaitTime) > 0) {
                    yield this.startDislikeLiked(withSleep);
                    yield utils_1.Utils.sleep(this.getLikeSleepTime() * 8);
                    if (this.dislikesCountCurrentDay < this.config.maxDislikesPerDay &&
                        this.storageService.getDislikeableLength(this.dislikeWaitTime) > 0) {
                        return this.startAutoDislike(withSleep);
                    }
                    else {
                        return Promise.resolve();
                    }
                }
                else if (this.dislikesCountCurrentDay < this.config.maxDislikesPerDay) {
                    if (this.likesCountCurrentDay < this.config.maxLikesPerDay) {
                        yield utils_1.Utils.sleep(this.getLikeSleepTime() * utils_1.Utils.getRandomInt(3, 8));
                        return this.startAutoDislike(withSleep);
                    }
                    else {
                        return Promise.resolve();
                    }
                }
                else {
                    utils_1.Utils.writeLog('Stopped to dislike medias for today, limit has been reached');
                    return Promise.resolve();
                }
            }
            catch (e) {
                utils_1.Utils.writeLogError('Error while performing startAutoDislike', 'startAutoDislike');
                yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                return this.startAutoDislike(withSleep);
            }
        });
    }
    startBanSleep() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.banCount >= this.banCountToBeBanned) {
                utils_1.Utils.writeLog('Bot is probably getting banned, sleeping now for ' +
                    this.banSleepTime / 3600 +
                    'h');
                this.banCount = 0;
                this.botIsAsleep = true;
                yield utils_1.Utils.sleepSecs(this.banSleepTime);
                this.botIsAsleep = false;
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
    likeAllExistingMedia(posts, withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.likesCountCurrentDay >= this.config.maxLikesPerDay) {
                return Promise.resolve();
            }
            const postsToLikeCount = this.config.maxLikesPerHashtag + this.likesCountCurrentDay;
            while (posts.length > 0 &&
                this.botIsAsleep === false &&
                this.likesCountCurrentDay < this.config.maxLikesPerDay &&
                this.likesCountCurrentDay < postsToLikeCount) {
                try {
                    const post = posts.splice(utils_1.Utils.getRandomInt(0, posts.length - 1), 1)[0];
                    if (this.storageService.canLike(post.id) !== true ||
                        post.likes < this.config.minLikesToLikeMedia ||
                        post.likes > this.config.maxLikesToLikeMedia) {
                        utils_1.Utils.writeLog(`Not liking post ${post.id}`);
                        continue;
                    }
                    else {
                        const result = yield this.apiService.like(post.id);
                        const success = yield this.isSuccess(result);
                        if (success === false) {
                            utils_1.Utils.writeLog(`Failed to like media ${post.id} : URL: https://www.instagram.com/p/${post.shortcode}`);
                            yield this.startLikeSleep(withSleep);
                            continue;
                        }
                        else {
                            this.likedNewMedia(post);
                        }
                        yield this.startLikeSleep(withSleep);
                    }
                }
                catch (e) {
                    console.error('Error liking post likeAllExistingMedia, ', e);
                    continue;
                }
            }
            utils_1.Utils.writeLog(`Finished likeAllExistingMedia Current: ${this.likesCountCurrentDay}, Liking till: ${postsToLikeCount}`);
            return Promise.resolve();
        });
    }
    startLikeSleep(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (withSleep === true) {
                if (this.likesCountCurrentDay % 8 === 0) {
                    yield utils_1.Utils.sleep(this.getLikeSleepTime() * utils_1.Utils.getRandomInt(4, 8), 'likeAllExistingMedia');
                }
                else {
                    yield utils_1.Utils.sleep(undefined, 'likeAllExistingMedia');
                }
            }
            else {
                return Promise.resolve();
            }
        });
    }
    startDisikeSleep(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (withSleep === true) {
                if (this.dislikesCountCurrentDay % 8 === 0) {
                    yield utils_1.Utils.sleep(this.getLikeSleepTime() * utils_1.Utils.getRandomInt(4, 8), 'startDislikeLiked');
                }
                else {
                    yield utils_1.Utils.sleep(this.getLikeSleepTime(), 'startDislikeLiked');
                }
            }
            else {
                return Promise.resolve();
            }
        });
    }
    startFollowSleep(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (withSleep === true) {
                if (this.followCountCurrentDay % 4 === 0) {
                    yield utils_1.Utils.sleep(this.getFollowSleepTime() * utils_1.Utils.getRandomInt(4, 8), 'FollowSleep');
                }
                else {
                    yield utils_1.Utils.sleep(undefined, 'FollowSleep');
                }
            }
            else {
                return Promise.resolve();
            }
        });
    }
    startUnfollowSleep(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (withSleep === true) {
                if (this.unfollowCountCurrentDay % 4 === 0) {
                    yield utils_1.Utils.sleep(this.getFollowSleepTime() * utils_1.Utils.getRandomInt(4, 8), 'UnfollowSleep');
                }
                else {
                    yield utils_1.Utils.sleep(undefined, 'UnfollowSleep');
                }
            }
            else {
                return Promise.resolve();
            }
        });
    }
    followAllUsersById(userIds, withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            while (this.followCountCurrentDay < this.config.maxFollowsPerDay &&
                this.botIsAsleep === false &&
                userIds.length > 0) {
                try {
                    const userId = userIds.splice(utils_1.Utils.getRandomInt(0, userIds.length - 1), 1)[0];
                    if (userId !== this.user_id &&
                        this.storageService.canFollow(userId) === true) {
                        const result = yield this.apiService.getUserInfoById(userId, Object.assign({}, this.config.followerOptions));
                        const success = yield this.isSuccess(result);
                        if (success === false) {
                            yield this.startFailedRequestSleep();
                            continue;
                        }
                        const user = result.data;
                        if (user && user.canBeFollowed === true) {
                            const result = yield this.apiService.follow(user.user_id);
                            const success = yield this.isSuccess(result);
                            if (success === false) {
                                utils_1.Utils.writeLogError(`Failed to follow ${user.username}, status: ${result.status}`);
                                yield this.startFailedRequestSleep();
                                continue;
                            }
                            else {
                                this.followedNewUser(user);
                                if (withSleep === true) {
                                    yield this.startFollowSleep(withSleep);
                                }
                            }
                        }
                        else {
                            utils_1.Utils.writeLog(`Not following user: ${user.canFollowReason()}`);
                            yield utils_1.Utils.sleepSecs(utils_1.Utils.getRandomInt(5, 30));
                        }
                    }
                }
                catch (e) {
                    console.error('Error following user by posts followAllUsersByMedia, ', e);
                    yield this.startFailedRequestSleep();
                    continue;
                }
            }
            return Promise.resolve();
        });
    }
    startFailedRequestSleep() {
        return utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
    }
    likedNewMedia(post) {
        const index = this.userIdOfLikedPosts.findIndex(id => id === post.ownerId);
        if (index < 0) {
            this.userIdOfLikedPosts.push(post.ownerId);
        }
        utils_1.Utils.writeLog(`Liked post ${post.id}`, 'Like');
        this.likesCountCurrentDay++;
        this.storageService.addLike(post.id);
        this.updateMessage();
        if (this.shouldStartDislike() === true) {
            this.startAutoDislike();
        }
    }
    followedNewUser(user) {
        utils_1.Utils.writeLog(`Followed new user: ${user.username}`, 'Follow');
        this.followCountCurrentDay++;
        this.storageService.addFollower(user.user_id);
        this.updateMessage();
        if (this.followCountCurrentDay % 8 === 0) {
            if (this.shouldStartUnfollow() === true)
                this.startAutoUnfollow();
        }
    }
    unfollowedNewUser(userId) {
        utils_1.Utils.writeLog(`Unfollowed new user: ID: ${userId}`, 'Unfollow');
        this.unfollowCountCurrentDay++;
        this.storageService.unFollowed(userId);
        this.updateMessage();
    }
    dislikedNewMedia(postId) {
        utils_1.Utils.writeLog(`Disliked new media: ID: ${postId}`, 'Dislike');
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
    getLikeSleepTime() {
        return (utils_1.Utils.getRandomInt(this.likeSleep * 0.85, this.likeSleep * 0.85 + this.likeSleep * 0.3 * Math.random()) * 1000);
    }
    getFollowSleepTime() {
        return (utils_1.Utils.getRandomInt(this.followSleep * 0.85, this.followSleep * 0.85 + this.followSleep * 0.3 * Math.random()) * 1000);
    }
    startNewDay() {
        this.userIdOfLikedPosts = [];
        this.followCountCurrentDay = 0;
        this.unfollowCountCurrentDay = 0;
        this.likesCountCurrentDay = 0;
        this.dislikesCountCurrentDay = 0;
        this.storageService.cleanUp();
    }
    getBotToSleep() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                utils_1.Utils.writeLog('Putting bot to sleep', 'Bot-Sleep');
                if (this.isLoggedIn === true) {
                    yield this.logout();
                }
                this.botIsAsleep = true;
                yield utils_1.Utils.sleep();
                const sleepTime = utils_1.Utils.getRandomInt(this.sleepTimeInSecs * 0.9, this.sleepTimeInSecs * 0.9 +
                    this.sleepTimeInSecs * 0.2 * Math.random()) * 1000;
                utils_1.Utils.writeLog(`Bot will sleep until ${utils_1.Utils.getDateString(new Date(Date.now() + sleepTime))}`, 'Bot-Sleep');
                yield utils_1.Utils.sleep(sleepTime, 'Bot-Sleep');
                this.startNewDay();
                this.botIsAsleep = false;
                yield this.restartRoutines();
                this.registerBotSleep();
            }
            catch (e) {
                utils_1.Utils.writeLogError('getBotToSleep Error: ' + e);
            }
        });
    }
    startUnfollowFollowed(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.isUnfollowing = true;
            while (this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
                this.botIsAsleep === false) {
                try {
                    const unfollowableUsersKeys = Object.keys(this.storageService.getUnfollowable(this.unfollowWaitTime));
                    const userId = unfollowableUsersKeys[utils_1.Utils.getRandomInt(0, unfollowableUsersKeys.length - 1)];
                    const result = yield this.apiService.follow(userId, true);
                    const success = yield this.isSuccess(result);
                    if (success === false) {
                        yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                        continue;
                    }
                    else {
                        this.unfollowedNewUser(userId);
                        if (withSleep === true) {
                            yield this.startUnfollowSleep(withSleep);
                        }
                        else {
                            yield utils_1.Utils.sleep();
                        }
                    }
                }
                catch (e) {
                    console.error('Error following user by posts followAllUsersByMedia, ', e);
                    continue;
                }
            }
            this.isUnfollowing = false;
            return Promise.resolve();
        });
    }
    startDislikeLiked(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.isDisliking = true;
            while (this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
                this.botIsAsleep === false) {
                try {
                    const mediaKeys = Object.keys(this.storageService.getLikes());
                    const postId = mediaKeys[utils_1.Utils.getRandomInt(0, mediaKeys.length - 1)];
                    const result = yield this.apiService.like(postId, true);
                    const success = yield this.isSuccess(result);
                    if (success === false) {
                        yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                        continue;
                    }
                    else {
                        this.dislikedNewMedia(postId);
                        if (withSleep === true) {
                            yield this.startDisikeSleep();
                        }
                        else {
                            yield utils_1.Utils.sleep();
                        }
                    }
                }
                catch (e) {
                    console.error('Error following user by posts startDislikeLiked, ', e);
                    continue;
                }
            }
            this.isDisliking = false;
            return Promise.resolve();
        });
    }
    shouldStartUnfollow() {
        return (this.storageService.getUnfollowableLength(this.unfollowWaitTime) > 0 &&
            this.isUnfollowing === false);
    }
    shouldStartDislike() {
        return (this.storageService.getDislikeableLength(this.dislikeWaitTime) > 0 &&
            this.isDisliking === false);
    }
    restartRoutines() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.isLoggedIn === false) {
                yield this.login();
            }
            else {
                utils_1.Utils.writeLogError('still logged in, no need to restart routines');
                return Promise.resolve();
            }
            Object.keys(this.registeredRoutines).forEach(key => {
                utils_1.Utils.writeLog('Restarting routine: ' + key);
                this.registeredRoutines[key].call(this);
            });
            return Promise.resolve();
        });
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
}
exports.Instabot = Instabot;
//# sourceMappingURL=bot.js.map