import { clearOldMessages } from './core/setup/main.js';
import { config as DotEnvConfig } from "dotenv";
import { MongoClient } from 'mongodb';
DotEnvConfig({
    path: `${process.cwd()}/.env`
});
// Load discord client and telegram client from the core/ folder
import discord from './core/discord.js';
import telegram from './core/telegram.js';
process.on('uncaughtException', (err) => {
    console.log(err);
});
const client = new MongoClient(process.env.MONGO_URI);
await clearOldMessages(telegram);
telegram.launch();
discord.login(process.env.DISCORDTOKEN);
await client.connect();
global.db = client.db();