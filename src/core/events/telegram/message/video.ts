import { AttachmentBuilder, Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars, handleUser } from "../../../setup/main.js";
import { message } from "telegraf/filters";


export const name = "video";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {
    if (!ctx.has(message("video"))) return;
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
                        const newmsg = await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] })
                        await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: newmsg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
                        return;
                    }
                    const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${msgcontent}`, files: [attachment] });
                    await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
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