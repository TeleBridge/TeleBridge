import Discord from 'discord.js';
import fs from 'fs'
import {default as tgclient} from './telegram.js'
import 'dotenv/config'
import md2html from './setup/md2html.js';
const json = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`));

const dsclient = new Discord.Client({intents: 33281, allowedMentions: { repliedUser: false }});

dsclient.on('ready', () => {
    dsclient.channels.cache.get(process.env.discordchannelid).send('Discord Client ready and logged in as ' + dsclient.user.tag + '.');
})

dsclient.on('messageCreate', (message) => {
    if (message.author.bot) return;
    if(message.channel.id != process.env.discordchannelid) return;
    message.attachments.forEach(async ({ url }) => {
        try {
            await tgclient.telegram.sendMessage(process.env.tgchatid, `<b>${message.author.tag}</b>:\n<a href="${url}">${url}</a>`, {parse_mode: "html"})
        } catch (err) {}
    });
    tgclient.telegram.sendMessage(process.env.tgchatid, `<b>${message.author.tag}</b>:\n ${md2html(message.cleanContent)}`, {parse_mode: 'html'});})
export default dsclient;
