import * as shell from 'shelljs';

shell.cp('-R', 'src/bot-config.json', 'build/src/bot-config.json');

console.log('copied config to build dir');
