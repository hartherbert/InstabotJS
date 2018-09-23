import { BotBehaviorConfig, BotConfig } from './models/config';
import { HttpService } from './services/http.service';
import { StorageService } from './services/storage.service';
import { Utils } from './modules/utils/utils';
import { MediaPost } from './models/post';
import { UserAccount } from './models/user-account';
import { IResult } from './models/http-result';

export class Instabot {
  public isLoggedIn: boolean = false;
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
    maxLikesPerDay: 1000,
    maxDislikesPerDay: 0,
    maxFollowsPerDay: 300,
    maxUnfollowsPerDay: 300,
    minUnfollowWaitTime: 4320, // minutes... -> 72 hours
    minDislikeWaitTime: 1440, // minutes... -> 24 hours
    maxFollowsPerHashtag: 20,
    hashtags: ['follow4follow', 'f4f', 'beer', 'l4l', 'like4like'],
    maxLikesPerHashtag: 50,
    sleepTime: 4,
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
  /*registered functions to call again after bot-sleep*/
  private registeredRoutines: {
    [routine: string]: [Function, any[]];
  } = {};
  /*How long a day goes*/
  public readonly timeInDay: number = 24 * 60 * 60; // 24 hours
  /*Bot sleeptime in seconds (calculated in the constructor)*/
  private readonly sleepTimeInSecs: number; // bot sleeptime in secs
  /*minimum sleeptime for the bot if an failed request response comes in*/
  public readonly failedRequestSleepTime = 120; // in seconds
  /*Maximum count of ban request responses*/
  public banCountToBeBanned: number = 3;
  /*Time to sleep in seconds when ban is active*/
  public banSleepTime: number = 2 * 60 * 60;

  //endregion

  //region Internal Variables
  /*minimum sleep time for the bot between 2 likes requests*/
  public readonly likeSleep: number; // in seconds
  /*minimum sleep time for the bot between 2 follow requests*/
  public readonly followSleep: number; // in seconds
  /*minimum wait time for the bot before it can unfollow an followed user*/
  public readonly unfollowWaitTime: number; // in seconds
  /*minimum wait time for the bot before it can dislike an liked mediapost*/
  private readonly dislikeWaitTime: number; // in seconds
  /*List of all userIds that some posts were liked*/
  private userIdOfLikedPosts: string[] = [];
  /*if the bot is current sleeping*/
  private botIsAsleep: boolean = false;
  /*Count of the followed users in the current running day*/
  private followCountCurrentDay: number = 0;
  /*Count of the unfollowed users in the current running day*/
  private unfollowCountCurrentDay: number = 0;
  /*likes made in the current running day*/
  public likesCountCurrentDay: number = 0;
  /*dislikes made in the current running day*/
  private dislikesCountCurrentDay: number = 0;
  /*if initialisation was successful*/
  private readonly canStart;
  /*Count of possible ban request responses*/
  private banCount: number = 0;
  /*if dislike loop is running*/
  private isDisliking: boolean = false;
  /*if unfollow loop is running*/
  private isUnfollowing: boolean = false;

  //endregion

