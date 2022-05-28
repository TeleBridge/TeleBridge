import * as R from 'ramda'

function createTextObjFromMessage(ctx, message) {
	return R.cond([
		// Text
		[
			R.has("text"),
			({ text, entities }) => ({
				raw: text,
				entities: R.defaultTo([], entities)
			})
		],
		// Animation, audio, document, photo, video or voice
		[
			R.has("caption"),
			({ caption, caption_entities }) => ({
				raw: caption,
				entities: R.defaultTo([], caption_entities)
			})
		],
		// Stickers have an emoji instead of text
		[
			R.has("sticker"),
			message => ({
				raw: R.ifElse(
					() => ctx.TediCross.settings.telegram.sendEmojiWithStickers,
					R.path(["sticker", "emoji"]),
					R.always("")
				)(message),
				entities: []
			})
		],
		// Locations must be turned into an URL
		[
			R.has("location"),
			({ location }) => ({
				raw: `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&ll=${location.latitude},${location.longitude}&z=16`,
				entities: []
			})
		],
		// Default to undefined
		[R.T, R.always({ raw: "", entities: [] })]
	])(message);
}