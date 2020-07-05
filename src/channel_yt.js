const {
	obj_extract, obj_map,
	error: error_make,
	json_to_string_or_empty,
} = require('@leonardpauli/utils/src/misc.js')

const {dlog} = require('@leonardpauli/utils/src/log.js')
const {yt_api} = require('./yt_api.js')

const {config} = require('../config.js')

const raw_templates = require('./raw_templates.js')
const {queries} = require('./queries.js')


const fragment = {

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

				// TODO: error == 'no result' should not be logged as an error? but set .missing=true? (+delete .missing on successful match import)

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

				/* {
				  "endpoint": "/channels",
				  "query": {"part": [...],"id": ["UCgO0J4fCNTyU-PibDiNEFjQ"]},
				  "date": "2020-06-17T23:16:30.545Z",
				  "error": { "error": {
			      "code": 403,
			      "message": "The request cannot be completed because you have exceeded your <a href=\"/youtube/v3/getting-started#quota\">quota</a>.",
			      "errors": [{
		          "message": "The request cannot be completed because you have exceeded your <a href=\"/youtube/v3/getting-started#quota\">quota</a>.",
		          "domain": "youtube.quota",
		          "reason": "quotaExceeded"
		        }]
				  } },
				  "status": 403
				} */

				const status_forbidden = error.data && error.data.status===403
				if (status_forbidden) {
					let is_quotaExceeded = false
					try {
						is_quotaExceeded = error.data.error.error.errors[0].reason === 'quotaExceeded'
					} catch (e) { /*noop*/ }
					if (is_quotaExceeded) {
						dlog({at: 'batch_fetch_import_channels.quotaExceeded', is_quotaExceeded})
						process.exit(0)
						return
					}
				}
			}
		}

	},

	async fetch_import_channel ({id, slug}, ctx) {
		if (id) {
			const res = await yt_api.channels_by_ids({
				ids: [id],
			})
			if (res.error) throw error_make({...res, at: 'yt_api'})
			if (!res.data || !res.data) {
				const err = new Error(`no res.data`)
				err.data = res
				throw err
			}
			const is_empty = res.data.pageInfo.totalResults===0 || !res.data.items || !res.data.items.length
			const d_raw = is_empty?{id, empty: true}:res.data.items[0]

			await this.import_channel(d_raw, {ctx, fetched_at: res.date})
		} else if (slug) {
			const res = await yt_api.channel_by_username({
				username: slug,
			})
			if (res.error) throw error_make({...res, at: 'yt_api'})
			if (!res.data || !res.data.items) {
				const err = new Error(`no res.data`)
				err.data = res
				throw err
			}
			const is_empty = res.data.pageInfo.totalResults===0 || !res.data.items || !res.data.items.length
			const d_raw = is_empty?{slug, empty: true}:res.data.items[0]

			await this.import_channel(d_raw, {ctx, fetched_at: res.date})
		} else throw new Error(`no id or slug`)
	},

	async import_channel (raw, {ctx, fetched_at}) {
		// raw: {id and/or slug, empty: true} or {id, ...}

		const obj = {
			fetched_at: fetched_at.toISOString(),
			rest: {},
		}

		const mark_empty = !!raw.empty
		if (!mark_empty) try {
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
		console.dir({raw, obj, ctx}, {depth: 8})
		if (!ctx.q_id) {
			await this.neo4j_request(`
				with $channel_raw as channel_raw
				${queries.channel_import({channel_raw: 'channel_raw', mark_empty})}
				return 0
			`, {channel_raw: obj})
		} else {
			await this.neo4j_request(`
				with $p_id as p_id, $xs as xs
				${queries.channel_import_queued_mark_done({p_id: 'p_id', xs: 'xs', mark_empty})}
				return 0
			`, {
				p_id: ctx.p_id,
				xs: [{channel: obj, q_id: ctx.q_id}],
			})
		}
	
	},

}

module.exports = {default: fragment}
