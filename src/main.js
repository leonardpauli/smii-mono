const fs = require('fs')
const neo4j = require('neo4j-driver')

const deinit = require('@leonardpauli/utils/src/deinit.js')
const neo4j_utils = require('@leonardpauli/utils/src/neo4j.js')(neo4j)
const {server_new} = require('@leonardpauli/utils/src/server.js')
const {
	server_start,
	api_handler,
	action_type_generic,
	action_type_load,
	action_load,
} = require('@leonardpauli/utils/src/server_action.js')

const {action_list} = require('./action_list.js')

const {config} = require('../config.js')


const main = {
	async init () {

		const ctx = {}

		ctx.neo4j_driver = neo4j_utils.driver_setup(config.neo4j)
		const session_use = ctx=> neo4j_utils.session_use({deinit, driver: ctx.neo4j_driver})

		const action_type_list = [
			action_type_generic(),
			neo4j_utils.server_action_type_raw({session_use}),
		]
		const action_type_register = action_type_load(action_type_list)
		const action_register = action_load(action_list, action_type_register)

		const server = server_new({
			...config.server,
			handlers: [
				api_handler({
					endpoint: '/api',
					ctx_new: ()=> ({...ctx}),
					action_register,
				}),
			],
		})
		
		server_start(server, config.server)

	},
	exit () { // not in use?
		deinit.exit()
	},
}


// start

main.init().catch(console.error)
