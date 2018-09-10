import { Utils } from '../utils/utils';
import { UserAccount, UserAccountOptions } from '../models/user-account';
import FormData = require('form-data');
import fetch, { Response } from 'node-fetch';
import { convertToMediaPosts, MediaPost } from '../models/post';

export interface IResult<T> {
  status: number;
  success: boolean;
  data?: T;
}

const EndPoints = {
  baseUrl: 'https://www.instagram.com/',
  feed: () => `${EndPoints.baseUrl}?__a=1`,
  login: () => `${EndPoints.baseUrl}accounts/login/ajax/`,
  logout: () => `${EndPoints.baseUrl}accounts/logout`,
  exploreTag: (tag: string) => `${EndPoints.baseUrl}explore/tags/${tag}/?__a=1`,
  exploreLocation: (location: string) =>
    `${EndPoints.baseUrl}explore/locations/${location}/?__a=1`,
  like: (id: string, isDislike: boolean = false) =>
    `${EndPoints.baseUrl}web/likes/${id}/${isDislike ? 'unlike' : 'like'}/`,
  comment: (id: string) => `${EndPoints.baseUrl}web/comments/${id}/add/`,
  follow: (userId: string, isUnfollow: boolean = false) =>
    `${EndPoints.baseUrl}web/friendships/${userId}/${
      isUnfollow === true ? 'unfollow' : 'follow'
    }/`,
  mediaDetails: (id: string) => `${EndPoints.baseUrl}p/${id}/?__a=1`,
  userDetails: (username: string) => `${EndPoints.baseUrl}${username}/?__a=1`,
  userDetailsById: (userId: string) =>
    `https://i.instagram.com/api/v1/users/${userId}/info/`,
  getUsersThatLikedMedia: (shortcode: string, first: number) =>
    `${
      EndPoints.baseUrl
    }graphql/query/?query_hash=e0f59e4a1c8d78d0161873bc2ee7ec44&variables=%7B%22shortcode%22%3A%22${shortcode}%22%2C%22include_reel%22%3Afalse%2C%22first%22%3A${first}%7D`,
};

/*const Matchers = {
  sharedData: /\<script type=\"text\/javascript\">window\._sharedData \=(.*)\;<\//,
};*/

export class HttpService {
  // region Internal Variables

  /**
   * Which languages should be set on the header
   * */
  private language: string = 'en-US;q=0.9,en;q=0.8,es;q=0.7';

  /**
   * Random user-agent to be used, consistent from the beginning
   * */
  private userAgent: string = Utils.getFakeUserAgent();

  /**
   * csrfToken for instagram
   * */
  private csrfToken: string = undefined;

  /**
   * when logged in, sessionId is being saved here
   * */
  private sessionId: string = undefined;

  /**
   * Hidden header that needs to be set
   * */
  private rollout_hash: string;

  /**
   * Cookies set over time, appended on the requests
   * */
  private essentialCookies = {
    sessionid: undefined,
    ds_user_id: undefined,
    csrftoken: undefined,
    shbid: undefined,
    rur: undefined,
    mid: undefined,
    shbts: undefined,
    mcd: undefined,
    ig_cb: 1,
    //urlgen      : undefined //this needs to be filled in according to my RE
  };

  private baseHeader = {
    'accept-langauge': this.language,
    origin: 'https://www.instagram.com',
    referer: 'https://www.instagram.com/',
    'upgrade-insecure-requests': '1',
    'user-agent': this.userAgent,
  };

  // endregion

  constructor() {}

  /**
   * Get csrf token
   * @return {Object} Promise<IResult<string>>
   */
  public getCsrfToken(): Promise<IResult<string>> {
    return new Promise<IResult<string>>((resolve, reject) => {
      fetch('https://www.instagram.com', {
        method: 'get',
        headers: this.combineWithBaseHeader({
          accept:
            'text/html,application/xhtml+xml,application/xml;q0.9,image/webp,image/apng,*.*;q=0.8',
          'accept-encoding': 'gzip, deflate, br',
          cookie: this.generateCookie(true),
        }),
      })
        .then(response => {
          this.updateEssentialValues(response.headers.raw()['set-cookie']);
          this.csrfToken = this.essentialCookies.csrftoken;
          response
            .text()
            .then(html => {
              this.updateEssentialValues(html, true);
              this.csrfToken = this.essentialCookies.csrftoken;
              return resolve(Utils.getResult(response, this.csrfToken));
            })
            .catch(() => {
              return reject('Could not get CSRF-Token of Instagram');
            });
        })
        .catch(() => {
          return reject('Could not get CSRF-Token of Instagram');
        });
    });
  }

