import { Client, Message } from 'discord.js'
import { Telegraf } from 'telegraf'
import { escapeHTMLSpecialChars, md2html } from '../../setup/main.js';


export const name = 'messageUpdate'
export async function execute(dsclient: Client, tgclient: Telegraf, oM: Message, nM: Message) {
    if (!oM.author || !nM.author) return;
    if (global.config.ignore_bots && oM.author.bot) return;
    if (oM.author.id === dsclient.user?.id) return;

    const messageid = await global.db.collection('messages').findOne({ discord: oM.id })
    if (messageid) {
        let attachmentarray: string[] = [];
        nM.attachments.forEach(async ({ url }) => {
            attachmentarray.push(url);
        });
        let msgcontent;
        if (nM.cleanContent) msgcontent = md2html(escapeHTMLSpecialChars(nM.cleanContent));
        if (!msgcontent) msgcontent = '';
        const string = attachmentarray.toString().replaceAll(',', ' ')
        await tgclient.telegram.editMessageText(messageid.chatIds.telegram, parseInt(messageid.telegram), undefined, `<b>${nM.author.tag.replace(/#0$/, "")}</b>:\n${msgcontent} ${string}`, { parse_mode: 'HTML' })
    }
}