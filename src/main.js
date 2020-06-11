const neo4j = require('neo4j-driver')
const neo4j_utils = require('@leonardpauli/utils/src/neo4j.js')(neo4j)

const {
	noop,
	is_object, obj_extract,
	xs_remove,
} = require('@leonardpauli/utils/src/misc.js')

const deinit = require('@leonardpauli/utils/src/deinit.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {yt_api} = require('./yt_api.js')

const {config} = require('../config.js')

const {tmp_scripts} = require('./tmp_scripts.js')
const raw_templates = require('./raw_templates.js')


const main = {
	async init () {
		dlog({at: 'main.start'})

		this.session = neo4j_utils.session_setup({config: config.neo4j, deinit})

		config.youtube.key = config.youtube.key_list[0]
		await yt_api.init(config.youtube)


		const tmp_scripts_run = true
		if (tmp_scripts_run) {
			await tmp_scripts.call(this)
			this.exit()
			return
		}


		deinit.add(()=> {
			dlog('queue.poll.deinit')
			this.queue_poll_stop()
		})
		this.queue_poll_start()

	},
	exit () { // not in use?
		deinit.exit()
	},

	neo4j_request (query, params = {}) {
		return neo4j_utils.execute_to_objects(this.session, query, params)
	},

	async neo4j_request_and_log (query, params = {}) {
		const res = await neo4j_utils.execute_to_objects(this.session, query, params)
		console.dir(res, {depth: 5})
	},

	async neo4j_batch_process_all_nodes ({
		node_label,
		i: i_start = 0,
		size = 10000,
		query, // eg. where v.published_at is null set v.published_at = v.publishedAt
	}) {
		let i = i_start
		
		const res = await this.neo4j_request(`match (v:${node_label}) return count(v) as count`)
		const total = res[0].count
		dlog.time({at: 'batch.start', node_label, total})

		while (true) {
			const res = await this.neo4j_request(`
				match (v:${node_label}) with v
				skip tointeger($i*$size) limit tointeger($size)
				with collect(v) as vs, count(v) as count_all
				call apoc.cypher.doIt("
					unwind $vs as v
					with v
					${query}
					return count(v) as count
				", {vs: vs}) yield value
				return value.count as count, count_all
			`, {size, i})
			const {count, count_all} = res[0]
			const done = count_all<size
			dlog.time({
				at: 'batch.done', i, count, count_all,
				progress: (i*size + count_all)/total,
			})
			if (done) break;
			i++
		}
		return i
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

	async batch_fetch_import_channels (xs) {
		if (xs.length!==1) throw new Error(`TODO: batch import by combining ids fetch (yt_api.channels_by_ids)`)

		await this.fetch_import_channel(xs[0])
	},

	async fetch_import_channel ({id, slug}) {
		if (id) {
			const res = await yt_api.channels_by_ids({
				ids: [id],
			})
			if (!res.data || !res.data.items || !res.data.items.length)
				throw new Error(`!res.data.items.length ${id}`)
			const d_raw = res.data.items[0]

			await this.import_channel(d_raw, {fetched_at: res.date})
		} else if (slug) {
			const res = await yt_api.channel_by_username({
				username: slug,
			})
			if (!res.data || !res.data.items || !res.data.items.length)
				throw new Error(`!res.data.items.length ${slug}`)
			const d_raw = res.data.items[0]

			await this.import_channel(d_raw, {fetched_at: res.date})
		} else throw new Error(`no id or slug`)
	},

	async import_channel (raw, {fetched_at}) {

		const obj = {
			fetched_at,
			rest: {},
		}
		obj_extract({
			template: raw_templates.channel,
			source: raw,
			ctx: {obj},
			rest_target: obj.left = {},
		})
		obj.left = JSON.stringify(obj.left)
		console.dir(obj, {depth: 4})

		/*
		TODO:
		- :Video -> :Video:Post
		- clean hiddenSubscriberCount / subscriber_count=0 -> null
		- (:Channel)-[:has_post]->(:Post)
		- what if same slug but different id?
		- v_keywords
		*/
	
	},
}



// start

main.init()
	.catch(err=> (console.log('main error'), console.error(err)))
