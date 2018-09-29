import { BotBehaviorConfig, BotConfig } from './models/config';
import { HttpService } from './services/http.service';
import { StorageService } from './services/storage.service';
import { Utils } from './modules/utils/utils';
import { MediaPost } from './models/post';
import { UserAccount } from './models/user-account';
import { IResult } from './models/http-result';

export class Instabot {

  public apiService: HttpService;
  public storageService: StorageService;


  //region Config
  /*username of the current logged in user*/
  public username: string;
  /*password of the current logged in user*/
  public password: string;
  /*userId of the current logged in user*/
  public user_id: string;

  /*actual bot configuration*/
  public config: BotBehaviorConfig;
  /*Default bot configuration*/
  private defaultConfig: BotBehaviorConfig = {
    botModes: 'like-classic-mode',
    maxLikesPerDay: 1000,
    maxDislikesPerDay: 0,
    maxFollowsPerDay: 300,
    maxUnfollowsPerDay: 300,
    minUnfollowWaitTime: 1440, // minutes... -> 72 hours
    minDislikeWaitTime: 1440, // minutes... -> 24 hours
    maxFollowsPerHashtag: 20,
    hashtags: ['follow4follow', 'f4f', 'beer', 'l4l', 'like4like'],
    maxLikesPerHashtag: 50,
    sleepStart: '0:00',
    sleepEnd: '7:00',
    waitTimeBeforeDelete: 10080, // minutes... -> 1 week
    followerOptions: {
      unwantedUsernames: [],
      followFakeUsers: false,
      followSelebgramUsers: false,
      followPassiveUsers: false,
    },
    postOptions: {
      maxLikesToLikeMedia: 600,
      minLikesToLikeMedia: 5,
    },
    isTesting: false,
  };

  /*minimum sleeptime for the bot if an failed request response comes in*/
  public readonly failedRequestSleepTime = 120; // in seconds
  /*Maximum count of ban request responses*/
  public banCountToBeBanned: number = 3;
  /*Time to sleep in seconds when ban is active*/
  public banSleepTime: number = 2 * 60 * 60;

  //endregion

  //region Internal Variables
  /*If the bot has been logged in successfully*/
  public isLoggedIn: boolean = false;
  /*Count of the followed users in the current running day*/
  public followCountCurrentDay: number = 0;
  /*Count of the unfollowed users in the current running day*/
  public unfollowCountCurrentDay: number = 0;
  /*likes made in the current running day*/
  public likesCountCurrentDay: number = 0;
  /*dislikes made in the current running day*/
  private dislikesCountCurrentDay: number = 0;
  /*if initialisation was successful*/
  private readonly canStart;
  /*Count of possible ban request responses*/
  private banCount: number = 0;
  /*Tells if the bot has been banned*/
  private isBanned: boolean = false;

  //endregion

  constructor(
    options: BotConfig,
  ) {
    if (
      options == null ||
      options['username'] == null ||
      options['password'] == null
    ) {
      // incorrect config, required properties are probably missing
      this.canStart = false;
      return;
    }

    // required params exists
    this.canStart = true;

    this.username = options.username;
    this.password = options.password;
    this.config = {
      ...this.defaultConfig,
      ...options.config,
    };


    // only for testing purposes
    if (this.config.isTesting === true) {
      this.isLoggedIn = true;
    }



    this.apiService = new HttpService({followerOptions: this.config.followerOptions, postOptions: this.config.postOptions});
    this.storageService = new StorageService({
      waitTimeBeforeDeleteData: this.config.waitTimeBeforeDelete,
      unfollowWaitTime: this.config.minUnfollowWaitTime
    });

    Utils.writeLog('----------------------- INSTABOT JS -----------------------', 'START');
    Utils.writeLog('Started the bot');



  }

