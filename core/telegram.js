import 'dotenv/config'
import { Telegraf } from 'telegraf'
import {default as dsclient} from './discord.js'
import { MessageAttachment } from 'discord.js'
import { escapeChars } from './setup/main.js'

const tgclient = new Telegraf(process.env.TGTOKEN, {username: process.env.tgusername, channelMode: true})
tgclient.telegram.getMe().then((botInfo) => {
    tgclient.options.username = botInfo.username
  })

tgclient.start((ctx) => ctx.replyWithHTML('Welcome!\nThis is a self-hosted TeleBridge instance, for more info, check out the <a href="https://github.com/AntogamerYT/TeleBridge">GitHub Repo</a> (Not public yet)'))
tgclient.on('text', async(ctx) => {
    if (ctx.chat.id != process.env.tgchatid) return;
    ctx.message.reply_to_message 
    let username;
    switch (ctx.message.from.username) {
      case 'undefined':
        username = ctx.message.from.first_name;
        break;
      default:
        username = ctx.message.from.username;
        break;
    }
    let userreply;
    if(ctx.message.reply_to_message != undefined) {
      switch (ctx.message.reply_to_message.from.username) {
        case 'undefined':
          userreply = ctx.message.reply_to_message.from.first_name;
          break;
        default:
          userreply = ctx.message.reply_to_message.from?.username;
          break;
      }
    }
    let extraargs;
    if(ctx.message.is_automatic_forward === true) { extraargs = `(_Automatic Forward from channel_)`; username = ctx.message.forward_from_chat.title}
    if(ctx.message.forward_from_chat != undefined){ extraargs = `(Forwarded from ${username})`; username = ctx.message.forward_from_chat.title}
    if(ctx.message.forward_from != undefined){ extraargs = `(Forwarded from **${ctx.message.forward_from.username}**)`;}
    if(ctx.message.reply_to_message != undefined){ extraargs = `(Replying to ${userreply})`; }
    if(extraargs === undefined) extraargs = '';
    dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`);
})
tgclient.on('sticker', async(ctx) => {
  //get sticker emoji and image link 
    //send sticker to discord

  let emoji = ctx.message.sticker.emoji;
  let image = ctx.message.sticker.file_id;
  const link = await ctx.telegram.getFileLink(image);
  console.log(link.href)
})
tgclient.on('photo', async(ctx) => {
  let atarray = []
  for(let i = 0; i < ctx.message.photo.length; i++) {
    let image = ctx.message.photo[i].file_id;
    let link = await ctx.telegram.getFileLink(image);
    atarray.push(link.href)
  }
  let array2 = []
  for(let i = 1; i < atarray.length; i++) {
    let at = new MessageAttachment(atarray[i], `image${i}.jpg`)
    array2.push(at)
  }
array2.splice(array.length/2)
  dsclient.channels.cache.get(process.env.discordchannelid).send({files: [array2]});
    //console.log(await dsclient.channels.cache.get(process.env.discordchannelid).send({content: files: atarray}))
})
tgclient.on('video', async(ctx) => {
  //get video link
  //send video to discord
  let image = ctx.message.video.file_id;
  console.log(image)
})


export default tgclient
