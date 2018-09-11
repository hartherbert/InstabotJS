"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bot_1 = require("./models/bot");
const http_service_1 = require("./services/http.service");
const path = require("path");
const storage_service_1 = require("./services/storage.service");
const readConfig = require('read-config');
(() => {
    const configPath = path.join(__dirname, 'bot-config.json');
    const config = readConfig(configPath);
    const httpService = new http_service_1.HttpService();
    const storageService = new storage_service_1.StorageService();
    const bot = new bot_1.Instabot(httpService, storageService, config);
    bot
        .initBot()
        .then(() => {
        bot.startAutoLikeByTagMode();
        bot.startAutoFollow();
    })
        .catch(err => {
        console.log(err);
    });
})();
//# sourceMappingURL=main.js.map