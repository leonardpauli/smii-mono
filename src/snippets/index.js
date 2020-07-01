const enabled = false

async function main () {
	// await require('./misc.js').setup_constraints.call(this)
	// await require('./schema_cleanup_jun12.js').main.call(this)
	await require('./channel_yt_fetcher_snippets.js').main.call(this)
	// await require('./video_yt_fetcher_snippets.js').main.call(this)
}

module.exports = {
	main,
	enabled,
}
