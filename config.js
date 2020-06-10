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
}

module.exports = {config}
