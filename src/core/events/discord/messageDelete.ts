import { Client, Message} from 'discord.js'
import { Telegraf } from 'telegraf'

export const name = 'messageDelete'
export async function execute(dsclient: Client, tgclient: Telegraf, message: Message) {
    if (!message.author) return;
    if (global.config.ignore_bots && message.author.bot && message.author.id !== dsclient?.user?.id) return;

    const messageid = await global.db.collection('messages').findOne({ discord: message.id })

    if (messageid) {
        await tgclient.telegram.deleteMessage(messageid.chatIds.telegram, parseInt(messageid.telegram))
        await global.db.collection('messages').deleteOne({ discord: message.id })
    }
}