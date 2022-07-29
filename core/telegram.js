import 'dotenv/config'
import { Telegraf } from 'telegraf'
import {default as dsclient } from './discord.js'
import { MessageAttachment } from 'discord.js'
import { escapeChars, handleUser } from './setup/main.js'

const tgclient = new Telegraf(process.env.TGTOKEN, {username: process.env.tgusername, channelMode: true})
tgclient.telegram.getMe().then((botInfo) => {
  tgclient.options.username = botInfo.username
})
tgclient.command('chatinfo', async(ctx) => {
  ctx.reply(`Chat ID: ${ctx.chat.id}\nChat Type: ${ctx.chat.type}\nChat Title: ${ctx.chat.title}`)
})
tgclient.command('delete', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  const message = ctx.message.reply_to_message.message_id
  if(!message) return ctx.reply('Please reply to a message to delete it.')
  const messageid = global.messages[message]
  if (messageid != undefined) {
    tgclient.telegram.deleteMessage(process.env.tgchatid, message)
    const msg = await dsclient.channels.cache.get(process.env.discordchannelid).messages.fetch(messageid, {force: true})
    msg.delete()
    delete global.messages[messageid]
  } else {
    ctx.reply('Message not found, maybe the bot was restarted?')
  }
  ctx.deleteMessage()
})
tgclient.start((ctx) => ctx.replyWithHTML('Welcome!\nThis is a self-hosted TeleBridge instance, for more info, check out the <a href="https://github.com/AntogamerYT/TeleBridge">GitHub Repo</a>'))
tgclient.on('text', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  let {username, userreply, extraargs} = handleUser(ctx)
  const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`);
  global.messages[ctx.message.message_id] = msg.id
})

tgclient.on('channel_post', async(ctx) => {
  if (ctx.chat.id != process.env.tgchatid) return;
  if (ctx.update.channel_post.text == "/delete") {
    const message = ctx.channelPost.reply_to_message.message_id
    if(!message) return ctx.reply('Please reply to a message to delete it.')
    const messageid = global.messages[message]
    if (messageid != undefined) {
      tgclient.telegram.deleteMessage(process.env.tgchatid, message)
      const msg = await dsclient.channels.cache.get(process.env.discordchannelid).messages.fetch(messageid, {force: true})
      msg.delete()
      delete global.messages[messageid]
    } else {
      ctx.reply('Message not found, maybe the bot was restarted?')
    }
    ctx.deleteMessage()
    return;
  }
  const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(ctx.update.channel_post.chat.title)}**:\n ${ctx.update.channel_post.text}`);
  global.messages[ctx.channelPost.message_id] = msg.id
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
  const attachment = new MessageAttachment(link.href, filename)
  const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment]});
  global.messages[ctx.message.message_id] = msg.id 
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
  ctx.message.message_id
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
    const msg = dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: array2});
    // add msg.id with ctx.message.message_id to global.messages (Object)
    global.messages[ctx.message.message_id] = msg.id
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    const msg = dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
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
    const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
    global.messages[ctx.message.message_id] = msg.id 
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    global.messages[ctx.message.message_id] = msg.id 
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
    const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
    global.messages[ctx.message.message_id] = msg.id 
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    global.messages[ctx.message.message_id] = msg.id 
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
    const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
    global.messages[ctx.message.message_id] = msg.id 
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    const msg = await dsclient.channels.cache.get(process.env.discordchannelid).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    global.messages[ctx.message.message_id] = msg.id 
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})



export default tgclient