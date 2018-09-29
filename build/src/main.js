"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const lib_1 = require("./lib");
const readConfig = require('read-config');
(() => {
    const configPath = path.join(__dirname, 'bot-config.json');
    const config = readConfig(configPath);
    const bot = new lib_1.Instabot(config);
    bot
        .initBot()
        .then(() => {
    })
        .catch(err => {
        console.error('BOT INIT FAILED', err);
    });
})();
