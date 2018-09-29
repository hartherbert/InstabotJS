/**
 * Describes an user that was found in instagram from the bot
 * */
import { EOL } from 'os';

export interface UserAccountOptions {
  /**
   * unwantedUsernames, list of strings containing full or parts of usernames that are not wanted to be followed
   * the bot skips them
   * */
  unwantedUsernames?: string[];

  /**
   * followFakeUsers, if bot should follow users that the bot thinks are fake users
   * determined by (following/followers)
   * */
  followFakeUsers?: boolean;

  /**
   * followSelebgramUsers, if bot should follow users that the bot thinks are selebgram users
   * determined by (followers/following)
   * */
  followSelebgramUsers?: boolean;

  /**
   * followPassiveUsers, if bot should follow users that the bot thinks are passive (inactive) users
   * determined by (count of medias per (follower and followings)
   * */
  followPassiveUsers?: boolean;

  /**
   * unfollowOnlyWhenFollowingMe, only let bot unfollow user if user is following user
   * */
  unfollowOnlyWhenFollowingMe?: boolean;
}

export class UserAccount {
  private readonly selebgramSelector = 20;
  private readonly activeMultiplier = 200;
  private readonly fakeSelector = 7;

  public user_id: string;
  public username: string;

  private _isSelebgram: boolean = null;
  get isSelebgram(): boolean {
    if (this.options && this.options.followSelebgramUsers === true) {
      // always return false when config wants to follow selebgram accounts
      return false;
    } else {
      return this._isSelebgram;
    }
  }

  private _isFake: boolean = null;
  get isFake(): boolean {
    if (this.options && this.options.followFakeUsers === true) {
      // return always that its not an fake account if the config
      // says it wants to follow fake accounts
      return false;
    } else {
      return this._isFake;
    }
  }

  private _isActive: boolean = null;
  get isActive(): boolean {
    if (this.options && this.options.followPassiveUsers === true) {
      // always return true if config wants to follow passive users
      return true;
    } else {
      return this._isActive;
    }
  }

  private _hasUnwantedUsername: boolean = false;
  get hasUnwantedUsername(): boolean {
    return this._hasUnwantedUsername;
  }

  private _followers: number = -1;
  get followers(): number {
    return this._followers;
  }
  set followers(count: number) {
    this._followers = count;
    this.checkAccountType();
  }

  private _followings: number = -1;
  get followings(): number {
    return this._followings;
  }
  set followings(count: number) {
    this._followings = count;
    this.checkAccountType();
  }

  private _mediaCount: number = -1;
  get mediaCount(): number {
    return this._mediaCount;
  }
  set mediaCount(count: number) {
    this._mediaCount = count;
    this.checkAccountType();
  }

  private _isFollowingMe: boolean;
  get isFollowingMe(): boolean {
    return this._isFollowingMe;
  }

  private _isFollowedByMe: boolean;
  get isFollowedByMe(): boolean {
    return this._isFollowedByMe;
  }

  public options: UserAccountOptions = {};

  constructor() {}

  public static getUserByProfileData(
    userData: object,
    options?: UserAccountOptions,
  ): UserAccount {
    if (!userData) {
      return null;
    }

    const user = new UserAccount();
    user.user_id = String(userData['id']);
    user.username = userData['username'];
    //userData['profile_pic_url'] -> profile picture
    user._followers = Number(userData['edge_followed_by']['count']);
    user._followings = Number(userData['edge_follow']['count']);
    user._mediaCount = Number(
      userData['edge_owner_to_timeline_media']['count'],
    );
    user._isFollowingMe =
      !!userData['follows_viewer'] || !!userData['has_requested_viewer'];
    user._isFollowedByMe =
      !!userData['followed_by_viewer'] || !!userData['requested_by_viewer'];

    if (options) {
      user.options = {
        ...user.options,
        ...options,
      };
    }

    user.checkAccountType();

    return user;
  }

  public static getUserByApiData(userId: string, userData: object) {
    const user = new UserAccount();
    user.user_id = userId;
    user.username = userData['user']['username'];
    //userData['profile_pic_url'] -> profile picture
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

  private checkAccountType() {
    if (this.followings < 0 || this.followers < 0 || this.mediaCount < 0) {
      return;
    }

    if (
      this.followers == 0 ||
      this.followings / this.followers > this.fakeSelector
    ) {
      // probably fake account
      this._isFake = true;
      this._isSelebgram = false;
    } else if (
      this.followers == 0 ||
      this.followers / this.followings > this.selebgramSelector
    ) {
      // is selebgram account
      this._isSelebgram = true;
      this._isFake = false;
    }

    // check if is active account
    this._isActive =
      this.mediaCount > 0 &&
      this.followings / this.mediaCount < this.activeMultiplier &&
      this.followers / this.mediaCount < this.activeMultiplier;

    //check username
    this.checkUsername();
  }

  private checkUsername() {
    if (!this.options || !this.options.unwantedUsernames) {
      this._hasUnwantedUsername = false;
      return;
    }
    //check username based on list
    const foundIndex = this.options.unwantedUsernames.findIndex(
      unwantedUsername => {
        return (
          this.username
            .toLowerCase()
            .indexOf(unwantedUsername.toLowerCase().toString()) > -1
        );
      },
    );
    this._hasUnwantedUsername = foundIndex > -1;
  }

  public get canBeFollowed(): boolean {
    return (
      this.isFake !== true &&
      this.isSelebgram !== true &&
      this.isActive === true &&
      this.hasUnwantedUsername !== true
    );
  }

  public get canBeUnfollowed(): boolean {
    return (this.isFollowedByMe === true && (this.options.unfollowOnlyWhenFollowingMe===true?this.isFollowingMe:true));
  }

  public canFollowReason() {
    if (this.canBeFollowed === true) {
      return `${this.username} can be followed`;
    } else {
      return `${this.username} can not be followed. Reason(s): ${
        this.isFake === true ? 'it is probably fake; ' : ''
      }${
        this.isSelebgram === true ? 'it is probably an selebgram account; ' : ''
      }${this.isActive === false ? 'it is an passive account; ' : ''}${
        this.hasUnwantedUsername === true ? 'has unwanted username' : ''
      }`;
    }
  }

  public toString() {
    let typeString: string = '';
    if (this.isSelebgram === true) {
      typeString = 'This account is probably a selebgram account.';
    } else if (this.isFake === true) {
      typeString = 'This account is probably a fake account';
    } else {
      typeString = 'This is an normal account';
    }

    if (this.isActive === true) {
      typeString += `${EOL}and this account is active`;
    } else {
      typeString += `${EOL}and this account is passive`;
    }

    return `User_Id: ${this.user_id}${EOL}Username: ${
      this.username
    }${EOL}Posts: ${this.mediaCount}${EOL}Followers: ${
      this.followers
    }${EOL}Following: ${this.followings}${EOL}Type: ${typeString}${EOL}`;
  }
}
