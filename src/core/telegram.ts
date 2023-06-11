import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { default as dsclient } from './discord.js'
import { TextChannel } from 'discord.js'
import { escapeHTMLSpecialChars } from './setup/main.js'
import { ChatMemberAdministrator } from 'typegram'
import { TelegramClient } from 'telegram'
import { clean } from './commands/discord/eval.js'
import { inspect } from 'util'

const tgclient = new Telegraf(process.env.TGTOKEN)

tgclient.command('chatinfo', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('This command can only be used in a group chat.')
  ctx.reply(`Chat ID: <code>${ctx.chat.id}</code>\nChat Type: ${ctx.chat.type}\nChat Title: ${ctx.chat.title}`, { parse_mode: 'HTML' })
})

tgclient.command("me", async (ctx) => {
  ctx.reply(`Your Telegram ID is <code>${ctx.from.id}</code>`, { parse_mode: "HTML" })
})

tgclient.command("eval", async (ctx) => { 
  if (parseInt(global.config.owner.telegram) !== ctx.from.id)
    return;
  const args = ctx.message.text.split(" ").slice(1)

  const toEval = `(async  () => {${clean(args.join(' '))}})()`;
  try {
    if (toEval) {
      const evaluated = inspect(await eval(toEval));

      
      return ctx.reply(`\`\`\`js\n${escapeHTMLSpecialChars(evaluated)}\n\`\`\``, { parse_mode: "MarkdownV2" });
    }
  } catch (e) {
    return ctx.reply(`Error\n\`\`\`js\n${escapeHTMLSpecialChars(`${e}`)}\n\`\`\``, { parse_mode: "MarkdownV2"});
  }

    
})

tgclient.command("link", async (ctx) => {
  if (await global.db.collection("Users").findOne({ telegram_id: ctx.from?.id })) return ctx.reply("Your account is already linked.")
  const args = ctx.message.text.split(" ")
  const code = args[1]
  if (!code) return ctx.reply("Please provide a code, to get it run the /link command on the TeleBridge bot on Discord.")
  let dbval = await global.db.collection("Users").findOne({ code: parseInt(code) })
  if (!dbval) return ctx.reply("The code is invalid, make sure to run /link in Discord first to get your code.")
  if (dbval.telegram_id) return ctx.reply("Your account is already linked, use the /unlink command to unlink it first.")

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "Confirm",
          callback_data: `link:${code}`
        }
      ],
      [
        {
          text: "Cancel",
          callback_data: "cancel"
        }
      ]
    ]
  }

  const dsuser = await dsclient.users.fetch(dbval.discord_id) 

  ctx.reply(`Are you sure you want to link this account to the following Discord account?\n\nUsername: ${dsuser.tag}\nID: ${dsuser.id}`, { reply_markup: keyboard })
  tgclient.action(`link:${code}`, async (ctx) => {
    await global.db.collection("Users").updateOne({ code: parseInt(code) }, { $set: { telegram_id: ctx.from?.id }, $unset: { code: "" } })
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] })
    await ctx.editMessageText("Account linked successfully.")

  })
})

tgclient.command("unlink", async (ctx) => {
  let dbval = await global.db.collection("Users").findOne({ telegram_id: ctx.from?.id })
  if (!dbval) return ctx.reply("Your account is not linked.")
  const keyboard = {
    inline_keyboard: [
      [
        {

          text: "Confirm",
          callback_data: `unlink:${ctx.from?.id}`
        }
      ],
      [
        {
          text: "Cancel",
          callback_data: "cancel"
        }
      ]
    ]
  }

  const dsuser = await dsclient.users.fetch(dbval.discord_id)

  ctx.reply(`Are you sure you want to unlink this account from the following Discord account?\n\nUsername: ${dsuser.tag}\nID: ${dsuser.id}`, { reply_markup: keyboard })

  tgclient.action(`unlink:${ctx.from?.id}`, async (ctx) => {
    await global.db.collection("Users").deleteOne({ telegram_id: ctx.from?.id })
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] })
    await ctx.editMessageText("Account unlinked successfully.")
  })


})

tgclient.action("cancel", async (ctx) => {
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] })
  await ctx.editMessageText("Cancelled.")
})

tgclient.command('delete', async (ctx) => {
  try {
    const chatMember = await ctx.getChatMember(ctx.from.id) as ChatMemberAdministrator
    if ((chatMember as any).status !== "creator" && !chatMember.can_delete_messages && ctx.message.from.id !== ctx.from.id ) return ctx.reply('You need to be an admin and have the permission to delete messages or it needs to be your message to use this command.')
    if (!ctx.message.reply_to_message) return ctx.reply('Please reply to a message to delete it.')
    const message = ctx.message.reply_to_message.message_id
    const messageid = await global.db.collection("messages").findOne({ telegram: message })
    if (messageid) {
      await tgclient.telegram.deleteMessage(messageid.chatIds.telegram, messageid.telegram)
      const msg = await (dsclient.channels.cache.get(messageid.chatIds.discord) as TextChannel).messages.fetch(messageid.discord)
      msg.delete()
      await global.db.collection('messages').deleteOne({ telegram: message })
    } else {
      ctx.reply('Message not found.')
    }
    ctx.deleteMessage()
  } catch (error) {
    console.log(error)
  }

})

tgclient.command('bridges', async (ctx) => {
  try {
    let bridges = ''
    for (let i = 0; i < global.config.bridges.length; i++) {
      const bridge = global.config.bridges[i];
      if (bridge.hide && ctx.chat.id !== parseInt(bridge.telegram.chat_id)) continue;
      const discordChannel = dsclient.channels.cache.get(bridge.discord.chat_id);
      const telegramChannel = await tgclient.telegram.getChat(bridge.telegram.chat_id);
      if (telegramChannel.type === "private") return; // Typescript moment
      bridges += `
            <b>${bridge.name}${bridge.disabled ? " (disabled)" : ""}</b>:
                <b>${(discordChannel as TextChannel).name}</b> (${discordChannel?.id}) - <b>${telegramChannel.title}</b> (${telegramChannel.id})\n`
    }
    ctx.replyWithHTML(`<b>Bridges:</b>\n${bridges}\n\nPowered by <a href="https://github.com/TeleBridge/TeleBridge.git">TeleBridge</a>`)
  } catch (error) {
    console.log(error)
  }

})

tgclient.command("info", async (ctx) => {
  ctx.replyWithHTML("TeleBridge is a bridge between Telegram and Discord made by <a href=\"https://antogamer.it\">Antogamer</a>\n\nIt doesn\'t have a public instance, so you\'ll have to selfhost it, but don\'t worry! It\'s easy!\n\nCheck me out on <a href=\"https://github.com/TeleBridge/TeleBridge.git\">GitHub</a>")
})

tgclient.start((ctx) => ctx.replyWithHTML('Welcome!\nThis is a self-hosted TeleBridge instance, for more info, check out the <a href="https://github.com/TeleBridge/TeleBridge">GitHub Repo</a>\nFor a list of bridges, run the /bridges command\nFor more infos, check the /info command.'))


export default tgclient

declare module 'telegraf' {
  interface Telegraf {
    mtproto: TelegramClient;
  }
}
