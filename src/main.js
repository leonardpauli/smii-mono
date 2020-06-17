const neo4j = require('neo4j-driver')
const neo4j_utils = require('@leonardpauli/utils/src/neo4j.js')(neo4j)

const deinit = require('@leonardpauli/utils/src/deinit.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {yt_api} = require('./yt_api.js')

const {config} = require('../config.js')

const dev_snippets = require('./snippets/index.js')
const {queries} = require('./queries.js')


const fragment_queue = require('./queue.js').default
const fragment_neo4j = require('./neo4j.js').default
const fragment_channel_yt = require('./channel_yt.js').default
const fragment_video_yt = require('./video_yt.js').default


const main = {
	async init () {
		dlog({at: 'main.init'})

		const driver = neo4j_utils.driver_setup(config.neo4j)
		this.session = driver.session()
		deinit.add(()=> {
			dlog('closing neo4j connection...')
			return this.session.close()
		})

		// TODO: key shifting?
		config.youtube.key = config.youtube.key_list[0]
		await yt_api.init(config.youtube)

		return this.start()
	},

	async start () {
		if (dev_snippets.enabled) {
			await dev_snippets.main.call(this)
			return deinit.exit()
		} else {
			return this.processor_start()
		}
	},

	async processor_start () {
		const p_id = config.processor_id

		await this.neo4j_request_and_log(
			queries['processor register/ensure and mark as started']({p_id: '$p_id'}), {p_id})

		await this.neo4j_request_and_log(
			queries['queue inspect taken for processor']({p_id: '$p_id'}), {p_id})


		deinit.add(()=> {
			dlog('queue.poll.deinit')
			this.queue_poll_stop()
		})
		this.queue_poll_start()
	},


	// TODO: convert fragments (potentially namespace conflicting) to own objects?

	...fragment_queue,

	...fragment_neo4j,

	...fragment_channel_yt,

	...fragment_video_yt,

}



// start

main.init()
	.catch(err=> (console.log('main error'), console.error(err)))
