import * as path from 'path';
import { BotConfig } from './models/config';
import { Instabot } from './lib';
const readConfig = require('read-config');

(() => {
  const configPath = path.join(__dirname, 'bot-config.json');
  const config: BotConfig = readConfig(configPath);

  const bot = new Instabot(config);

  bot
    .initBot()
    .then(()=>{

    })
    .catch(err => {
      console.error('BOT INIT FAILED', err);
    });
})(); // self calling function
