import * as R from 'ramda';
export function clearOldMessages(tgBot, offset = -1) {
	const timeout = 0;
	const limit = 100;
	return tgBot.telegram.getUpdates(timeout, limit, offset).then(
		R.ifElse(
			R.isEmpty,
			R.always(undefined),
			R.compose(
				newOffset => clearOldMessages(tgBot, newOffset),
				R.add(1),
				R.prop("update_id"),
				R.last
			)
		)
	);
}
export const escapeHTMLSpecialChars = R.compose(
	R.replace(/>/g, "&gt;"),
	R.replace(/</g, "&lt;"),
	R.replace(/&/g, "&amp;")
);
export function escapeChars (text) {
	return text
		.replace("*", "\\*")
		.replace("_", "\\_")
}

export function handleUser(ctx) {
	let username;
	let userreply;
	let extraargs;
    switch (ctx.message.from.username) {
      case undefined:
        username = ctx.message.from.first_name;
        break;
      default:
        username = ctx.message.from.username;
        break;
    }
    if(ctx.message.reply_to_message != undefined) {
      switch (ctx.message.reply_to_message.from.username) {
        case undefined:
          userreply = ctx.message.reply_to_message.from.first_name;
          break;
        default:
          userreply = ctx.message.reply_to_message.from?.username;
          break;
      }
    }
    if(ctx.message.is_automatic_forward === true) { extraargs = `(_Automatic Forward from channel_)`; username = ctx.message.forward_from_chat.title}
    if(ctx.message.forward_from_chat != undefined){ extraargs = `(Forwarded from ${username})`; username = ctx.message.forward_from_chat.title}
    if(ctx.message.forward_from != undefined){ extraargs = `(Forwarded from **${ctx.message.forward_from.username}**)`;}
    if(ctx.message.reply_to_message != undefined){ extraargs = `(Replying to ${userreply})`; }
    if(extraargs === undefined) extraargs = '';
	return {username, userreply, extraargs}

}