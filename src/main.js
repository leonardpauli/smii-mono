const neo4j = require('neo4j-driver')
const neo4j_utils = require('@leonardpauli/utils/src/neo4j.js')(neo4j)

const deinit = require('@leonardpauli/utils/src/deinit.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {yt_api} = require('./yt_api.js')

const {config} = require('../config.js')

const yt_channel_id_linustechtips = 'UCXuqSBlHAE6Xw-yeJA0Tunw'
const yt_channel_username_beneater = 'eaterbc'



const main = {
	async init () {
		dlog({at: 'main.start'})

		this.session = neo4j_utils.session_setup({config: config.neo4j, deinit})

		config.youtube.key = config.youtube.key_list[0]
		await yt_api.init(config.youtube)

		deinit.add(()=> {
			dlog('queue.poll.deinit')
			this.queue_poll_stop()
		})
		this.queue_poll_start()

		// const res_raw = await execute_to_objects(this.session, query, param)

		// console.dir(await yt_api.channel_by_username({
		// 	username: yt_channel_username_beneater,
		// }), {depth: 5})

	},
	exit () { // not in use?
		deinit.exit()
	},

	queue_poll_delay: 1000,
	queue_poll_timeout: null,
	queue_poll_running: false,
	queue_poll_start () {
		if (this.queue_poll_running) return
		this.queue_poll_running = true
		this.queue_poll_do()
	},
	queue_poll_stop () {
		this.queue_poll_running = false
		if (this.queue_poll_timeout!==null) {
			clearTimeout(this.queue_poll_timeout)
			this.queue_poll_timeout = null
		}
	},
	async queue_poll_do () {

		dlog('queue_poll_do')

		if (this.queue_poll_running) {
			this.queue_poll_timeout = setTimeout(()=> this.queue_poll_running && this.queue_poll_do(), this.queue_poll_delay)
		}
	},
}


// start

main.init()
	.catch(err=> (console.log('main error'), console.error(err)))
