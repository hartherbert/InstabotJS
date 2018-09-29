"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FileSync = require('lowdb/adapters/FileSync');
const low = require('lowdb');
class StorageService {
    constructor(waitTimeBeforeDeleteData = 10080 /*in minutes - ...one week to delete data*/) {
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
    /**
     * method to set the wait-time before outdated data gets deleted
     * */
    setWaitTimeBeforeDelete(minutes) {
        this.waitTimeBeforeDeleteData = minutes * 60;
    }
    //region has functions
    /**
     * checks if like exists in database
     * */
    hasLike(postId) {
        return !!this.database.get(this.likeObject(postId)).value();
    }
    /**
     * checks if dislike exists in database
     * */
    hasDisLike(postId) {
        return !!this.database.get(this.disLikeObject(postId)).value();
    }
    /**
     * checks if follower exists in database
     * */
    hasFollower(followerId) {
        return !!this.database.get(this.followerObject(followerId)).value();
    }
    /**
     * checks if unfollowed exists in database
     * */
    hasUnFollowed(followerId) {
        return !!this.database.get(this.unfollowerObject(followerId)).value();
    }
    //endregion
    //region length functions
    /**
     * gets the actual count of likes in database
     * */
    getLikesLength() {
        return Object.keys(this.getLikes()).length;
    }
    /**
     * gets the actual count of dislikes in database
     * */
    getDisLikesLength() {
        return Object.keys(this.getDisLikes()).length;
    }
    /**
     * gets the actual count of followers in database
     * */
    getFollowersLength() {
        return Object.keys(this.getFollowers()).length;
    }
    /**
     * gets the actual count of unfollowed in database
     * */
    getUnFollowsLength() {
        return Object.keys(this.getUnfollowed()).length;
    }
    /**
     * get number of the unfollowable users
     * @returns count of the unfollowable users
     * */
    getUnfollowableLength(time = 86400) {
        return Object.keys(this.getUnfollowable(time)).length;
    }
    /**
     * get number of the dislikeable posts
     * @returns count of the dislikeable posts
     * */
    getDislikeableLength(time = 86400) {
        return Object.keys(this.getDislikeable(time)).length;
    }
    //endregion
    //region get all from object
    /**
     * get all likes
     * */
    getLikes() {
        return this.database.get(this.likesPath).value();
    }
    /**
     * get all disliked users
     * */
    getDisLikes() {
        return this.database.get(this.dislikesPath).value();
    }
    /**
     * get all followed users
     * */
    getFollowers() {
        return this.database.get(this.followerPath).value();
    }
    /**
     * get all unfollowed users
     * */
    getUnfollowed() {
        return this.database.get(this.unfollowsPath).value();
    }
    //endregion
    //region clean functions
    /**
     * method to clear out all outdated data of the database
     * */
    cleanUp() {
        const unfollowed = this.getUnfollowed();
        const disliked = this.getDisLikes();
        /*clean up unfollowed*/
        Object.keys(unfollowed).forEach(userId => {
            if (new Date(unfollowed[userId] + this.waitTimeBeforeDeleteData * 1000).getTime() < new Date(Date.now()).getTime()) {
                // can delete, time passed
                this.removeUnfollowed(userId);
            }
        });
        /*clean up dislikes*/
        Object.keys(disliked).forEach(postId => {
            if (new Date(disliked[postId] + this.waitTimeBeforeDeleteData * 1000).getTime() < new Date(Date.now()).getTime()) {
                // can delete, time passed
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
    //endregion
    //region can functions
    /**
     * if post with specific postId can be liked
     * based on if already liked or already disliked
     * */
    canLike(postId) {
        return this.hasLike(postId) === false && this.hasDisLike(postId) === false;
    }
    /**
     * if user with specific userId can be followed
     * based on if already followed or already unfollowed
     * */
    canFollow(userId) {
        return (this.hasFollower(userId) === false && this.hasUnFollowed(userId) === false);
    }
    //endregion
    /**
     * method to get all unfollowable users at the current moment.
     * @param unfollowAllowedTime, minimum seconds that passed by to declare user to be unfollowable
     * @retuns object containing all users that can be unfollowed at the moment
     * */
    getUnfollowable(unfollowAllowedTime = 86400) {
        const followed = this.getFollowers();
        const canUnfollow = {};
        Object.keys(followed).forEach(key => {
            if (new Date(followed[key] + unfollowAllowedTime * 1000).getTime() <
                new Date(Date.now()).getTime()) {
                // can unfollow, time passed
                canUnfollow[key] = followed[key];
            }
        });
        return canUnfollow;
    }
    /**
     * method to get all dislikeable users at the current moment.
     * @param dislikeAllowTime, minimum seconds that passed by to declare user to be dislikeable
     * @retuns object containing all posts that can be disliked at the moment
     * */
    getDislikeable(dislikeAllowTime = 86400) {
        const likes = this.getLikes();
        const canDislike = {};
        Object.keys(likes).forEach(key => {
            if (new Date(likes[key] + dislikeAllowTime * 1000).getTime() <
                new Date(Date.now()).getTime()) {
                // can dislike, time passed
                canDislike[key] = likes[key];
            }
        });
        return canDislike;
    }
    /**
     * Removes followed user from followers and add him to the unfollowed list
     * */
    unFollowed(userId) {
        //remove from followers
        this.removeFollower(userId);
        //add to unfollowed
        this.addUnfollowed(userId);
    }
    /**
     * Removes liked post from liked posts and add it to the disliked ones
     * */
    disLiked(postId) {
        this.removeLike(postId);
        this.addDisLiked(postId);
    }
    //region remove functions
    removeLike(postId) {
        if (this.hasLike(postId) === true) {
            //remove from likes
            this.database
                .set(this.likesPath, this.database
                .get(this.likesPath)
                .omit(postId)
                .value())
                .write();
        }
        //else do nothing, like not present
    }
    removeDisLike(postId) {
        if (this.hasDisLike(postId) === true) {
            //remove from dislikes
            this.database
                .set(this.dislikesPath, this.database
                .get(this.dislikesPath)
                .omit(postId)
                .value())
                .write();
        }
        //else do nothing, dislike not present
    }
    removeFollower(userId) {
        if (this.hasFollower(userId) === true) {
            //remove from followers
            this.database
                .set(this.followerPath, this.database
                .get(this.followerPath)
                .omit(userId)
                .value())
                .write();
        }
        //else do nothing, follower not present
    }
    removeUnfollowed(userId) {
        if (this.hasUnFollowed(userId) === true) {
            //remove from followers
            this.database
                .set(this.unfollowsPath, this.database
                .get(this.unfollowsPath)
                .omit(userId)
                .value())
                .write();
        }
        //else do nothing, unfollowed not present
    }
    //endregion
    //region add functions
    /**
     * Adds a follower to the followers list
     * */
    addFollower(followerId) {
        this.database.set(`${this.followerPath}.${followerId}`, Date.now()).write();
    }
    /**
     * Adds a post to the liked posts list
     * */
    addLike(postId) {
        this.database.set(this.likeObject(postId), Date.now()).write();
    }
    /**
     * Add user to the already followed and unfollowed again list
     * */
    addUnfollowed(userId) {
        this.database.set(this.unfollowerObject(userId), Date.now()).write();
    }
    /**
     * Adds post to the already liked and disliked again list
     * */
    addDisLiked(postId) {
        this.database.set(this.disLikeObject(postId), Date.now()).write();
    }
}
exports.StorageService = StorageService;
//# sourceMappingURL=storage.service.js.map