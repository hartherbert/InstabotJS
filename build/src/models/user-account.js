"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
class UserAccount {
    constructor() {
        this.selebgramSelector = 20;
        this.activeMultiplier = 200;
        this.fakeSelector = 7;
        this._isSelebgram = null;
        this._isFake = null;
        this._isActive = null;
        this._hasUnwantedUsername = false;
        this._followers = -1;
        this._followings = -1;
        this._mediaCount = -1;
        this.options = {};
    }
    get isSelebgram() {
        if (this.options && this.options.followSelebgramUsers === true) {
            return false;
        }
        else {
            return this._isSelebgram;
        }
    }
    get isFake() {
        if (this.options && this.options.followFakeUsers === true) {
            return false;
        }
        else {
            return this._isFake;
        }
    }
    get isActive() {
        if (this.options && this.options.followPassiveUsers === true) {
            return true;
        }
        else {
            return this._isActive;
        }
    }
    get hasUnwantedUsername() {
        return this._hasUnwantedUsername;
    }
    get followers() {
        return this._followers;
    }
    set followers(count) {
        this._followers = count;
        this.checkAccountType();
    }
    get followings() {
        return this._followings;
    }
    set followings(count) {
        this._followings = count;
        this.checkAccountType();
    }
    get mediaCount() {
        return this._mediaCount;
    }
    set mediaCount(count) {
        this._mediaCount = count;
        this.checkAccountType();
    }
    get isFollowingMe() {
        return this._isFollowingMe;
    }
    get isFollowedByMe() {
        return this._isFollowedByMe;
    }
    static getUserByProfileData(userData, options) {
        if (!userData) {
            return null;
        }
        const user = new UserAccount();
        user.user_id = String(userData['id']);
        user.username = userData['username'];
        user._followers = Number(userData['edge_followed_by']['count']);
        user._followings = Number(userData['edge_follow']['count']);
        user._mediaCount = Number(userData['edge_owner_to_timeline_media']['count']);
        user._isFollowingMe =
            !!userData['follows_viewer'] || !!userData['has_requested_viewer'];
        user._isFollowedByMe =
            !!userData['followed_by_viewer'] || !!userData['requested_by_viewer'];
        if (options) {
            user.options = Object.assign({}, user.options, options);
        }
        user.checkAccountType();
        return user;
    }
    static getUserByApiData(userId, userData) {
        const user = new UserAccount();
        user.user_id = userId;
        user.username = userData['user']['username'];
        user._followers = Number(userData['user']['follower_count']);
        user._followings = Number(userData['user']['following_count']);
        user._mediaCount = Number(userData['user']['media_count']);
        user._isFollowingMe =
            !!userData['follows_viewer'] || !!userData['has_requested_viewer'];
        user._isFollowedByMe =
            !!userData['followed_by_viewer'] || !!userData['requested_by_viewer'];
        user.checkAccountType();
        return user;
    }
    checkAccountType() {
        if (this.followings < 0 || this.followers < 0 || this.mediaCount < 0) {
            return;
        }
        if (this.followers == 0 ||
            this.followings / this.followers > this.fakeSelector) {
            this._isFake = true;
            this._isSelebgram = false;
        }
        else if (this.followers == 0 ||
            this.followers / this.followings > this.selebgramSelector) {
            this._isSelebgram = true;
            this._isFake = false;
        }
        this._isActive =
            this.mediaCount > 0 &&
                this.followings / this.mediaCount < this.activeMultiplier &&
                this.followers / this.mediaCount < this.activeMultiplier;
        this.checkUsername();
    }
    checkUsername() {
        if (!this.options || !this.options.unwantedUsernames) {
            this._hasUnwantedUsername = false;
            return;
        }
        const foundIndex = this.options.unwantedUsernames.findIndex(unwantedUsername => {
            return (this.username
                .toLowerCase()
                .indexOf(unwantedUsername.toLowerCase().toString()) > -1);
        });
        this._hasUnwantedUsername = foundIndex > -1;
    }
    get canBeFollowed() {
        return (this.isFake !== true &&
            this.isSelebgram !== true &&
            this.isActive === true &&
            this.hasUnwantedUsername !== true);
    }
    get canBeUnfollowed() {
        return (this.isFollowedByMe === true && (this.options.unfollowOnlyWhenFollowingMe === true ? this.isFollowingMe : true));
    }
    canFollowReason() {
        if (this.canBeFollowed === true) {
            return `${this.username} can be followed`;
        }
        else {
            return `${this.username} can not be followed. Reason(s): ${this.isFake === true ? 'it is probably fake; ' : ''}${this.isSelebgram === true ? 'it is probably an selebgram account; ' : ''}${this.isActive === false ? 'it is an passive account; ' : ''}${this.hasUnwantedUsername === true ? 'has unwanted username' : ''}`;
        }
    }
    toString() {
        let typeString = '';
        if (this.isSelebgram === true) {
            typeString = 'This account is probably a selebgram account.';
        }
        else if (this.isFake === true) {
            typeString = 'This account is probably a fake account';
        }
        else {
            typeString = 'This is an normal account';
        }
        if (this.isActive === true) {
            typeString += `${os_1.EOL}and this account is active`;
        }
        else {
            typeString += `${os_1.EOL}and this account is passive`;
        }
        return `User_Id: ${this.user_id}${os_1.EOL}Username: ${this.username}${os_1.EOL}Posts: ${this.mediaCount}${os_1.EOL}Followers: ${this.followers}${os_1.EOL}Following: ${this.followings}${os_1.EOL}Type: ${typeString}${os_1.EOL}`;
    }
}
exports.UserAccount = UserAccount;
