import 'dotenv/config'
import { Telegraf } from 'telegraf'
import {channelPost, editedMessage, message} from "telegraf/filters"
import {default as dsclient } from './discord.js'
import { AttachmentBuilder, TextChannel } from 'discord.js'
import { escapeChars, handleEditedUser, handleUser } from './setup/main.js'

const tgclient = new Telegraf(process.env.TGTOKEN)
/*tgclient.telegram.getMe().then((botInfo) => {
  tgclient.options.username = botInfo.username
})*/
tgclient.command('chatinfo', async (ctx) => {
  if (ctx.chat.type == 'private') return ctx.reply('This command can only be used in a group chat.')
  ctx.reply(`Chat ID: ${ctx.chat.id}\nChat Type: ${ctx.chat.type}\nChat Title: ${ctx.chat.title}`)
})
tgclient.command('delete', async(ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  if ((await ctx.getChatMember(ctx.from.id)).status !== 'creator' && (await ctx.getChatMember(ctx.from.id)).status !== 'administrator') return ctx.reply('You need to be an admin to use this command.')
  if(!ctx.message.reply_to_message) return ctx.reply('Please reply to a message to delete it.')
  const message = ctx.message.reply_to_message.message_id
  const messageid = await global.db.collection("messages").findOne({telegram: message})
  if (messageid != undefined) {
    tgclient.telegram.deleteMessage(process.env.TGCHATID, message)
    const msg = await (await dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(messageid.discord)
    msg.delete()
    await global.db.collection('messages').deleteOne({telegram: message})
  } else {
    ctx.reply('Message not found, maybe the bot was restarted?')
  }
  ctx.deleteMessage()
})
tgclient.start((ctx) => ctx.replyWithHTML('Welcome!\nThis is a self-hosted TeleBridge instance, for more info, check out the <a href="https://github.com/AntogamerYT/TeleBridge">GitHub Repo</a>'))
tgclient.on('text', async(ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  // get user id
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
  const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`);
  await global.db.collection('messages').insertOne({telegram: ctx.message.message_id, discord: msg.id})
})

tgclient.on(editedMessage("text"), async (ctx) => {
  if (ctx.chat.id !== parseInt(process.env.TGCHATID)) return;
  if (!ctx.editedMessage) return;
  let user = handleEditedUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply

  const messageid = await global.db.collection("messages").findOne({ telegram: ctx.editedMessage.message_id })

  if (messageid) {
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(messageid.discord)
    await msg.edit(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.editedMessage.text}`)
  }
})


tgclient.on(channelPost("text"), async(ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  if (ctx.channelPost.text === "/delete") {
    const message = ctx.channelPost.message_id
    if(!message) return ctx.reply('Please reply to a message to delete it.')
    const messageid = await global.db.collection("messages").findOne({ telegram: message })
    if (messageid != undefined) {
      tgclient.telegram.deleteMessage(process.env.TGCHATID, message)
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(messageid.discord)
      msg.delete()
      await global.db.collection('messages').deleteOne({ telegram: message })
    } else {
      ctx.reply('Message not found')
    }
    ctx.deleteMessage()
    return;
  }
  const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(ctx.update.channel_post.chat.title)}**:\n ${ctx.update.channel_post.text}`);
  await global.db.collection("messages").insertOne({ telegram: ctx.channelPost.message_id, discord: msg.id })
})

tgclient.on('sticker', async(ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
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
  if (filename == undefined) return;
  filename = filename.replace(/\.tgs$/gmi, '.webp') 
  const attachment = new AttachmentBuilder(link.href, { name: filename })
  const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment]});
  await global.db.collection('messages').insertOne({telegram: ctx.message.message_id, discord: msg.id})
})

tgclient.on('photo', async(ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
  let atarray = []
  for(let i = 0; i < ctx.message.photo.length; i++) {
    let image = ctx.message.photo[i].file_id;
    let link = await ctx.telegram.getFileLink(image);
    atarray.push(link.href)
  }
  ctx.message.message_id
  let array2 = []
  let at = new AttachmentBuilder(atarray[atarray.length - 1], { name: `image${atarray[atarray.length - 1]}.jpg` })
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
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID)as TextChannel).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: array2});
    await global.db.collection('messages').insertOne({telegram: ctx.message.message_id, discord: msg.id})
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID)as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
  
})
tgclient.on('video', async(ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
  
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
  const attachment = new AttachmentBuilder(link.href, { name: filename })
  try {
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    await global.db.collection('messages').insertOne({telegram: ctx.message.message_id, discord: msg.id})

    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})
tgclient.on('voice', async(ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
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
  const attachment = new AttachmentBuilder(link.href, { name: filename })
  try {
    const msg = await (await dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})
tgclient.on('document', async(ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
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
  const attachment = new AttachmentBuilder(link.href, { name: filename })
  try {
    const msg = await (await dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}` ,files: [attachment]});
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})



export default tgclient
