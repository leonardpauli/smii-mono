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
	
	},

}

module.exports = {default: fragment}
