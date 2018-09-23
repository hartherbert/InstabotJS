import { Instabot } from '../../lib';
import { Utils } from '../utils/utils';
import { StateManager } from '../state-manager';
import { MediaPost } from '../../models/post';

export class LikeClassicMode extends StateManager{

  private cachedMediaPosts: MediaPost[] = [];

  private timeToSleep

  constructor(private bot: Instabot){
    super();



  }

  public start(){

  }




  public async loadMediaPage(shortcode: string): Promise<MediaPost>{
    // only downloading page, so instagram nows we went there
    const result = await this.bot.apiService.getMediaPostPage(shortcode);
    const success = await this.bot.isSuccess(result);
    return success === true? result.data: null;
  }

  public async startAutoLikeByTagMode(): Promise<any> {

    do{
      // check if new posts should be cached
      if(this.cachedMediaPosts.length <= 0){
        this.triedPosts = 0;
        // download more random posts
        // get any hashtag from map
        const hashtag: string = this.bot.getRandomHashtag();
        // get posts for this hashtag
        Utils.writeLog('Selected new hashtag: ' + hashtag);
        const result = await this.bot.apiService.getMediaByHashtag(hashtag);
        const success = await this.bot.isSuccess(result);
        if (success === true) {
          // like all posts
          this.cachedMediaPosts = result.data;
        }
        else {
          // getting posts wasn't successful
          await Utils.sleepSecs(this.bot.failedRequestSleepTime); // chills
        }
      }

      // quick delay
      await Utils.quickSleep();


      let currentPost:MediaPost;

      // select post
      if(this.cachedMediaPosts.length > 0){
        // select post and get explicit site
        const selectedPostToLoad: MediaPost = this.cachedMediaPosts.splice(
          Utils.getRandomInt(0, this.cachedMediaPosts.length - 1),
          1,
        )[0];
        currentPost = await this.loadMediaPage(selectedPostToLoad.shortcode);
      }


      await Utils.quickSleep();

      // like post
      if (this.bot.likesCountCurrentDay < this.bot.config.maxLikesPerDay) {
        if(currentPost != null && currentPost.canLike() === true){
          // like post now
          const result = await this.bot.apiService.like(currentPost.id);
          const success = await this.bot.isSuccess(result);
          if (success === false) {
            Utils.writeLog(
              `Failed to like post: https://www.instagram.com/p/${currentPost.shortcode}`,
            );
            await this.bot.startLikeSleep();
            continue;
          } else {
            this.bot.likedNewMedia(currentPost);
          }
        }else{
          this.cachedMediaPosts = [];
        }
      }else{
        // if todays limit is reached, just return
        Utils.writeLog(
          'Todays Like limit is reached, pausing now.',
          'startAutoLikeByTagMode',
        );
        Utils.sleepSecs(this.bot.slee)
      }

      if(this.cachedMediaPosts.length < 9){
        this.cachedMediaPosts = [];
      }


    }while(true);


    try {
      // Utils.writeLog('Called startAutoLikeByTagMode');
      this.registerRoutine(
        'startAutoLikeByTagMode',
        this.startAutoLikeByTagMode,
      );

      if (this.botIsAsleep === true) {
        return Promise.resolve();
      }

      if (!this.isLoggedIn) {
        await this.initBot();
      }

      if (this.bot.likesCountCurrentDay >= this.bot.config.maxLikesPerDay) {
        // if todays limit is reached, just return
        Utils.writeLog(
          'Todays Like limit is reached, pausing now.',
          'startAutoLikeByTagMode',
        );
        return Promise.resolve();
      }else{
        // get any hashtag from map
        const hashtag: string = this.getRandomHashtag();
        // get posts for this hashtag
        Utils.writeLog('Selected new hashtag: ' + hashtag);
        const result = await this.apiService.getMediaByHashtag(hashtag);
        const success = await this.isSuccess(result);
        if (success === true) {
          // like all posts
          await this.likeAllExistingMedia(result.data);
          await Utils.sleep(
            this.getLikeSleepTime() * Utils.getRandomInt(4, 8),
            'After likeallExistingMedia',
          );

          if (this.likesCountCurrentDay < this.config.maxLikesPerDay) {
            return this.startAutoLikeByTagMode();
          } else {
            Utils.writeLog(
              'Todays Like limit is reached, pausing now.',
              'startAutoLikeByTagMode',
            );
            return Promise.resolve();
          }
        }
        else {
          // getting posts wasn't successful
          Utils.writeLog(
            `Selecting new hashtag failed, sleeping for ${this
              .failedRequestSleepTime / 60} mins`,
          );
          await Utils.sleepSecs(this.failedRequestSleepTime); // chills
          return this.startAutoLikeByTagMode();
        }
      }

      await this.getStartRoutineSleepTime();

      // get any hashtag from map
      const hashtag: string = this.getRandomHashtag();
      // get posts for this hashtag
      Utils.writeLog('Selected new hashtag: ' + hashtag);
      const result = await this.apiService.getMediaByHashtag(hashtag);
      const success = await this.isSuccess(result);
      if (success === true) {
        // like all posts
        await this.likeAllExistingMedia(result.data);
        await Utils.sleep(
          this.getLikeSleepTime() * Utils.getRandomInt(4, 8),
          'After likeallExistingMedia',
        );

        if (this.likesCountCurrentDay < this.config.maxLikesPerDay) {
          return this.startAutoLikeByTagMode();
        } else {
          Utils.writeLog(
            'Todays Like limit is reached, pausing now.',
            'startAutoLikeByTagMode',
          );
          return Promise.resolve();
        }
      }
      else {
        // getting posts wasn't successful
        Utils.writeLog(
          `Selecting new hashtag failed, sleeping for ${this
            .failedRequestSleepTime / 60} mins`,
        );
        await Utils.sleepSecs(this.failedRequestSleepTime); // chills
        return this.startAutoLikeByTagMode();
      }
    } catch (e) {
      Utils.writeLogError(
        'Error while performing startAutoLikeByTagMode',
        'startAutoLikeByTagMode',
      );
      await Utils.sleepSecs(this.failedRequestSleepTime);
      return this.startAutoLikeByTagMode();
    }
  }

}
