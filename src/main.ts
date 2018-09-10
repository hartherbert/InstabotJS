import { Instabot } from './models/bot';
import { HttpService } from './services/http.service';
import * as path from 'path';
import { BotConfig } from './models/config';
import { StorageService } from './services/storage.service';
const readConfig = require('read-config');

(() => {
  const configPath = path.join(__dirname, 'bot-config.json');
  const config: BotConfig = readConfig(configPath);

  const httpService: HttpService = new HttpService();
  const storageService: StorageService = new StorageService();
  const bot = new Instabot(httpService, storageService, config);

  bot
    .initBot()
    .then(() => {
      // add mode here
      // startAutoLikeByTagMode runs till max values are reached for the day,
      // restarts automatically bcs function has been registered
      bot.startAutoLikeByTagMode();
      bot.startAutoFollow();
    })
    .catch(err => {
      console.log(err);
    });
})(); // self calling function
