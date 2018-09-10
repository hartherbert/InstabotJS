import * as shell from 'shelljs';

shell.cp('-R', 'src/bot-config.json', 'build/src/');

console.log('copied config to build dir');
