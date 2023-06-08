import { Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars } from "../../../setup/main.js";
import { editedChannelPost } from "telegraf/filters";
import { toMarkdownV2 } from "@telebridge/entity";


export const name = "text";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {
    if (!ctx.has(editedChannelPost("text"))) return;
    try {
        if (!ctx.editedChannelPost) return;
        for (let i = 0; i < global.config.bridges.length; i++) {
            if (global.config.bridges[i].disabled) continue;
            const discordChatId = global.config.bridges[i].discord.chat_id;
            const telegramChatId = global.config.bridges[i].telegram.chat_id;
            if (parseInt(telegramChatId) === ctx.chat.id) {
                if (ctx.editedChannelPost.text.length >= 2000) {
                    const msgId = await ctx.telegram.sendMessage(ctx.chat.id, `<i>The text is too long to be sent due to Discord's limits (2000 characters)`, { parse_mode: "HTML", reply_to_message_id: ctx.editedChannelPost.message_id })
                    setTimeout(() => {
                        ctx.telegram.deleteMessage(ctx.chat.id, msgId.message_id)
                    }, 3000);
                    return;
                } 
                const messageid = await global.db.collection("messages").findOne({ telegram: ctx.editedChannelPost.message_id })
                if (messageid) {
                    const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(messageid.discord)
                    await msg.edit(`**${escapeChars(ctx.update.edited_channel_post.chat.title)}**:\n ${toMarkdownV2(ctx.editedChannelPost)}`)
                }
            }
        }
    } catch (error) {
        console.log(error)
    }
}