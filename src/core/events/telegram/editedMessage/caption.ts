import { Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars, handleEditedUser } from "../../../setup/main.js";
import { editedMessage } from "telegraf/filters";


export const name = "caption";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {
    if (!ctx.has(editedMessage("caption"))) return;
    try {
        if (!ctx.editedMessage) return;
        for (let i = 0; i < global.config.bridges.length; i++) {
            if (global.config.bridges[i].disabled) continue;
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
                    if (ctx.editedMessage.caption.length >= 2000) {
                        const msgId = await ctx.telegram.sendMessage(ctx.chat.id, `<i>The caption is too long to be sent due to Discord's limits (2000 characters)`, { parse_mode: "HTML", reply_to_message_id: ctx.editedMessage.message_id })
                        setTimeout(() => {
                            ctx.telegram.deleteMessage(ctx.chat.id, msgId.message_id)
                        }, 3000);
                        return
                    } 
                    const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(messageid.discord)
                    await msg.edit({ content: `**${escapeChars(username)}** ${extraargs}:\n ${ctx.editedMessage.caption}` })
                }
            }
        }
    } catch (error) {
        console.log(error)
    }
}