const {dlog} = require('@leonardpauli/utils/src/log.js')
const {config} = require('../config.js')
const {queries} = require('./queries.js')


const fragment = {
	
	queue_poll_delay: config.queue_poll_delay,
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

		const p_id = config.processor_id
		const res = await this.neo4j_request(queries['queue take awaiting']({
			p_id: '$p_id', count: config.queue_take_count}), {p_id})
		await this.batch_fetch_import_channels(res, {p_id})

		if (this.queue_poll_running) {
			this.queue_poll_timeout = setTimeout(()=> this.queue_poll_running && this.queue_poll_do(), this.queue_poll_delay)
		}
	},

}

module.exports = {default: fragment}
