const path = require('path')
const {server_config_default_get} = require('@leonardpauli/utils/src/server_action.js')

const config = {
	server: server_config_default_get({root_dir: __dirname}),

	neo4j: {
		url: process.env.neo4j_url,
		user: process.env.neo4j_user,
		pass: process.env.neo4j_pass,
	},
}

module.exports = {config}
