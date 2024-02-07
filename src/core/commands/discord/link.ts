import { Client, ChatInputCommandInteraction, APIEmbed, GuildChannel } from 'discord.js';
import tgclient from '../../telegram.js';

export const name = "link";
export const description = "Link your Discord account to your Telegram account";
export const dm_permission = false;
export async function execute(client: Client, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    let dbval;
    dbval = await global.db.collection("Users").findOne({ discord_id: interaction.user.id })
    if (dbval && !dbval.code) {
        await interaction.editReply({ content: "You already have a linked account." });
        return;
    }

    if (dbval && dbval.code) {
        const embed: APIEmbed = {
            title: 'Account linking',
            description: `To link your account, send the code \`${dbval.code}\` to the [Telegram bot](https://t.me/${tgclient.botInfo?.username}) in a private chat using the /link command like this:\n\n\`/link ${dbval.code}\``,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'TeleBridge',
            }
        }

        await interaction.editReply({ embeds: [embed] })
    }
    
    let int = 0;
    for (let bridge of global.config.bridges) {
        const guildId = (client.channels.cache.get(bridge.discord.chat_id) as GuildChannel).guildId;
        if (guildId !== interaction.guildId && int !== global.config.bridges.length) {
            int++;
            continue;
        } else if (int === global.config.bridges.length) {
            await interaction.editReply({ content: "You can only link your account in a server with TeleBridge enabled." });
            return;
        }
    }

    let code: number;

    code = Math.floor(10000 + Math.random() * 90000);

    dbval = await global.db.collection("Users").findOne({ code: code })

    while (dbval) {
        code = Math.floor(10000 + Math.random() * 90000);

        dbval = await global.db.collection("Users").findOne({ code: code })
    }

    await global.db.collection("Users").insertOne({ code: code, discord_id: interaction.user.id })

    const embed: APIEmbed = {
        title: 'Account linking',
        description: `To link your account, send the code \`${code}\` to the [Telegram bot](https://t.me/${tgclient.botInfo?.username}) in a private chat using the /link command like this:\n\n\`/link ${code}\``,
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'TeleBridge',
        }
    }

    await interaction.editReply({ embeds: [embed] })
}
