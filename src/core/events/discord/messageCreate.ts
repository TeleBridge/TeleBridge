import { Client, Message, StickerFormatType } from 'discord.js'
import { Telegraf } from 'telegraf'
import jimp from 'jimp'
import { escapeHTMLSpecialChars, replaceEmojis, md2html } from '../../setup/main.js';


export const name = 'messageCreate'
export async function execute(dsclient: Client, tgclient: Telegraf, message: Message) {
    if (global.config.ignore_bots && message.author.bot) return;
    if (message.author.id === dsclient.user?.id) return;


    for (let i = 0; i < global.config.bridges.length; i++) {
        const discordChatId = global.config.bridges[i].discord.chat_id;
        const telegramChatId = global.config.bridges[i].telegram.chat_id;
        if (message.channel.id === discordChatId) {
            let attachmentarray: string[] = [];
            let authorTag = message.author.tag.replace(/#0$/, "")
            message.attachments.forEach(async ({ url }) => {
                attachmentarray.push(url);
            });
            let msgcontent: string;
            if (message.cleanContent) { msgcontent = md2html(escapeHTMLSpecialChars(replaceEmojis(message.cleanContent))); } else { msgcontent = ''; }

            if (message.stickers.size > 0 && !message.reference) {
                const sticker = message.stickers.first();
                if (sticker?.format === StickerFormatType.Lottie || sticker?.format === StickerFormatType.APNG) {
                    const msg = await tgclient.telegram.sendMessage(telegramChatId, `<b>${authorTag}</b>:\n<i>Lottie/APNG stickers are currently not supported, sending the message content</i>\n${msgcontent}`, { parse_mode: 'HTML' })
                    await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                    return;
                }
                const stickerurl = sticker?.url ?? '';

                const image = await jimp.read(stickerurl)

                const buffer = await image.resize(512, 512).getBufferAsync(jimp.MIME_PNG)

                await tgclient.telegram.sendMessage(telegramChatId, `<b>${authorTag}</b>:\n${msgcontent}\nSticker⬇️`, { parse_mode: 'HTML' })
                const msg = await tgclient.telegram.sendSticker(telegramChatId, { source: buffer })
                await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                return;
            }
            const attachmentURLs = attachmentarray.toString().replaceAll(',', ' ')
            if (message.reference) {
                const msgid = await global.db.collection('messages').findOne({ discord: message.reference.messageId })
                if (msgid) {
                    if (message.stickers.size > 0) {

                        const sticker = message.stickers.first();
                        const stickerurl = sticker?.url ?? '';
                        const image = await jimp.read(stickerurl)

                        if (sticker?.format === StickerFormatType.Lottie || sticker?.format === StickerFormatType.APNG) {
                            const msg = await tgclient.telegram.sendMessage(telegramChatId, `<b>${authorTag}</b>:\n<i>Lottie/APNG stickers are currently not supported, sending the message content</i>\n${msgcontent}`, { reply_to_message_id: parseInt(msgid.telegram), parse_mode: 'HTML' })
                            await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                            return;
                        }


                        const buffer = await image.resize(512, 512).getBufferAsync(jimp.MIME_PNG)
                        await tgclient.telegram.sendMessage(telegramChatId, `<b>${authorTag}</b>:\n${msgcontent}`, { reply_to_message_id: parseInt(msgid.telegram), parse_mode: 'HTML' })
                        const msg = await tgclient.telegram.sendSticker(telegramChatId, { source: buffer }, { reply_to_message_id: parseInt(msgid.telegram) })
                        await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                        return;
                    }
                    if (message.flags.toArray().includes("IsVoiceMessage")) {
                        const msg = await tgclient.telegram.sendVoice(telegramChatId, message.attachments.first()?.url ?? '', { reply_to_message_id: parseInt(msgid.telegram), caption: `<b>${authorTag}</b>:\n${msgcontent}`, parse_mode: 'HTML' })
                        await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                        return;
                    }
                    const msg = await tgclient.telegram.sendMessage(telegramChatId, `<b>${authorTag}</b>:\n${msgcontent} ${attachmentURLs}`, { parse_mode: 'HTML', reply_to_message_id: parseInt(msgid.telegram) })
                    await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                    return;
                }
            }

            if (message.flags.toArray().includes("IsVoiceMessage")) {
                const msg = await tgclient.telegram.sendVoice(telegramChatId, message.attachments.first()?.url ?? '', { caption: `<b>${authorTag}</b>:\n${msgcontent}`, parse_mode: 'HTML' })
                await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                return;
            }

            const msg = await tgclient.telegram.sendMessage(telegramChatId, `<b>${authorTag}</b>:\n${msgcontent} ${attachmentURLs}`, { parse_mode: 'HTML' })
            await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } });
        }
    }
    if (message.content.startsWith("!")) {
        const command = message.content.split(" ")[0].replace("!", "")
        const args = message.content.split(" ").slice(1)
        const cmd = dsclient.msgCommands.get(command);
        if (!cmd) return;
        await cmd.msgExecute(dsclient, message, args)
    }
}