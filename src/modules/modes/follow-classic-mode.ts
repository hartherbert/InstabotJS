import { Instabot } from '../../lib';
import { Utils } from '../utils/utils';
import { StateManager } from '../state-manager';
import { UserAccount } from '../../models/user-account';


export class FollowClassicMode extends StateManager{
  private cachedFollowUserIds: string[] = [];
  private numberOfUsersToFollow: number = 0;
  private followedUsers: number = 0;

  constructor(private bot: Instabot){
    super();
    this.stateName = 'Follow-Classic';

  }


  public async start(){

    Utils.writeLog('Started the service', this.stateName);

    do{

      if(this.bot.shouldBotSleep(new Date(Date.now()))===true || this.bot.followCountCurrentDay >= this.bot.config.maxFollowsPerDay){
        // bot should be sleeping or he just reached his limit of the day
        Utils.writeLog('Bot is sleeping or reached limit for today', this.stateName);
        await Utils.sleepSecs(Utils.getRandomInt(30* 60, 180 * 60)); // Between 0.5 and 3 hours of sleep
        continue;
      }



      // check if some users should be cached
      if(this.cachedFollowUserIds.length <= 0){
        // download more random posts
        // get any hashtag from map
        const hashtag: string = this.bot.getRandomHashtag();


        // get posts for this hashtag
        Utils.writeLog('Selected new hashtag: ' + hashtag, this.stateName);
        const result = await this.bot.apiService.getMediaByHashtag(hashtag);
        const success = await this.bot.isSuccess(result);
        if (success === true) {
          // get all user ids from the random posts
          this.cachedFollowUserIds = result.data.map((post)=> post.ownerId);

          this.cachedFollowUserIds = this.cachedFollowUserIds.filter((userId)=>{
            // filter out already followed users and own id
            return this.bot.storageService.canFollow(userId) && this.bot.user_id.toString() !== userId.toString();
          });

          this.numberOfUsersToFollow = Utils.getRandomInt(Math.floor(0.8 * this.bot.config.maxFollowsPerHashtag), Math.floor(1.2* this.bot.config.maxFollowsPerHashtag));
          this.followedUsers = 0;

          await Utils.sleep();
          // just wait a bit
        }
        else {
          // getting posts wasn't successful
          await Utils.sleepSecs(this.bot.failedRequestSleepTime); // chills
          continue;
        }
      }


      let currentUser:UserAccount = null;

      // select post
      if(this.cachedFollowUserIds.length > 0){
        // select post and get explicit site
        const selectedUserToLoad: string = this.cachedFollowUserIds.splice(
          Utils.getRandomInt(0, this.cachedFollowUserIds.length - 1),
          1,
        )[0];
        const result = await this.bot.apiService.getUserInfoById(selectedUserToLoad);
        const success = await this.bot.isSuccess(result);
        if(success === true){
          currentUser = result.data;
        }else{
          // failed to load user
          await Utils.sleepSecs(this.bot.failedRequestSleepTime);
        }
        await Utils.quickSleep();
      }



      // follow user
      if(currentUser != null && currentUser.canBeFollowed === true){
        // follow user now
        const result = await this.bot.apiService.follow(currentUser.user_id, false);
        const success = await this.bot.isSuccess(result);
        if (success === false) {
          Utils.writeLog(
            `Failed to follow user: username: ${currentUser.username}`,
            this.stateName
          );
          await Utils.sleepSecs(this.bot.failedRequestSleepTime);
          continue;
        } else {
          this.followedUsers++;
          this.bot.followedNewUser(currentUser, this.stateName);
          await Utils.sleepSecs(this.getFollowSleepTime());
        }
      }else{
        //this.cachedMediaPosts = [];
        await Utils.quickSleep();
      }


      if(this.numberOfUsersToFollow <= this.followedUsers){
        // restart with new hashtag
        this.cachedFollowUserIds = [];
      }

    }while(true);
  }


  private getFollowSleepTime(): number {
    return Utils.getRandomInt(90, 560);
  }

}
