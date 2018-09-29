import { Instabot } from '../../lib';
import { Utils } from '../utils/utils';
import { StateManager } from '../state-manager';
import { UserAccount } from '../../models/user-account';

export class UnfollowClassicMode extends StateManager {
  private cachedUnfollowUserIds: string[] = [];

  constructor(private bot: Instabot) {
    super();
    this.stateName = 'Unfollow-Classic';
  }

  public async start() {
    Utils.writeLog('Started the service', this.stateName);

    do {
      if (
        this.bot.shouldBotSleep(new Date(Date.now())) === true ||
        this.bot.unfollowCountCurrentDay >=
          this.bot.config.maxUnfollowsPerDay ||
        this.bot.storageService.getUnfollowableLength() < 1
      ) {
        // bot should be sleeping or he just reached his limit of the day
        Utils.writeLog(
          'Bot is sleeping or reached limit for today or has nobody to unfollow',
          this.stateName,
        );
        await Utils.sleepSecs(Utils.getRandomInt(30 * 60, 180 * 60)); // Between 0.5 and 3 hours of sleep
        continue;
      }

      // check if some users should be cached
      if (this.cachedUnfollowUserIds.length <= 0) {
        this.cachedUnfollowUserIds = Object.keys(
          // get only all users that the unfollow wait time exceeded
          this.bot.storageService.getUnfollowable(),
        );
      }

      let currentUser: UserAccount = null;

      // select post
      if (this.cachedUnfollowUserIds.length > 0) {
        // select post and get explicit site
        const selectedUserToUnfollow: string = this.cachedUnfollowUserIds.splice(
          Utils.getRandomInt(0, this.cachedUnfollowUserIds.length - 1),
          1,
        )[0];

        const result = await this.bot.apiService.getUserInfoById(
          selectedUserToUnfollow,
        );
        const success = await this.bot.isSuccess(result);
        if (success === true) {
          currentUser = result.data;
          await Utils.sleep();
        } else {
          // failed to load user
          await Utils.sleepSecs(this.bot.failedRequestSleepTime);
        }
        await Utils.quickSleep();
      }

      // unfollow user
      if (currentUser != null && currentUser.canBeUnfollowed === true) {
        // follow user now
        const result = await this.bot.apiService.follow(
          currentUser.user_id,
          true,
        );
        const success = await this.bot.isSuccess(result);
        if (success === false) {
          Utils.writeLog(
            `Failed to unfollow user: username: ${currentUser.username}`,
            this.stateName,
          );
          await Utils.sleepSecs(this.bot.failedRequestSleepTime);
        } else {
          this.bot.unfollowedNewUser(currentUser, this.stateName);
          await Utils.sleepSecs(this.getUnfollowSleepTime());
        }
      } else {
        await Utils.quickSleep();
      }
    } while (true);
  }

  private getUnfollowSleepTime(): number {
    return Utils.getRandomInt(90, 560);
  }
}
