[![TypeScript version][ts-badge]][typescript-30]
[![Node.js version][nodejs-badge]][nodejs]
[![APLv2][license-badge]][LICENSE]
[![Build Status][travis-badge]][travis-ci]
[![PRs Welcome][prs-badge]][prs]
[![Donate][donate-badge]][donate]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

# InstabotJS

Automatic Instagram-Bot with [Node.js][nodejs] project in [TypeScript][typescript] [3.0][typescript-30].

What's included:

+ [TypeScript][typescript] [3.0][typescript-30],
+ [TSLint 5][tslint] with [Microsoft rules][tslint-microsoft-contrib],
+ [Prettier][prettier] to enforces a consistent code style (but it's optional),
+ [NPM scripts for common operations](#available-scripts),
+ .editorconfig for consistent file format.

## Quick start

This project is intended to be used with v8 (LTS Carbon) release of [Node.js][nodejs] or newer and [NPM][npm]. Make sure you have those installed. Then just type following commands:


## Bot config

the bot can be customized by the bot-config.json file

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


## Available scripts

+ `clean` - remove coverage data, Jest cache and transpiled files,
+ `build` - transpile TypeScript to ES6,
+ `watch` - interactive watch mode to automatically transpile source files,
+ `lint` - lint source files and tests,
+ `test` - run tests,
+ `test:watch` - interactive watch mode to automatically re-run tests

[ts-badge]: https://img.shields.io/badge/TypeScript-3.0-blue.svg
[nodejs-badge]: https://img.shields.io/badge/Node.js->=%208.9-blue.svg
[nodejs]: https://nodejs.org/dist/latest-v8.x/docs/api/
[travis-badge]: https://travis-ci.org/hobbydevs/InstabotJS.svg?branch=master
[travis-ci]: https://travis-ci.org/hobbydevs/InstabotJS
[typescript]: https://www.typescriptlang.org/
[typescript-30]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html
[license-badge]: https://img.shields.io/badge/license-APLv2-blue.svg
[license]: https://github.com/hobbydevs/InstabotJS/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg
[prs]: http://makeapullrequest.com
[donate-badge]: https://img.shields.io/badge/$-support-green.svg
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