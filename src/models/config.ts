import { UserAccountOptions } from './user-account';

export interface BotConfig {
  username: string;
  password: string;
  config: BotBehaviorConfig;
}

export interface BotBehaviorConfig {
  /*Bot-Standard-Config*/
  /**
   * hashtags, list of hashtags the bot should search for, without '#' prefix
   * */
  hashtags: string[];

  /**
   * sleepTime, how many hours the bot should sleep within 24 hours
   * @param time in hours
   * */
  sleepTime: number;

  /*Like-Config*/
  /**
   * maxLikesPerHashtag, maximum likes the bot is allowed to make per hashtag per 24 hours
   * when the limit is reached, the bot takes another hashtag
   * */
  maxLikesPerHashtag: number;

  /**
   * maxLikesToLikeMedia, maximum likes a post is allowed to have to be liked by the bot
   * */
  maxLikesToLikeMedia: number;

  /**
   * minLikesToLikeMedia, minimum likes a post is allowed to have to be liked by the bot
   * */
  minLikesToLikeMedia: number;

  /**
   * maxLikesPerDay, maximum likes the bot is allowed to make per 24 hours
   * */
  maxLikesPerDay: number;

  /**
   * maxDislikesPerDay, maximum dislikes per 24 hours
   * */
  maxDislikesPerDay: number;

  /**
   * minDislikeWaitTime, minimum time to wait to dislike a mediapost the bot liked before
   * @param time in minutes
   * */
  minDislikeWaitTime: number;

  /*Follow-Config*/
  /**
   * maxFollowsPerDay, max people to follow in 24 hours
   * */
  maxFollowsPerDay: number;

  /**
   * maxUnfollowsPerDay, max people to unfollow in 24 hours
   * */
  maxUnfollowsPerDay: number;

  /**
   * minUnfollowWaitTime, minimum time to wait to unfollow a user the bot followed before
   * @param time in minutes
   * */
  minUnfollowWaitTime: number;

  /**
   * maxFollowsPerHashtag, maximum follows the bot is allowed to make per hashtag per 24 hours
   * when the limit is reached, the bot takes another hashtag
   * (only used by sinlge follow mode)
   * */
  maxFollowsPerHashtag: number;

  /**
   * followerOptions, options that determine if bot should follow a specific user
   * */
  followerOptions: UserAccountOptions;

  /**
   * waitTimeBeforeDelete, minutes to wait before delete stored data (only unfollowed and disliked images)
   * this option is only available to prevent an enormous data stored as json
   * @param time in minutes
   * */
  waitTimeBeforeDelete: number;
}
