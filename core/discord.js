import Discord from 'discord.js';
import fs from 'fs'
import {default as tgclient} from './telegram.js'
import 'dotenv/config'
const json = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`));

const dsclient = new Discord.Client({intents: 33281, allowedMentions: { repliedUser: false }});

dsclient.on('ready', () => {
    dsclient.channels.cache.get(process.env.discordchannelid).send('Discord Client ready and logged in as ' + dsclient.user.tag + '.');
})

dsclient.on('messageCreate', (message) => {
    if (message.author.bot) return;
    if(message.channel.id != process.env.discordchannelid) return;
    if(message.attachments.map(a => a.proxyURL).length === 0) {
        return tgclient.telegram.sendMessage(process.env.tgchatid, `**${message.author.tag}**:\n ${message.content}`);
    } else {
        return tgclient.telegram.sendMessage(process.env.tgchatid, `**${message.author.tag}**:\n ${message.content}`, {
            "caption": message.attachments.map(a => a.proxyURL)[0]
        });
    }
})
export default dsclient;