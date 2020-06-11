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



		// const d = await yt_api.channel_by_username({
		// 	username: yt_channel_username_beneater,
		// })
		// const d = await yt_api.channels_by_ids({
		// 	ids: [yt_channel_id_linustechtips],
		// })
		// console.dir(d, {depth: 7})
		
		await this.batch_fetch_import_channels([
			{slug: yt_channel_username_beneater},
		])

		this.exit()

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
			template: channel_raw_template,
			source: raw,
			ctx: {obj},
			rest_target: obj.left = {},
		})
		obj.left = JSON.stringify(obj.left)
		console.dir(obj, {depth: 4})

		/*
		TODO:
		- publishedAt -> published_at
		- videoCount -> post_count
		- :Video -> :Video:Post
		- fetchedAt -> fetched_at
		- clean hiddenSubscriberCount / subscriber_count=0 -> null
		- what if same slug but different id?
		- v_keywords
		- obj_extract
		*/
	
	},
}


const v_use_empty = false
const v = path=> (v, ctx)=> {
	const is_empty = v==='' || v===undefined || v===null
	if (!v_use_empty && is_empty) return
	ctx.obj[path] = is_empty? null: v
}
const v_rest = path=> (v, ctx)=> {
	const is_empty = v==='' || v===undefined || v===null
	if (!v_use_empty && is_empty) return
	ctx.obj.rest[path] = is_empty? null: v
}

const v_keywords = path=> (v, ctx)=> {}


const channel_raw_template = {
	kind: noop,
	// etag: v_rest('yt_etag'),
	id: v('id'),
	snippet: {
		title: v_rest('title'),
		description: v('description'),
		customUrl: v('slug'),
		publishedAt: v('published_at'),
		thumbnails: Object.fromEntries('default,medium,high'.split(',').map(k=> [k, {
			// template: width, height // 88, 240, 800
			url: v_rest(`image_${k}`),
			width: noop,
			height: noop,
		}])),
		localized: noop || {
			title: noop,
			description: noop,
		},
		country: v('country'), // empty or eg. 'CA'
	},
	contentDetails: {
		relatedPlaylists: {
			uploads: v('uploads_playlist_id'), // playlist_id
			likes: v('likes_playlist_id'), // '' or playlist_id
			favorites: v('favorites_playlist_id'), // '' or playlist_id
			watchHistory: noop, // 'HL',
			watchLater: noop, // 'WL',
		},
	},
	statistics: {
		viewCount: v('view_count'), // string (import as full neo4j int)
		commentCount: a=> v('comment_count')(a==='0'?null:a),
		subscriberCount: v('subscriber_count'), // null if hiddenSubscriberCount===true
		hiddenSubscriberCount: v('subscriber_count_hidden'), // boolean
		videoCount: v('post_count'),
	},
	brandingSettings: {
		channel: {
			title: noop,
			description: noop,
			keywords: v_keywords('keywords'), // empty or space-separated (beware of quotes, see existing parsing)
			defaultTab: noop, // 'Featured',
      // showRelatedChannels: true,
      showBrowseView: noop, // true,
		},
		image: {
			bannerImageUrl: noop,

			bannerTabletLowImageUrl: noop,
			bannerTabletImageUrl: noop,
			bannerTabletHdImageUrl: noop,
			bannerTabletExtraHdImageUrl: v_rest('image_banner_default'),

			bannerMobileImageUrl: noop,
			bannerMobileLowImageUrl: noop,
			bannerMobileMediumHdImageUrl: noop,
			bannerMobileHdImageUrl: noop,
			bannerMobileExtraHdImageUrl: noop,

			bannerTvImageUrl: noop,
			bannerTvLowImageUrl: noop,
			bannerTvMediumImageUrl: noop,
			bannerTvHighImageUrl: v_rest('image_banner_high'),
		},
		hints: noop, // meta data/additional kv fields?
	},
}


// start

main.init()
	.catch(err=> (console.log('main error'), console.error(err)))