  constructor(
    public apiService: HttpService,
    public storageService: StorageService,
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

    this.registeredRoutines = {};

    this.sleepTimeInSecs = Math.floor(this.config.sleepTime * 60 * 60);

    // time to wait to like next again,
    // attention: its calculated but still random
    // and 2/3 of the real time bcs the dislike time starts after 1/3 of the time
    this.likeSleep = Math.floor(
      (this.timeInDay - this.sleepTimeInSecs) / this.config.maxLikesPerDay,
    );

    // time to wait to follow next again,
    // attention: its calculated but still random
    // and 2/3 of the real time bcs the unfollow time starts after 1/3 of the time
    this.followSleep = Math.floor(
      (this.timeInDay - this.sleepTimeInSecs) / this.config.maxFollowsPerDay,
    );

    // minimum wait time so the bot can unfollow followed users
    // converting minutes (from config) to seconds
    this.unfollowWaitTime = Math.floor(this.config.minUnfollowWaitTime * 60);
    this.dislikeWaitTime = Math.floor(this.config.minDislikeWaitTime * 60);

    /*this.storageService.setWaitTimeBeforeDelete(
      this.config.waitTimeBeforeDelete,
    );*/

    // only for testing purposes
    if (this.config.isTesting === true) {
      this.isLoggedIn = true;
    }

    //this.clearRoutines();
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
      this.registerBotSleep();
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
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
   * Registers when the bot needs to go to sleep
   * */
  private registerBotSleep() {
    if (this.sleepTimeInSecs <= 0) {
      // bot has no sleep
      return;
    }
    const worktime = (this.timeInDay - this.sleepTimeInSecs) * 1000; // in ms
    const botStartSleep = worktime * 0.9 + worktime * 0.2 * Math.random(); // in ms

    const sleepTime = new Date(Date.now() + botStartSleep);

    Utils.writeLog(
      `Registered bot to sleep at ${Utils.getDateString(sleepTime)}`,
    );
    Utils.sleep(botStartSleep).then(() => {
      this.getBotToSleep();
    });
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
            Utils.sleep().then(() => {
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
                    Utils.sleep().then(() => {
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
   * Registers a routine function, to call again after bot-sleep
   * @param id, any name (key in the object)
   * @param routine, function to be called after sleep
   * @param params, arguments to pass to function on call
   * */
  private registerRoutine(
    id: string,
    routine: Function,
    ...params: any[]
  ): void {
    console.log('registering new routine: ', id);
    if (Object.keys(this.registeredRoutines).indexOf(id) < 0) {
      // register routine
      console.log('registered routine: ', id);
      this.registeredRoutines[id] = [routine, params];
    }
  }

  private async getStartRoutineSleepTime(): Promise<any> {
    const sleepSecs = Utils.getRandomInt(1, 180);
    Utils.writeLog(
      'Bot sleeping now for ' + sleepSecs + ' before starting routine',
    );
    return Utils.sleep(sleepSecs * 1000);
  }

  /**
   * Recursive function to like posts on instagram from random users (based on the hashtags in the config)
   * */
  public async startAutoLikeByTagMode(): Promise<any> {
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

      if (this.likesCountCurrentDay >= this.config.maxLikesPerDay) {
        // if todays limit is reached, just return
        Utils.writeLog(
          'Todays Like limit is reached, pausing now.',
          'startAutoLikeByTagMode',
        );
        return Promise.resolve();
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
      } else {
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

  /**
   * Recursive function to follow users and like posts on own profile from random users (based on the own post likes)
   * */
  public async startAutoCheckOwnProfileMode(): Promise<any> {
    // Todo
  }

  /**
   * Follows user of liked posts (more natural) or if startAutoLikeByTagMode is not started
   * it just searches users based on hashtags and follows them
   * */
  public async startAutoFollow(withSleep: boolean = true) {
    try {
      this.registerRoutine('startAutoFollow', this.startAutoFollow, withSleep);

      if (this.botIsAsleep === true) {
        return Promise.resolve();
      }

      if (!this.isLoggedIn) {
        await this.initBot();
      }

      await this.getStartRoutineSleepTime();

      if (
        this.userIdOfLikedPosts.length > 5 &&
        this.followCountCurrentDay < this.config.maxFollowsPerDay
      ) {
        // get followers of posts
        await this.followAllUsersById(this.userIdOfLikedPosts);

        await Utils.sleep(this.getFollowSleepTime() * 4);
        if (this.followCountCurrentDay < this.config.maxFollowsPerDay) {
          return this.startAutoFollow();
        } else {
          return Promise.resolve();
        }
      } else if (this.followCountCurrentDay < this.config.maxFollowsPerDay) {
        // get any hashtag from map
        const hashtag: string = this.getRandomHashtag();
        // get posts for this hashtag
        const result = await this.apiService.getMediaByHashtag(hashtag);
        const success = await this.isSuccess(result);
        if (success === false) {
          await Utils.sleepSecs(this.failedRequestSleepTime);
          return this.startAutoFollow();
        }
        const userIds: string[] = result.data.map(post => post.ownerId);
        await this.followAllUsersById(userIds, withSleep);
        await Utils.sleep(this.getFollowSleepTime() * 4);
        return this.startAutoFollow();
      } else {
        // do nothing
        Utils.writeLog('Stopped following people for today', 'startAutoFollow');
        this.updateMessage();
        return Promise.resolve();
      }
    } catch (e) {
      Utils.writeLogError(
        'Error while performing startAutoFollow',
        'startAutoFollow',
      );
      await Utils.sleepSecs(this.failedRequestSleepTime);
      return this.startAutoFollow();
    }
  }

  /**
   * Unfollows user that had been followed before
   * is called automatically after 1/3 of the follows of the current day were made
   * @param withSleep, if bot should sleep between the unfollows
   * @param isAutoStarted, if was started inside the bot logic or from user of the class
   * */
  public async startAutoUnfollow(
    withSleep: boolean = true,
    isAutoStarted: boolean = true,
  ) {
    try {
      if (this.botIsAsleep === true) {
        return Promise.resolve();
      }

      if (this.isUnfollowing === true) {
        return Promise.resolve();
      }

      if (this.isLoggedIn !== true) {
        await this.initBot();
      }

      if (isAutoStarted === false) {
        // registering the routine to autostart again after bot waking up after sleep
        this.registerRoutine(
          'startAutoUnfollow',
          this.startAutoUnfollow,
          withSleep,
          isAutoStarted,
        );
      }

      await this.getStartRoutineSleepTime();

      /*if (this.shouldStartUnfollow() !== true) {
        await Utils.sleepSecs(this.getFollowSleepTime() * 4);
        return this.startAutoUnfollow(withSleep);
      }*/
      // should start now
      if (
        this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
        this.storageService.getUnfollowableLength(this.unfollowWaitTime) > 0
      ) {
        await this.startUnfollowFollowed(withSleep);
        await Utils.sleep(
          this.getFollowSleepTime() * Utils.getRandomInt(5, 10),
        );
        if (
          this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
          this.storageService.getUnfollowableLength(this.unfollowWaitTime) > 0
        ) {
          return this.startAutoUnfollow(withSleep, isAutoStarted);
        } else {
          return Promise.resolve();
        }
      } else if (
        this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay
      ) {
        if (this.followCountCurrentDay < this.config.maxFollowsPerDay) {
          // still not followed all of today
          // start with delay
          await Utils.sleep(
            this.getFollowSleepTime() * Utils.getRandomInt(3, 8),
          );
          return this.startAutoUnfollow(withSleep, isAutoStarted);
        } else {
          // nobody anymore here to unfollow
          return Promise.resolve();
        }
      } else {
        Utils.writeLog(
          'Stopped to unfollow people today, limit has been reached',
        );
        return Promise.resolve();
      }
    } catch (e) {
      Utils.writeLogError(
        'Error while performing startAutoUnfollow',
        'startAutoUnfollow',
      );
      await Utils.sleepSecs(this.failedRequestSleepTime);
      return this.startAutoUnfollow(withSleep, isAutoStarted);
    }
  }

  /**
   * Dislikes posts that had been liked before
   * is called automatically after 1/3 of the likes of the current day were made
   * */
  public async startAutoDislike(
    withSleep: boolean = true,
    isAutoStarted: boolean = true,
  ) {
    try {
      if (this.botIsAsleep === true) {
        return Promise.resolve();
      }

      if (this.isDisliking === true) {
        return Promise.resolve();
      }

      if (this.isLoggedIn !== true) {
        await this.initBot();
      }

      if (isAutoStarted === false) {
        this.registerRoutine(
          'startAutoDislike',
          this.startAutoDislike,
          withSleep,
          isAutoStarted,
        );
      }

      await this.getStartRoutineSleepTime();

      // should start now
      if (
        this.dislikesCountCurrentDay < this.config.maxDislikesPerDay &&
        this.storageService.getDislikeableLength(this.dislikeWaitTime) > 0
      ) {
        await this.startDislikeLiked(withSleep);
        await Utils.sleep(this.getLikeSleepTime() * 8);
        if (
          this.dislikesCountCurrentDay < this.config.maxDislikesPerDay &&
          this.storageService.getDislikeableLength(this.dislikeWaitTime) > 0
        ) {
          return this.startAutoDislike(withSleep);
        } else {
          return Promise.resolve();
        }
      } else if (this.dislikesCountCurrentDay < this.config.maxDislikesPerDay) {
        if (this.likesCountCurrentDay < this.config.maxLikesPerDay) {
          // still not liked all media for today
          // start with delay
          await Utils.sleep(this.getLikeSleepTime() * Utils.getRandomInt(3, 8));
          return this.startAutoDislike(withSleep);
        } else {
          // nobody anymore here to unfollow
          return Promise.resolve();
        }
      } else {
        Utils.writeLog(
          'Stopped to dislike medias for today, limit has been reached',
        );
        return Promise.resolve();
      }
    } catch (e) {
      Utils.writeLogError(
        'Error while performing startAutoDislike',
        'startAutoDislike',
      );
      await Utils.sleepSecs(this.failedRequestSleepTime);
      return this.startAutoDislike(withSleep);
    }
  }

  /**
   * Puts the bot into an bansleep mode
   * */
  private async startBanSleep(): Promise<any> {
    if (this.banCount >= this.banCountToBeBanned) {
      Utils.writeLog(
        'Bot is probably getting banned, sleeping now for ' +
          this.banSleepTime / 3600 +
          'h',
      );
      this.banCount = 0;
      this.botIsAsleep = true;
      await Utils.sleepSecs(this.banSleepTime);
      this.botIsAsleep = false;
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
   * Recursive method calling itself till all posts in the array are liked (if allowed to like based on config)
   * @param posts
   * @param withSleep, if bot should sleep between the likes
   * */
  private async likeAllExistingMedia(
    posts: MediaPost[],
    withSleep: boolean = true,
  ): Promise<any> {
    if (this.likesCountCurrentDay >= this.config.maxLikesPerDay) {
      // if todays limit is reached, just return
      return Promise.resolve();
    }

    const postsToLikeCount =
      this.config.maxLikesPerHashtag + this.likesCountCurrentDay;

    /*Utils.writeLog(
      `Starting likeAllExistingMedia Current: ${
        this.likesCountCurrentDay
      }, Liking till: ${postsToLikeCount}`,
    );*/

    while (
      posts.length > 0 &&
      this.botIsAsleep === false &&
      this.likesCountCurrentDay < this.config.maxLikesPerDay &&
      this.likesCountCurrentDay < postsToLikeCount
    ) {
      try {
        //like all the stuff while true
        const post: MediaPost = posts.splice(
          Utils.getRandomInt(0, posts.length - 1),
          1,
        )[0];

        if (
          this.storageService.canLike(post.id) !== true ||
          post.canLike() !== true
        ) {
          // already result media
          Utils.writeLog(`Not liking post ${post.id}`);
          continue;
        } else {
          const result = await this.apiService.like(post.id);
          const success = await this.isSuccess(result);
          if (success === false) {
            Utils.writeLog(
              `Failed to like media ${
                post.id
              } : URL: https://www.instagram.com/p/${post.shortcode}`,
            );
            await this.startLikeSleep(withSleep);
            continue;
          } else {
            this.likedNewMedia(post);
          }
          await this.startLikeSleep(withSleep);
        }
      } catch (e) {
        console.error('Error liking post likeAllExistingMedia, ', e);
        continue;
      }
    }

    Utils.writeLog(
      `Finished likeAllExistingMedia Current: ${
        this.likesCountCurrentDay
      }, Liking till: ${postsToLikeCount}`,
    );

    return Promise.resolve();
  }

  /**
   * Determine the sleeptime, every 8. like will sleep a longer time than normal
   * */
  public async startLikeSleep(withSleep: boolean = true, factor: number = 8) {
    if (withSleep === true) {
      if (this.likesCountCurrentDay % factor === 0) {
        await Utils.sleep(
          this.getLikeSleepTime() * Utils.getRandomInt(factor / 2, factor),
          'likeAllExistingMedia',
        );
      } else {
        await Utils.sleep(undefined, 'likeAllExistingMedia');
      }
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Determine the sleeptime, every 8. like will sleep a longer time than normal
   * */
  private async startDisikeSleep(withSleep: boolean = true) {
    if (withSleep === true) {
      if (this.dislikesCountCurrentDay % 8 === 0) {
        await Utils.sleep(
          this.getLikeSleepTime() * Utils.getRandomInt(4, 8),
          'startDislikeLiked',
        );
      } else {
        await Utils.sleep(this.getLikeSleepTime(), 'startDislikeLiked');
      }
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Determine the sleeptime, every 4. follow will sleep a longer time than normal
   * */
  private async startFollowSleep(withSleep: boolean = true) {
    if (withSleep === true) {
      if (this.followCountCurrentDay % 4 === 0) {
        await Utils.sleep(
          this.getFollowSleepTime() * Utils.getRandomInt(4, 8),
          'FollowSleep',
        );
      } else {
        await Utils.sleep(undefined, 'FollowSleep');
      }
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Determine the sleeptime, every 4. follow will sleep a longer time than normal
   * */
  private async startUnfollowSleep(withSleep: boolean = true) {
    if (withSleep === true) {
      if (this.unfollowCountCurrentDay % 4 === 0) {
        await Utils.sleep(
          this.getFollowSleepTime() * Utils.getRandomInt(4, 8),
          'UnfollowSleep',
        );
      } else {
        await Utils.sleep(undefined, 'UnfollowSleep');
      }
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Follows all userIds provided
   * @param userIds, to follow
   * @param withSleep, if bot should sleep between follows
   * */
  private async followAllUsersById(
    userIds: string[],
    withSleep: boolean = true,
  ): Promise<any> {
    while (
      this.followCountCurrentDay < this.config.maxFollowsPerDay &&
      this.botIsAsleep === false &&
      userIds.length > 0
    ) {
      try {
        const userId: string = userIds.splice(
          Utils.getRandomInt(0, userIds.length - 1),
          1,
        )[0];

        // check if its own user_id
        if (
          userId !== this.user_id &&
          this.storageService.canFollow(userId) === true
        ) {
          const result = await this.apiService.getUserInfoById(userId);
          const success = await this.isSuccess(result);
          if (success === false) {
            await this.startFailedRequestSleep();
            continue;
          }
          const user = result.data;
          if (user && user.canBeFollowed === true) {
            //Utils.writeLog('Trying to follow user: ' + user.username);

            //follow the user
            const result = await this.apiService.follow(user.user_id);

            const success = await this.isSuccess(result);
            if (success === false) {
              Utils.writeLogError(
                `Failed to follow ${user.username}, status: ${result.status}`,
              );
              await this.startFailedRequestSleep();
              continue;
            } else {
              this.followedNewUser(user);
              await this.startFollowSleep(withSleep);
            }
          } else {
            Utils.writeLog(`Not following user: ${user.canFollowReason()}`);
            await Utils.sleepSecs(Utils.getRandomInt(5, 30));
          }
        }
      } catch (e) {
        console.error(
          'Error following user by posts followAllUsersByMedia, ',
          e,
        );
        await this.startFailedRequestSleep();
        continue;
      }
    }
    return Promise.resolve();
  }

  /**
   * set the bot to sleep if an request fails
   * */
  private startFailedRequestSleep(): Promise<any> {
    return Utils.sleepSecs(this.failedRequestSleepTime);
  }

  /**
   * function to call when new post has been liked
   * stores postid into storageApi
   * */
  public likedNewMedia(post: MediaPost) {
    const index = this.userIdOfLikedPosts.findIndex(id => id === post.ownerId);
    if (index < 0) {
      // not found
      this.userIdOfLikedPosts.push(post.ownerId);
    }
    Utils.writeLog(
      `Liked new post: https://www.instagram.com/p/${post.shortcode}`,
      'Like',
    );
    this.likesCountCurrentDay++;
    this.storageService.addLike(post.id);
    this.updateMessage();

    /*if (this.shouldStartDislike() === true) {
      // start to dislike media
      this.startAutoDislike();
    }*/
  }

  /**
   * function to call when new user has been followed
   * stores userId into storageApi
   * */
  private followedNewUser(user: UserAccount) {
    // save as followed
    Utils.writeLog(`Followed new user: ${user.username}`, 'Follow');
    this.followCountCurrentDay++;
    this.storageService.addFollower(user.user_id);
    //Utils.writeLog(`Successfully followed ${user.username}`);
    this.updateMessage();

    if (this.followCountCurrentDay % 8 === 0) {
      if (this.shouldStartUnfollow() === true)
        // start to unfollow users
        this.startAutoUnfollow();
    }
  }

  /**
   * function to call when new user has been unfollowed
   * stores userId into storageApi
   * */
  private unfollowedNewUser(userId: string) {
    // save as unfollowed
    Utils.writeLog(`Unfollowed new user: ID: ${userId}`, 'Unfollow');
    this.unfollowCountCurrentDay++;
    this.storageService.unFollowed(userId);
    this.updateMessage();
  }

  /**
   * function to call when new post has been disliked
   * stores userId into storageApi
   * */
  private dislikedNewMedia(postId: string): void {
    // save as disliked
    Utils.writeLog(`Disliked new media: ID: ${postId}`, 'Dislike');
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
   * gets a random sleep time between likes a little random
   * */
  private getLikeSleepTime() {
    return (
      Utils.getRandomInt(
        this.likeSleep * 0.85,
        this.likeSleep * 0.85 + this.likeSleep * 0.3 * Math.random(),
      ) * 1000
    );
  }

  /**
   * gets a random sleep time between follows a little random
   * */
  private getFollowSleepTime() {
    return (
      Utils.getRandomInt(
        this.followSleep * 0.85,
        this.followSleep * 0.85 + this.followSleep * 0.3 * Math.random(),
      ) * 1000
    );
  }

  /**
   * function to be called when a 'new day' starts for the bot
   * */
  private startNewDay() {
    this.userIdOfLikedPosts = [];
    this.followCountCurrentDay = 0;
    this.unfollowCountCurrentDay = 0;
    this.likesCountCurrentDay = 0;
    this.dislikesCountCurrentDay = 0;
    this.storageService.cleanUp();
  }

  /**
   * sets the bot in sleep mode
   * */
  private async getBotToSleep() {
    try {
      Utils.writeLog('Putting bot to sleep', 'Bot-Sleep');
      // Prevent bot from doing any actions
      if (this.isLoggedIn === true) {
        await this.logout();
      }
      this.botIsAsleep = true;
      await Utils.sleep(); // sleep to let every routine get that we are sleeping now

      const sleepTime =
        Utils.getRandomInt(
          this.sleepTimeInSecs * 0.9,
          this.sleepTimeInSecs * 0.9 +
            this.sleepTimeInSecs * 0.2 * Math.random(),
        ) * 1000;

      Utils.writeLog(
        `Bot will sleep until ${Utils.getDateString(
          new Date(Date.now() + sleepTime),
        )}`,
        'Bot-Sleep',
      );

      //TEST
      // Utils.writeLog('sleeping 5 mins then restart');
      // await Utils.sleepSecs(300);
      //TEST END

      await Utils.sleep(sleepTime, 'Bot-Sleep');
      this.startNewDay();
      this.botIsAsleep = false;

      // todo add unlike and unfollow routine here

      await this.restartRoutines();
      this.registerBotSleep();
    } catch (e) {
      Utils.writeLogError('getBotToSleep Error: ' + e);
    }
  }

  /**
   * starts to unfollow all followed users that are stored in the storageApi
   * */
  private async startUnfollowFollowed(withSleep: boolean = true): Promise<any> {
    this.isUnfollowing = true;
    while (
      this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
      this.botIsAsleep === false
    ) {
      try {
        const unfollowableUsersKeys = Object.keys(
          // get only all users that the unfollow wait time exceeded
          this.storageService.getUnfollowable(this.unfollowWaitTime),
        );

        const userId: string =
          unfollowableUsersKeys[
            Utils.getRandomInt(0, unfollowableUsersKeys.length - 1)
          ];
        const result = await this.apiService.follow(userId, true);
        const success = await this.isSuccess(result);
        if (success === false) {
          //couldnt unfollow
          await Utils.sleepSecs(this.failedRequestSleepTime);
          continue;
        } else {
          this.unfollowedNewUser(userId);
          await this.startUnfollowSleep(withSleep);
        }
      } catch (e) {
        console.error(
          'Error following user by posts followAllUsersByMedia, ',
          e,
        );
        continue;
      }
    }

    this.isUnfollowing = false;
    return Promise.resolve();
  }

  /**
   * starts to dislike all liked posts that are stored in the storageApi
   * */
  private async startDislikeLiked(withSleep: boolean = true): Promise<any> {
    this.isDisliking = true;
    while (
      this.unfollowCountCurrentDay < this.config.maxUnfollowsPerDay &&
      this.botIsAsleep === false
    ) {
      try {
        const mediaKeys = Object.keys(this.storageService.getLikes());

        const postId: string =
          mediaKeys[Utils.getRandomInt(0, mediaKeys.length - 1)];
        const result = await this.apiService.like(postId, true);
        const success = await this.isSuccess(result);
        if (success === false) {
          //couldnt dislike
          await Utils.sleepSecs(this.failedRequestSleepTime);
          continue;
        } else {
          this.dislikedNewMedia(postId);
          if (withSleep === true) {
            await this.startDisikeSleep(); //Utils.sleep(this.getLikeSleepTime(), 'startUnfollowFollowed');
          } else {
            await Utils.sleep();
          }
        }
      } catch (e) {
        console.error('Error following user by posts startDislikeLiked, ', e);
        continue;
      }
    }

    this.isDisliking = false;
    return Promise.resolve();
  }

  /**
   * function to determine if the unfollow loop should start
   * */
  private shouldStartUnfollow() {
    return (
      this.storageService.getUnfollowableLength(this.unfollowWaitTime) > 0 &&
      this.isUnfollowing === false
    );
  }

  /**
   * function to determine if the dislike loop should start
   * */
  private shouldStartDislike() {
    return (
      this.storageService.getDislikeableLength(this.dislikeWaitTime) > 0 &&
      this.isDisliking === false
    );
  }

  /**
   * function to restart all routines that were running before the bot-sleep
   * */
  private async restartRoutines() {
    if (this.config.isTesting === true) {
      // pass
      this.isLoggedIn = true;
    } else if (this.isLoggedIn === false) {
      await this.login();
    } else {
      Utils.writeLogError('still logged in, no need to restart routines');
      return Promise.resolve();
    }

    // restart all routines that were running
    Object.keys(this.registeredRoutines).forEach(key => {
      Utils.writeLog('Restarting routine: ' + key);
      this.registeredRoutines[key][0].call(
        this,
        this.registeredRoutines[key][1],
      );
    });

    return Promise.resolve();
  }

  private clearRoutines() {
    this.registeredRoutines = {};
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


  private shouldBotSleep():boolean{
    const now = new Date();
    const nowNumber = (now.getHours() + "" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes());
    const shouldNumber = (this.config.sleepUntil).replace(":", "");
    if(Number(nowNumber) >= Number(shouldNumber)){
      console.log('should not be sleeping now' );
    }else{
      console.log('should be sleeping');
    }

  }

}
