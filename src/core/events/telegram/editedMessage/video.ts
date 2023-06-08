import { AttachmentBuilder, Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars, handleEditedUser } from "../../../setup/main.js";
import { editedMessage } from "telegraf/filters";
import { toMarkdownV2 } from "@telebridge/entity";

export const name = "video";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {

    if (!ctx.has(editedMessage("video"))) return;
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
                    const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(messageid.discord)
                    const video = ctx.editedMessage.video
                    const attachment = new AttachmentBuilder((await ctx.telegram.getFileLink(video.file_id)).href, { name: video.file_name })
                    await msg.edit({ content: `**${escapeChars(username)}** ${extraargs}:\n ${toMarkdownV2(ctx.editedMessage)}`, files: [attachment] })
                }
            }
        }
    } catch (error) {
        console.log(error)
    }
}