  /**
   * first method to call after constructor
   * Tries to login the user and initializes everything to start to like and follow some stuff on insta (lol)
   * */
  public async initBot(): Promise<any> {
    if (this.canStart !== true) {
      return this.shutDown(
        Utils.getShutdownMessage(
          'Username or/and Password are missing. You need to provide your credentials inside the bot-config.json file!',
        ),
      );
    }

    try {
      this.collectPreviousData();

      process.on('SIGINT', () => {
        console.log('Trying to log out the bot, please wait...');
        if (this.isLoggedIn === true) {
          this.logout()
            .then(() => {
              Utils.writeLog('Logged out the bot successfully');
              this.updateMessage(true);
              this.shutDown();
            })
            .catch(err => {
              Utils.writeLog(err);
              this.updateMessage(true);
              this.shutDown();
            });
        } else {
          Utils.writeLog('Logged out the bot successfully');
          this.updateMessage(true);
          this.shutDown();
        }
      });

      await this.login();
      // register botsleep

      await this.startSelectedMode();

      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }


  public async startSelectedMode(){
    const strategies = require('./modules/modes/strategies');
    const modes = this.config.botModes.split(',');

    await modes.forEach((modeName)=>{
      const mode = strategies[modeName.trim()];

      if(mode == null){
        Utils.writeLog(`startSelectedMode: mode ${modeName} does not exist`);
      }
      else{
        //start mode
        new mode(this).start();
      }
    });
  }

  /**
   * looking up all the stuff the bot already did today, then setting those values accordingly
   * */
  private collectPreviousData() {
    const followers = this.storageService.getFollowers();
    const likes = this.storageService.getLikes();
    const dislikes = this.storageService.getDisLikes();
    const unfollows = this.storageService.getUnfollowed();

    const todayFollowers = Object.keys(followers).filter(key => {
      try {
        return (
          new Date(followers[key]).setHours(0, 0, 0, 0) ==
          new Date(Date.now()).setHours(0, 0, 0, 0)
        );
      } catch (e) {
        return false;
      }
    });
    const todayLikes = Object.keys(likes).filter(key => {
      try {
        return (
          new Date(likes[key]).setHours(0, 0, 0, 0) ==
          new Date(Date.now()).setHours(0, 0, 0, 0)
        );
      } catch (e) {
        return false;
      }
    });

    const todayDisLikes = Object.keys(dislikes).filter(key => {
      try {
        return (
          new Date(dislikes[key]).setHours(0, 0, 0, 0) ==
          new Date(Date.now()).setHours(0, 0, 0, 0)
        );
      } catch (e) {
        return false;
      }
    });

    const todayUnfollows = Object.keys(unfollows).filter(key => {
      try {
        return (
          new Date(unfollows[key]).setHours(0, 0, 0, 0) ==
          new Date(Date.now()).setHours(0, 0, 0, 0)
        );
      } catch (e) {
        return false;
      }
    });

    this.followCountCurrentDay = todayFollowers.length;
    this.likesCountCurrentDay = todayLikes.length;
    this.unfollowCountCurrentDay = todayUnfollows.length;
    this.dislikesCountCurrentDay = todayDisLikes.length;

    console.log(
      'Already did today:',
      'Follows:',
      this.followCountCurrentDay,
      'Likes:',
      this.likesCountCurrentDay,
      'Unfollows:',
      this.unfollowCountCurrentDay,
      'Dislikes:',
      this.dislikesCountCurrentDay,
    );
  }


  /**
   * logs in the current user
   * */
  private login(): Promise<boolean> {
    if (this.isLoggedIn === true) return Promise.resolve(true);
    return new Promise((resolve, reject) => {
      Utils.writeLog('trying to login as ' + this.username + '...', 'Login');
      this.apiService
        .getCsrfToken()
        .then(result => {
          this.isSuccess(result).then(success => {
            if (success === false) {
              return reject(
                'Could not get CSRF-Token from Instagram... Is your IP blocked by Instagram ?',
              );
            }
            Utils.writeLog('Successfully got the CSRF-Token', 'Login');
            // successful request, got csrf
            Utils.quickSleep().then(() => {
              this.apiService
                .login({
                  username: this.username,
                  password: this.password,
                })
                .then(result => {
                  this.isSuccess(result).then(success => {
                    if (success === false) {
                      return reject(
                        `Could not login with the provided credentials... Username: ${
                          this.username
                        } , Password: ${this.password}`,
                      );
                    }
                    Utils.writeLog('Only one step left...', 'Login');
                    // logged in successfully
                    Utils.quickSleep().then(() => {
                      this.apiService
                        .getUserInfo(this.username)
                        .then(result => {
                          // own user_id
                          this.isSuccess(result).then(success => {
                            if (success === false) {
                              return reject(
                                'Failed to get your profile information...',
                              );
                            } else {
                              this.user_id = result.data.user_id;
                              this.isLoggedIn = true;
                              Utils.writeLog('Login was successful', 'Login');
                              return resolve(true);
                            }
                          });
                        })
                        .catch(() => {
                          return reject(
                            'Could not get user info, couldnt login...',
                          );
                        });
                    }); // no catch needed for sleep
                  }); // no catch needed for isSuccess
                })
                .catch(err => {
                  return reject(err);
                });
            }); // no catch needed for sleep
          });
        })
        .catch(err => {
          return reject(err);
        });
    });
  }

  /**
   * logs out the current user
   * */
  private logout(): Promise<boolean> {
    if (this.isLoggedIn === false) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve, reject) => {
      this.apiService
        .logout()
        .then(result => {
          this.isSuccess(result).then(success => {
            if (success === false) {
              return reject('Could not logout of Instagram... ');
            }
            // success
            this.isLoggedIn = false;
            return resolve(true);
          });
        })
        .catch(() => {
          return reject('Could not logout of Instagram...');
        });
    });
  }


  /**
   * Puts the bot into an bansleep mode
   * */
  private async startBanSleep(): Promise<any> {
    if (this.banCount >= this.banCountToBeBanned) {
      Utils.writeLog(
        'Bot is probably getting banned, sleeping now for ' +
          this.banSleepTime / 3600 +
          'h', 'Ban'
      );
      this.isBanned = true;
      this.banCount = 0;
      await Utils.sleepSecs(this.banSleepTime);
      this.isBanned = false;
      return Promise.resolve();
    } else {
      return Promise.resolve();
    }
  }

  /**
   * private method to evaluate response result coming from the ApiService
   * @param result, result coming from ApiService
   * @returns Promise<boolean>
   * */
  public async isSuccess(result: IResult<any>): Promise<boolean> {
    if (result.success !== true) {
      // request wasnt successful
      if (result.status >= 400 && result.status <= 403) {
        this.banCount++;
        Utils.writeLog(
          'Request ended with status: ' +
            result.status +
            ', Ban-Count is now on: ' +
            this.banCount +
            ' of total: ' +
            this.banCountToBeBanned +
            ', when reached, then bot will sleep for ' +
            this.banSleepTime / 3600 +
            ' hours',
        );
        await this.startBanSleep();
        return Promise.resolve(false);
      } else {
        await Utils.sleep();
        return Promise.resolve(false);
      }
    } else {
      // successful request
      return Promise.resolve(true);
    }
  }

  /**
   * function to call when new post has been liked
   * stores postid into storageApi
   * */
  public likedNewMedia(post: MediaPost, prefix: string) {
    // save as liked
    Utils.writeLog(
      `Liked new post: https://www.instagram.com/p/${post.shortcode}`,
      prefix,
    );
    this.likesCountCurrentDay++;
    this.storageService.addLike(post.id);
    this.updateMessage();
  }

  /**
   * function to call when new user has been followed
   * stores userId into storageApi
   * */
  public followedNewUser(user: UserAccount, prefix: string) {
    // save as followed
    Utils.writeLog(`Followed new user: ${user.username}`, prefix);
    this.followCountCurrentDay++;
    this.storageService.addFollower(user.user_id);
    this.updateMessage();
  }

  /**
   * function to call when new user has been unfollowed
   * stores userId into storageApi
   * */
  public unfollowedNewUser(user: UserAccount, prefix: string) {
    // save as unfollowed
    Utils.writeLog(`Unfollowed user: username: ${user.user_id}`, prefix);
    this.unfollowCountCurrentDay++;
    this.storageService.unFollowed(user.user_id);
    this.updateMessage();
  }

  /**
   * function to call when new post has been disliked
   * stores userId into storageApi
   * */
  private dislikedNewMedia(postId: string, prefix: string): void {
    // save as disliked
    Utils.writeLog(`Disliked new media: ID: ${postId}`, prefix);
    this.dislikesCountCurrentDay++;
    this.storageService.disLiked(postId);
    this.updateMessage();
  }

  /**
   * updates the message in the console
   * */
  private updateMessage(newLine: boolean = false) {
    if (newLine === true) {
      Utils.writeLog(
        `Likes: ${this.storageService.getLikesLength()} / ${this.storageService.getDisLikesLength()}; Follows: ${this.storageService.getFollowersLength()} / ${this.storageService.getUnFollowsLength()};`,
      );
    } else {
      Utils.writeProgress(
        `Likes: ${this.storageService.getLikesLength()} / ${this.storageService.getDisLikesLength()}; Follows: ${this.storageService.getFollowersLength()} / ${this.storageService.getUnFollowsLength()};`,
      );
    }
  }

  /**
   * selects an random hashtag of the hashtag-array of the config
   * @returns hashtag as string
   * */
  public getRandomHashtag(): string {
    return this.config.hashtags[
      Utils.getRandomInt(0, this.config.hashtags.length - 1)
    ];
  }

  /**
   * function to be called when a 'new day' starts for the bot
   * */
  private startNewDay() {
    this.followCountCurrentDay = 0;
    this.unfollowCountCurrentDay = 0;
    this.likesCountCurrentDay = 0;
    this.dislikesCountCurrentDay = 0;
    this.storageService.cleanUp();
  }

  /**
   * method to shutdown the bot (kills the node process)
   * */
  private async shutDown(message?: string) {
    // sleeps just so all console logs on the end can be written,
    // before the process gets killed
    if (message) {
      Utils.writeLog(message);
    }
    await Utils.sleepSecs(1);
    process.exit();
  }

  public shouldBotSleep(now: Date): boolean {

    const { nowHour, nowMinutes } = {
      nowHour: Number(now.getHours()),
      nowMinutes: Number(now.getMinutes()),
    };

    const { startHour, startMinutes } = {
      startHour: Number(this.config.sleepStart.split(':')[0]),
      startMinutes: Number(this.config.sleepStart.split(':')[1]),
    };
    const { endHour, endMinutes } = {
      endHour: Number(this.config.sleepEnd.split(':')[0]),
      endMinutes: Number(this.config.sleepEnd.split(':')[1]),
    };

    const shouldBotSleep = (
      nowHour >= startHour &&
      nowHour * 60 + nowMinutes >=
      startHour * 60 + startMinutes &&
      nowHour <= endHour &&
      nowHour*60 + nowMinutes <= endHour * 60 + endMinutes
    );

    if(shouldBotSleep === true){
      // start new day bcs all functions are in the sleep mode
      this.startNewDay();
    }

    // only merge them here so the day gets reset right
    return shouldBotSleep || this.isBanned;
  }
}
