# TeleBridge
A Telegram-Discord bridge with support to multiple bridges!

Do you want to try the bot before self-hosting it? [Join my Discord server](https://discord.gg/ekaCwEfUt4) and/or [the TeleBridge test group](https://t.me/+FxQGfeA-C2hmYjA8)

## Requirements
- MongoDB Database (Atlas is fine but idk if there are ratelimits, selfhost ftw)
- Latest NodeJS version

## How to run
### You should install [node.js](https://nodejs.org/en/) to continue (latest version recommended)
- Clone the repo
- Create a [Discord bot](https://discord.com/developers/applications) and a Telegram bot by messaging [@BotFather](https://t.me/BotFather), **MAKE SURE TO DISABLE PRIVACY MODE** by following this video 

![](https://cdn.antogamer.it/r/Telegram_LcLzXfxwXO.gif)

- Message content **HAS** to be enabled on your bot or else it will crash, go into the Discord developer dashboard, open your application, go to bot and flip the message content intent switch on
![](https://cdn.antogamer.it/r/msedge_02pF29B5Bz.png)

- Fill out the [.env.example](https://github.com/AntogamerYT/TeleBridge/blob/master/.env.example) and rename it into `.env`
- Also fill the [example.config.json](https://github.com/AntogamerYT/TeleBridge/blob/master/example.config.json) and rename it into `config.json`
    PRO Tip: You can add more bridges by simply adding more objects in `bridges`
- Run `npm install` to install the required packages
- Run `npm run build` to build the code, then `npm start` and (if everything was done correctly) the bot will be up and ready to use!

