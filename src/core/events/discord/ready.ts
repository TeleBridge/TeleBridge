import { ActivityType, ApplicationCommandOption, Client, Interaction, Message, Routes } from 'discord.js'
import fs from 'fs'
import { validateChannels } from '../../setup/main.js';

export const name = 'ready'
export async function execute(dsclient: Client) {
    const commandFiles = fs.readdirSync(`${process.cwd()}/dist/core/commands/discord`).filter(file => file.endsWith('.js'));

    let commandsArray: any[] = [];
    for (const file of commandFiles) {
        const command: Command = await import(`${process.cwd()}/dist/core/commands/discord/${file}`);
        if (command.messageContent) {
            dsclient.msgCommands.set(command.name, command);
            continue;
        }
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
}

interface Command {
    name: string;
    description: string;
    dm_permission: boolean;
    options: ApplicationCommandOption[];
    messageContent: boolean;
    execute: (client: Client, interaction: Interaction) => void | Promise<void>;
    msgExecute: (client: Client, message: Message, args: string[]) => void | Promise<void>;
}