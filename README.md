# TeleBridge
A Telegram-Discord bridge with support to multiple bridges!

![TeleBridge Image](https://raw.githubusercontent.com/TeleBridge/.github/13b4764fbf73812d2342dde0063ce85cb69cc0d7/files/GitHub_Preview.png)

Do you want to try the bot before self-hosting it? [Join my Discord server](https://discord.gg/ekaCwEfUt4) and/or [the TeleBridge test group](https://t.me/+FxQGfeA-C2hmYjA8) on Telegram

## Requirements
- MongoDB Database (Atlas is fine but idk if there are ratelimits, selfhost ftw)
- Latest NodeJS version (18.16.0+)

## Support/Help

Do you need some help to run the bot? [Join my Discord server](https://discord.gg/ekaCwEfUt4) and go to the `telebridge-support` channel, I'll be happy to help you!

## How to host
### You should install [NodeJS](https://nodejs.org/en/) to continue
- Clone the repo using git or any version control program
- Create a [Discord bot](https://discord.com/developers/applications) with the Message Content intent enabled and a Telegram bot by messaging [@BotFather](https://t.me/BotFather), **MAKE SURE TO DISABLE PRIVACY MODE** by following this video 

![](https://cdn.antogamer.it/r/Telegram_LcLzXfxwXO.gif)

- Message content **HAS** to be enabled on your bot or else it will crash, go into the Discord developer dashboard, open your application, go to bot, flip the message content intent switch on and press save on the bottom of the page
![](https://cdn.antogamer.it/r/msedge_02pF29B5Bz.png)

- Fill out the [.env.example](https://github.com/AntogamerYT/TeleBridge/blob/master/.env.example) and rename it into `.env`
- Also fill the [example.config.json](https://github.com/AntogamerYT/TeleBridge/blob/master/example.config.json) and rename it into `config.json`

    PRO Tip: You can add more bridges by simply adding more objects in `bridges`
- Run `npm install` to install the required packages
- Use the `npm run telebridge` ( or `npm run build`, then `npm start`) and, if everything was done correctly, the bot will be up and ready to use!

If you're on Debian or any Linux distro and you get an outdated NodeJS version, I recommend using NodeSource's [repositories](https://github.com/nodesource/distributions) to install a supported NodeJS version.

## Settings

You can edit TeleBridge's settings by editing the [config.json](https://github.com/TeleBridge/TeleBridge/blob/master/example.config.json) file.


| Config Key | Value Type | Description                       |
|------------|------------|-----------------------------------|
| Bridges    | Array      | Array of bridges (chats to bridge)|


Bridges (JSON of a bridge):

| Config Value | Value type | Description                                       |
|--------------|------------|---------------------------------------------------|
| name         | string     | Name of the bridge, useful for the /bridges command|
| discord chat_id | string  | Channel ID of Discord, get it by enabling developer mode on Discord, right clicking on the channel and clicking "Copy Channel ID"|
| telegram chat_id | string | Chat ID of the Telegram group chat, get it by using the /info command of TeleBridge |
| hide | boolean (true, false) | Decides if the bridge should be hidden in the /bridges command if the command is ran on a Discord server that's not the hidden one |

## How do I support the project?

You can make a donation on [GitHub Sponsors](https://github.com/sponsors/AntogamerYT), or you can just [contribute](https://github.com/TeleBridge/TeleBridge/pulls) in the code :)