import { APIActionRowComponent, APIButtonComponent, Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars, getButtons, handleUser } from "../../../setup/main.js";
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
                if (ctx.message.text.length >= 2000) {
                    const message = await ctx.replyWithHTML('<i>Error: the message couldn\'t be processed because it exceeds Discord\'s maximum character limit (2000)</i>')
                    setTimeout(() => {
                        ctx.deleteMessage(message.message_id)
                    }
                        , 3000);
                    return;
                }
                let user = handleUser(ctx)
                if (!user) return;
                let username = user.username
                let extraargs = user.extraargs
                let userreply = user.userreply
                let messageOptions: any = {
                    content: `**${escapeChars(username)}** ${extraargs}:\n ${ctx.message.text}`
                }
                let buttons;
                if (ctx.message.reply_markup) {
                    buttons = getButtons(ctx)
                    messageOptions = {
                        ...messageOptions,
                        components: [buttons as APIActionRowComponent<APIButtonComponent>]
                    }
                }

                if (ctx.message.reply_to_message) {
                    const msgid = await global.db.collection("messages").findOne({ telegram: ctx.message.reply_to_message.message_id })
                    if (msgid) {
                        const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
                        const newmsg = await msg.reply(messageOptions)
                        await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: newmsg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
                        return;
                    }
                }
                const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(messageOptions);
                await global.db.collection('messages').insertOne({ telegram: ctx.message.message_id, discord: msg.id, chatIds: { discord: discordChatId, telegram: telegramChatId } })
            }
        }
    } catch (error) {
        console.log(error)
    }
}