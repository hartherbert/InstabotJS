"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_account_1 = require("../models/user-account");
const node_fetch_1 = require("node-fetch");
const post_1 = require("../models/post");
const utils_1 = require("../modules/utils/utils");
const EndPoints = {
    baseUrl: 'https://www.instagram.com/',
    feed: () => `${EndPoints.baseUrl}?__a=1`,
    login: () => `${EndPoints.baseUrl}accounts/login/ajax/`,
    logout: () => `${EndPoints.baseUrl}accounts/logout`,
    exploreTag: (tag) => `${EndPoints.baseUrl}explore/tags/${tag}/?__a=1`,
    exploreLocation: (location) => `${EndPoints.baseUrl}explore/locations/${location}/?__a=1`,
    like: (id, isDislike = false) => `${EndPoints.baseUrl}web/likes/${id}/${isDislike ? 'unlike' : 'like'}/`,
    comment: (id) => `${EndPoints.baseUrl}web/comments/${id}/add/`,
    follow: (userId, isUnfollow = false) => `${EndPoints.baseUrl}web/friendships/${userId}/${isUnfollow === true ? 'unfollow' : 'follow'}/`,
    mediaDetails: (id) => `${EndPoints.baseUrl}p/${id}/?__a=1`,
    userDetails: (username) => `${EndPoints.baseUrl}${username}/?__a=1`,
    userDetailsById: (userId) => `https://i.instagram.com/api/v1/users/${userId}/info/`,
    getUsersThatLikedMedia: (shortcode, first) => `${EndPoints.baseUrl}graphql/query/?query_hash=e0f59e4a1c8d78d0161873bc2ee7ec44&variables=%7B%22shortcode%22%3A%22${shortcode}%22%2C%22include_reel%22%3Afalse%2C%22first%22%3A${first}%7D`,
};
/*const Matchers = {
  sharedData: /\<script type=\"text\/javascript\">window\._sharedData \=(.*)\;<\//,
};*/
class HttpService {
    // endregion
    /**
     * Which languages should be set on the header
     * */
    constructor(options) {
        this.options = options;
        // region Internal Variables
        /**
         * Random user-agent to be used, consistent from the beginning
         * */
        this.userAgent = utils_1.Utils.getFakeUserAgent();
        /**
         * csrfToken for instagram
         * */
        this.csrfToken = undefined;
        /**
         * when logged in, sessionId is being saved here
         * */
        this.sessionId = undefined;
        /**
         * Cookies set over time, appended on the requests
         * */
        this.essentialCookies = {
            sessionid: undefined,
            ds_user_id: undefined,
            csrftoken: undefined,
            shbid: undefined,
            rur: undefined,
            mid: undefined,
            shbts: undefined,
            mcd: undefined,
            ig_cb: 1,
        };
        this.language = 'en-US;q=0.9,en;q=0.8,es;q=0.7';
        this.baseHeader = {
            'accept-langauge': this.language,
            origin: 'https://www.instagram.com',
            referer: 'https://www.instagram.com/',
            'upgrade-insecure-requests': '1',
            'user-agent': this.userAgent,
        };
    }
    /**
     * Get csrf token
     * @return {Object} Promise<IResult<string>>
     */
    getCsrfToken() {
        return new Promise((resolve, reject) => {
            node_fetch_1.default('https://www.instagram.com', {
                method: 'get',
                headers: this.combineWithBaseHeader({
                    accept: 'text/html,application/xhtml+xml,application/xml;q0.9,image/webp,image/apng,*.*;q=0.8',
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
                    return resolve(utils_1.Utils.getResult(response, this.csrfToken));
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
    getFormDataPairs(data, pairs = []) {
        // Turn the data object into an array of URL-encoded key/value pairs.
        for (let name in data) {
            pairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
        }
        return pairs;
    }
    getFormData(data) {
        const pairs = this.getFormDataPairs(data);
        // Combine the pairs into a single string and replace all %-encoded spaces to
        // the '+' character; matches the behaviour of browser form submissions.
        return pairs.join('&').replace(/%20/g, '+');
    }
    /**
     * Session id by username and password
     * @return {any} Promise
     * @param credentials
     */
    login(credentials) {
        /*let yes = true;*/
        const formdata = this.getFormData({
            username: credentials.username,
            password: credentials.password
        });
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
                referer: 'https://www.instagram.com/accounts/login/?source=auth_switcher',
            }),
        };
        return new Promise((resolve, reject) => {
            node_fetch_1.default(EndPoints.login(), options)
                .then(response => {
                return response
                    .json()
                    .then(json => {
                    if (json &&
                        json['authenticated'] === true &&
                        json['user'] === true) {
                        this.updateEssentialValues(response.headers.raw()['set-cookie']);
                        this.sessionId = this.essentialCookies.sessionid;
                        return resolve(utils_1.Utils.getResult(response, this.essentialCookies.sessionid));
                    }
                    else {
                        return reject('Authentication failed... Is your username and your password right?');
                    }
                })
                    .catch(() => {
                    //json error, not right response, login failed
                    return reject('Could not login with your username and password... Try again.');
                });
                /*this.updateEssentialValues(response.headers.raw()['set-cookie']);
                this.sessionId = this.essentialCookies.sessionid;
                return resolve(
                  Utils.getResult(response, this.essentialCookies.sessionid),
                );*/
            })
                .catch(() => {
                return reject('Could not login with your username and password... Try again.');
            });
        });
    }
    /**
     * logs out the current user
     * @return {Object} Promise<IResult<boolean>>
     */
    logout() {
        if (!this.csrfToken || this.csrfToken.length < 2) {
            return Promise.reject('cannot logout if not logged in');
        }
        const formdata = this.getFormData({
            csrfmiddlewaretoken: this.csrfToken
        });
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
        return new Promise((resolve, reject) => {
            node_fetch_1.default(EndPoints.logout(), options)
                .then(t => {
                this.updateEssentialValues(t.headers.raw()['set-cookie']);
                this.sessionId = undefined;
                this.csrfToken = undefined;
                return resolve(utils_1.Utils.getResult(t, t.ok));
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
    follow(userId, isUnfollow = false) {
        return new Promise(resolve => {
            node_fetch_1.default(EndPoints.follow(userId, isUnfollow), {
                method: 'post',
                headers: this.getHeaders(),
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
    getMediaByHashtag(hashtag) {
        return new Promise(resolve => {
            node_fetch_1.default(EndPoints.exploreTag(hashtag), {
                method: 'get',
                headers: this.getHeaders(),
            })
                .then((response) => {
                response
                    .json()
                    .then(json => {
                    if (json == null) {
                        return resolve(utils_1.Utils.getResult(response, []));
                    }
                    else {
                        return resolve(utils_1.Utils.getResult(response, post_1.convertToMediaPosts(utils_1.Utils.getPostsOfHashtagGraphQL(json), this.options.postOptions)));
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
    getMediaPostPage(shortcode) {
        return new Promise(resolve => {
            node_fetch_1.default(EndPoints.mediaDetails(shortcode), {
                method: 'get',
                headers: this.getHeaders(),
            })
                .then((response) => {
                response
                    .json()
                    .then(json => {
                    if (json == null) {
                        return resolve(utils_1.Utils.getResult(response, null));
                    }
                    else {
                        return resolve(utils_1.Utils.getResult(response, post_1.convertToMediaPost(utils_1.Utils.getPostGraphQL(json))));
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
    getUserInfo(username) {
        return new Promise(resolve => {
            node_fetch_1.default(EndPoints.userDetails(username), {
                method: 'get',
                headers: this.getHeaders(),
            })
                .then(response => {
                /*return response
                  .text()
                  .then(text => {
                    try {
                      let userData = this.getSharedData(text)['entry_data'][
                        'ProfilePage'
                      ][0]['graphql']['user'];
                      return resolve(
                        Utils.getResult(
                          response,
                          UserAccount.getUserByProfileData(userData, options),
                        ),
                      );
                    } catch (e) {
                      console.error('getUserInfo text error', e);
                      return resolve({
                        status: 500,
                        success: false,
                        data: null,
                      });
                    }
                  })
                  .catch(err => {
                    console.error('getUserInfo text error', err);
                    return resolve({
                      status: 500,
                      success: false,
                      data: null,
                    });
                  });*/
                return response
                    .json()
                    .then(json => {
                    if (json == null ||
                        !json['graphql'] ||
                        !json['graphql']['user']) {
                        return resolve({
                            status: response.status,
                            success: false,
                            data: null,
                        });
                    }
                    const userData = json['graphql']['user'];
                    return resolve(utils_1.Utils.getResult(response, user_account_1.UserAccount.getUserByProfileData(userData, this.options.followerOptions)));
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
    getUserInfoById(userId) {
        return new Promise(resolve => {
            node_fetch_1.default(EndPoints.userDetailsById(userId), {
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
                        return resolve(utils_1.Utils.getResult(response, null));
                    }
                    else {
                        // get complete userinfo by profile
                        utils_1.Utils.sleep().then(() => {
                            this.getUserInfo(json['user']['username']).then(result => {
                                return resolve(result);
                            });
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
    like(postId, isDislike = false) {
        return new Promise(resolve => {
            node_fetch_1.default(EndPoints.like(postId, isDislike), {
                method: 'POST',
                headers: this.getHeaders(),
                follow: 0,
            })
                .then(response => resolve(utils_1.Utils.getResult(response, response.ok)))
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
    getHeaders() {
        return {
            referer: 'https://www.instagram.com/p/BT1ynUvhvaR/?taken-by=yatsenkolesh',
            origin: 'https://www.instagram.com',
            'user-agent': this.userAgent,
            'x-instagram-ajax': this.rollout_hash ? this.rollout_hash : '1',
            'x-requested-with': 'XMLHttpRequest',
            'x-csrftoken': this.csrfToken,
            cookie: ' sessionid=' + this.sessionId + '; csrftoken=' + this.csrfToken + ';',
        };
    }
    generateCookie(simple) {
        if (simple)
            return 'ig_cb=1';
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
    combineWithBaseHeader(data) {
        return Object.assign(this.baseHeader, data);
    }
    updateEssentialValues(src, isHTML = false) {
        //assumes that essential values will be extracted from
        // a cookie unless specified by the isHTML bool
        if (!isHTML) {
            let keys = Object.keys(this.essentialCookies);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                if (!this.essentialCookies[key])
                    for (let cookie in src)
                        if (src[cookie].includes(key) &&
                            !src[cookie].includes(key + '=""')) {
                            this.essentialCookies[key] = src[cookie]
                                .split(';')[0]
                                .replace(key + '=', '');
                            break;
                        }
            }
        }
        else {
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
}
exports.HttpService = HttpService;
//# sourceMappingURL=http.service.js.map