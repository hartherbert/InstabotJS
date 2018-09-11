"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FileSync = require('lowdb/adapters/FileSync');
const low = require('lowdb');
class StorageService {
    constructor() {
        this.followerPath = 'followers';
        this.unfollowsPath = 'unfollows';
        this.likesPath = 'likes';
        this.dislikesPath = 'dislikes';
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
        let followers = this.getFollowers();
        if (followers == null) {
            followers = {};
        }
        this.setFollowers(followers);
        let likes = this.getLikes();
        if (likes == null) {
            likes = {};
        }
        this.setLikes(likes);
    }
    getFollowers() {
        return this.database.get(this.followerPath).value();
    }
    getFollowersLength() {
        return Object.keys(this.getFollowers()).length;
    }
    getUnFollows() {
        return this.database.get(this.unfollowsPath).value();
    }
    getUnFollowsLength() {
        return Object.keys(this.getUnFollows()).length;
    }
    getLikes() {
        return this.database.get(this.likesPath).value();
    }
    getLikesLength() {
        return Object.keys(this.getLikes()).length;
    }
    getDisLikes() {
        return this.database.get(this.dislikesPath).value();
    }
    getDisLikesLength() {
        return Object.keys(this.getDisLikes()).length;
    }
    setFollowers(followers) {
        this.database.get(this.followerPath).write(followers);
    }
    setUnFollows(unfollows) {
        this.database.get(this.unfollowsPath).write(unfollows);
    }
    setLikes(likes) {
        this.database.get(this.likesPath).write(likes);
    }
    setDisLikes(dislikes) {
        this.database.get(this.dislikesPath).write(dislikes);
    }
    canLike(postId) {
        const likes = this.getLikes();
        const dislikes = this.getDisLikes();
        return likes[postId] == null && dislikes[postId] == null;
    }
    canFollow(userId) {
        const followers = this.getFollowers();
        const unfollows = this.getUnFollows();
        return followers[userId] == null && unfollows[userId] == null;
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
    getUnfollowableLength(time = 86400) {
        return Object.keys(this.getUnfollowable(time)).length;
    }
    addFollower(followerId) {
        const followers = this.getFollowers();
        followers[followerId] = Date.now();
        this.setFollowers(followers);
    }
    addLike(postId) {
        const likes = this.getLikes();
        likes[postId] = Date.now();
        this.setLikes(likes);
    }
    unFollowed(userId) {
        const followers = this.getFollowers();
        if (followers[userId]) {
            this.addUnfollowed(userId);
            delete followers[userId];
        }
        this.setFollowers(followers);
    }
    disLiked(postId) {
        const likes = this.getLikes();
        if (likes[postId]) {
            this.addDisLiked(postId);
            delete likes[postId];
        }
        this.setLikes(likes);
    }
    addUnfollowed(userId) {
        const unfollows = this.getUnFollows();
        unfollows[userId] = Date.now();
        this.setUnFollows(unfollows);
    }
    addDisLiked(postId) {
        const dislikes = this.getDisLikes();
        dislikes[postId] = Date.now();
        this.setDisLikes(dislikes);
    }
}
exports.StorageService = StorageService;
//# sourceMappingURL=storage.service.js.map