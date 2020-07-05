const config = {
	youtube: {
		key_list: (process.env.yt_api_keys||'').split(',').filter(Boolean),
		prevent_live_reqs: false,
		base_url: 'https://www.googleapis.com/youtube/v3',
	},
	neo4j: {
		url: process.env.neo4j_url,
		user: process.env.neo4j_user,
		pass: process.env.neo4j_pass,
	},
	processor_id: process.env.processor_id,
	queue_poll_delay: 2000,
	queue_take_count: 5,

	use_snippet: process.env.use_snippet==='true',
}

module.exports = {config}
