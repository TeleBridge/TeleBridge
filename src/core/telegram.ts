import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { channelPost, editedMessage, message } from "telegraf/filters"
import { default as dsclient } from './discord.js'
import { AttachmentBuilder, TextChannel } from 'discord.js'
import { GenerateBase64Waveform, escapeChars, handleEditedUser, handleUser } from './setup/main.js'
import { ChatMemberAdministrator } from 'typegram'

const tgclient = new Telegraf(process.env.TGTOKEN)


tgclient.command('chatinfo', async (ctx) => {
  if (ctx.chat.type == 'private') return ctx.reply('This command can only be used in a group chat.')
  ctx.reply(`Chat ID: ${ctx.chat.id}\nChat Type: ${ctx.chat.type}\nChat Title: ${ctx.chat.title}`)
})

tgclient.command('delete', async (ctx) => {
  try {
    const chatMember = await ctx.getChatMember(ctx.from.id) as ChatMemberAdministrator
    if ((chatMember as any).status !== "creator" && !chatMember.can_delete_messages) return ctx.reply('You need to be an admin and have the permission to delete messages to use this command.')
    if (!ctx.message.reply_to_message) return ctx.reply('Please reply to a message to delete it.')
    const message = ctx.message.reply_to_message.message_id
    const messageid = await global.db.collection("messages").findOne({ telegram: message })
    if (messageid != undefined) {
      tgclient.telegram.deleteMessage(messageid.chatIds.telegram, message)
      const msg = await (dsclient.channels.cache.get(messageid.chatIds.discord) as TextChannel).messages.fetch(messageid.discord)
      msg.delete()
      await global.db.collection('messages').deleteOne({ telegram: message })
    } else {
      ctx.reply('Message not found.')
    }
    ctx.deleteMessage()
  } catch (error) {
    console.log(error)
  }
  
})

tgclient.command('bridges', async (ctx) => {
  try {
    let bridges = ''
    for (let i = 0; i < global.config.bridges.length; i++) {
      const bridge = global.config.bridges[i];
      if (bridge.hide && ctx.chat.id !== parseInt(bridge.telegram.chat_id)) continue;
      const discordChannel = dsclient.channels.cache.get(bridge.discord.chat_id);
      const telegramChannel = await tgclient.telegram.getChat(bridge.telegram.chat_id);
      if (telegramChannel.type === "private") return; // Typescript moment
      bridges += `
            <b>${bridge.name}</b>:
                <b>${(discordChannel as TextChannel).name}</b> (${discordChannel?.id}) - <b>${telegramChannel.title}</b> (${telegramChannel.id})\n`
    }
    ctx.replyWithHTML(`<b>Bridges:</b>\n${bridges}\n\nPowered by <a href="https://github.com/TeleBridge/TeleBridge.git">TeleBridge</a>`)
  } catch (error) {
    console.log(error)
  }
  
})

tgclient.command("info", async (ctx) => {
  ctx.replyWithHTML("TeleBridge is a bridge between Telegram and Discord made by <a href=\"https://antogamer.it\">Antogamer</a>\n\nIt doesn\'t have a public instance, so you\'ll have to selfhost it, but don\'t worry! It\'s easy!\n\nCheck me out on <a href=\"https://github.com/TeleBridge/TeleBridge.git\">GitHub</a>")
})

tgclient.start((ctx) => ctx.replyWithHTML('Welcome!\nThis is a self-hosted TeleBridge instance, for more info, check out the <a href="https://github.com/TeleBridge/TeleBridge">GitHub Repo</a>\nFor a list of bridges, run the /bridges command\nFor more infos, check the /info command.'))
tgclient.on(message("text"), async (ctx) => {
  try {
    for (let i = 0; i < global.config.bridges.length; i++) {
      const discordChatId = global.config.bridges[i].discord.chat_id;
      const telegramChatId = global.config.bridges[i].telegram.chat_id;
      if (parseInt(telegramChatId) === ctx.chat.id) {
        let user = handleUser(ctx)
        if (!user) return;
        let username = user.username
        let extraargs = user.extraargs
        let userreply = user.userreply
        if (ctx.message.reply_to_message) {
          const msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
          if (msgid) {
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            const newmsg = await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`)
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: newmsg.id })
            return;
          }
        }
        const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`);
        await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      }
    }
  } catch (error) {
    console.log(error)
  }
  
})

tgclient.on(editedMessage("text"), async (ctx) => {

  try {
    if (!ctx.editedMessage) return;
    for (let i = 0; i < global.config.bridges.length; i++) {
      const discordChatId = global.config.bridges[i].discord.chat_id;
      const telegramChatId = global.config.bridges[i].telegram.chat_id;
      if (parseInt(telegramChatId) === ctx.chat.id) {
        let user = handleEditedUser(ctx)
        if (!user) return;
        let username = user.username
        let extraargs = user.extraargs
        let userreply = user.userreply

        const messageid = await global.db.collection("messages").findOne({ telegram: ctx.editedMessage.message_id })

        if (messageid) {
          const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(messageid.discord)
          await msg.edit(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.editedMessage.text}`)
        }
      }
    }
  } catch (error) {
    console.log(error)
  }
  
})


tgclient.on(channelPost("text"), async (ctx) => {
  try {
    for (let i = 0; i < global.config.bridges.length; i++) {
      const discordChatId = global.config.bridges[i].discord.chat_id;
      const telegramChatId = global.config.bridges[i].telegram.chat_id;
      if (parseInt(telegramChatId) === ctx.chat.id) {
        if (ctx.channelPost.text === "/delete") {
          const message = ctx.channelPost.message_id
          if (!message) return ctx.reply('Please reply to a message to delete it.')
          const messageid = await global.db.collection("messages").findOne({ telegram: message })
          if (messageid != undefined) {
            tgclient.telegram.deleteMessage(telegramChatId, message)
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(messageid.discord)
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
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply(`**${escapeChars(ctx.update.channel_post.chat.title)}**:\n ${ctx.update.channel_post.text}`)
            await global.db.collection('messages').insertOne({ telegram: ctx.update.channel_post.reply_to_message.message_id, discord: msg.id })
            return;
          }
        }
        const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(`**${escapeChars(ctx.update.channel_post.chat.title)}**:\n ${ctx.update.channel_post.text}`);
        await global.db.collection("messages").insertOne({ telegram: ctx.channelPost.message_id, discord: msg.id })
      }
    }
  } catch (error) {
    console.log(error)
  }
  
})

tgclient.on(message("sticker"), async (ctx) => {
  try {
    for (let i = 0; i < global.config.bridges.length; i++) {
      const discordChatId = global.config.bridges[i].discord.chat_id;
      const telegramChatId = global.config.bridges[i].telegram.chat_id;
      if (parseInt(telegramChatId) === ctx.chat.id) {
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
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment] })
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
            return;
          }
        }
  
  
        const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment] });
        await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
      }
    }
  } catch (error) {
    console.log(error)
  }
})

tgclient.on(message("photo"), async (ctx) => {
  try {
    for (let i = 0; i < global.config.bridges.length; i++) {
      const discordChatId = global.config.bridges[i].discord.chat_id;
      const telegramChatId = global.config.bridges[i].telegram.chat_id;
      if (parseInt(telegramChatId) === ctx.chat.id) {
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
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: array2 })
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
            return;
          }
          const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: array2 });
          await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
        } catch (error) {
          const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (25MB)</i>')
  
          if (msgid) {
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`)
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
            return;
          }
          const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
          await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
          setTimeout(() => {
            ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
          }, 5000);
        }
      }
    }
  } catch (error) {
    console.log(error)
  }
})

