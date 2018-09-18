"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FileSync = require('lowdb/adapters/FileSync');
const low = require('lowdb');
class StorageService {
    constructor(waitTimeBeforeDeleteData = 10080) {
        this.waitTimeBeforeDeleteData = waitTimeBeforeDeleteData;
        this.followerPath = 'followers';
        this.unfollowsPath = 'unfollows';
        this.likesPath = 'likes';
        this.dislikesPath = 'dislikes';
        this.followerObject = followerId => `${this.followerPath}.${followerId}`;
        this.unfollowerObject = followerId => `${this.unfollowsPath}.${followerId}`;
        this.likeObject = postId => `${this.likesPath}.${postId}`;
        this.disLikeObject = dislikeId => `${this.dislikesPath}.${dislikeId}`;
        this.adapter = new FileSync('db.json', {
            defaultValue: {
                [this.followerPath]: {},
                [this.unfollowsPath]: {},
                [this.likesPath]: {},
                [this.dislikesPath]: {},
            },
            serialize: data => JSON.stringify(data),
            deserialize: stringData => JSON.parse(stringData),
        });
        this.database = new low(this.adapter);
        this.setWaitTimeBeforeDelete(this.waitTimeBeforeDeleteData);
    }
    setWaitTimeBeforeDelete(minutes) {
        this.waitTimeBeforeDeleteData = minutes * 60;
    }
    hasLike(postId) {
        return !!this.database.get(this.likeObject(postId)).value();
    }
    hasDisLike(postId) {
        return !!this.database.get(this.disLikeObject(postId)).value();
    }
    hasFollower(followerId) {
        return !!this.database.get(this.followerObject(followerId)).value();
    }
    hasUnFollowed(followerId) {
        return !!this.database.get(this.unfollowerObject(followerId)).value();
    }
    getLikesLength() {
        return Object.keys(this.getLikes()).length;
    }
    getDisLikesLength() {
        return Object.keys(this.getDisLikes()).length;
    }
    getFollowersLength() {
        return Object.keys(this.getFollowers()).length;
    }
    getUnFollowsLength() {
        return Object.keys(this.getUnfollowed()).length;
    }
    getUnfollowableLength(time = 86400) {
        return Object.keys(this.getUnfollowable(time)).length;
    }
    getDislikeableLength(time = 86400) {
        return Object.keys(this.getDislikeable(time)).length;
    }
    getLikes() {
        return this.database.get(this.likesPath).value();
    }
    getDisLikes() {
        return this.database.get(this.dislikesPath).value();
    }
    getFollowers() {
        return this.database.get(this.followerPath).value();
    }
    getUnfollowed() {
        return this.database.get(this.unfollowsPath).value();
    }
    cleanUp() {
        const unfollowed = this.getUnfollowed();
        const disliked = this.getDisLikes();
        Object.keys(unfollowed).forEach(userId => {
            if (new Date(unfollowed[userId] + this.waitTimeBeforeDeleteData * 1000).getTime() < new Date(Date.now()).getTime()) {
                this.removeUnfollowed(userId);
            }
        });
        Object.keys(disliked).forEach(postId => {
            if (new Date(disliked[postId] + this.waitTimeBeforeDeleteData * 1000).getTime() < new Date(Date.now()).getTime()) {
                this.removeDisLike(postId);
            }
        });
    }
    wipeData() {
        this.database.set(this.followerPath, {}).write();
        this.database.set(this.unfollowsPath, {}).write();
        this.database.set(this.likesPath, {}).write();
        this.database.set(this.dislikesPath, {}).write();
    }
    canLike(postId) {
        return this.hasLike(postId) === false && this.hasDisLike(postId) === false;
    }
    canFollow(userId) {
        return (this.hasFollower(userId) === false && this.hasUnFollowed(userId) === false);
    }
    getUnfollowable(unfollowAllowedTime = 86400) {
        const followed = this.getFollowers();
        const canUnfollow = {};
        Object.keys(followed).forEach(key => {
            if (new Date(followed[key] + unfollowAllowedTime * 1000).getTime() <
                new Date(Date.now()).getTime()) {
                canUnfollow[key] = followed[key];
            }
        });
        return canUnfollow;
    }
    getDislikeable(dislikeAllowTime = 86400) {
        const likes = this.getLikes();
        const canDislike = {};
        Object.keys(likes).forEach(key => {
            if (new Date(likes[key] + dislikeAllowTime * 1000).getTime() <
                new Date(Date.now()).getTime()) {
                canDislike[key] = likes[key];
            }
        });
        return canDislike;
    }
    unFollowed(userId) {
        this.removeFollower(userId);
        this.addUnfollowed(userId);
    }
    disLiked(postId) {
        this.removeLike(postId);
        this.addDisLiked(postId);
    }
    removeLike(postId) {
        if (this.hasLike(postId) === true) {
            this.database
                .set(this.likesPath, this.database
                .get(this.likesPath)
                .omit(postId)
                .value())
                .write();
        }
    }
    removeDisLike(postId) {
        if (this.hasDisLike(postId) === true) {
            this.database
                .set(this.dislikesPath, this.database
                .get(this.dislikesPath)
                .omit(postId)
                .value())
                .write();
        }
    }
    removeFollower(userId) {
        if (this.hasFollower(userId) === true) {
            this.database
                .set(this.followerPath, this.database
                .get(this.followerPath)
                .omit(userId)
                .value())
                .write();
        }
    }
    removeUnfollowed(userId) {
        if (this.hasUnFollowed(userId) === true) {
            this.database
                .set(this.unfollowsPath, this.database
                .get(this.unfollowsPath)
                .omit(userId)
                .value())
                .write();
        }
    }
    addFollower(followerId) {
        this.database.set(`${this.followerPath}.${followerId}`, Date.now()).write();
    }
    addLike(postId) {
        this.database.set(this.likeObject(postId), Date.now()).write();
    }
    addUnfollowed(userId) {
        this.database.set(this.unfollowerObject(userId), Date.now()).write();
    }
    addDisLiked(postId) {
        this.database.set(this.disLikeObject(postId), Date.now()).write();
    }
}
exports.StorageService = StorageService;
//# sourceMappingURL=storage.service.js.map