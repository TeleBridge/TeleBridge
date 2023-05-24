import { clearOldMessages, setupMtProto } from './core/setup/main.js';
import { config as DotEnvConfig } from "dotenv";
import { Db, MongoClient } from 'mongodb'
import chalk from 'chalk'
DotEnvConfig({
    path: `${process.cwd()}/.env`
})
import discord from './core/discord.js';
import telegram from './core/telegram.js';
import fs from 'fs';
import { channelPost, editedChannelPost, editedMessage, message } from 'telegraf/filters'

const eventsFolders = fs.readdirSync(process.cwd() + '/dist/core/events/telegram')

for (const folder of eventsFolders) {
  const eventFiles = fs.readdirSync(process.cwd() + `/dist/core/events/telegram/${folder}`).filter(file => file.endsWith('.js'))
  for (const file of eventFiles) {
    const event = await import(`./core/events/telegram/${folder}/${file}`)

    const filters: any = {
      "editedMessage": editedMessage(event.name),
      "message": message(event.name),
      "editedChannelPost": editedChannelPost(event.name),
      "channelPost": channelPost(event.name)
    }

    telegram.on(filters[folder], async (ctx) => event.execute(telegram, discord, ctx))
  }
}

const eventFiles = fs.readdirSync(`${process.cwd()}/dist/core/events/discord`).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = await import(`${process.cwd()}/dist/core/events/discord/${file}`);
    if (event.name === 'ready') {
        discord.once(event.name, (...args) => event.execute(discord, ...args));
        continue;
    }
    discord.on(event.name, (...args) => event.execute(discord, telegram, ...args));
}

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

const chatIds: number[] = []

for (let bridge of global.config.bridges) {
    chatIds.push(parseInt(bridge.telegram.chat_id))
}
global.db = client.db()

await clearOldMessages(telegram)
telegram.launch()
discord.login(process.env.DISCORDTOKEN)
if (process.env.API_ID && process.env.API_HASH) {
    await setupMtProto(telegram)
    await telegram.mtproto.start({
        botAuthToken: process.env.TGTOKEN
    })

    fs.writeFileSync(`${process.cwd()}/.string_session`, `${telegram.mtproto.session.save()}`)
} else {
    console.log(chalk.yellow('API_ID and API_HASH not found, skipping MTProto setup'))
}



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
            API_ID: string;
            API_HASH: string;
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
        disabled: boolean;
    }[]
    ignore_bots: boolean;
    [key: string]: any;
    owner: {
        discord: string;
        telegram: string;
    }
}


declare module 'telegraf';