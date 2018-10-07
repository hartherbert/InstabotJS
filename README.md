[![TypeScript version][ts-badge]][typescript-30]
[![Node.js version][nodejs-badge]][nodejs]
[![MIT][license-badge]][license]
[![PRs Welcome][prs-badge]][prs]
[![Donate][donate-badge]][donate]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]

# InstabotJS

Automatic Instagram-Bot with [Node.js][nodejs] project in [TypeScript][typescript] [3.0][typescript-30].

What's included:

* [TypeScript][typescript] [3.0][typescript-30],
* [TSLint 5][tslint] with [Microsoft rules][tslint-microsoft-contrib],
* [Prettier][prettier] to enforces a consistent code style (but it's optional),
* [NPM scripts for common operations](#available-scripts),
* .editorconfig for consistent file format.


## Quick start

Just watch the Youtube video

[![How to setup an Instagram-bot for free](http://img.youtube.com/vi/t_D6MTjTbls/0.jpg)](http://www.youtube.com/watch?v=t_D6MTjTbls)


## Config
These configuration setting should be set inside the src [bot-config.json](/src/bot-config.json) file when you are compiling the project with `npm run watch`. When you are only editing the configuration without compiling it, just edit the [bot-config.json](/build/src/bot-config.json) in the `build/src` directory.

+ hashtags
> hashtags, list of hashtags the bot should search for, without '#' prefix
+ sleepStart
> sleepStart, time to send the bot to sleep only in this format 'hh:mm' or 'h:mm'
+ sleepEnd
> sleepEnd, time to wake the bot up again only in this format 'hh:mm' or 'h:mm'
+ botModes
> botModes, list of names of modes to start, format: 'routine1, routine2, routine3, ...'
available botModes, see **strategies**
+ maxLikesPerHashtag
> maxLikesPerHashtag, maximum likes the bot is allowed to make per hashtag per 24 hours when the limit is reached, the bot takes another hashtag
+ maxLikesPerDay
> maxLikesPerDay, maximum likes the bot is allowed to make per 24 hours
+ maxDislikesPerDay
> maxDislikesPerDay, maximum dislikes per 24 hours
+ minDislikeWaitTime
> minDislikeWaitTime, minimum time to wait to dislike a mediapost the bot liked before
(time in minutes)
+ maxFollowsPerDay
> maxFollowsPerDay, max people to follow in 24 hours
+ maxUnfollowsPerDay
> maxUnfollowsPerDay, max people to unfollow in 24 hours
+ minUnfollowWaitTime
> minUnfollowWaitTime, minimum time to wait to unfollow a user the bot followed before
(time in minutes)
+ maxFollowsPerHashtag
> maxFollowsPerHashtag, maximum follows the bot is allowed to make per hashtag per 24 hours when the limit is reached, the bot takes another hashtag (only used by sinlge follow mode)
+ followerOptions
  + unwantedUsernames
  > unwantedUsernames, list of strings containing full or parts of usernames that are not wanted to be followed
  + followFakeUsers
  > followFakeUsers, if bot should follow users that the bot thinks are fake users
  + followSelebgramUsers
  > followSelebgramUsers, if bot should follow users that the bot thinks are selebgram users
  + followPassiveUsers
  > followPassiveUsers, if bot should follow users that the bot thinks are passive (inactive) users
  + unfollowOnlyWhenFollowingMe
  > unfollowOnlyWhenFollowingMe, only let bot unfollow user if user is following user
+ postOptions
  + maxLikesToLikeMedia
  > maxLikesToLikeMedia, maximum likes a post is allowed to have to be liked by the bot
  + minLikesToLikeMedia
  > minLikesToLikeMedia, minimum likes a post is allowed to have to be liked by the bot
+ waitTimeBeforeDelete
> waitTimeBeforeDelete, minutes to wait before delete stored data (only unfollowed and disliked images) this option is only available to prevent an enormous data stored as json
(time in minutes)
+ isTesting
> isTesting, used only to let bot be checkable by automated tests

### Strategies 
Strategies or botModes (reference in bot-config.json) can be used to configure the behaviour of the bot while online. One maybe just wants to like pictures every day, the other only wants to follow
users automatically. There are a few strategies to use to complete different kind of behaviours. All strategies can be used together.
+ like-classic-mode
+ follow-classic-mode
+ unfollow-classic-mode

## Bot config

If you don't want to change anything in the code and just use the bot with and change the configuration, follow these steps:

Download and install all npm dependencies

```sh
git clone https://github.com/hobbydevs/InstabotJS
cd InstabotJS
npm install
```

or just download and unzip current `master` branch:

```sh
wget https://github.com/hobbydevs/InstabotJS/archive/master.zip -O InstabotJS
unzip InstabotJS.zip && rm InstabotJS.zip
```

After that go to the [bot-config.json](/build/src/bot-config.json) and change the username to your instagram username and the password to your instagram password.

When you've done all just go to the [build](/build/src) directory and run

```sh
node main.js
```

### Advanced Bot Config

the bot can be customized by the bot-config.json file.
To see all available options to customize the bot in the .json see the typescript [config](/src/models/config.ts).

To change some code and compile the typescript code to javascript, just run `npm run watch`. This will copy the [bot-config.json](/src/bot-config.json) from the src to the build/src directory and watch filechanges and compile them to javascript.
When you finished coding some stuff just go to `build/src` and run `node main.js` and watch your little bot go 🔥


## Actions frequency restrictions

* **Likes limit**: no more than one like every 28 – 36 seconds (1000 likes at a time for a period of 24 hours);

* **Followers limit**: no more than one like every 28 – 36 seconds and no more than 200 followers an hour (1000 followers at a time for a period of 24 hours);

* **Followers + Likes limit**: no more than 2000 (1000 + 1000) every 24 hours with the interval of 28 – 38 seconds;

* **Unfollow limit**: the interval of 12-22 seconds, no more than 1000 every 24 hours from unmutual and 1000 from mutual;

* **Mentions limit**: 5 nicks in a message with the interval of 350-450 seconds;

* **Comments limit**: no more than 12-14 an hour with the interval of 350 – 400 seconds, overlimit might be treated as spam;

* **Publishing images**: you shouldn’t add too many images to a new Instagram account, the best practice is to publish no more than 2-3 images a day, and for older accounts this figure is 9-12 images.

### New account limitations

You should keep these in mind in case you’re not sure that Instagram treats your account as a trusted one, or if you want to secure your account from getting blocked to the full.

* The actions interval for the first 12-20 days is 36-48 seconds;
* The total limit for all kinds of actions (follow, unfollow, like) is 500 every 24 hours.

The best strategy for new accounts would be to publish 2 or 3 images and let the account settle in for 2 or 3 weeks.


## Available scripts

* `clean` - remove coverage data, Jest cache and transpiled files,
* `build` - transpile TypeScript to ES6,
* `watch` - interactive watch mode to automatically transpile source files,
* `lint` - lint source files and tests,
* `test` - run tests,
* `test:watch` - interactive watch mode to automatically re-run tests

## Support
If you want to support this project send a PR or give it a star. 
Want to say thank you? Help me out  [![Donate][donate-badge]][donate]


[ts-badge]: https://img.shields.io/badge/TypeScript-3.0-blue.svg
[nodejs-badge]: https://img.shields.io/badge/Node.js->=%208.9-blue.svg
[nodejs]: https://nodejs.org/dist/latest-v8.x/docs/api/
[travis-badge]: https://travis-ci.org/hobbydevs/InstabotJS.svg?branch=master
[travis-ci]: https://travis-ci.org/hobbydevs/InstabotJS
[typescript]: https://www.typescriptlang.org/
[typescript-30]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html
[license-badge]: https://img.shields.io/github/license/mashape/apistatus.svg
[license]: https://github.com/hobbydevs/InstabotJS/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg
[prs]: http://makeapullrequest.com
[donate-badge]: https://img.shields.io/badge/donate-what%20you%20want-brightgreen.svg
[donate]: https://bit.ly/2x0cUp1
[github-watch-badge]: https://img.shields.io/github/watchers/hobbydevs/InstabotJS.svg?style=social
[github-watch]: https://github.com/hobbydevs/InstabotJS/watchers
[github-star-badge]: https://img.shields.io/github/stars/hobbydevs/InstabotJS.svg?style=social
[github-star]: https://github.com/hobbydevs/InstabotJS/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Check%20out%20this%20Node.js%20TypeScript%20boilerplate!%20https://github.com/jsynowiec/node-typescript-boilerplate%20%F0%9F%91%8D
[twitter-badge]: https://img.shields.io/twitter/url/https/jsynowiec/node-typescript-boilerplate.svg?style=social
[jest]: https://facebook.github.io/jest/
[tslint]: https://palantir.github.io/tslint/
[tslint-microsoft-contrib]: https://github.com/Microsoft/tslint-microsoft-contrib
[flow-boilerplate]: https://github.com/jsynowiec/node-flowtype-boilerplate
[wiki-js-tests]: https://github.com/hobbydevs/InstabotJS/wiki/Unit-tests-in-plain-JavaScript
[prettier]: https://prettier.io
[tutorial]: https://www.youtube.com/watch?v=t_D6MTjTbls
