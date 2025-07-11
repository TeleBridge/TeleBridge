import { Context, Telegraf } from 'telegraf';
import { Chat, Update } from '@telegraf/types';
import { editedMessage, message } from 'telegraf/filters';
import dsclient from '../discord.js';
import tgclient from '../telegram.js';
import chalk from 'chalk';
import { Logger, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/StringSession.js';
import { DeletedMessage, DeletedMessageEvent } from 'telegram/events/DeletedMessage.js'
import { APIActionRowComponent, APIButtonComponent, TextChannel } from 'discord.js';
import fs from 'fs'


export function clearOldMessages(tgBot: Telegraf, offset = -1): any {
	const timeout = 0;
	const limit = 100;
	return tgBot.telegram.getUpdates(timeout, limit, offset, undefined)
		.then(function (value: Update[]) {
			if (value.length === 0) {
				return undefined;
			} else {
				const newOffset = value[value.length - 1].update_id + 1;
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
	if (ctx.has(message("forward_origin"))) {
		const origin = ctx.message.forward_origin!;
		if (origin.type === "user") {
			forwardFromChatTitle = origin.sender_user.first_name;
		}
		if (origin.type === "channel") {
			forwardFromChatTitle = (origin.chat as Chat.ChannelChat).title;
		}
	}
	if (ctx.chat.type === "private") return undefined;
	switch (ctx.message.from.username) {
		case undefined:
			username = ctx.message.from.first_name;
			break;
		default:
			username = ctx.message.from.username;
			break;
	}
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
	if (ctx.has(message("is_automatic_forward")) && ctx.has(message("forward_origin"))) {
		if (ctx.message.forward_origin.type === "channel") {
			extraargs = `(_Automatic Forward from channel_)`;
			username = forwardFromChatTitle;
		}
	}
	if (ctx.has(message("forward_origin")) && ctx.message.forward_origin.type !== "user" && !ctx.message.is_automatic_forward) {
		extraargs = `(Forwarded by ${username})`;
		if (ctx.message.forward_origin.type === "channel") {
			username = (ctx.message.forward_origin.chat as Chat.ChannelChat).title;
		}
	}

	if (ctx.from?.username === "GroupAnonymousBot" && ctx.message.sender_chat && ctx.message.sender_chat.type !== 'private') {
		extraargs = `(Anonymous Group Admin)`;
		username = ctx.message.sender_chat.title;
	}

	if (forwardName) {
		extraargs = `(Forwarded from **${forwardName}**)`;
	}

	if (ctx.has(message("via_bot"))) {
		extraargs = `(Via **${ctx.message.via_bot.username}**)`;
	}

	if (userreply) {
		extraargs = `(Replying to ${userreply})`;
	}

	extraargs ??= '';
	userreply ??= '';
	username ??= '';

	return { username, userreply, extraargs };
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

	if ((ctx.has(editedMessage("text")) || ctx.has(editedMessage("caption"))) && ctx.editedMessage.reply_to_message !== undefined) {
		switch (ctx.editedMessage.reply_to_message.from?.username) {
			case undefined:
				userreply = ctx.editedMessage.reply_to_message.from?.first_name;
				break;
			default:
				userreply = ctx.editedMessage.reply_to_message.from?.username;
				break;
		}
	}
	if ((ctx.has(editedMessage("text")) || ctx.has(editedMessage("caption"))) && ctx.editedMessage.is_automatic_forward) { extraargs = `(_Automatic Forward from channel_)`; username = ctx.editedMessage.forward_sender_name }
	if ((ctx.has(editedMessage("text")) || ctx.has(editedMessage("caption"))) && ctx.editedMessage.via_bot) { extraargs = `(Via **${ctx.editedMessage.via_bot.username}**)`; }
	if (userreply) { extraargs = `(Replying to ${userreply})`; }
	if (extraargs === undefined) extraargs = '';
	if (userreply === undefined) userreply = '';
	if (username === undefined) username = '';
	return { username, userreply, extraargs }


}

export function getButtons(ctx: Context) {
	let row: APIActionRowComponent<APIButtonComponent> = {
		type: 1,
		components: []
	}
	if (ctx.chat && ctx.chat.type === "private") return;

	
	// ah, good old @ts-expect-error
	/*
	Property 'reply_markup' does not exist on type 'New & NonChannel & Message'.
  	Property 'reply_markup' does not exist on type 'New & NonChannel & ChannelChatCreatedMessage'.
   */
	// @ts-expect-error
	const keyboard = ctx.message?.reply_markup?.inline_keyboard[0].filter((k: any) => k.url)
	if (keyboard && keyboard.length > 0) {
		for (let button of keyboard) {
			if (!button.url) continue;
			row.components.push({
				type: 2,
				label: button.text,
				style: 5,
				url: button.url
			})
		}
	} else {
		return undefined;
	}
	return row;

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
			console.log(chalk.yellow("There was an error while trying to fetch the Telegram chat of \"" + bridge.name + "\", disabling the bridge (the messages of that bridge won't be forwarded)"))
			bridge.disabled = true;
		}

	}

}

async function deletedMessageEvent(event: DeletedMessageEvent) {
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

export async function setDeletedCheckTimeout() {
	if (!tgclient.mtproto) {
		console.log(chalk.red("MTProto needs to be set up to use the deleted message check. Check the GitHub page for more info."))
		return;
	}
	if (global.config.check_for_deleted_messages === false) return;
	

	const timeout = global.config.deleted_message_check_interval * 60 * 1000;

	setInterval(async () => {
		for (let bridge of global.config.bridges) {
			if (bridge.disabled) continue;
			const messages = await global.db.collection('messages').find({ "chatIds.telegram": bridge.telegram.chat_id }).sort({ _id: -1 }).limit(5).toArray()
			for (let message of messages) {
				const msg = await tgclient.mtproto.getMessages(bridge.telegram.chat_id, { ids: [message.telegram] })
				if (msg[0] === undefined) {
					await global.db.collection('messages').deleteOne({ telegram: message.telegram })
					const discordMsg = await (dsclient.channels.cache.get(bridge.discord.chat_id) as TextChannel).messages.fetch(message.discord)
					if(discordMsg) await discordMsg.delete()
				}
			}

		}
	}, timeout)

}