tgclient.on(message("video"), async (ctx) => {
  try {
    for (let i = 0; i < global.config.bridges.length; i++) {
      const discordChatId = global.config.bridges[i].discord.chat_id;
      const telegramChatId = global.config.bridges[i].telegram.chat_id;
      if (parseInt(telegramChatId) === ctx.chat.id) {
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
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] })
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
            return;
          }
          const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] });
          await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
        } catch (error) {
          const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (25MB)</i>')
          if (msgid) {
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`)
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
            return;
          }
          const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
          await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
  
          setTimeout(() => {
            ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
          }, 5000);
        }
      }
    }
  } catch (error) {
    console.log(error)
  }
})
tgclient.on(message("voice"), async (ctx) => {
  try {
    for (let i = 0; i < global.config.bridges.length; i++) {
      const discordChatId = global.config.bridges[i].discord.chat_id;
      const telegramChatId = global.config.bridges[i].telegram.chat_id;
      if (parseInt(telegramChatId) === ctx.chat.id) {
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
  
          const attachment = await fetch("https://discord.com/api/v10/channels/" + discordChatId + "/attachments", {
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
          const waveform = await GenerateBase64Waveform(link.href)
  
  
          if (msgid) {
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n Voice Message ⬇️` })
            const res = await fetch("https://discord.com/api/v10/channels/" + discordChatId + "/messages", {
              method: "POST",
              body: JSON.stringify({
                attachments: [{
                  id: 0,
                  filename: "voice-message.ogg",
                  "uploaded_filename": attachment.attachments[0].upload_filename,
                  "duration_secs": ctx.message.voice.duration,
                  waveform: waveform
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
  
          (dsclient.channels.cache.get(discordChatId) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n Voice Message ⬇️` })
  
          const res = await fetch("https://discord.com/api/v10/channels/" + discordChatId + "/messages", {
            method: "POST",
            body: JSON.stringify({
              attachments: [{
                id: 0,
                filename: "voice-message.ogg",
                "uploaded_filename": attachment.attachments[0].upload_filename,
                "duration_secs": ctx.message.voice.duration,
                waveform: waveform
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
  
          const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (25MB)</i>')
          if (msgid) {
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`)
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
            return;
          }
  
          const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
          await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
          setTimeout(() => {
            ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
          }, 5000);
        }
      }
    }
  } catch (error) {
    console.log(error)
  }
})
tgclient.on(message("document"), async (ctx) => {
  try {
    for (let i = 0; i < global.config.bridges.length; i++) {
      const discordChatId = global.config.bridges[i].discord.chat_id;
      const telegramChatId = global.config.bridges[i].telegram.chat_id;
      if (parseInt(telegramChatId) === ctx.chat.id) {
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
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] })
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
            return;
          }
  
          const msg = await (await dsclient.channels.cache.get(discordChatId) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] });
          await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
        } catch (error) {
          const message = await ctx.replyWithHTML('<i>Error: the file couldn\'t be processed because it exceeds Discord\'s maximum file size (25MB)</i>')
          if (msgid) {
            const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
            await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`, allowedMentions: { repliedUser: true } })
            await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
            return;
          }
  
          const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
          await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id })
          setTimeout(() => {
            ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
          }, 5000);
        }
      }
    }
  } catch (error) {
    console.log(error)
  }
})

export default tgclient