  /**
   * Session id by username and password
   * @return {any} Promise
   * @param credentials
   */
  public login(credentials: {
    username: string;
    password: string;
  }): Promise<IResult<string>> {
    const formdata =
      'username=' +
      credentials.username +
      '&password=' +
      credentials.password +
      '&queryParams=%7B%7D';

    let options = {
      method: 'POST',
      body: formdata,
      headers: this.combineWithBaseHeader({
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'content-length': formdata.length,
        'content-type': 'application/x-www-form-urlencoded',
        cookie: 'ig_cb=' + this.essentialCookies.ig_cb,
        'x-csrftoken': this.csrfToken,
        'x-instagram-ajax': this.rollout_hash,
        'x-requested-with': 'XMLHttpRequest',
      }),
    };

    return new Promise<IResult<string>>((resolve, reject) => {
      fetch(EndPoints.login(), options)
        .then(response => {
          this.updateEssentialValues(response.headers.raw()['set-cookie']);
          this.sessionId = this.essentialCookies.sessionid;
          return resolve(
            Utils.getResult(response, this.essentialCookies.sessionid),
          );
        })
        .catch(() => {
          return reject(
            'Could not login with your username and password... Try again.',
          );
        });
    });
  }

  /**
   * logs out the current user
   * @return {Object} Promise<IResult<boolean>>
   */
  public logout(): Promise<IResult<boolean>> {
    if (!this.csrfToken || this.csrfToken.length < 2) {
      return Promise.reject('cannot logout if not logged in');
    }

    const form = new FormData();
    form.append('csrfmiddlewaretoken', this.csrfToken);

    let options = {
      method: 'POST',
      body: form,
      headers: this.combineWithBaseHeader({
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'content-type': 'application/x-www-form-urlencoded',
        cookie: 'ig_cb=' + this.essentialCookies.ig_cb,
        'x-csrftoken': this.csrfToken,
        'x-instagram-ajax': this.rollout_hash,
        'x-requested-with': 'XMLHttpRequest',
      }),
    };

    return new Promise((resolve, reject) => {
      fetch(EndPoints.logout(), options)
        .then(t => {
          this.updateEssentialValues(t.headers.raw()['set-cookie']);
          this.sessionId = undefined;
          this.csrfToken = undefined;
          return resolve(Utils.getResult(t, t.ok));
        })
        .catch(() => {
          return reject('Instagram logout failed');
        });
    });
  }

  /**
   * Follow/unfollow user by id
   * @description always resolves the promise, never rejects
   * @param {string} userId
   * @param {boolean} isUnfollow, if true user will be unfollowed
   * @return {object} Promise<IResult<boolean>>
   */
  public follow(
    userId: string,
    isUnfollow: boolean = false,
  ): Promise<IResult<boolean>> {
    return new Promise<IResult<boolean>>(resolve => {
      fetch(EndPoints.follow(userId, isUnfollow), {
        method: 'post',
        headers: this.getHeaders(), //headers
      })
        .then(r => {
          return resolve({
            status: r.status,
            success: r.ok,
          });
        })
        .catch(() => {
          return resolve({
            status: 500,
            success: false,
          });
        });
    });
  }

  /**
   * Gets an amount of posts based on the specific hashtag
   * @description always resolves the promise, never rejects
   * @param {string} hashtag
   * @returns {Promise<IResult<MediaPost[]>>}
   */
  public getMediaByHashtag(hashtag: string): Promise<IResult<MediaPost[]>> {
    return new Promise<IResult<MediaPost[]>>(resolve => {
      fetch(EndPoints.exploreTag(hashtag), {
        method: 'get',
        headers: this.getHeaders(),
      })
        .then((response: Response) => {
          response
            .json()
            .then(json => {
              if (json == null) {
                return resolve(Utils.getResult(response, []));
              } else {
                return resolve(
                  Utils.getResult(
                    response,
                    convertToMediaPosts(Utils.getPostsOfHashtagGraphQL(json)),
                  ),
                );
              }
            })
            .catch(() => {
              return resolve({
                status: 500,
                success: false,
                data: [],
              });
            });
        })
        .catch(() => {
          return resolve({
            status: 500,
            success: false,
            data: [],
          });
        });
    });
  }

  /*public getUsersByLikedMedia(shortcode: string, userCount: number = 24): Promise<IResult<UserAccount[]>>{
    return new Promise<IResult<UserAccount[]>>((resolve)=>{
      fetch(EndPoints.getUsersByLikedMedia(shortcode, userCount),{
        method: 'get',
        headers: this.getHeaders(),
      }).then((response)=>{

      }).catch(() =>{
        return resolve({
          status: 500,
          success:false,
          data: []
        })
      })
    });
  }*/

  /**
   * gets details about an user by the username
   * @description always resolves the promise, never rejects
   * @param username, username of the user
   * @param options
   * @returns Promise<IResult<UserAccount>>
   * */
  public getUserInfo(
    username: string,
    options?: UserAccountOptions,
  ): Promise<IResult<UserAccount>> {
    return new Promise<IResult<UserAccount>>(resolve => {
      fetch(EndPoints.userDetails(username), {
        method: 'get',
        headers: this.getHeaders(),
      })
        .then(response => {
          return response
            .json()
            .then(json => {
              if (
                json == null ||
                !json['graphql'] ||
                !json['graphql']['user']
              ) {
                return resolve({
                  status: response.status,
                  success: false,
                  data: null,
                });
              }
              const userData = json['graphql']['user'];
              return resolve(
                Utils.getResult(
                  response,
                  UserAccount.getUserByProfileData(userData, options),
                ),
              );
            })
            .catch(() => {
              return resolve({
                status: 500,
                success: false,
                data: null,
              });
            });
        })
        .catch(() => {
          return resolve({
            status: 500,
            success: false,
            data: null,
          });
        });
    });
  }

