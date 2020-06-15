const neo4j = require('neo4j-driver')
const neo4j_utils = require('@leonardpauli/utils/src/neo4j.js')(neo4j)

const {
	noop,
	is_object, obj_extract, obj_map,
	xs_remove,
	delay,
	catch_allow_code,
	error: error_make,
	json_to_string_or_empty,
} = require('@leonardpauli/utils/src/misc.js')

const deinit = require('@leonardpauli/utils/src/deinit.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {yt_api} = require('./yt_api.js')

const {config} = require('../config.js')

const {tmp_scripts} = require('./tmp_scripts.js')
const raw_templates = require('./raw_templates.js')
const {queries} = require('./queries.js')


const main = {
	async init () {
		dlog({at: 'main.start'})

		const driver = neo4j_utils.driver_setup({config: config.neo4j, deinit})
		this.session = driver.session()
		deinit.add(()=> {
			dlog('closing neo4j connection...')
			return this.session.close()
		})


		// TODO: key shifting?
		config.youtube.key = config.youtube.key_list[0]
		await yt_api.init(config.youtube)


		const tmp_scripts_run = false
		if (tmp_scripts_run) {
			await tmp_scripts.call(this)
			this.exit()
			return
		}


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
	exit () { // not in use?
		deinit.exit()
	},

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

	neo4j_request (query, params = {}) {
		return neo4j_utils.execute_to_objects(this.session, query, params)
			.catch(error=> {
				console.dir({at: 'neo4j_request.error', query, error})
				return Promise.reject(error)
			})
	},

	async neo4j_request_and_log (query, params = {}) {
		const res = await this.neo4j_request(query, params)
		console.dir(res, {depth: 5})
	},

	async neo4j_ensure_constraint_node_property_unique (name, label, what='n.id') {
		const query = `create constraint ${name} on (n:${label}) assert ${what} is unique`
		const res = await this.neo4j_request(query)
			.catch(catch_allow_code('Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists'))
		dlog.time({at: 'neo4j_ensure_constraint_node_property_unique', name, res: res===null?'existing':'created'})
	},

	async neo4j_batch_process_all_nodes ({
		node_label,
		i: i_start = 0,
		size = 10000,
		query, // eg. where n.published_at is null set n.published_at = n.publishedAt

		match_query = `match (n:${node_label}) with n`,
		limit_query = `
			skip tointeger($i*$size) limit tointeger($size)
			with collect(n) as ns, count(n) as count_all
		`,
		perform_query = `
			${query}
			return count(n) as count
		`
	}) {
		let i = i_start
		
		const res = await this.neo4j_request(`${match_query} return count(n) as count`)
		const total = res[0].count
		dlog.time({at: 'batch.start', node_label, total})

		while (true) {
			const res = await this.neo4j_request(`
				${match_query}
				${limit_query}
				call apoc.cypher.doIt("
					unwind $ns as n
					with n
					${perform_query}
				", {ns: ns}) yield value
				return value, count_all
			`, {size, i})
			const {count_all, value} = res[0]
			const done = count_all<size
			dlog.time({
				...value,
				at: 'batch.done', i, count_all,
				progress: (i*size + count_all)/total,
			})
			if (done) break;
			i++
		}
		return i
	},

	async neo4j_batch_process_until ({
		size = 10000,
		node_label,

		match_query = `match (n:${node_label}) with n`,
		limit_query = `
			limit tointeger($size)
			with collect(n) as ns, count(n) as count_all
		`,
		perform_query = `
			${query}
			return count(n) as count
		`
	}) {
		let i = 0
		
		const res = await this.neo4j_request(`${match_query} return count(n) as count`)
		const total = res[0].count
		dlog.time({at: 'batch.start', node_label, total})

		while (true) {
			const res = await this.neo4j_request(`
				${match_query}
				${limit_query}
				call apoc.cypher.doIt("
					unwind $ns as n
					with n
					${perform_query}
				", {ns: ns}) yield value
				return value, count_all
			`, {size})
			const {count_all, value} = res[0]
			const done = count_all<size
			dlog.time({
				...value,
				at: 'batch.done', i, count_all,
				progress: (i*size + count_all)/total,
			})
			if (done) break;
			i++
		}
		return i
	},

	async batch_fetch_import_channels (xs, {p_id} = {}) {
		// TODO: batch import by combining ids fetch (yt_api.channels_by_ids)

		for (const x of xs) {
			dlog({at: 'batch_fetch_import_channels.entry', x})
			try {
				await this.fetch_import_channel(x.channel, {q_id: x.q_id, p_id})
			} catch (error) {
				const log_obj = {
					...error.data?obj_map(error.data, json_to_string_or_empty):{},
					at: 'fetch_import_channel',
					error: (''+error.message).split('\n')[0],
					stack: ''+error.stack,
				}

				// TODO: refactor prop as link (to :Processor)?
				const no_queue_node = !x.q_id
				if (no_queue_node) {
					log_obj.p_id = p_id
					try {
						log_obj.x = JSON.stringify(x)
					} catch (err) {}
				}

				dlog.error({
					at: 'fetch_import_channel',
					error,
				})
				await this.neo4j_request_and_log(`
					with $log_obj as log_obj, $q_id as q_id
					${queries['queue item mark as failed']({log_obj: 'log_obj', q_id: 'q_id'})}
					return 1
				`, {
					q_id: no_queue_node?null:x.q_id,
					log_obj,
				})
			}
		}

	},

	async fetch_import_channel ({id, slug}, ctx) {
		if (id) {
			const res = await yt_api.channels_by_ids({
				ids: [id],
			})
			if (res.error) throw error_make({...res, at: 'yt_api'})
			if (!res.data || !res.data.items || !res.data.items.length)
				throw new Error(`no results`)
			const d_raw = res.data.items[0]

			await this.import_channel(d_raw, {ctx, fetched_at: res.date})
		} else if (slug) {
			const res = await yt_api.channel_by_username({
				username: slug,
			})
			if (res.error) throw error_make({...res, at: 'yt_api'})
			if (!res.data || !res.data.items || !res.data.items.length)
				throw new Error(`no results`)
			const d_raw = res.data.items[0]

			await this.import_channel(d_raw, {ctx, fetched_at: res.date})
		} else throw new Error(`no id or slug`)
	},

	async import_channel (raw, {ctx, fetched_at}) {

		const obj = {
			fetched_at: fetched_at.toISOString(),
			rest: {},
		}
		try {
			obj_extract({
				template: raw_templates.channel,
				source: raw,
				ctx: {obj},
				rest_target: obj.left = {},
			})
			obj.left = JSON.stringify(obj.left)
			if (obj.keywords) {
				obj.keywords = obj.keywords.map(v=> v.replace(/\t/g, ' ')).join('\t')
			}
			// console.dir(obj, {depth: 4})
		} catch (e) {
			// console.dir({at: 'import_channel', raw, ctx})
			throw e
		}

		if (!ctx.q_id) {
			await this.neo4j_request_and_log(`
				with $channel_raw as channel_raw
				${queries.channel_import({channel_raw: 'channel_raw'})}
				return n.title
			`, {channel_raw: obj})
		} else {
			await this.neo4j_request_and_log(`
				with $p_id as p_id, $xs as xs
				${queries.channel_import_queued_mark_done({p_id: 'p_id', xs: 'xs'})}
				return 1
			`, {
				p_id: ctx.p_id,
				xs: [{channel: obj, q_id: ctx.q_id}],
			})
		}


		/*
		TODO:
		// "done senario" seems to be working properly
		- use lib for queue
			- processor start
			- queue add channel
			- queue take channel
			- failure senarios
			- done senario
			- reset stalling + inspect logic
		- make it automatic
		- add lib (shared somehow?) to api
		- add vue starter base
		- create + deploy simple queue table viewer
		- add ability to add to queue + search
		- add graph viz
		--
		- add video fetcher
		- update viz + deploy to do-instance
		*/
	
	},
}



// start

main.init()
	.catch(err=> (console.log('main error'), console.error(err)))
