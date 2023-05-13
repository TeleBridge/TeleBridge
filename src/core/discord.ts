import Discord, { APIEmbed, ActivityType, Routes, TextChannel } from 'discord.js';
import { default as tgclient } from './telegram.js'
import 'dotenv/config'
import md2html from './setup/md2html.js';

const dsclient = new Discord.Client({ intents: 33281, allowedMentions: { repliedUser: false } });

dsclient.on('ready', () => {
    console.log(`Logged in as ${dsclient.user?.tag}`);

    dsclient.user?.setActivity({
        name: 'Messages from Telegram and Discord with TeleBridge! | /info',
        type: ActivityType.Watching
    })

    dsclient.rest.put(
        Routes.applicationCommands(dsclient?.user?.id!),
        { body: [{ name: 'bridges', description: 'List of bridges' }, { name: "info", description: "Infos about me" }] }
    )
})

dsclient.on('interactionCreate', async (interaction) => {
    let embedString: string = '';
    if (!interaction.isCommand()) return;
    if (interaction.commandName === 'bridges') {
        await interaction.deferReply({ ephemeral: true });

        for (let i = 0; i < global.config.bridges.length; i++) {
            const discordChatId = global.config.bridges[i].discord.chat_id;
            const telegramChatId = global.config.bridges[i].telegram.chat_id;
            if (global.config.bridges[i].hide && (dsclient.channels.cache.get(global.config.bridges[i].discord.chat_id) as TextChannel).guildId !== interaction.guildId) continue;
            const bridgeName = global.config.bridges[i].name;
            const discordChannel = await dsclient.channels.fetch(discordChatId);
            const telegramChannel = await tgclient.telegram.getChat(telegramChatId);
            if (telegramChannel.type === "private") return; // Typescript moment
            embedString += `
            **${bridgeName}**:
                **${(discordChannel as TextChannel).name}** (${discordChatId}) - **${telegramChannel.title}** ${telegramChatId}\n
            `
        }

        const embed: APIEmbed = {
            title: 'Bridges',
            description: embedString + '\n\nPowered by [TeleBridge](https://github.com/AntogamerYT/TeleBridge.git)',
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'TeleBridge',
            }
        }

        await interaction.editReply({ embeds: [embed] })
    }

    if (interaction.commandName === 'info') {

        const embed: APIEmbed = {
            title: 'Info',
            description: 'TeleBridge is a bridge between Telegram and Discord made by [Antogamer](https://antogamer.it)\n\nIt doesn\'t have a public instance, so you\'ll have to selfhost it, but don\'t worry! It\'s easy!\n\nCheck me out on [GitHub](https://github.com/AntogamerYT/TeleBridge.git)',
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'TeleBridge',
            }
        }

        await interaction.reply({ embeds: [embed], ephemeral: true })
    }
})

dsclient.on('messageCreate', async (message) => {
    if (process.env.IGNOREBOTS === 'true' && message.author.bot) return;
    if (message.author.id === dsclient.user?.id) return;

    for (let i = 0; i < global.config.bridges.length; i++) {
        const discordChatId = global.config.bridges[i].discord.chat_id;
        const telegramChatId = global.config.bridges[i].telegram.chat_id;
        if (message.channel.id === discordChatId) {
            let attachmentarray: string[] = [];
            message.attachments.forEach(async ({ url }) => {
                attachmentarray.push(url);
            });
            let msgcontent: string;
            if (message.cleanContent) { msgcontent = md2html(message.cleanContent); } else { msgcontent = ''; }
            if (message.stickers.size > 0) message.stickers.forEach(s => msgcontent += ' ' + s.url);
            const string = attachmentarray.toString().replaceAll(',', ' ')
            if (message.reference) {
                const msgid = await global.db.collection('messages').findOne({ discord: message.reference.messageId })
                if (msgid) {
                    if (message.flags.toArray().includes("IsVoiceMessage")) {
                        const msg = await tgclient.telegram.sendVoice(telegramChatId, message.attachments.first()?.url ?? '', { reply_to_message_id: parseInt(msgid.telegram), caption: `<b>${message.author.tag}</b>:\n${msgcontent}`, parse_mode: 'HTML' })
                        await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                        return;
                    }
                    const msg = await tgclient.telegram.sendMessage(telegramChatId, `<b>${message.author.tag}</b>:\n${msgcontent} ${string}`, { parse_mode: 'HTML', reply_to_message_id: parseInt(msgid.telegram) })
                    await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                    return;
                }
            }

            if (message.flags.toArray().includes("IsVoiceMessage")) {
                const msg = await tgclient.telegram.sendVoice(telegramChatId, message.attachments.first()?.url ?? '', { caption: `<b>${message.author.tag}</b>:\n${msgcontent}`, parse_mode: 'HTML' })
                await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                return;
            }

            const msg = await tgclient.telegram.sendMessage(telegramChatId, `<b>${message.author.tag}</b>:\n${msgcontent} ${string}`, { parse_mode: 'HTML' })
            await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } });
        }
    }

})

dsclient.on('messageDelete', async (message) => {
    if (!message.author) return;
    if (message.author.id === dsclient?.user?.id) return;
    if (process.env.IGNOREBOTS === 'true' && message.author.bot) return;

    const messageid = await global.db.collection('messages').findOne({ discord: message.id })

    if (messageid) {
        await tgclient.telegram.deleteMessage(messageid.chatIds.telegram, parseInt(messageid.telegram))
        await global.db.collection('messages').deleteOne({ discord: message.id })
    }
})

dsclient.on("messageUpdate", async (oM, nM) => {
    if (!oM.author || !nM.author) return;
    if (process.env.IGNOREBOTS === 'true' && oM.author.bot) return;
    if (oM.author.id === dsclient.user?.id) return;

    const messageid = await global.db.collection('messages').findOne({ discord: oM.id })
    if (messageid) {
        let attachmentarray: string[] = [];
        nM.attachments.forEach(async ({ url }) => {
            attachmentarray.push(url);
        });
        let msgcontent;
        if (nM.cleanContent) msgcontent = md2html(nM.cleanContent);
        if (!msgcontent) msgcontent = '';
        const string = attachmentarray.toString().replaceAll(',', ' ')
        await tgclient.telegram.editMessageText(messageid.chatIds.telegram, parseInt(messageid.telegram), undefined, `<b>${nM.author.tag}</b>:\n${msgcontent} ${string}`, { parse_mode: 'HTML' })
    }
})

export default dsclient;