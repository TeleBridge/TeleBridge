import { Context, Telegraf } from 'telegraf';
import { Update } from 'typegram';
import { editedMessage, message } from 'telegraf/filters';
import dsclient from '../discord.js';
import tgclient from '../telegram.js';
import chalk from 'chalk';
import { Logger, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/StringSession.js';
import { DeletedMessage, DeletedMessageEvent } from 'telegram/events/DeletedMessage.js'
import { TextChannel } from 'discord.js';
import fs from 'fs'


export function clearOldMessages(tgBot: Telegraf, offset = -1): any {
	const timeout = 0;
	const limit = 100;
	return tgBot.telegram.getUpdates(timeout, limit, offset, undefined)
		.then(function (updateArray: Update[]) {
			if (updateArray.length === 0) {
				return undefined;
			} else {
				const newOffset = updateArray[updateArray.length - 1].update_id + 1;
				return clearOldMessages(tgBot, newOffset);
			}
		});
}
export const escapeHTMLSpecialChars = (value: string) => {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
};
export function escapeChars(text: string) {
	return text
		.replace("*", "\\*")
		.replace("_", "\\_")
}

export function replaceEmojis(text: string) {
	const emojiRegex = /<a:(.*?):\d+>|\s*<:(.*?):\d+>/g;
	const emojiMatches = text.match(emojiRegex);
	if (emojiMatches) {
		for (const emojiMatch of emojiMatches) {
			const emojiName = emojiMatch.split(":")[1];
			text = text.replace(
				emojiMatch,
				`:${emojiName}:`
			);
		}
	}
	return text;
}

export function md2html(text: string): string {
	text = text
		.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
		.replace(/__(.*?)__/g, "<u>$1</u>")
		.replace(/\*(.*?)\*/g, "<i>$1</i>")
		.replace(/_(.*?)_/g, "<i>$1</i>")
		.replace(/~~(.*?)~~/g, "<s>$1</s>")
		.replace(/\|\|(.*?)\|\|/g, "<tg-spoiler>$1</tg-spoiler>")
		.replace(/`([^`]+)`/g, "<code>$1</code>");

	return text
}


export function handleUser(ctx: Context) {
	let username;
	let userreply;
	let extraargs;
	if (!ctx.message || !ctx.chat) return undefined;
	let forwardFromChatTitle: string = "";
	let forwardName: string | undefined = "";
	if (ctx.has(message("forward_from_chat")) && ctx.message.forward_from_chat.type === "private") forwardFromChatTitle = ctx.message.forward_from_chat.first_name;
	if (ctx.has(message("forward_from_chat")) && ctx.message.forward_from_chat.type === "channel") forwardFromChatTitle = ctx.message.forward_from_chat.title;
	if (ctx.chat.type === "private") return undefined;
	switch (ctx.message.from.username) {
		case undefined:
			username = ctx.message.from.first_name;
			break;
		default:
			username = ctx.message.from.username;
			break;
	}
	if (ctx.has(message("forward_from"))) {
		forwardName = ctx.message.forward_from.username
	} else if (ctx.has(message("forward_sender_name"))) forwardName = ctx.message.forward_sender_name;

	if (ctx.has(message("reply_to_message"))) {
		switch (ctx.message.reply_to_message.from?.username) {
			case undefined:
				userreply = ctx.message.reply_to_message.from?.first_name;
				break;
			default:
				userreply = ctx.message.reply_to_message.from?.username;
				break;
		}
	}
	if (ctx.has(message("is_automatic_forward"))) { extraargs = `(_Automatic Forward from channel_)`; username = ctx.message.forward_sender_name }
	if (ctx.has(message("forward_from_chat"))) { extraargs = `(Forwarded by ${username})`; username = forwardFromChatTitle }
	if (forwardName) { extraargs = `(Forwarded from **${forwardName}**)`; }
	if (ctx.has(message("via_bot"))) { extraargs = `(Via **${ctx.message.via_bot.username}**)`; }
	if (userreply) { extraargs = `(Replying to ${userreply})`; }
	if (extraargs === undefined) extraargs = '';
	if (userreply === undefined) userreply = '';
	if (username === undefined) username = '';
	return { username, userreply, extraargs }

}


export function handleEditedUser(ctx: Context) {
	let username;
	let userreply;
	let extraargs;
	if (!ctx.editedMessage || !ctx.chat) return undefined;
	if (ctx.chat.type === "private") return undefined;
	switch (ctx.editedMessage.from.username) {
		case undefined:
			username = ctx.editedMessage.from.first_name;
			break;
		default:
			username = ctx.editedMessage.from.username;
			break;
	}

	if (ctx.has(editedMessage("text" || "caption")) && ctx.editedMessage.reply_to_message !== undefined) {
		switch (ctx.editedMessage.reply_to_message.from?.username) {
			case undefined:
				userreply = ctx.editedMessage.reply_to_message.from?.first_name;
				break;
			default:
				userreply = ctx.editedMessage.reply_to_message.from?.username;
				break;
		}
	}
	if (ctx.has(editedMessage("text" || "caption")) && ctx.editedMessage.is_automatic_forward) { extraargs = `(_Automatic Forward from channel_)`; username = ctx.editedMessage.forward_sender_name }
	if (ctx.has(editedMessage("text" || "caption")) && ctx.editedMessage.via_bot) { extraargs = `(Via **${ctx.editedMessage.via_bot.username}**)`; }
	if (userreply) { extraargs = `(Replying to ${userreply})`; }
	if (extraargs === undefined) extraargs = '';
	if (userreply === undefined) userreply = '';
	if (username === undefined) username = '';
	return { username, userreply, extraargs }


}


// Doesn't work with discord, don't even bother trying
// if you still want to do some fuckery with this code, install https://github.com/bbc/audiowaveform
// NVM IT'S A LOT EASIER THAN I THOUGHT
// it isn't because it's not precise but having a waveform is still nice
export async function GenerateBase64Waveform(audioUrl: string): Promise<string> {
	const audioData = await (await fetch(audioUrl)).text()

	return Buffer.from(audioData.slice(0, 100)).toString('base64')
}

export async function validateChannels() {
	for (let bridge of global.config.bridges) {
		const dschannel = dsclient.channels.cache.get(bridge.discord.chat_id)
		if (!dschannel) {
			console.log(chalk.yellow("Invalid Discord channel at bridge \"" + bridge.name + "\", disabling the bridge (the messages of that bridge won't be forwarded)"))
			bridge.disabled = true;
			return;
		}
		try {
			const tgchat = await tgclient.telegram.getChat(bridge.telegram.chat_id)
			if (!tgchat) {
				console.log(chalk.yellow("Invalid Telegram chat at bridge \"" + bridge.name + "\", disabling the bridge (the messages of that bridge won't be forwarded)"))
				bridge.disabled = true;
			}
		} catch (error) {
			throw new Error(`${error}`)
		}

	}

}

async function deletedMessageEvent(event: DeletedMessageEvent) {
	console.log("Got deleted message event, didn't expect that to work, create an issue on GitHub to let me know please!", event)
	try {
		for (let i = 0; i < global.config.bridges.length; i++) {
			if (global.config.bridges[i].disabled) continue;
			const discordChatId = global.config.bridges[i].discord.chat_id;
			const telegramChatId = global.config.bridges[i].telegram.chat_id;
			if (telegramChatId === event.chatId?.toString()) {
				const msg = await global.db.collection('messages').findOne({ telegram: event._messageId?.toString() })
				if (msg) {
					const discordMsg = await (dsclient.channels.cache.get(discordChatId) as TextChannel).messages.fetch(msg.discord)
					await discordMsg.delete()
					await global.db.collection('messages').deleteOne({ telegram: event._messageId?.toString() })
				}
			}
		}
	} catch (error) {
		console.log(error)
	}
}

export async function setupMtProto(tgclient: Telegraf) {
	let stringSession = "";
	try {
		const file = fs.readFileSync(`${process.cwd()}/.string_session`, 'utf-8')
		if (file) stringSession = file;
	} catch (error) {

	}

	tgclient.mtproto = new TelegramClient(
		new StringSession(stringSession),
		parseInt(process.env.API_ID),
		process.env.API_HASH,
		{
			connectionRetries: 5,
			baseLogger: new Logger(undefined)
		}
	)

	tgclient.mtproto.addEventHandler(deletedMessageEvent, new DeletedMessage({ chats: global.config.bridges.map(bridge => bridge.telegram.chat_id) }))
}

