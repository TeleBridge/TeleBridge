import 'dotenv/config'
import { Telegraf } from 'telegraf'
import {default as dsclient } from './discord.js'
import { MessageAttachment } from 'discord.js'
import { escapeChars, handleUser } from './setup/main.js'

const tgclient = new Telegraf(process.env.TGTOKEN, {username: process.env.tgusername, channelMode: true})
tgclient.telegram.getMe().then((botInfo) => {
  tgclient.options.username = botInfo.username
})

tgclient.start((ctx) => ctx.replyWithHTML('Welcome!\nThis is a self-hosted TeleBridge instance, for more info, check out the <a href="https://github.com/AntogamerYT/TeleBridge">GitHub Repo</a> (Not public yet)'))
tgclient.on('text', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  let {username, userreply, extraargs} = handleUser(ctx)
  dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`);
})
  
tgclient.on('sticker', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  let {username, userreply, extraargs} = handleUser(ctx)
  let emoji = ctx.message.sticker.emoji;
  let image = ctx.message.sticker.file_id;
  let ext;
   if(ctx.message.sticker.is_video === true) {
  	ext = '.webm'
  } else {
  	ext = '.webp'
  }
  const link = await ctx.telegram.getFileLink(image);
  let filename = link.href.match(/https?:\/\/api\.telegram\.org\/file\/.*\/stickers\/.*\..*/gmi)?.[0]?.replaceAll(/https?:\/\/api\.telegram\.org\/file\/.*\/stickers\//gmi, '')
  filename = filename.replace(/\.tgs$/gmi, '.webp') 
  // madonna ma un po di indenting no? lol no
  const attachment = new MessageAttachment(link.href, filename)
  dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment]}); // si deve usare files aaaaaaa
})

tgclient.on('photo', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  let { username, userreply, extraargs } = handleUser(ctx)
  let atarray = []
  for(let i = 0; i < ctx.message.photo.length; i++) {
    let image = ctx.message.photo[i].file_id;
    let link = await ctx.telegram.getFileLink(image);
    atarray.push(link.href)
  }

  let array2 = []
  let at = new MessageAttachment(atarray[atarray.length-1], `image${atarray[atarray.length-1]}.jpg`)
  array2.push(at)
  let msgcontent;
  switch(ctx.message.caption) {
    case undefined:
      msgcontent = `_No caption_`
      break;
    default:
      msgcontent = ctx.message.caption
      break;
  }
  
  try {
    dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: array2});
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
  
})
tgclient.on('video', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  let { username, userreply, extraargs } = handleUser(ctx)
  
  let msgcontent;
  switch(ctx.message.caption) {
    case undefined:
      msgcontent = `_No caption_`
      break;
    default:
      msgcontent = ctx.message.caption
      break;
  }
  let image = ctx.message.video.file_id;
  let link = await ctx.telegram.getFileLink(image);
  let filename = link.href.match(/https?:\/\/api\.telegram\.org\/file\/.*\/videos\/.*\..*/gmi)?.[0]?.replaceAll(/https?:\/\/api\.telegram\.org\/file\/.*\/videos\//gmi, '')
  const attachment = new MessageAttachment(link.href, filename)
  try {
    dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})
tgclient.on('voice', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  let { username, userreply, extraargs } = handleUser(ctx)
  let msgcontent;
  switch(ctx.message.caption) {
    case undefined:
      msgcontent = `_No caption_`
      break;
    default:
      msgcontent = ctx.message.caption
      break;
  }
  let image = ctx.message.voice.file_id;
  let link = await ctx.telegram.getFileLink(image);
  let filename = link.href.match(/https?:\/\/api\.telegram\.org\/file\/.*\/voice\/.*\..*/gmi)?.[0]?.replaceAll(/https?:\/\/api\.telegram\.org\/file\/.*\/voice\//gmi, '')
  const attachment = new MessageAttachment(link.href, filename)
  try {
    dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})
tgclient.on('document', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  let { username, userreply, extraargs } = handleUser(ctx)
  let msgcontent;
  switch(ctx.message.caption) {
    case undefined:
      msgcontent = `_No caption_`
      break;
    default:
      msgcontent = ctx.message.caption
      break;
  }
  let image = ctx.message.document.file_id;
  let link = await ctx.telegram.getFileLink(image);
  let filename = link.href.match(/https?:\/\/api\.telegram\.org\/file\/.*\/documents\/.*\..*/gmi)?.[0]?.replaceAll(/https?:\/\/api\.telegram\.org\/file\/.*\/documents\//gmi, '')
  const attachment = new MessageAttachment(link.href, filename)
  try {
    dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})



export default tgclient