import { APIEmbed, ActivityType, Routes, StickerFormatType, TextChannel, GatewayIntentBits, Client, Partials, APIApplicationCommand, Collection, ChatInputCommandInteraction, CacheType, Interaction, ApplicationCommandOption, ApplicationCommandType } from 'discord.js';
import { default as tgclient } from './telegram.js'
import 'dotenv/config'
import jimp from 'jimp'
import md2html from './setup/md2html.js';
import { escapeHTMLSpecialChars, validateChannels } from './setup/main.js';
import fs from 'fs'

const dsclient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    allowedMentions: { repliedUser: false },
    partials: [ Partials.Channel ]
});

dsclient.commands = new Collection()


dsclient.on('ready', async () => {
    const commandFiles = fs.readdirSync(`${process.cwd()}/dist/core/commands/discord`).filter(file => file.endsWith('.js'));

    let commandsArray: any[] = [];
    for (const file of commandFiles) {
        const command: Command = await import(`${process.cwd()}/dist/core/commands/discord/${file}`);
        commandsArray.push({
            name: command.name,
            description: command.description,
            options: command.options || [],
            dm_permission: command.dm_permission || true
        })
        dsclient.commands.set(command.name, command);
    }
    console.log(`Logged in as ${dsclient.user?.tag}`);
    await validateChannels()

    dsclient.user?.setActivity({
        name: 'Messages from Telegram and Discord with TeleBridge! | /info',
        type: ActivityType.Watching
    })

    dsclient.rest.put(
        Routes.applicationCommands(dsclient?.user?.id!),
        {
            body: commandsArray
        }
    )
})

dsclient.on('interactionCreate', async (interaction) => {

    if (!interaction.isCommand()) return;

    const command = dsclient.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(dsclient, interaction);
    } catch (error) {
        
    }
})

dsclient.on('messageCreate', async (message) => {
    if (global.config.ignore_bots && message.author.bot) return;
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
            if (message.cleanContent) { msgcontent = md2html(escapeHTMLSpecialChars(message.cleanContent)); } else { msgcontent = ''; }

            if (message.stickers.size > 0 && !message.reference)  {
                const sticker = message.stickers.first();
                if (sticker?.format === StickerFormatType.Lottie || sticker?.format === StickerFormatType.APNG) {
                    const msg = await tgclient.telegram.sendMessage(telegramChatId, `<b>${message.author.tag}</b>:\n<i>Lottie/APNG stickers are currently not supported, sending the message content</i>\n${msgcontent}`, { parse_mode: 'HTML' })
                    await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                    return;
                }
                const stickerurl = sticker?.url ?? '';

                const image = await jimp.read(stickerurl)

                const buffer = await image.resize(512, 512).getBufferAsync(jimp.MIME_PNG)

                await tgclient.telegram.sendMessage(telegramChatId, `<b>${message.author.tag}</b>:\n${msgcontent}`, { parse_mode: 'HTML' })
                const msg = await tgclient.telegram.sendSticker(telegramChatId, { source: buffer })
                await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                return;
            }
            const string = attachmentarray.toString().replaceAll(',', ' ')
            if (message.reference) {
                const msgid = await global.db.collection('messages').findOne({ discord: message.reference.messageId })
                if (msgid) {
                    if (message.stickers.size > 0) {

                        const sticker = message.stickers.first();
                        const stickerurl = sticker?.url ?? '';
                        const image = await jimp.read(stickerurl)

                        if (sticker?.format === StickerFormatType.Lottie || sticker?.format === StickerFormatType.APNG) {
                            const msg = await tgclient.telegram.sendMessage(telegramChatId, `<b>${message.author.tag}</b>:\n<i>Lottie/APNG stickers are currently not supported, sending the message content</i>\n${msgcontent}`, { reply_to_message_id: parseInt(msgid.telegram), parse_mode: 'HTML' })
                            await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                            return;
                        }


                        const buffer = await image.resize(512, 512).getBufferAsync(jimp.MIME_PNG)
                        await tgclient.telegram.sendMessage(telegramChatId, `<b>${message.author.tag}</b>:\n${msgcontent}`, { reply_to_message_id: parseInt(msgid.telegram) ,parse_mode: 'HTML' })
                        const msg = await tgclient.telegram.sendSticker(telegramChatId, {source: buffer}, { reply_to_message_id: parseInt(msgid.telegram) })
                        await global.db.collection('messages').insertOne({ discord: message.id, telegram: msg.message_id, chatIds: { telegram: telegramChatId, discord: discordChatId } })
                        return;
                    }
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
    if (global.config.ignore_bots && message.author.bot && message.author.id !== dsclient?.user?.id) return;

    const messageid = await global.db.collection('messages').findOne({ discord: message.id })

    if (messageid) {
        await tgclient.telegram.deleteMessage(messageid.chatIds.telegram, parseInt(messageid.telegram))
        await global.db.collection('messages').deleteOne({ discord: message.id })
    }
})

dsclient.on("messageUpdate", async (oM, nM) => {
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
        await tgclient.telegram.editMessageText(messageid.chatIds.telegram, parseInt(messageid.telegram), undefined, `<b>${nM.author.tag}</b>:\n${msgcontent} ${string}`, { parse_mode: 'HTML' })
    }
})

export default dsclient;

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
    }
}

interface Command {
    name: string;
    description: string;
    dm_permission: boolean;
    options: ApplicationCommandOption[];
    execute: (client: Client, interaction: Interaction) => void | Promise<void>;
}