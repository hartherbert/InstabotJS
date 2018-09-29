"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("./modules/utils/utils");
const moment = require("moment");
class Instabot {
    //endregion
    constructor(apiService, storageService, options) {
        this.apiService = apiService;
        this.storageService = storageService;
        this.isLoggedIn = false;
        /*Default bot configuration*/
        this.defaultConfig = {
            maxLikesPerDay: 1000,
            maxDislikesPerDay: 0,
            maxFollowsPerDay: 300,
            maxUnfollowsPerDay: 300,
            minUnfollowWaitTime: 4320,
            minDislikeWaitTime: 1440,
            maxFollowsPerHashtag: 20,
            hashtags: ['follow4follow', 'f4f', 'beer', 'l4l', 'like4like'],
            maxLikesPerHashtag: 50,
            sleepTime: 4,
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
        /*registered functions to call again after bot-sleep*/
        this.registeredRoutines = {};
        /*How long a day goes*/
        this.timeInDay = 24 * 60 * 60; // 24 hours
        /*minimum sleeptime for the bot if an failed request response comes in*/
        this.failedRequestSleepTime = 120; // in seconds
        /*Maximum count of ban request responses*/
        this.banCountToBeBanned = 3;
        /*Time to sleep in seconds when ban is active*/
        this.banSleepTime = 2 * 60 * 60;
        /*List of all userIds that some posts were liked*/
        this.userIdOfLikedPosts = [];
        /*if the bot is current sleeping*/
        this.botIsAsleep = false;
        /*Count of the followed users in the current running day*/
        this.followCountCurrentDay = 0;
        /*Count of the unfollowed users in the current running day*/
        this.unfollowCountCurrentDay = 0;
        /*likes made in the current running day*/
        this.likesCountCurrentDay = 0;
        /*dislikes made in the current running day*/
        this.dislikesCountCurrentDay = 0;
        /*Count of possible ban request responses*/
        this.banCount = 0;
        /*if dislike loop is running*/
        this.isDisliking = false;
        /*if unfollow loop is running*/
        this.isUnfollowing = false;
        if (options == null ||
            options['username'] == null ||
            options['password'] == null) {
            // incorrect config, required properties are probably missing
            this.canStart = false;
            return;
        }
        // required params exists
        this.canStart = true;
        this.username = options.username;
        this.password = options.password;
        this.config = Object.assign({}, this.defaultConfig, options.config);
        this.registeredRoutines = {};
        this.sleepTimeInSecs = Math.floor(this.config.sleepTime * 60 * 60);
        // time to wait to like next again,
        // attention: its calculated but still random
        // and 2/3 of the real time bcs the dislike time starts after 1/3 of the time
        this.likeSleep = Math.floor((this.timeInDay - this.sleepTimeInSecs) / this.config.maxLikesPerDay);
        // time to wait to follow next again,
        // attention: its calculated but still random
        // and 2/3 of the real time bcs the unfollow time starts after 1/3 of the time
        this.followSleep = Math.floor((this.timeInDay - this.sleepTimeInSecs) / this.config.maxFollowsPerDay);
        // minimum wait time so the bot can unfollow followed users
        // converting minutes (from config) to seconds
        this.unfollowWaitTime = Math.floor(this.config.minUnfollowWaitTime * 60);
        this.dislikeWaitTime = Math.floor(this.config.minDislikeWaitTime * 60);
        /*this.storageService.setWaitTimeBeforeDelete(
          this.config.waitTimeBeforeDelete,
        );*/
        // only for testing purposes
        if (this.config.isTesting === true) {
            this.isLoggedIn = true;
        }
        //this.clearRoutines();
    }
    /**
     * first method to call after constructor
     * Tries to login the user and initializes everything to start to like and follow some stuff on insta (lol)
     * */
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
                // register botsleep
                this.registerBotSleep();
                return Promise.resolve();
            }
            catch (e) {
                return Promise.reject(e);
            }
        });
    }
    /**
     * looking up all the stuff the bot already did today, then setting those values accordingly
     * */
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
    /**
     * Registers when the bot needs to go to sleep
     * */
    registerBotSleep() {
        if (this.sleepTimeInSecs <= 0) {
            // bot has no sleep
            return;
        }
        const worktime = (this.timeInDay - this.sleepTimeInSecs) * 1000; // in ms
        const botStartSleep = worktime * 0.9 + worktime * 0.2 * Math.random(); // in ms
        const sleepTime = new Date(Date.now() + botStartSleep);
        utils_1.Utils.writeLog(`Registered bot to sleep at ${utils_1.Utils.getDateString(sleepTime)}`);
        utils_1.Utils.sleep(botStartSleep).then(() => {
            this.getBotToSleep();
        });
    }
    /**
     * logs in the current user
     * */
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
                    // successful request, got csrf
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
                                utils_1.Utils.writeLog('Only one step left...', 'Login');
                                // logged in successfully
                                utils_1.Utils.sleep().then(() => {
                                    this.apiService
                                        .getUserInfo(this.username)
                                        .then(result => {
                                        // own user_id
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
                                }); // no catch needed for sleep
                            }); // no catch needed for isSuccess
                        })
                            .catch(err => {
                            return reject(err);
                        });
                    }); // no catch needed for sleep
                });
            })
                .catch(err => {
                return reject(err);
            });
        });
    }
    /**
     * logs out the current user
     * */
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
                    // success
                    this.isLoggedIn = false;
                    return resolve(true);
                });
            })
                .catch(() => {
                return reject('Could not logout of Instagram...');
            });
        });
    }
    /**
     * Registers a routine function, to call again after bot-sleep
     * @param id, any name (key in the object)
     * @param routine, function to be called after sleep
     * @param params, arguments to pass to function on call
     * */
    registerRoutine(id, routine, ...params) {
        console.log('registering new routine: ', id);
        if (Object.keys(this.registeredRoutines).indexOf(id) < 0) {
            // register routine
            console.log('registered routine: ', id);
            this.registeredRoutines[id] = [routine, params];
        }
    }
    getStartRoutineSleepTime() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const sleepSecs = utils_1.Utils.getRandomInt(1, 180);
            utils_1.Utils.writeLog('Bot sleeping now for ' + sleepSecs + ' before starting routine');
            return utils_1.Utils.sleep(sleepSecs * 1000);
        });
    }
    /**
     * Recursive function to like posts on instagram from random users (based on the hashtags in the config)
     * */
    startAutoLikeByTagMode() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                // Utils.writeLog('Called startAutoLikeByTagMode');
                this.registerRoutine('startAutoLikeByTagMode', this.startAutoLikeByTagMode);
                if (this.botIsAsleep === true) {
                    return Promise.resolve();
                }
                if (!this.isLoggedIn) {
                    yield this.initBot();
                }
                if (this.likesCountCurrentDay >= this.config.maxLikesPerDay) {
                    // if todays limit is reached, just return
                    utils_1.Utils.writeLog('Todays Like limit is reached, pausing now.', 'startAutoLikeByTagMode');
                    return Promise.resolve();
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
    /**
     * Recursive function to follow users and like posts on own profile from random users (based on the own post likes)
     * */
    startAutoCheckOwnProfileMode() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // Todo
        });
    }
    /**
     * Follows user of liked posts (more natural) or if startAutoLikeByTagMode is not started
     * it just searches users based on hashtags and follows them
     * */
    startAutoFollow(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                this.registerRoutine('startAutoFollow', this.startAutoFollow, withSleep);
                if (this.botIsAsleep === true) {
                    return Promise.resolve();
                }
                if (!this.isLoggedIn) {
                    yield this.initBot();
                }
                yield this.getStartRoutineSleepTime();
                if (this.userIdOfLikedPosts.length > 5 &&
                    this.followCountCurrentDay < this.config.maxFollowsPerDay) {
                    // get followers of posts
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
                    // get any hashtag from map
                    const hashtag = this.getRandomHashtag();
                    // get posts for this hashtag
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
                    // do nothing
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
    /**
     * Unfollows user that had been followed before
     * is called automatically after 1/3 of the follows of the current day were made
     * @param withSleep, if bot should sleep between the unfollows
     * @param isAutoStarted, if was started inside the bot logic or from user of the class
     * */
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
                    // registering the routine to autostart again after bot waking up after sleep
                    this.registerRoutine('startAutoUnfollow', this.startAutoUnfollow, withSleep, isAutoStarted);
                }
                yield this.getStartRoutineSleepTime();
                /*if (this.shouldStartUnfollow() !== true) {
                  await Utils.sleepSecs(this.getFollowSleepTime() * 4);
                  return this.startAutoUnfollow(withSleep);
                }*/
                // should start now
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
                        // still not followed all of today
                        // start with delay
                        yield utils_1.Utils.sleep(this.getFollowSleepTime() * utils_1.Utils.getRandomInt(3, 8));
                        return this.startAutoUnfollow(withSleep, isAutoStarted);
                    }
                    else {
                        // nobody anymore here to unfollow
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
    /**
     * Dislikes posts that had been liked before
     * is called automatically after 1/3 of the likes of the current day were made
     * */
    startAutoDislike(withSleep = true, isAutoStarted = true) {
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
                if (isAutoStarted === false) {
                    this.registerRoutine('startAutoDislike', this.startAutoDislike, withSleep, isAutoStarted);
                }
                yield this.getStartRoutineSleepTime();
                // should start now
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
                        // still not liked all media for today
                        // start with delay
                        yield utils_1.Utils.sleep(this.getLikeSleepTime() * utils_1.Utils.getRandomInt(3, 8));
                        return this.startAutoDislike(withSleep);
                    }
                    else {
                        // nobody anymore here to unfollow
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
    /**
     * Puts the bot into an bansleep mode
     * */
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
    /**
     * private method to evaluate response result coming from the ApiService
     * @param result, result coming from ApiService
     * @returns Promise<boolean>
     * */
    isSuccess(result) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (result.success !== true) {
                // request wasnt successful
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
                // successful request
                return Promise.resolve(true);
            }
        });
    }
    /**
     * Recursive method calling itself till all posts in the array are liked (if allowed to like based on config)
     * @param posts
     * @param withSleep, if bot should sleep between the likes
     * */
    likeAllExistingMedia(posts, withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.likesCountCurrentDay >= this.config.maxLikesPerDay) {
                // if todays limit is reached, just return
                return Promise.resolve();
            }
            const postsToLikeCount = this.config.maxLikesPerHashtag + this.likesCountCurrentDay;
            /*Utils.writeLog(
              `Starting likeAllExistingMedia Current: ${
                this.likesCountCurrentDay
              }, Liking till: ${postsToLikeCount}`,
            );*/
            while (posts.length > 0 &&
                this.botIsAsleep === false &&
                this.likesCountCurrentDay < this.config.maxLikesPerDay &&
                this.likesCountCurrentDay < postsToLikeCount) {
                try {
                    //like all the stuff while true
                    const post = posts.splice(utils_1.Utils.getRandomInt(0, posts.length - 1), 1)[0];
                    if (this.storageService.canLike(post.id) !== true ||
                        post.canLike() !== true) {
                        // already result media
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
    /**
     * Determine the sleeptime, every 8. like will sleep a longer time than normal
     * */
    startLikeSleep(withSleep = true, factor = 8) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (withSleep === true) {
                if (this.likesCountCurrentDay % factor === 0) {
                    yield utils_1.Utils.sleep(this.getLikeSleepTime() * utils_1.Utils.getRandomInt(factor / 2, factor), 'likeAllExistingMedia');
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
    /**
     * Determine the sleeptime, every 8. like will sleep a longer time than normal
     * */
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
    /**
     * Determine the sleeptime, every 4. follow will sleep a longer time than normal
     * */
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
    /**
     * Determine the sleeptime, every 4. follow will sleep a longer time than normal
     * */
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
    /**
     * Follows all userIds provided
     * @param userIds, to follow
     * @param withSleep, if bot should sleep between follows
     * */
    followAllUsersById(userIds, withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            while (this.followCountCurrentDay < this.config.maxFollowsPerDay &&
                this.botIsAsleep === false &&
                userIds.length > 0) {
                try {
                    const userId = userIds.splice(utils_1.Utils.getRandomInt(0, userIds.length - 1), 1)[0];
                    // check if its own user_id
                    if (userId !== this.user_id &&
                        this.storageService.canFollow(userId) === true) {
                        const result = yield this.apiService.getUserInfoById(userId);
                        const success = yield this.isSuccess(result);
                        if (success === false) {
                            yield this.startFailedRequestSleep();
                            continue;
                        }
                        const user = result.data;
                        if (user && user.canBeFollowed === true) {
                            //Utils.writeLog('Trying to follow user: ' + user.username);
                            //follow the user
                            const result = yield this.apiService.follow(user.user_id);
                            const success = yield this.isSuccess(result);
                            if (success === false) {
                                utils_1.Utils.writeLogError(`Failed to follow ${user.username}, status: ${result.status}`);
                                yield this.startFailedRequestSleep();
                                continue;
                            }
                            else {
                                this.followedNewUser(user);
                                yield this.startFollowSleep(withSleep);
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
    /**
     * set the bot to sleep if an request fails
     * */
    startFailedRequestSleep() {
        return utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
    }
    /**
     * function to call when new post has been liked
     * stores postid into storageApi
     * */
    likedNewMedia(post) {
        const index = this.userIdOfLikedPosts.findIndex(id => id === post.ownerId);
        if (index < 0) {
            // not found
            this.userIdOfLikedPosts.push(post.ownerId);
        }
        utils_1.Utils.writeLog(`Liked new post: https://www.instagram.com/p/${post.shortcode}`, 'Like');
        this.likesCountCurrentDay++;
        this.storageService.addLike(post.id);
        this.updateMessage();
        /*if (this.shouldStartDislike() === true) {
          // start to dislike media
          this.startAutoDislike();
        }*/
    }
    /**
     * function to call when new user has been followed
     * stores userId into storageApi
     * */
    followedNewUser(user) {
        // save as followed
        utils_1.Utils.writeLog(`Followed new user: ${user.username}`, 'Follow');
        this.followCountCurrentDay++;
        this.storageService.addFollower(user.user_id);
        //Utils.writeLog(`Successfully followed ${user.username}`);
        this.updateMessage();
        if (this.followCountCurrentDay % 8 === 0) {
            if (this.shouldStartUnfollow() === true)
                // start to unfollow users
                this.startAutoUnfollow();
        }
    }
    /**
     * function to call when new user has been unfollowed
     * stores userId into storageApi
     * */
    unfollowedNewUser(userId) {
        // save as unfollowed
        utils_1.Utils.writeLog(`Unfollowed new user: ID: ${userId}`, 'Unfollow');
        this.unfollowCountCurrentDay++;
        this.storageService.unFollowed(userId);
        this.updateMessage();
    }
    /**
     * function to call when new post has been disliked
     * stores userId into storageApi
     * */
    dislikedNewMedia(postId) {
        // save as disliked
        utils_1.Utils.writeLog(`Disliked new media: ID: ${postId}`, 'Dislike');
        this.dislikesCountCurrentDay++;
        this.storageService.disLiked(postId);
        this.updateMessage();
    }
    /**
     * updates the message in the console
     * */
    updateMessage(newLine = false) {
        if (newLine === true) {
            utils_1.Utils.writeLog(`Likes: ${this.storageService.getLikesLength()} / ${this.storageService.getDisLikesLength()}; Follows: ${this.storageService.getFollowersLength()} / ${this.storageService.getUnFollowsLength()};`);
        }
        else {
            utils_1.Utils.writeProgress(`Likes: ${this.storageService.getLikesLength()} / ${this.storageService.getDisLikesLength()}; Follows: ${this.storageService.getFollowersLength()} / ${this.storageService.getUnFollowsLength()};`);
        }
    }
    /**
     * selects an random hashtag of the hashtag-array of the config
     * @returns hashtag as string
     * */
    getRandomHashtag() {
        return this.config.hashtags[utils_1.Utils.getRandomInt(0, this.config.hashtags.length - 1)];
    }
    /**
     * gets a random sleep time between likes a little random
     * */
    getLikeSleepTime() {
        return (utils_1.Utils.getRandomInt(this.likeSleep * 0.85, this.likeSleep * 0.85 + this.likeSleep * 0.3 * Math.random()) * 1000);
    }
    /**
     * gets a random sleep time between follows a little random
     * */
    getFollowSleepTime() {
        return (utils_1.Utils.getRandomInt(this.followSleep * 0.85, this.followSleep * 0.85 + this.followSleep * 0.3 * Math.random()) * 1000);
    }
    /**
     * function to be called when a 'new day' starts for the bot
     * */
    startNewDay() {
        this.userIdOfLikedPosts = [];
        this.followCountCurrentDay = 0;
        this.unfollowCountCurrentDay = 0;
        this.likesCountCurrentDay = 0;
        this.dislikesCountCurrentDay = 0;
        this.storageService.cleanUp();
    }
    /**
     * sets the bot in sleep mode
     * */
    getBotToSleep() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                utils_1.Utils.writeLog('Putting bot to sleep', 'Bot-Sleep');
                // Prevent bot from doing any actions
                if (this.isLoggedIn === true) {
                    yield this.logout();
                }
                this.botIsAsleep = true;
                yield utils_1.Utils.sleep(); // sleep to let every routine get that we are sleeping now
                const sleepTime = utils_1.Utils.getRandomInt(this.sleepTimeInSecs * 0.9, this.sleepTimeInSecs * 0.9 +
                    this.sleepTimeInSecs * 0.2 * Math.random()) * 1000;
                utils_1.Utils.writeLog(`Bot will sleep until ${utils_1.Utils.getDateString(new Date(Date.now() + sleepTime))}`, 'Bot-Sleep');
                //TEST
                // Utils.writeLog('sleeping 5 mins then restart');
                // await Utils.sleepSecs(300);
                //TEST END
                yield utils_1.Utils.sleep(sleepTime, 'Bot-Sleep');
                this.startNewDay();
                this.botIsAsleep = false;
                // todo add unlike and unfollow routine here
                yield this.restartRoutines();
                this.registerBotSleep();
            }
            catch (e) {
                utils_1.Utils.writeLogError('getBotToSleep Error: ' + e);
            }
        });
    }
    /**
     * starts to unfollow all followed users that are stored in the storageApi
     * */
    startUnfollowFollowed(withSleep = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.isUnfollowing = true;
            while (this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
                this.botIsAsleep === false) {
                try {
                    const unfollowableUsersKeys = Object.keys(
                    // get only all users that the unfollow wait time exceeded
                    this.storageService.getUnfollowable(this.unfollowWaitTime));
                    const userId = unfollowableUsersKeys[utils_1.Utils.getRandomInt(0, unfollowableUsersKeys.length - 1)];
                    const result = yield this.apiService.follow(userId, true);
                    const success = yield this.isSuccess(result);
                    if (success === false) {
                        //couldnt unfollow
                        yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                        continue;
                    }
                    else {
                        this.unfollowedNewUser(userId);
                        yield this.startUnfollowSleep(withSleep);
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
    /**
     * starts to dislike all liked posts that are stored in the storageApi
     * */
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
                        //couldnt dislike
                        yield utils_1.Utils.sleepSecs(this.failedRequestSleepTime);
                        continue;
                    }
                    else {
                        this.dislikedNewMedia(postId);
                        if (withSleep === true) {
                            yield this.startDisikeSleep(); //Utils.sleep(this.getLikeSleepTime(), 'startUnfollowFollowed');
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
    /**
     * function to determine if the unfollow loop should start
     * */
    shouldStartUnfollow() {
        return (this.storageService.getUnfollowableLength(this.unfollowWaitTime) > 0 &&
            this.isUnfollowing === false);
    }
    /**
     * function to determine if the dislike loop should start
     * */
    shouldStartDislike() {
        return (this.storageService.getDislikeableLength(this.dislikeWaitTime) > 0 &&
            this.isDisliking === false);
    }
    /**
     * function to restart all routines that were running before the bot-sleep
     * */
    restartRoutines() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.config.isTesting === true) {
                // pass
                this.isLoggedIn = true;
            }
            else if (this.isLoggedIn === false) {
                yield this.login();
            }
            else {
                utils_1.Utils.writeLogError('still logged in, no need to restart routines');
                return Promise.resolve();
            }
            // restart all routines that were running
            Object.keys(this.registeredRoutines).forEach(key => {
                utils_1.Utils.writeLog('Restarting routine: ' + key);
                this.registeredRoutines[key][0].call(this, this.registeredRoutines[key][1]);
            });
            return Promise.resolve();
        });
    }
    clearRoutines() {
        this.registeredRoutines = {};
    }
    /**
     * method to shutdown the bot (kills the node process)
     * */
    shutDown(message) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // sleeps just so all console logs on the end can be written,
            // before the process gets killed
            if (message) {
                utils_1.Utils.writeLog(message);
            }
            yield utils_1.Utils.sleepSecs(1);
            process.exit();
        });
    }
    shouldBotSleep() {
        const now = new Date();
        const start = now;
        start.setHours(Number(this.config.sleepStart.split(':')[0]));
        start.setMinutes(Number(this.config.sleepStart.split(':')[1]));
        const end = new Date(now.valueOf());
        end.setDate(now.getDate() + 1);
        end.setHours(Number(this.config.sleepEnd.split(':')[0]));
        end.setMinutes(Number(this.config.sleepEnd.split(':')[1]));
        console.log('Looking if ', now.toString(), 'is between ', start.toString(), 'and', end.toString());
        return moment(now).isBetween(start, end);
        /*const nowNumber =
          now.getHours() +
          '' +
          (now.getMinutes() < 10 ? '0' : '') +
          now.getMinutes();
        const shouldNumber = this.config.sleepEnd.replace(':', '');
        if (Number(nowNumber) >= Number(shouldNumber)) {
          console.log('should not be sleeping now');
        } else {
          console.log('should be sleeping');
        }*/
    }
}
exports.Instabot = Instabot;
//# sourceMappingURL=lib.js.map