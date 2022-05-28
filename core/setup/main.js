import * as R from 'ramda';
function clearOldMessages(tgBot, offset = -1) {
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

export default clearOldMessages;