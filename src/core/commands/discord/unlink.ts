import { ButtonStyle, ComponentType, InteractionButtonComponentData } from 'discord.js';
import { Client, ChatInputCommandInteraction, APIEmbed } from 'discord.js';
import tgclient from '../../telegram.js';
import { ChatMember } from 'typegram';

export const name = "unlink";
export const description = "Unlink your Discord account from your Telegram account";
export const dm_permission = false;
export async function execute(dsclient: Client, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    let dbval = await global.db.collection("Users").findOne({ discord_id: interaction.user.id })

    if (!dbval) {
        await interaction.editReply({ content: "You don't have a linked account."});
        return;
    }

    const confirmButton: InteractionButtonComponentData = {
        type: ComponentType.Button,
        style: ButtonStyle.Danger,
        label: "Confirm",
        customId: "confirm"
    }

    const cancelButton: InteractionButtonComponentData = {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: "Cancel",
        customId: "cancel"
    }

    const buttonRow = {
        type: ComponentType.ActionRow,
        components: [confirmButton, cancelButton]
    }

    let user: ChatMember = {} as ChatMember;
    for (let bridge of global.config.bridges) {
        try {
            user = await tgclient.telegram.getChatMember(bridge.telegram.chat_id, dbval.telegram_id)
        } catch (error) {
            continue;
        }
    }

    if (!user.user) {
        await interaction.editReply({ content: "Could not find your Telegram account."});
        return;
    }


    const confirmEmbed: APIEmbed = {
        title: 'Account unlinking',
        description: `Are you sure you want to unlink this account from the following Telegram account?\n\nUsername: ${user.user.username || (user.user.first_name + " " + user.user.last_name ?? "") }\nID: ${user.user.id}`,
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'TeleBridge',
        }
    }

    const confirmMessage = await interaction.editReply({ embeds: [confirmEmbed], components: [buttonRow] })


    const filter = (i: any) => i.user.id === interaction.user.id;
    const collector = confirmMessage.createMessageComponentCollector({ filter });
    
    collector.on('collect', async i => {
        if (i.customId === "confirm") {
            await global.db.collection("Users").deleteOne({ discord_id: interaction.user.id })

            const embed: APIEmbed = {
                title: 'Account unlinking',
                description: `Your account has been unlinked.`,
                color: 0x00ff00,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'TeleBridge',
                }
            }

            await i.update({ embeds: [embed], components: [] })
        } else if (i.customId === "cancel") {
            const embed: APIEmbed = {
                title: 'Account unlinking',
                description: `Your account has been unlinked.`,
                color: 0x00ff00,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'TeleBridge',
                }
            }
            await i.update({ embeds: [embed], components: [] })
        }
    })

}