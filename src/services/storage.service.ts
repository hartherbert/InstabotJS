const FileSync = require('lowdb/adapters/FileSync');
const low = require('lowdb');

interface UserMap {
  [userId: string]: number;
  // id => (value:number = timestamp)
}

interface LikeMap {
  [postId: string]: number;
  // id => (value:number = timestamp)
}

export class StorageService {
  protected readonly followerPath: string = 'followers';
  protected readonly unfollowsPath: string = 'unfollows';
  protected readonly likesPath: string = 'likes';
  protected readonly dislikesPath: string = 'dislikes';

  private adapter = new FileSync('db.json', {
    defaultValue: {
      [this.followerPath]: {},
      [this.unfollowsPath]: {},
      [this.likesPath]: {},
      [this.dislikesPath]: {},
    },
    serialize: data => JSON.stringify(data),
    deserialize: stringData => JSON.parse(stringData),
  });

  database;

  constructor() {
    this.database = new low(this.adapter);

    let followers: UserMap = this.getFollowers();
    if (followers == null) {
      followers = {};
    }

    this.setFollowers(followers);
    let likes: LikeMap = this.getLikes();
    if (likes == null) {
      likes = {};
    }

    this.setLikes(likes);
  }

  /**
   * get all followed users
   * */
  public getFollowers(): UserMap {
    return this.database.get(this.followerPath).value();
  }

  public getFollowersLength() {
    return Object.keys(this.getFollowers()).length;
  }

  /**
   * get all unfollowed users
   * */
  public getUnFollows(): UserMap {
    return this.database.get(this.unfollowsPath).value();
  }

  public getUnFollowsLength() {
    return Object.keys(this.getUnFollows()).length;
  }

  /**
   * get all likes
   * */
  public getLikes(): LikeMap {
    return this.database.get(this.likesPath).value();
  }

  public getLikesLength() {
    return Object.keys(this.getLikes()).length;
  }

  /**
   * get all disliked users
   * */
  public getDisLikes(): LikeMap {
    return this.database.get(this.dislikesPath).value();
  }

  public getDisLikesLength() {
    return Object.keys(this.getDisLikes()).length;
  }

  /**
   * set all followed users
   * */
  private setFollowers(followers: UserMap) {
    this.database.get(this.followerPath).write(followers);
  }

  /**
   * set all unfollowed users
   * */
  private setUnFollows(unfollows: UserMap) {
    this.database.get(this.unfollowsPath).write(unfollows);
  }

  /**
   * set all likes
   * */
  private setLikes(likes: LikeMap) {
    this.database.get(this.likesPath).write(likes);
  }

  /**
   * set all dislikes
   * */
  private setDisLikes(dislikes: LikeMap) {
    this.database.get(this.dislikesPath).write(dislikes);
  }

  /**
   * if post with specific postId can be liked
   * based on if already liked or already disliked
   * */
  public canLike(postId: string): boolean {
    const likes = this.getLikes();
    const dislikes = this.getDisLikes();
    return likes[postId] == null && dislikes[postId] == null;
  }

  /**
   * if user with specific userId can be followed
   * based on if already followed or already unfollowed
   * */
  public canFollow(userId: string): boolean {
    const followers = this.getFollowers();
    const unfollows = this.getUnFollows();
    return followers[userId] == null && unfollows[userId] == null;
  }

  /**
   * method to get all unfollowable users at the current moment.
   * @param unfollowAllowedTime, min seconds that passed by to declare user to be unfollowable
   * @retuns object containing all users that can be unfollowed at the moment
   * */
  public getUnfollowable(unfollowAllowedTime: number = 86400): UserMap {
    const followed = this.getFollowers();
    const canUnfollow = {};
    Object.keys(followed).forEach(key => {
      if (
        new Date(followed[key] + unfollowAllowedTime * 1000).getTime() <
        new Date(Date.now()).getTime()
      ) {
        // can unfollow, time passed
        canUnfollow[key] = followed[key];
      }
    });
    return canUnfollow;
  }

  /**
   * get number of the unfollowable users
   * @returns count of the unfollowable users
   * */
  public getUnfollowableLength(time: number = 86400): number {
    return Object.keys(this.getUnfollowable(time)).length;
  }

  /**
   * Adds a follower to the followers list
   * */
  public addFollower(followerId: string) {
    const followers = this.getFollowers();
    followers[followerId] = Date.now();
    this.setFollowers(followers);
  }

  /**
   * Adds a post to the liked posts list
   * */
  public addLike(postId: string) {
    const likes = this.getLikes();
    likes[postId] = Date.now();
    this.setLikes(likes);
  }

  /**
   * Removes followed user from followers and add him to the unfollowed list
   * */
  public unFollowed(userId: string) {
    const followers = this.getFollowers();
    if (followers[userId]) {
      this.addUnfollowed(userId);
      delete followers[userId];
    }
    this.setFollowers(followers);
  }

  /**
   * Removes liked post from liked posts and add it to the disliked ones
   * */
  public disLiked(postId: string) {
    const likes = this.getLikes();
    if (likes[postId]) {
      this.addDisLiked(postId);
      delete likes[postId];
    }
    this.setLikes(likes);
  }

  /**
   * Add user to the already followed and unfollowed again list
   * */
  private addUnfollowed(userId: string) {
    const unfollows = this.getUnFollows();
    unfollows[userId] = Date.now();
    this.setUnFollows(unfollows);
  }

  /**
   * Adds post to the already liked and disliked again list
   * */
  private addDisLiked(postId: string) {
    const dislikes = this.getDisLikes();
    dislikes[postId] = Date.now();
    this.setDisLikes(dislikes);
  }
}
