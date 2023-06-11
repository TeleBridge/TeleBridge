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
- Create a [Discord bot](https://discord.com/developers/applications) with the Message Content intent enabled and a Telegram bot by messaging [@BotFather](https://t.me/BotFather), **MAKE SURE TO DISABLE PRIVACY MODE** by following this example


![GIF that uses the /setprivacy command of Telegram's BotFather bot to disable the privacy on the bot](https://github.com/TeleBridge/TeleBridge/assets/64664639/525149bc-6dab-4cb7-a80a-2c7d6ac9c3a8)


- Message content **HAS** to be enabled on your bot or else it will crash, go into the Discord developer dashboard, open your application, go to bot, flip the message content intent switch on and press save on the bottom of the page

![Message Content switch in the Discord Developers dashboard](https://cdn.antogamer.it/r/msedge_02pF29B5Bz.png)

- Get the Telegram chat id by running the /chatinfo command of the bot and the Discord channel id by enabling developer mode on Discord, right clicking on the channel and clicking "Copy Channel ID"
- Fill out the [.env.example](https://github.com/AntogamerYT/TeleBridge/blob/master/.env.example) and rename it into `.env`

    Don't know how to get API_ID and API_HASH? Check [Getting API ID and hash](https://github.com/TeleBridge/TeleBridge/tree/master#getting-api-id-and-hash)
- Also fill the [example.config.json](https://github.com/AntogamerYT/TeleBridge/blob/master/example.config.json) and rename it into `config.json`

    PRO Tip: You can add more bridges by simply adding more objects in `bridges`
- Run `npm install` to install the required packages
- Use the `npm run telebridge` ( or `npm run build`, then `npm start`) and, if everything was done correctly, the bot will be up and ready to use!

If you're on Debian or any Linux distro and you get an outdated NodeJS version, I recommend using NodeSource's [repositories](https://github.com/nodesource/distributions) to install a supported NodeJS version.

## Getting API ID and hash

This is required for getting MTPROTO to work for stuff like the Message Delete event (experimental, might not work), remove the variables entirely from the .env to disable MTPROTO

- Go to https://my.telegram.org/ and log in.
- After logging in, click on API Development tools as shown in the image below or simply go to https://my.telegram.org/apps and fill out the form

![my.telegram.org main page](https://github.com/TeleBridge/TeleBridge/assets/64664639/7733b339-717c-4061-bfdb-7f49502165d8)

- After filling it, you will get your api_id and api_hash parameters as shown in the image below

![api_id and api_hash](https://github.com/TeleBridge/TeleBridge/assets/64664639/fa4e91f4-7d5b-4408-804d-a14017d968e8)



## Settings

You can edit TeleBridge's settings by editing the [config.json](https://github.com/TeleBridge/TeleBridge/blob/master/example.config.json) file.


| Config Key | Value Type | Description                       |
|------------|------------|-----------------------------------|
| Bridges    | Array      | Array of bridges (chats to bridge)|
| ignore_bots | boolean (true, false) | Choose if you want to hide the bots' messages when bridging a message to Telegram |
| owner      | Object     | Declares the user IDs of the bot owner for commands like eval |
| check_for_deleted_messages | boolean (true, false) | Choose if you want to check for messages getting deleted or not every x minutes set in the config (MTProto required) (can get your bot ratelimited) |
| deleted_message_check_interval | number | Interval for message checking (in minutes) |


Bridges (JSON of a bridge):

| Config Key | Value type | Description                                       |
|--------------|------------|---------------------------------------------------|
| name         | string     | Name of the bridge, useful for the /bridges command|
| discord chat_id | string  | Channel ID of Discord, get it by enabling developer mode on Discord, right clicking on the channel and clicking "Copy Channel ID"|
| telegram chat_id | string | Chat ID of the Telegram group chat, get it by using the /chatinfo command of TeleBridge |
| hide | boolean (true, false) | Decides if the bridge should be hidden in the /bridges command if the command is ran on a Discord server/Telegram chat that's not the hidden one |

owner:

| Config Key | Value Type | Description |
| discord    | string     | Your [Discord User ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-) |
| telegram   | string     | Your Telegram ID, get it by running the /me command of your Telebridge instance |

## Discord commands

Slash commands:

slash commands get added everytime the bot starts

| Command | Description |
|---------|-------------|
| bridges | List of the bridges set up in the [config.json](https://github.com/TeleBridge/TeleBridge/blob/master/example.config.json) file. |
| info    | Infos about the bot (pretty much like the /start command on Telegram) |
| link    | Link your Discord and Telegram accounts together, pretty much useless right now but you will be able to do stuff with it in the future. |
| unlink  | Unlink command for the account linking feature |

Prefix commands:

The prefix is `!` and you can't change it for now

| Command | Description |
|---------|-------------|
| eval    | Evaluates code, only available to the bot owner set up in the [config.json](https://github.com/TeleBridge/TeleBridge/blob/master/example.config.json) file, **BE CAREFUL OF WHAT YOU DO, THIS EVALUATES JAVASCRIPT CODE ON YOUR MACHINE AND IT CAN CAUSE DAMAGE IF NOT USED CORRECTLY!!!** |

## Telegram commands

Pretty much the same as Discord's

| Command | Description |
|---------|-------------|
| bridges | List of the bridges set up in the [config.json](https://github.com/TeleBridge/TeleBridge/blob/master/example.config.json) file. |
| chatinfo | Gives you the chat ID and the group type |
| start    | Infos about the bot |
| link    | Link your Discord and Telegram accounts together, pretty much useless right now but you will be able to do stuff with it in the future. You need to run this command on the Discord side first to start the linking process |
| unlink  | Unlink command for the account linking feature |
| eval | Evaluates code, only available to the bot owner set up in the [config.json](https://github.com/TeleBridge/TeleBridge/blob/master/example.config.json) file, **BE CAREFUL OF WHAT YOU DO, THIS EVALUATES JAVASCRIPT CODE ON YOUR MACHINE AND IT CAN CAUSE DAMAGE IF NOT USED CORRECTLY!!!** |

## How do I support the project?

You can make a donation on [GitHub Sponsors](https://github.com/sponsors/AntogamerYT), or you can just [contribute](https://github.com/TeleBridge/TeleBridge/pulls) in the code :)
