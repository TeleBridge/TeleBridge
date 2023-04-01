import * as R from 'ramda';
import { message } from 'telegraf/filters';
//@ts-expect-error
export function clearOldMessages(tgBot, offset = -1) {
    const timeout = 0;
    const limit = 100;
    return tgBot.telegram.getUpdates(timeout, limit, offset, undefined).then(R.ifElse(R.isEmpty, R.always(undefined), 
    // @ts-expect-error
    R.compose(
    //@ts-ignore
    newOffset => clearOldMessages(tgBot, newOffset), R.add(1), R.prop("update_id"), R.last)));
}
export const escapeHTMLSpecialChars = R.compose(R.replace(/>/g, "&gt;"), R.replace(/</g, "&lt;"), R.replace(/&/g, "&amp;"));
export function escapeChars(text) {
    return text
        .replace("*", "\\*")
        .replace("_", "\\_");
}
export function handleUser(ctx) {
    let username;
    let userreply;
    let extraargs;
    if (!ctx.message || !ctx.chat)
        return undefined;
    switch (ctx.message.from.username) {
        case undefined:
            username = ctx.message.from.first_name;
            break;
        default:
            username = ctx.message.from.username;
            break;
    }
    if (ctx.has(message("text")) && ctx.message.reply_to_message != undefined) {
        switch (ctx.message.reply_to_message.from?.username) {
            case undefined:
                userreply = ctx.message.reply_to_message.from?.first_name;
                break;
            default:
                userreply = ctx.message.reply_to_message.from?.username;
                break;
        }
    }
    if (ctx.has(message("text")) && ctx.message.is_automatic_forward) {
        extraargs = `(_Automatic Forward from channel_)`;
        username = ctx.message.forward_sender_name;
    }
    //@ts-ignore until i find a better way to do this it will stay like this
    if (ctx.has(message("forward_from_chat"))) {
        extraargs = `(Forwarded from ${username})`;
        username = ctx.message.forward_from_chat.title;
    }
    if (ctx.has(message("text")) && ctx.message.forward_from) {
        extraargs = `(Forwarded by **${ctx.message.forward_from.username}**)`;
    }
    if (userreply) {
        extraargs = `(Replying to ${userreply})`;
    }
    if (extraargs === undefined)
        extraargs = '';
    if (userreply === undefined)
        userreply = '';
    if (username === undefined)
        username = '';
    return { username, userreply, extraargs };
}
export function handleEditedUser(ctx) {
    let username;
    let userreply;
    let extraargs;
    if (!ctx.editedMessage || !ctx.chat)
        return undefined;
    switch (ctx.editedMessage.from.username) {
        case undefined:
            username = ctx.editedMessage.from.first_name;
            break;
        default:
            username = ctx.editedMessage.from.username;
            break;
    }
    if (ctx.has(message("text")) && ctx.editedMessage.reply_to_message != undefined) {
        switch (ctx.editedMessage.reply_to_message.from?.username) {
            case undefined:
                userreply = ctx.editedMessage.reply_to_message.from?.first_name;
                break;
            default:
                userreply = ctx.editedMessage.reply_to_message.from?.username;
                break;
        }
    }
    if (ctx.has(message("text")) && ctx.editedMessage.is_automatic_forward) {
        extraargs = `(_Automatic Forward from channel_)`;
        username = ctx.editedMessage.forward_sender_name;
    }
    //@ts-ignore until i find a better way to do this it will stay like this
    if (ctx.has(message("forward_from_chat"))) {
        extraargs = `(Forwarded from ${username})`;
        username = ctx.editedMessage.forward_from_chat.title;
    }
    if (ctx.has(message("text")) && ctx.editedMessage.forward_from) {
        extraargs = `(Forwarded by **${ctx.editedMessage.forward_from.username}**)`;
    }
    if (userreply) {
        extraargs = `(Replying to ${userreply})`;
    }
    if (extraargs === undefined)
        extraargs = '';
    if (userreply === undefined)
        userreply = '';
    if (username === undefined)
        username = '';
    return { username, userreply, extraargs };
}
