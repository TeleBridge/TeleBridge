import Discord from 'discord.js';
import { default as tgclient } from './telegram.js';
import 'dotenv/config';
import md2html from './setup/md2html.js';
const dsclient = new Discord.Client({ intents: 33281, allowedMentions: { repliedUser: false } });
dsclient.on('ready', () => {
    dsclient.channels.cache.get(process.env.DISCORDCHANNELID).send('Discord Client ready and logged in as ' + dsclient?.user?.tag + '.');
});
dsclient.on('messageCreate', async (message) => {
    if (process.env.IGNOREBOTS === 'true' && message.author.bot)
        return;
    if (message.author.id === dsclient.user?.id)
        return;
    if (message.channel.id !== process.env.DISCORDCHANNELID)
        return;
    let attachmentarray = [];
    message.attachments.forEach(async ({ url }) => {
        attachmentarray.push(url);
    });
    let msgcontent;
    if (message.cleanContent) {
        msgcontent = md2html(message.cleanContent);
    }
    else {
        msgcontent = '';
    }
    if (message.stickers.size > 0)
        message.stickers.forEach(s => msgcontent += ' ' + s.url);
    const string = attachmentarray.toString().replaceAll(',', ' ');
    if (message.reference) {
        const msgid = await global.db.collection('messages').findOne({ discord: message.reference.messageId });
        if (msgid) {
            // check if message contains the 8192 flag (voice message)
            if (message.flags.toArray().includes("IsVoiceMessage")) {
                const msg = await tgclient.telegram.sendVoice(process.env.TGCHATID, message.attachments.first()?.url ?? '', { reply_to_message_id: parseInt(msgid.telegram), caption: `<b>${message.author.tag}</b>:\n${msgcontent}`, parse_mode: 'HTML' });
                await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id });
                return;
            }
            const msg = await tgclient.telegram.sendMessage(process.env.TGCHATID, `<b>${message.author.tag}</b>:\n${msgcontent} ${string}`, { parse_mode: 'HTML', reply_to_message_id: parseInt(msgid.telegram) });
            await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id });
            return;
        }
    }
    if (message.flags.toArray().includes("IsVoiceMessage")) {
        const msg = await tgclient.telegram.sendVoice(process.env.TGCHATID, message.attachments.first()?.url ?? '', { caption: `<b>${message.author.tag}</b>:\n${msgcontent}`, parse_mode: 'HTML' });
        await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id });
        return;
    }
    const msg = await tgclient.telegram.sendMessage(process.env.TGCHATID, `<b>${message.author.tag}</b>:\n${msgcontent} ${string}`, { parse_mode: 'HTML' });
    await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id });
});
dsclient.on('messageDelete', async (message) => {
    if (!message.author)
        return;
    if (message.author.id === dsclient?.user?.id)
        return;
    if (process.env.IGNOREBOTS === 'true' && message.author.bot)
        return;
    if (message.channel.id !== process.env.DISCORDCHANNELID)
        return;
    const messageid = await global.db.collection('messages').findOne({ discord: message.id });
    if (messageid) {
        await tgclient.telegram.deleteMessage(process.env.TGCHATID, parseInt(messageid.telegram));
        await global.db.collection('messages').deleteOne({ discord: message.id });
    }
});
dsclient.on("messageUpdate", async (oM, nM) => {
    if (!oM.author || !nM.author)
        return;
    if (process.env.IGNOREBOTS === 'true' && oM.author.bot)
        return;
    if (oM.author.id === dsclient.user?.id)
        return;
    if (oM.channel.id !== process.env.DISCORDCHANNELID)
        return;
    const messageid = await global.db.collection('messages').findOne({ discord: oM.id });
    if (messageid) {
        let attachmentarray = [];
        nM.attachments.forEach(async ({ url }) => {
            attachmentarray.push(url);
        });
        let msgcontent;
        if (nM.cleanContent)
            msgcontent = md2html(nM.cleanContent);
        if (!msgcontent)
            msgcontent = '';
        const string = attachmentarray.toString().replaceAll(',', ' ');
        await tgclient.telegram.editMessageText(process.env.TGCHATID, parseInt(messageid.telegram), undefined, `<b>${nM.author.tag}</b>:\n${msgcontent} ${string}`, { parse_mode: 'HTML' });
    }
});
export default dsclient;
