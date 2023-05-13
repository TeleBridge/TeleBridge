import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { channelPost, editedMessage } from "telegraf/filters"
import { default as dsclient } from './discord.js'
import { AttachmentBuilder, TextChannel } from 'discord.js'
import { escapeChars, handleEditedUser, handleUser } from './setup/main.js'
import { ChatMemberAdministrator } from 'typegram'

const tgclient = new Telegraf(process.env.TGTOKEN)
/*tgclient.telegram.getMe().then((botInfo) => {
  tgclient.options.username = botInfo.username
})*/
tgclient.command('chatinfo', async (ctx) => {
  if (ctx.chat.type == 'private') return ctx.reply('This command can only be used in a group chat.')
  ctx.reply(`Chat ID: ${ctx.chat.id}\nChat Type: ${ctx.chat.type}\nChat Title: ${ctx.chat.title}`)
})

tgclient.command('delete', async (ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  const chatMember = await ctx.getChatMember(ctx.from.id) as ChatMemberAdministrator
  if ((chatMember as any).status !== "creator" && !chatMember.can_delete_messages) return ctx.reply('You need to be an admin and have the permission to delete messages to use this command.')
  if (!ctx.message.reply_to_message) return ctx.reply('Please reply to a message to delete it.')
  const message = ctx.message.reply_to_message.message_id
  const messageid = await global.db.collection("messages").findOne({ telegram: message })
  if (messageid != undefined) {
    tgclient.telegram.deleteMessage(process.env.TGCHATID, message)
    const msg = await (await dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(messageid.discord)
    msg.delete()
    await global.db.collection('messages').deleteOne({ telegram: message })
  } else {
    ctx.reply('Message not found, maybe the bot was restarted?')
  }
  ctx.deleteMessage()
})
tgclient.start((ctx) => ctx.replyWithHTML('Welcome!\nThis is a self-hosted TeleBridge instance, for more info, check out the <a href="https://github.com/AntogamerYT/TeleBridge">GitHub Repo</a>'))
tgclient.on('text', async (ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
  if (ctx.message.reply_to_message) {
    const msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`)
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }
  }
  const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`);
  await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
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


tgclient.on(channelPost("text"), async (ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  if (ctx.channelPost.text === "/delete") {
    const message = ctx.channelPost.message_id
    if (!message) return ctx.reply('Please reply to a message to delete it.')
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
  if (ctx.update.channel_post.reply_to_message) {
    const msgid = await global.db.collection("messages").findOne({ telegram: ctx.update.channel_post.reply_to_message.message_id })
    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply(`**${escapeChars(ctx.update.channel_post.chat.title)}**:\n ${ctx.update.channel_post.text}`)
      await global.db.collection('messages').insertOne({ telegram: ctx.update.channel_post.reply_to_message.message_id, discord: msg.id })
      return;
    }
  }
  const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(ctx.update.channel_post.chat.title)}**:\n ${ctx.update.channel_post.text}`);
  await global.db.collection("messages").insertOne({ telegram: ctx.channelPost.message_id, discord: msg.id })
})

tgclient.on('sticker', async (ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
  let emoji = ctx.message.sticker.emoji;
  let image = ctx.message.sticker.file_id;
  let ext;
  if (ctx.message.sticker.is_video === true) {
    ext = '.webm'
  } else {
    ext = '.webp'
  }
  const link = await ctx.telegram.getFileLink(image);
  let filename = link.href.match(/https?:\/\/api\.telegram\.org\/file\/.*\/stickers\/.*\..*/gmi)?.[0]?.replaceAll(/https?:\/\/api\.telegram\.org\/file\/.*\/stickers\//gmi, '')
  if (filename == undefined) return;
  filename = filename.replace(/\.tgs$/gmi, '.webp')
  const attachment = new AttachmentBuilder(link.href, { name: filename })

  if (ctx.message.reply_to_message) {
    const msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment] })
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }
  }


  const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment] });
  await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
})

tgclient.on('photo', async (ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
  let atarray = []
  for (let i = 0; i < ctx.message.photo.length; i++) {
    let image = ctx.message.photo[i].file_id;
    let link = await ctx.telegram.getFileLink(image);
    atarray.push(link.href)
  }
  ctx.message.message_id
  let array2 = []
  let at = new AttachmentBuilder(atarray[atarray.length - 1], { name: `image${atarray[atarray.length - 1]}.jpg` })
  array2.push(at)
  let msgcontent;
  switch (ctx.message.caption) {
    case undefined:
      msgcontent = `_No caption_`
      break;
    default:
      msgcontent = ctx.message.caption
      break;
  }
  let msgid;
  try {
    if (ctx.message.reply_to_message) {
      msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
    }

    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: array2 })
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: array2 });
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')

    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`)
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }

})
tgclient.on('video', async (ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply

  let msgcontent;
  switch (ctx.message.caption) {
    case undefined:
      msgcontent = `_No caption_`
      break;
    default:
      msgcontent = ctx.message.caption
      break;
  }
  let image = ctx.message.video.file_id;
  let msgid;
  try {
    let link = await ctx.telegram.getFileLink(image);
    let filename = link.href.match(/https?:\/\/api\.telegram\.org\/file\/.*\/videos\/.*\..*/gmi)?.[0]?.replaceAll(/https?:\/\/api\.telegram\.org\/file\/.*\/videos\//gmi, '')
    const attachment = new AttachmentBuilder(link.href, { name: filename })
    if (ctx.message.reply_to_message) {
      msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
    }
    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] })
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] });
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`)
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }
    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })

    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})
tgclient.on('voice', async (ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
  let msgcontent;
  switch (ctx.message.caption) {
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

  let msgid;
  if (ctx.message.reply_to_message) {
    msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
  }

  try {
    const voice = await fetch(link.href).then(res => res.arrayBuffer())

    const attachment = await fetch("https://discord.com/api/v10/channels/" + process.env.DISCORDCHANNELID + "/attachments", {
      method: "POST",
      body: JSON.stringify({
        files: [{
          file_size: voice.byteLength,
          filename: "voice-message.ogg",
          id: 2
        }]
      }),
      headers: {
        "content-type": "application/json",
        "Authorization": "Bot " + dsclient.token
      }
    }).then(res => res.json())

    await fetch(attachment.attachments[0].upload_url, { method: "PUT", body: voice })
    //const waveform = await GenerateBase64Waveform(link.href)

    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      // await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] })
      const res = await fetch("https://discord.com/api/v10/channels/" + process.env.DISCORDCHANNELID + "/messages", {
        method: "POST",
        body: JSON.stringify({
          //content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`,
          attachments: [{
            id: 0,
            filename: "voice-message.ogg",
            "uploaded_filename": attachment.attachments[0].upload_filename,
            "duration_secs": ctx.message.voice.duration,
            waveform: "AB=="//waveform
          }],
          message_reference: {
            message_id: msg.id,
            channel_id: msg.channel.id,
            guild_id: msg.guild.id
          },
          flags: 8192
        }),
        headers: {
          'x-super-properties': 'eyJvcyI6IldpbmRvd3MiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjo5OTk5OTk5fQ==',
          "content-type": "application/json",
          "Authorization": "Bot " + dsclient.token
        }
      }).then(res => res.json())


      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: res.id })
      return;
    }

    //const msg = await (await dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] });
    const res = await fetch("https://discord.com/api/v10/channels/" + process.env.DISCORDCHANNELID + "/messages", {
      method: "POST",
      body: JSON.stringify({
        //content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`,
        attachments: [{
          id: 0,
          filename: "voice-message.ogg",
          "uploaded_filename": attachment.attachments[0].upload_filename,
          "duration_secs": ctx.message.voice.duration,
          waveform: "AB=="//waveform
        }],
        flags: 8192
      }),
      headers: {
        'x-super-properties': 'eyJvcyI6IldpbmRvd3MiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjo5OTk5OTk5fQ==',
        "content-type": "application/json",
        "Authorization": "Bot " + dsclient.token
      }
    }).then(res => res.json())

    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: res.id })
  } catch (error) {

    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`)
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }

    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})
tgclient.on('document', async (ctx) => {
  if (ctx.chat.id != parseInt(process.env.TGCHATID)) return;
  let user = handleUser(ctx)
  if (!user) return;
  let username = user.username
  let extraargs = user.extraargs
  let userreply = user.userreply
  let msgcontent;
  switch (ctx.message.caption) {
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
  let msgid;
  if (ctx.message.reply_to_message) {
    msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
  }

  try {

    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] })
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }

    const msg = await (await dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] });
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
  } catch (error) {
    const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (8MB)</i>')
    if (msgid) {
      const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).messages.fetch(msgid.discord)
      await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`, allowedMentions: { repliedUser: true } })
      await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      return;
    }

    const msg = await (dsclient.channels.cache.get(process.env.DISCORDCHANNELID) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
    }, 5000);
  }
})



export default tgclient
