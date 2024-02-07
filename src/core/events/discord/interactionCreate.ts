import { ChatInputCommandInteraction, Client } from 'discord.js'


export const name = 'interactionCreate'
export async function execute(client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(client, interaction);
    } catch (error) {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'There was an error while executing this command!' });
        } else await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }

}