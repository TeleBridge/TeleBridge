import { AttachmentBuilder, Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars, handleEditedUser } from "../../../setup/main.js";
import { editedMessage } from "telegraf/filters";

export const name = "voice";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {

    if (!ctx.has(editedMessage("voice"))) return;
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
                    const video = ctx.editedMessage.voice
                    const attachment = new AttachmentBuilder((await ctx.telegram.getFileLink(video.file_id)).href, { name: video.file_id + ".ogg" })
                    await msg.edit({ content: `**${escapeChars(username)}** ${extraargs}:\n ${ctx.editedMessage.caption}`, files: [attachment] })
                }
            }
        }
    } catch (error) {
        console.log(error)
    }
}