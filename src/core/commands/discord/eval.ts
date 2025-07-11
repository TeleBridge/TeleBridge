import { ChannelType, Client, Message } from 'discord.js'
import { inspect } from 'util'

export const name = 'eval'
export const messageContent = true;
export const description = 'Evaluate a piece of code'
export async function msgExecute(client: Client, message: Message, args: string[]) { 
    if (global.config.owner.discord !== message.author.id)
        return;

    if (message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildAnnouncement) {
        await message.reply('This command can only be used in text channels.');
        return;
    }

    const toEval = `(async  () => {${clean(args.join(' '))}})()`;

    try {
        if (toEval) {
            const evaluated = inspect(await eval(toEval));

            if (evaluated.length > 4090) {
                message.channel.send('Result would exceed 4096 characters limit');
                return;
            }

            const embed = {
                color: 3066993,
                title: 'Evaluation Executed',
                description: `\`\`\`${evaluated}\`\`\``,
                timestamp: new Date().toISOString()
            };

            await message.channel.send({ embeds: [embed] });
        }
    }
    catch (error) {
        const embed = {
            color: 15158332,
            title: 'Evaluation Failed',
            description: `\`\`\`${error}\`\`\``,
            timestamp: new Date().toISOString()
        };

        await message.channel.send({ embeds: [embed] });
    }
}

export function clean(text: string) {
    if (typeof text === 'string') {
        return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)).replace('```JS', '').replace('```', '');
    }

    return text;
}