import 'dotenv/config'
import { Telegraf } from 'telegraf'
import fs from 'fs'
import {default as dsclient} from './discord.js'
const json = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`));

const tgclient = new Telegraf(process.env.TGTOKEN, {username: 'TeleBridge_robot', channelMode: true})
tgclient.telegram.getMe().then((botInfo) => {
    tgclient.options.username = botInfo.username
  })
tgclient.ready = () => {
  console.log('Telegram client ready and logged in as ' + tgclient.options.username + '.')
}
tgclient.start((ctx) => ctx.reply('Welcome!'))
tgclient.on('text', (ctx) => {
    if (ctx.chat.id != process.env.tgchatid) return;
    dsclient.channels.cache.get(process.env.discordchannelid).send(`${ctx.from.username}:\n ${ctx.message.text}`);
})
//log message in console when bot is stared

export default tgclient