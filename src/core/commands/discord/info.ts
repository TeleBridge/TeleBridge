import { Client, ChatInputCommandInteraction, APIEmbed } from 'discord.js';

export const name = "info";
export const description = "Infos about me";
export async function execute(dsclient: Client, interaction: ChatInputCommandInteraction) {
    const embed: APIEmbed = {
        title: 'Info',
        description: 'TeleBridge is a bridge between Telegram and Discord made by [Antogamer](https://antogamer.it)\n\nIt doesn\'t have a public instance, so you\'ll have to selfhost it, but don\'t worry! It\'s easy!\n\nCheck me out on [GitHub](https://github.com/TeleBridge/TeleBridge.git)',
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'TeleBridge',
        }
    }

    await interaction.reply({ embeds: [embed], ephemeral: true })
}