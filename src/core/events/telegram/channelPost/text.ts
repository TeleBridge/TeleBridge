import { APIActionRowComponent, APIBan, APIButtonComponent, Client, TextChannel } from "discord.js";
import { Context, Telegraf, } from "telegraf";
import { escapeChars } from "../../../setup/main.js";
import { channelPost } from "telegraf/filters";
import { toMarkdownV2 } from "@telebridge/entity";
import { MessageEntity } from "typegram";


export const name = "text";
export async function execute(tgclient: Telegraf, dsclient: Client, ctx: Context) {
    if (!ctx.has(channelPost("text"))) return;
    try {
        for (let i = 0; i < global.config.bridges.length; i++) {
            if (global.config.bridges[i].disabled) continue;
            const discordChatId = global.config.bridges[i].discord.chat_id;
            const telegramChatId = global.config.bridges[i].telegram.chat_id;
            if (parseInt(telegramChatId) === ctx.chat.id) {
                let messageOptions: any = {
                    content: `**${escapeChars(ctx.update.channel_post.chat.title)}**:\n ${toMarkdownV2({ text: ctx.channelPost.text, entities: ctx.channelPost.entities as MessageEntity[] || [] })}`
                }
                const buttons: APIActionRowComponent<APIButtonComponent> = {
                    type: 1,
                    components: []
                }
                if (ctx.channelPost.reply_markup?.inline_keyboard) {
                    for (let btn of ctx.channelPost.reply_markup.inline_keyboard[0].filter((k: any) => k.url)) {
                        buttons.components.push({
                            type: 2,
                            style: 5,
                            url: (btn as any).url,
                            label: btn.text
                        })
                    }
                    messageOptions = {
                        ...messageOptions,
                        components: [buttons as APIActionRowComponent<APIButtonComponent>]
                    }
                }
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
                
                if (ctx.channelPost.text.length >= 2000) {
                    const message = await ctx.replyWithHTML('<i>Error: the message couldn\'t be processed because it exceeds Discord\'s maximum character limit (2000)</i>')
                    setTimeout(() => {
                        ctx.deleteMessage(message.message_id)
                    }, 3000);
                    return;
                }

                if (ctx.update.channel_post.reply_to_message) {
                    const msgid = await global.db.collection("messages").findOne({ telegram: ctx.update.channel_post.reply_to_message.message_id })
                    if (msgid) {
                        const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msgid.discord)
                        const newmsg = await msg.reply(messageOptions)
                        await global.db.collection('messages').insertOne({ telegram: ctx.update.channel_post.reply_to_message.message_id, discord: newmsg.id })
                        return;
                    }
                }
                const msg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).send(messageOptions);
                await global.db.collection("messages").insertOne({ telegram: ctx.channelPost.message_id, discord: msg.id })
            }
        }
    } catch (error) {
        console.log(error)
    }
}