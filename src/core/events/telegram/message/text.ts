import { Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars, handleUser } from "../../../setup/main.js";
import { message } from "telegraf/filters";


export const name = "text";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {
    if(!ctx.has(message("text"))) return;
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
                if (ctx.message.reply_to_message) {
                    const msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
                    if (msgid) {
                        const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
                        const newmsg = await msg.reply(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`)
                        await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: newmsg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
                        return;
                    }
                }
                const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(`**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`);
                await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
            }
        }
    } catch (error) {
        console.log(error)
    }
}