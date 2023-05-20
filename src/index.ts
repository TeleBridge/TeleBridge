import { clearOldMessages, validateChannels } from './core/setup/main.js';
import { config as DotEnvConfig } from "dotenv";
import { Db, MongoClient } from 'mongodb'
import chalk from 'chalk'
DotEnvConfig({
    path: `${process.cwd()}/.env`
})

import discord from './core/discord.js';
import telegram from './core/telegram.js';
import fs from 'fs';

const GHpackageJson = await (await fetch("https://raw.githubusercontent.com/TeleBridge/TeleBridge/master/package.json")).json()
const packageJson = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`, 'utf-8'))

if (GHpackageJson.version !== packageJson.version) {
    console.log(chalk.yellow('New version available, it\'s recommended to update'))
    console.log(chalk.yellow('Current version: ' + packageJson.version))
    console.log(chalk.yellow('New version: ' + GHpackageJson.version))
}



const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const ConfigFile = fs.readFileSync(`${process.cwd()}/config.json`, 'utf-8');
if (!ConfigFile && !JSON.parse(ConfigFile)) throw new Error('Config file not found')
if (JSON.parse(ConfigFile).bridges.length === 0) throw new Error('No bridges found in the config file')
global.config = JSON.parse(ConfigFile);
const GHConfigJson = await (await fetch("https://raw.githubusercontent.com/TeleBridge/TeleBridge/master/example.config.json")).json()
if (JSON.stringify(Object.keys(GHConfigJson)).length > JSON.stringify(Object.keys(global.config)).length) {
    console.log(chalk.yellow('Updating config with the new options from GitHub, see the updated README on the GitHub repo for more info.'))
    Object.keys(GHConfigJson).forEach((key) => {
        if (!global.config[key]) {
            global.config[key] = GHConfigJson[key]
        }
    })
    fs.writeFileSync(`${process.cwd()}/config.json`, JSON.stringify(global.config, null, 4))
}
global.db = client.db()

await clearOldMessages(telegram)
telegram.launch()
discord.login(process.env.DISCORDTOKEN)

process.on('uncaughtException', (err) => {
    console.log(err);
})

/**
 * example db object for reference
 * {
 *  "discord": "messageid",
 *  "telegram": "messageid",
 *  "chatIds": {
 *     "discord": "chatid",
 *     "telegram": "chatid"
 *   }
 * }
 */

declare global {
    var db: Db;
    var config: Config;
    namespace NodeJS {
        interface ProcessEnv {
            DISCORDTOKEN: string;
            TGTOKEN: string;
            MONGO_URI: string;
        }
    }
}

interface Config {
    bridges: {
        name: string;
        discord: {
            chat_id: string;
        },
        telegram: {
            chat_id: string;
        },
        hide: boolean;
    }[]
    ignore_bots: boolean;
    [key: string]: any;
}


declare module 'telegraf';