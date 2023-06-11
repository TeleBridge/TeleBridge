import { GatewayIntentBits, Client, Partials, Collection, Interaction, ApplicationCommandOption, Message } from 'discord.js';
import chalk from 'chalk'
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

dsclient.rest.on("rateLimited", async (data) => {
    console.log(chalk.redBright(`[Discord] Rate limited for ${data.timeToReset}ms while using ${data.method} ${data.url}, ${data.global ? "the ratelimit is global" : "the ratelimit is not global"}.`))
})

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