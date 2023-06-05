import { Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { GenerateBase64Waveform, escapeChars, handleUser } from "../../../setup/main.js";
import { message } from "telegraf/filters";


export const name = "voice";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {
    if (!ctx.has(message("voice"))) return;
    try {
        for (let i = 0; i < global.config.bridges.length; i++) {
            if (global.config.bridges[i].disabled) continue;
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
                    case ctx.message.caption && ctx.message.caption.length >= 2000:
                        msgcontent = `_Caption too long_`
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
                                    message_id: msgid.discord,
                                    channel_id: msg.channel.id,
                                    guild_id: msg.guild.id
                                },
                                allowed_mentions: { repliedUser: false },
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
                        const newmsg = await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`)
                        await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: newmsg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
                        return;
                    }

                    const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n_I couldn\'t send the attachment, sending the message content_\n${msgcontent}`);
                    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
                    setTimeout(() => {
                        ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
                    }, 5000);
                }
            }
        }
    } catch (error) {
        console.log(error)
    }
}