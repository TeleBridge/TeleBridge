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
    //if(message.attachments.map(a => a.proxyURL).length === 0) {
        return tgclient.telegram.sendMessage(process.env.tgchatid, `<b>${message.author.tag}</b>:\n ${md2html(message.cleanContent)}`, {parse_mode: 'html'});
    // else {
    //    return tgclient.telegram.sendMessage(process.env.tgchatid, `\*\*${message.author.tag}\*\*:\n ${message.content}`, {
    //        "caption": message.attachments.map(a => a.proxyURL)[0],
    //        "parse_mode": "MarkdownV2"
    //    });
})
export default dsclient;

function ClearText(text) {
    return text
  .replace('_', '\\_')
  .replace('*', '\\*')
  .replace('[', '\\[')
  .replace(']', '\\]')
  .replace('(', '\\(')
  .replace(')', '\\)')
  .replace('~', '\\~')
  .replace('`', '\\`')
  .replace('>', '\\>')
  .replace('<', '\\<')
  .replace('#', '\\#')
  .replace('+', '\\+')
  .replace('-', '\\-')
  .replace('=', '\\=')
  .replace('|', '\\|')
  .replace('{', '\\{')
  .replace('}', '\\}')
  .replace('.', '\\.')
  .replace('!', '\\!')
  
}