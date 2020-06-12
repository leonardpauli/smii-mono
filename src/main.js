const neo4j = require('neo4j-driver')
const neo4j_utils = require('@leonardpauli/utils/src/neo4j.js')(neo4j)

const {
	noop,
	is_object, obj_extract,
	xs_remove,
	catch_allow_code,
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

	async fetch_import_channel ({id, slug}, ctx) {
		if (id) {
			const res = await yt_api.channels_by_ids({
				ids: [id],
			})
			if (!res.data || !res.data.items || !res.data.items.length)
				throw new Error(`!res.data.items.length ${id}`)
			const d_raw = res.data.items[0]

			await this.import_channel(d_raw, {ctx, fetched_at: res.date})
		} else if (slug) {
			const res = await yt_api.channel_by_username({
				username: slug,
			})
			if (!res.data || !res.data.items || !res.data.items.length)
				throw new Error(`!res.data.items.length ${slug}`)
			const d_raw = res.data.items[0]

			await this.import_channel(d_raw, {ctx, fetched_at: res.date})
		} else throw new Error(`no id or slug`)
	},

	async import_channel (raw, {ctx, fetched_at}) {

		const obj = {
			fetched_at: fetched_at.toISOString(),
			rest: {},
		}
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
		console.dir(obj, {depth: 4})

		if (!ctx.q_id) {
			await this.neo4j_request_and_log(`
				with $channel_raw as channel_raw
				${queries.channel_import()}
				return n.title
			`, {channel_raw: obj})
		} else {
			await this.neo4j_request_and_log(`
				with $p_id as p_id, $xs as xs
				${queries.channel_import_queued_mark_done()}
				return 1
			`, {
				p_id: ctx.p_id,
				xs: [{channel: obj, q_id: ctx.q_id}],
			})
		}


		/*
		TODO:
		- write update/import channel query + test it
		- add lib file for queue queries?
		- use lib for queue (+ make it automatic)
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
