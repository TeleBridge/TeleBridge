import { AttachmentBuilder, Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars, handleUser } from "../../../setup/main.js";
import { message } from "telegraf/filters";


export const name = "sticker";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {
    if (!ctx.has(message("sticker"))) return;
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
                        const newmsg = await msg.reply({ content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment] })
                        await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: newmsg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
                        return;
                    }
                }


                const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send({ content: `**${escapeChars(username)}** ${extraargs}:\n ${emoji}`, files: [attachment] });
                await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
            }
        }
    } catch (error) {
        console.log(error)
    }
}