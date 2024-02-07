import { APIEmbed, ChatInputCommandInteraction, Client, TextChannel } from 'discord.js';
import tgclient from '../../telegram.js';

export const name = "bridges";
export const description = "List of bridges";
export async function execute(dsclient: Client, interaction: ChatInputCommandInteraction) {
    let embedString = '';
    await interaction.deferReply({ ephemeral: true });

    for (let i = 0; i < global.config.bridges.length; i++) {
        const discordChatId = global.config.bridges[i].discord.chat_id;
        const telegramChatId = global.config.bridges[i].telegram.chat_id;
        if (global.config.bridges[i].hide && (dsclient.channels.cache.get(global.config.bridges[i].discord.chat_id) as TextChannel).guildId !== interaction.guildId) continue;
        const bridgeName = global.config.bridges[i].name;
        try {
            const discordChannel = await dsclient.channels.fetch(discordChatId);
            const telegramChannel = await tgclient.telegram.getChat(telegramChatId);
            if (telegramChannel.type === "private") return; // Typescript moment
            embedString += `
            **${bridgeName}**:
                **${(discordChannel as TextChannel).name}** (${discordChatId}) - **${telegramChannel.title}** (${telegramChatId})\n
            `
        } catch (error) {
            embedString += `
            **${bridgeName}**:
                **Invalid bridge**\n
            `
            continue;
        }

    }

    const embed: APIEmbed = {
        title: 'Bridges',
        description: embedString + '\n\nPowered by [TeleBridge](https://github.com/TeleBridge/TeleBridge.git)',
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'TeleBridge',
        }
    }

    await interaction.editReply({ embeds: [embed] })
}