  /**
   * gets details about an user by the id
   * @description always resolves the promise, never rejects
   * @param {string} userId, id of the user
   * @param options
   * @returns Promise<IResult<UserAccount>>
   * */
  public getUserInfoById(
    userId: string,
    options?: UserAccountOptions,
  ): Promise<IResult<UserAccount>> {
    return new Promise<IResult<UserAccount>>(resolve => {
      fetch(EndPoints.userDetailsById(userId), {
        method: 'get',
        headers: this.getHeaders(),
      })
        .then(response => {
          return response
            .json()
            .then(json => {
              if (!json || !json['user']) {
                return null;
              }
              if (response.ok !== true) {
                return resolve(Utils.getResult(response, null));
              } else {
                // get complete userinfo by profile
                Utils.sleep().then(() => {
                  this.getUserInfo(json['user']['username'], options).then(
                    result => {
                      return resolve(result);
                    },
                  );
                });
              }
            })
            .catch(() => {
              return resolve({
                status: 500,
                success: false,
                data: null,
              });
            });
        })
        .catch(() => {
          return resolve({
            status: 500,
            success: false,
            data: null,
          });
        });
    });
  }

  /**
   * Attention: postId need transfer only as String (reason int have max value - 2147483647)
   * @description always resolves the promise, never rejects
   * @example postId - '1510335854710027921'
   * @param {string} postId
   * @param {boolean} isDislike, if its a request to unlike an post
   * @return {object} Promise<IResult<boolean>>
   */
  public like(
    postId: string,
    isDislike: boolean = false,
  ): Promise<IResult<boolean>> {
    return new Promise<IResult<boolean>>(resolve => {
      fetch(EndPoints.like(postId, isDislike), {
        method: 'POST',
        headers: this.getHeaders(),
        follow: 0,
      })
        .then(response => resolve(Utils.getResult(response, response.ok)))
        .catch(err => {
          console.error('like error,', err);
          return resolve({
            status: 500,
            success: false,
            data: false,
          });
        });
    });
  }

  // endregion

  // region Internal Functions

  /**
   * @return {Object} default headers
   */
  private getHeaders(): any {
    return {
      referer: 'https://www.instagram.com/p/BT1ynUvhvaR/?taken-by=yatsenkolesh',
      origin: 'https://www.instagram.com',
      'user-agent': this.userAgent,
      'x-instagram-ajax': this.rollout_hash ? this.rollout_hash : '1',
      'x-requested-with': 'XMLHttpRequest',
      'x-csrftoken': this.csrfToken,
      cookie:
        ' sessionid=' + this.sessionId + '; csrftoken=' + this.csrfToken + ';',
    };
  }

  private generateCookie(simple?: boolean): string {
    if (simple) return 'ig_cb=1';

    let cookie = '';
    let keys = Object.keys(this.essentialCookies);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      cookie +=
        key +
        '=' +
        this.essentialCookies[key] +
        (i < keys.length - 1 ? '; ' : '');
    }

    return cookie;
  }

  private combineWithBaseHeader(data: object): any {
    return Object.assign(this.baseHeader, data);
  }

  private updateEssentialValues(src, isHTML: boolean = false): void {
    //assumes that essential values will be extracted from
    // a cookie unless specified by the isHTML bool
    if (!isHTML) {
      let keys = Object.keys(this.essentialCookies);

      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (!this.essentialCookies[key])
          for (let cookie in src)
            if (
              src[cookie].includes(key) &&
              !src[cookie].includes(key + '=""')
            ) {
              this.essentialCookies[key] = src[cookie]
                .split(';')[0]
                .replace(key + '=', '');
              break;
            }
      }
    } else {
      let subStr = src;

      let startStr = '<script type="text/javascript">window._sharedData = ';
      let start = subStr.indexOf(startStr) + startStr.length;
      subStr = subStr.substr(start, subStr.length);

      subStr = subStr.substr(0, subStr.indexOf('</script>') - 1);

      let json = JSON.parse(subStr);

      this.essentialCookies.csrftoken = json.config.csrf_token;
      this.rollout_hash = json.rollout_hash;
    }
  }

  // endregion

  // region HelperFunctions

  /*private getSharedData(htmlText: string): object {
    try {
      if (htmlText) {
        return JSON.parse(htmlText.match(Matchers.sharedData)[1]);
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  private getPostsOfHashtagPage(page: object) {
    if (page && page['entry_data']) {
      return page['entry_data']['TagPage'][0]['graphql']['hashtag'][
        'edge_hashtag_to_media'
      ]['edges'];
    } else {
      return [];
    }
  }*/

  // endregion
}
