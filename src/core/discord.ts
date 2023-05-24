import { GatewayIntentBits, Client, Partials, Collection, Interaction, ApplicationCommandOption, Message } from 'discord.js';
import 'dotenv/config'

const dsclient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    allowedMentions: { repliedUser: false },
    partials: [Partials.Channel]
});

dsclient.commands = new Collection()
dsclient.msgCommands = new Collection()

export default dsclient;

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
        msgCommands: Collection<string, Command>;
    }
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