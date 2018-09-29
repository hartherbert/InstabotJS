const FileSync = require('lowdb/adapters/FileSync');
const low = require('lowdb');

/**
 * Map-Interfaces are only there to be able to quick develop features
 * if there are more options needed to be stored in database
 * */
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

  protected readonly followerObject = followerId =>
    `${this.followerPath}.${followerId}`;
  protected readonly unfollowerObject = followerId =>
    `${this.unfollowsPath}.${followerId}`;
  protected readonly likeObject = postId => `${this.likesPath}.${postId}`;
  protected readonly disLikeObject = dislikeId =>
    `${this.dislikesPath}.${dislikeId}`;

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

  private database;

  private waitTimeBeforeDeleteData: number;
  private unfollowWaitTime: number;

  constructor(options?:{
    waitTimeBeforeDeleteData: number, // in minutes
    unfollowWaitTime: number // in minutes
  }) {
    this.database = new low(this.adapter);

    if(!options){
      options = {
        waitTimeBeforeDeleteData: 10080,
        unfollowWaitTime: 4320
      };
    }

    this.waitTimeBeforeDeleteData = (options.waitTimeBeforeDeleteData > 0)?options.waitTimeBeforeDeleteData * 60 : 10080 * 60;
    this.unfollowWaitTime = (options.unfollowWaitTime > 0)?options.unfollowWaitTime * 60 : 4320 * 60;

  }

  //region has functions
  /**
   * checks if like exists in database
   * */
  public hasLike(postId: string): boolean {
    return !!this.database.get(this.likeObject(postId)).value();
  }

  /**
   * checks if dislike exists in database
   * */
  public hasDisLike(postId: string): boolean {
    return !!this.database.get(this.disLikeObject(postId)).value();
  }

  /**
   * checks if follower exists in database
   * */
  public hasFollower(followerId: string): boolean {
    return !!this.database.get(this.followerObject(followerId)).value();
  }

  /**
   * checks if unfollowed exists in database
   * */
  public hasUnFollowed(followerId: string): boolean {
    return !!this.database.get(this.unfollowerObject(followerId)).value();
  }

  //endregion

  //region length functions
  /**
   * gets the actual count of likes in database
   * */
  public getLikesLength() {
    return Object.keys(this.getLikes()).length;
  }

  /**
   * gets the actual count of dislikes in database
   * */
  public getDisLikesLength() {
    return Object.keys(this.getDisLikes()).length;
  }

  /**
   * gets the actual count of followers in database
   * */
  public getFollowersLength() {
    return Object.keys(this.getFollowers()).length;
  }

  /**
   * gets the actual count of unfollowed in database
   * */
  public getUnFollowsLength() {
    return Object.keys(this.getUnfollowed()).length;
  }

  /**
   * get number of the unfollowable users
   * @returns count of the unfollowable users
   * */
  public getUnfollowableLength(time: number = this.unfollowWaitTime): number {
    return Object.keys(this.getUnfollowable(time)).length;
  }

  /**
   * get number of the dislikeable posts
   * @returns count of the dislikeable posts
   * */
  public getDislikeableLength(time: number = 86400): number {
    return Object.keys(this.getDislikeable(time)).length;
  }

  //endregion

  //region get all from object

  /**
   * get all likes
   * */
  public getLikes(): LikeMap {
    return this.database.get(this.likesPath).value();
  }

  /**
   * get all disliked users
   * */
  public getDisLikes(): LikeMap {
    return this.database.get(this.dislikesPath).value();
  }

  /**
   * get all followed users
   * */
  public getFollowers(): UserMap {
    return this.database.get(this.followerPath).value();
  }

  /**
   * get all unfollowed users
   * */
  public getUnfollowed(): UserMap {
    return this.database.get(this.unfollowsPath).value();
  }

  //endregion

  //region clean functions
  /**
   * method to clear out all outdated data of the database
   * */
  public cleanUp(): void {
    const unfollowed = this.getUnfollowed();
    const disliked = this.getDisLikes();
    /*clean up unfollowed*/
    Object.keys(unfollowed).forEach(userId => {
      if (
        new Date(
          unfollowed[userId] + this.waitTimeBeforeDeleteData * 1000,
        ).getTime() < new Date(Date.now()).getTime()
      ) {
        // can delete, time passed
        this.removeUnfollowed(userId);
      }
    });

    /*clean up dislikes*/
    Object.keys(disliked).forEach(postId => {
      if (
        new Date(
          disliked[postId] + this.waitTimeBeforeDeleteData * 1000,
        ).getTime() < new Date(Date.now()).getTime()
      ) {
        // can delete, time passed
        this.removeDisLike(postId);
      }
    });
  }

  public wipeData(): void {
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
  public canLike(postId: string): boolean {
    return this.hasLike(postId) === false && this.hasDisLike(postId) === false;
  }

  /**
   * if user with specific userId can be followed
   * based on if already followed or already unfollowed
   * */
  public canFollow(userId: string): boolean {
    return (
      this.hasFollower(userId) === false && this.hasUnFollowed(userId) === false
    );
  }

  //endregion

  /**
   * method to get all unfollowable users at the current moment.
   * @param unfollowAllowedTime, minimum seconds that passed by to declare user to be unfollowable
   * @retuns object containing all users that can be unfollowed at the moment
   * */
  public getUnfollowable(unfollowAllowedTime: number = this.unfollowWaitTime): UserMap {
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
   * method to get all dislikeable users at the current moment.
   * @param dislikeAllowTime, minimum seconds that passed by to declare user to be dislikeable
   * @retuns object containing all posts that can be disliked at the moment
   * */
  public getDislikeable(dislikeAllowTime: number = 86400): LikeMap {
    const likes = this.getLikes();
    const canDislike = {};
    Object.keys(likes).forEach(key => {
      if (
        new Date(likes[key] + dislikeAllowTime * 1000).getTime() <
        new Date(Date.now()).getTime()
      ) {
        // can dislike, time passed
        canDislike[key] = likes[key];
      }
    });
    return canDislike;
  }

  /**
   * Removes followed user from followers and add him to the unfollowed list
   * */
  public unFollowed(userId: string) {
    //remove from followers
    this.removeFollower(userId);
    //add to unfollowed
    this.addUnfollowed(userId);
  }

  /**
   * Removes liked post from liked posts and add it to the disliked ones
   * */
  public disLiked(postId: string) {
    this.removeLike(postId);
    this.addDisLiked(postId);
  }

  //region remove functions

  private removeLike(postId: string) {
    if (this.hasLike(postId) === true) {
      //remove from likes
      this.database
        .set(
          this.likesPath,
          this.database
            .get(this.likesPath)
            .omit(postId)
            .value(),
        )
        .write();
    }
    //else do nothing, like not present
  }

  private removeDisLike(postId: string) {
    if (this.hasDisLike(postId) === true) {
      //remove from dislikes
      this.database
        .set(
          this.dislikesPath,
          this.database
            .get(this.dislikesPath)
            .omit(postId)
            .value(),
        )
        .write();
    }
    //else do nothing, dislike not present
  }

  private removeFollower(userId: string) {
    if (this.hasFollower(userId) === true) {
      //remove from followers
      this.database
        .set(
          this.followerPath,
          this.database
            .get(this.followerPath)
            .omit(userId)
            .value(),
        )
        .write();
    }
    //else do nothing, follower not present
  }

  private removeUnfollowed(userId: string) {
    if (this.hasUnFollowed(userId) === true) {
      //remove from followers
      this.database
        .set(
          this.unfollowsPath,
          this.database
            .get(this.unfollowsPath)
            .omit(userId)
            .value(),
        )
        .write();
    }
    //else do nothing, unfollowed not present
  }

  //endregion

  //region add functions
  /**
   * Adds a follower to the followers list
   * */
  public addFollower(followerId: string) {
    this.database.set(`${this.followerPath}.${followerId}`, Date.now()).write();
  }

  /**
   * Adds a post to the liked posts list
   * */
  public addLike(postId: string) {
    this.database.set(this.likeObject(postId), Date.now()).write();
  }

  /**
   * Add user to the already followed and unfollowed again list
   * */
  private addUnfollowed(userId: string) {
    this.database.set(this.unfollowerObject(userId), Date.now()).write();
  }

  /**
   * Adds post to the already liked and disliked again list
   * */
  private addDisLiked(postId: string) {
    this.database.set(this.disLikeObject(postId), Date.now()).write();
  }
  //endregion
}
