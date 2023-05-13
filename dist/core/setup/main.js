import { message } from 'telegraf/filters';
export function clearOldMessages(tgBot, offset = -1) {
    const timeout = 0;
    const limit = 100;
    return tgBot.telegram.getUpdates(timeout, limit, offset, undefined)
        .then(function (updateArray) {
        if (updateArray.length === 0) {
            return undefined;
        }
        else {
            const newOffset = updateArray[updateArray.length - 1].update_id + 1;
            return clearOldMessages(tgBot, newOffset);
        }
    });
}
export const escapeHTMLSpecialChars = (value) => {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};
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
// Doesn't work with discord, don't even bother trying
// if you still want to do some fuckery with this code, install https://github.com/bbc/audiowaveform
export async function GenerateBase64Waveform(audioUrl) {
    /*return new Promise<string>(async (resolve, reject) => {

        const audioFilePath = process.cwd() + "/tmp/" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '.ogg';

        if (!fs.existsSync(process.cwd() + "/tmp/")) fs.mkdirSync(process.cwd() + "/tmp/")

        const response = await fetch(audioUrl);
        const buffer = Buffer.from(await response.arrayBuffer());

        fs.writeFileSync(audioFilePath, buffer);

        const command = `audiowaveform -i ${audioFilePath} -b 8 -o ${audioFilePath.replace("ogg", "json")}`;

        exec(command, { encoding: 'buffer' }, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            const file = fs.readFileSync(audioFilePath.replace("ogg", "json"));
            const waveform = JSON.parse(file.toString());

            const normalizedWaveform = Array.from(waveform.data).map((sample: any) => Math.floor(sample));
            const base64EncodedData = Buffer.from(normalizedWaveform).toString('base64');
            console.log(base64EncodedData)

            resolve(base64EncodedData);
            fs.unlinkSync(audioFilePath);
            fs.unlinkSync(audioFilePath.replace("ogg", "json"));
        });
    });*/
    const audioData = await (await fetch(audioUrl)).text();
    return Buffer.from(audioData.slice(0, 100)).toString('base64');
}
