const fs = require('fs')

const {yt_api} = require('../yt_api.js')
const {fs_json_file_read, fs_dir_ensure_full} = require('@leonardpauli/utils/src/fs.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {
	identity, obj_entries_map, obj_map, obj_map_values, xs_group,
	xs_sum,
	xs_overview, xs_number_overview,
} = require('@leonardpauli/utils/src/misc.js')
const {queries, example_channel_raw} = require('../queries.js')

const {config} = require('../../config.js')

const yt_channel_id_linustechtips = 'UCXuqSBlHAE6Xw-yeJA0Tunw'
const yt_channel_username_beneater = 'eaterbc'


async function main () {

	// TODO: (l:Log)--(q:Queued {status: 'failed'})--(c:Channel_yt) where c.fetched_at is not null detach delete l, q
	// TODO: merge id + slug node, eg.
	// 	error: Neo4jError: Node(5014713) already exists with label `Channel_yt` and property `slug` = 'fotoschnack'

	if (false) {
		const channels_to_fetch = await fs_json_file_read('./local/nordvpn_jun20.channels_to_fetch.json')
		const channel_ids = channels_to_fetch.map(a=> a.id).filter(Boolean)
		const channel_slugs = channels_to_fetch.filter(a=> a.slug)

		const size = 10
		let i = 0
		console.dir(channel_slugs.length)
		await this.neo4j_request_and_log(
			queries['queue add channels once']({xs: '$xs'}), {
				xs: channel_slugs.slice(i*size, (i+1)*size),
			})

		return
	}


	false && console.dir(await yt_api__i18n_regions())

	if (false) {

		const campaign_id = 'nordvpn_jun20'
		const {out, missing} = await nordvpn_clean.call(this)

		dlog({
			at: 'dataset.import.start',
			channels: out.channels.length,
			posts: out.posts.length,
		})

		if (missing.channels.length || missing.posts.length) {
			dlog.warn({
				at: 'dataset.import.missing data',
				channels: missing.channels.length,
				posts: missing.posts.length,
			})
		}
		
		// TODO: json.stringify sub-fields on out?
		// console.dir(out.channels.slice(0, 3))

		true && await this.neo4j_request_and_log(
			queries['channel_add_with_campaign']({
				xs: '$xs',
				campaign_id: '$campaign_id',
			}), {
				xs: out.channels, // .slice(0, 30),
				campaign_id,
			})

		const post_meta_flatten = a=> ({
			...a,
			upload_date: a.upload_date && a.upload_date.toISOString(),
		})
		const post_flatten = a=> ({...a, meta: a.meta && post_meta_flatten(a.meta)})

		// console.dir(out.posts.slice(0, 3).map(post_flatten))
		true && await this.neo4j_request_and_log(
			queries['video_add_with_campaign']({
				xs: '$xs',
				campaign_id: '$campaign_id',
			}), {
				xs: out.posts.map(post_flatten), // .slice(0, 3),
				campaign_id,
			})
	}

	if (false) {
		await this.neo4j_request_and_log(`
		  match (:CampaignData)--(c:Channel_yt)
		  where c.fetchedAt is null
		  and not (c)<-[:has_node]-(:Queued)
		  with c // order by rand() limit 10 // return c
		  merge (c)<-[:has_node]-(q:Queued {created_at: datetime(), priority: 1.0})
		  return count(c), count(q)
		`)

		// match (cd:CampaignData)--(x:Video) with cd, x match (x)--(m)--(c:Channel) optional match (c)--(q:Queued) return x, cd, c, m, q
		// match (cd:CampaignData)--(x:Channel) with cd, x match (c)--(q:Queued) return x, cd, c, q
	}



	if (false) {
		const d = await yt_api.videos({
			video_ids: ['W-hVyrWfa2s'],
		})
		// const d = await yt_api.channels_by_ids({
		// 	ids: [yt_channel_id_linustechtips],
		// })
		console.dir(d, {depth: 7})
	}

	if (true) {
		const campaign_id = 'nordvpn_jun20'

		const tlog = ({at, ...rest})=> dlog.time({at: campaign_id+'.'+at, ...rest})
		const step = async ({id, fn, parse = v=> v, log = (v, _res)=> ({count: v.length})})=> {
			const res = await json_cache_use({
				id: campaign_id+'.'+id,
				fn,
			})
			const parsed = parse(res)
			tlog({at: id, ...log(parsed, res)})
			return parsed
		}

		const videos_load = async (video_ids)=> {
			const videos = []

			const size = 50
			let i=0, slice
			do {
				slice = video_ids.slice(i*size, (i+1)*size)
				if (slice.length==0) break
			
				const items = await step({
					id: 'yt_video_load.v4.'+i,
					fn: ()=> yt_api.videos({video_ids: slice}),
					parse: v=> v.data && v.data.items || [],
					log: (_, v)=> v.data && ({page_info: v.data.pageInfo, date: v.date}),
				})

				videos.push(...items)

				i++
			} while (true)
			

			const by_channel = xs_group(videos, {key_get: v=> v.snippet.channelId})
			const by_video = {}; videos.map(v=> {by_video[v.id] = v})
			// console.dir(by_channel, {depth: 2})

			return {by_channel, by_video}
		}


		tlog({at: 'channel_ids start'})


		const vid_w_sales = await step({
			id: 'vid_entries_w_sales.v3',
			fn: ()=> this.neo4j_request(`
				match (cp:Campaign {id: $campaign_id})
				match (cp)--(cd:CampaignData)--(v:Video)
				// match (v)--(:Playlist)<-[:has_uploads]-(ch:Channel)--(chd:CampaignData)--(cpp:Campaign)
				where cd.sales is not null // and ch.fetched_at is not null
				return v.id as v_id, case when v.title is null then false else true end as fetched
			`, {campaign_id}),
			parse: v=> ({
				all: v.map(r=> r.v_id),
				fetched: v.filter(r=> r.fetched).map(r=> r.v_id),
				fetchednot: v.filter(r=> !r.fetched).map(r=> r.v_id),
			}),
			log: (v)=> obj_map_values(v, v=> v.length),
		})

		const {list: channel_ids, v: campaign_extract} = await step({
			id: 'channel_ids.v1',
			fn: ()=> campaign_extract_for_ml.call(this, {campaign_id}),
			parse: v=> ({v, list: [...new Set(v.map(r=> r.ch_id))]}),
			log: (v)=> ({channels: v.list.length, posts: v.v.length}),
		})

		const video_ids = await step({
			id: 'video_ids',
			fn: ()=> latest_video_ids_for_channels.call(this, {channel_ids, group_size: 10}),
			parse: v=> v.map(a=> a.v_id),
		})

		// ensure latest + campaign posts are taken
		campaign_extract.map(a=> a.post_id)
			.forEach(a=> !video_ids.includes(a) && video_ids.push(a))

		// // console.dir(video_ids.slice(2, 4))
		// // return

		// const d = await yt_api.videos({
		// 	video_ids: video_ids.slice(0, 100), // ['H7wx-35QSUM', 'Tp--FkiHyes'], // ['AjWRjVYA0PY', 'huKsSliDD3A'],
		// 	// also checkout the other .parts
		// })
		// console.dir(d, {depth: 8})
		// return
		

		if (false) {
			video_ids.push(...vid_w_sales.fetchednot)
			const still_missing_2 = [
				'l-C_367kkno', '7juLa6gqlag',
				'iVSNIIuARRE', 'Df_FnXUtAqA',
				'luiDm9DoMi8', '4RslRIW7vmw',
				'H6leGvf6BeM', 'ek-w7Sk-UMI',
				'RqnTkbfsvBg', 'tr5Qc8Zv6pU',
				'AB6pnwdjphA', 'W-j71YB6HH4',
				'6nh4bhXRzhg', 'wegxoNTw0_I',
				'xEKu1UBlUE8', '47xCRy-7TWw',
				'hibIJbNLLgA', '3c2wdDsaqkI',
				'NBDaLK6EjwI', 'cjP6TCQHGxs',
				'rhexnPq1Irw', 'hb8G7Su0IeM',
				'8OS6bnz67UY', 'RhZBSbQaWdc',
				'pX3tHaA8JnA', '5Cugm2Rh4eI',
				'aIqhu8ctmFo', 'qgttZr_cjqU'
			]
			video_ids.push(...still_missing_2)

			const {by_channel, by_video} = await videos_load(video_ids)

			const still_missing = vid_w_sales.all
				.map(id=> [id, by_video[id] && by_video[id].snippet.title?true:false])
				.filter(a=> !a[1]).map(a=> a[0])
			console.dir({still_missing})
			if (still_missing.length) return

			const chvs = vid_w_sales.all.map(id=> by_video[id])
				.map(v=> ({id: v.id, ch_id: v.snippet.channelId}))
			// console.dir(chvs)

			await step({
				id: 'chvs',
				fn: ()=> Promise.resolve(chvs),
			})

			return
		}

		const {by_channel, by_video} = await videos_load(video_ids)
		return

		const prepare_channel_stat_avgs = (ch_id, vs)=> {
			// clean/parse
			vs.forEach(v=> {
				if (v.statistics) {
					v.stats = obj_map_values(v.statistics, v=> v*1)
					delete v.statistics
				} else {v.stats = {}}
				if (v.contentDetails) {
					v.stats.duration = yt_dur_parse(v.contentDetails.duration)
					delete v.contentDetails.duration
				}
			})

			// extract
			vs.forEach(v=> {
				const {stats} = v
				v.stats_calc = {
					likes_per_dislikes: stats.likeCount/stats.dislikeCount || null,
					likes_per_rates: stats.likeCount/(stats.likeCount+stats.dislikeCount) || null,
					likes_per_views: stats.likeCount/stats.viewCount || null,
					comments_per_views: stats.commentCount/stats.viewCount || null,
					duration: stats.duration || null,
				}
			})

			const field_avg = (xs, vget = v=> v)=> {
				const vs = xs.map(vget)
				const ns = vs.filter(v=> typeof v==='number')
				return xs_sum(ns)/ns.length
			}
			const stat_avgs = {
				likes_per_dislikes: field_avg(vs, v=> v.stats_calc.likes_per_dislikes),
				likes_per_rates: field_avg(vs, v=> v.stats_calc.likes_per_rates),
				likes_per_views: field_avg(vs, v=> v.stats_calc.likes_per_views),
				comments_per_views: field_avg(vs, v=> v.stats_calc.comments_per_views),
				duration: field_avg(vs, v=> v.stats_calc.duration),
				views: field_avg(vs, v=> v.stats.viewCount),
			}

			// const overview = xs_overview(vs_stats, {unwrap: true, string_map: v=> v.slice(0, 50)})
			// console.dir({ch_id, stat_avgs}, {depth: 7})
			// return
			return stat_avgs
		}

		const ch_stat_avgs_map = Object.fromEntries([...by_channel]
			.map(([ch_id, vs])=> [ch_id, prepare_channel_stat_avgs(ch_id, vs)]))

		// const overview = xs_overview(Object.values(ch_stat_avgs_map))
		// console.dir({ch_stat_avgs_overview: overview}, {depth: 7})

		campaign_extract.map(c=> {
			const stats = ch_stat_avgs_map[c.ch_id]
			if (stats) {
				Object.entries(stats).map(([k, v])=> {
					c['ch_avg10_'+k] = v
				})
				c.ch_avg10_views_per_subs = stats.views/c.subscriber_count||null
			}
			const vid = by_video[c.post_id]
			if (vid) {
				c.view_count = vid.stats.viewCount
			}
			if (!c.view_count) {
				console.dir({pid: c.post_id, vid})
			}
		})

		// console.dir(campaign_extract)
		// cvr
		// ldr
		const tsv = xs_to_tsv(campaign_extract, {fields: (
			'post_id	ch_id	country	view_count	ch_avg10_likes_per_dislikes	ch_avg10_likes_per_rates	ch_avg10_likes_per_views	ch_avg10_comments_per_views	ch_avg10_views'+
			'	ch_avg10_duration	ch_avg10_views_per_subs	subscriber_count	sales	cost	ch_sales_from_fees	ch_revenue	category	ch_name').split('\t')})
		// console.log(tsv)
		const filename = './local/'+campaign_id+'.campaign_extract.v1.tsv'
		await fs.promises.writeFile(filename, tsv)

		tlog({at: 'wrote', filename, count: campaign_extract.length})


		return

		/*
		Plan:
		batch process: a
		
		with ['UC9VMz-llpSHTIfOzuggf5zA', 'UCzRE5sLT_nQQaxUCnADO0bQ'] as a
		unwind a as ch_id
		call apoc.cypher.doIt("
			match (ch:Channel {id: ch_id})-[:has_uploads]->(:Playlist)-[:has_video]->(v:Video)
			with ch, v order by v.published_at desc limit 10
			return ch.id as ch_id, v.id as v_id
		", {ch_id: ch_id}) yield value
		return value.ch_id, value.v_id, value.v_d

		// explore how many results per page / video_ids to send at max
		// TODO: later add logic to detect if changed / total results > results on page
		// use max count as batch process bucket size in prev
		const d = await yt_api.videos({
			video_ids: ['AjWRjVYA0PY', 'huKsSliDD3A'],
			// also checkout the other .parts
		})

		send response for import/merge to db

		modify campaign_extract_for_ml query to include + do arithmetic on last 10 vids where data is available

		upload tsv file to slack
		 */
		
		// const d = await yt_api.videos({
		// 	video_ids: ['AjWRjVYA0PY', 'huKsSliDD3A'],
		// 	// also checkout the other .parts
		// })
		// console.dir(d, {depth: 10})

	}


	if (false) {
		const res = await campaign_extract_for_ml.call(this, {campaign_id: 'nordvpn_jun20'})
		console.log(xs_to_tsv(res))
	}
}

const yt_dur_parse = str=> {
	if (!str) return null
	// PT11M26S
	let ms = 0

	const factor_map = {
		S: 1000,
		M: 1000*60,
		H: 1000*60*60,
		D: 1000*60*60*24,
	}

	const res = (''+str).replace(/^PT/, '').replace(/(\d+)(\w)/g, (_all, n, l)=> {
		const f = factor_map[l]
		if (!f) return _all
		ms += parseInt(n, 10)*f
		return ''
	})

	if (res.length) {
		dlog.warn({at: 'yt_dur_parse.failed', str})
		return null
	}

	return ms
}


const xs_to_tsv = (xs, {fields = Object.keys(xs[0])}={})=> {
	const fix_line = xs=> xs.map(a=> (''+a).replace(/[\t\n]+/g, ' ')).join('\t')

	let txt = ''
	txt += fix_line(fields)+'\n'
	for (const row of xs) {
		txt += fix_line(fields.map(k=> row[k]))+'\n'
	}

	return txt
}

async function latest_video_ids_for_channels ({channel_ids, group_size = 10}) {
	// channel_ids = ['UC9VMz-llpSHTIfOzuggf5zA', 'UCzRE5sLT_nQQaxUCnADO0bQ']
	const res = await this.neo4j_request(`
		unwind $channel_ids as ch_id
		call apoc.cypher.doIt("
			match (ch:Channel {id: ch_id})-[:has_uploads]->(:Playlist)-[:has_video]->(v:Video)
			with ch, v order by v.published_at desc limit ${group_size}
			return ch.id as ch_id, v.id as v_id
		", {ch_id: ch_id}) yield value
		return value.ch_id as ch_id, value.v_id as v_id
	`, {channel_ids})
	return res
}

async function campaign_extract_for_ml ({campaign_id, by_video = false}) {
	// post_id - unique identifies of the post
	// ch_id - unique identifier of a particular channel,
	// ch_name - the name of a particular channel,
	// country - the influencer's country of origin,
	// category - the category that best describes the channel's main topic,
	// cvr - channel view rate (average views/subscribers for the last 10 posts posted)
	// ldr - likes/dislikes ratio (average likes/dislikes for the last 10 posts posted)

	const res = await this.neo4j_request(`
		match (cp:Campaign {id: $campaign_id})
		match (cp)--(cd:CampaignData)--(v:Video)
		where v.title is not null
		match (v)--(:Playlist)<-[:has_uploads]-(ch:Channel)--(chd:CampaignData)--(cpp:Campaign)
		where cp = cpp and cd.sales is not null and ch.fetched_at is not null
		return
			v.id as post_id,
			ch.id as ch_id,
			chd.country_iso as country,
			chd.category as category, // not normalized
			ch.title as ch_name,

			ch.subscriber_count as subscriber_count,

			// as cvr,
			// as ldr

			cd.sales as sales,
			cd.cost as cost, // assumes cd.currency is same
			chd.sales_from_fees as ch_sales_from_fees,
			chd.revenue as ch_revenue

	`, {campaign_id})
	return res
}

async function nordvpn_clean () {
	const country_code_normalise = await country_code_normalise_get()

	dlog({at: 'nordvpn_clean', load: 'nordvpn_rado_v2.json'})

	const raw = require('../../local/nordvpn_rado_v2.json')

	const clear_as_num = (row, k)=> {
		if (!row[k] && row[k]!==0) delete row[k]
	}

	raw.map(row=> {
		if ('country' in row) {
			if (row.country) {
				const m = country_code_normalise(row.country)
				if (m) {
					row.country_iso = m
				} else {
					row.country_other = row.country
				}
			}
			delete row.country
		}
		if ('profile_link' in row) {
			if (row.profile_link) {
				const m = yt_api__channel_url_parse(row.profile_link)
				if (m && m.type==='channel') {
					row.id = m.id
				} else if (m && m.type==='user') {
					row.slug = m.id
				} else {
					row.profile_link_other = row.profile_link
				}
			}
			delete row.profile_link
		}
		clear_as_num(row, 'revenue')

		row.posts && row.posts.map(row=> {
			clear_as_num(row, 'clicks')
			clear_as_num(row, 'sales')
			clear_as_num(row, 'cost')
			delete row.year // clear_as_num(row, 'year')

			if ('upload_date' in row) {
				if (!row.upload_date) {
					delete row.upload_date
				} else {
					const d = new Date(row.upload_date)
					if (d) {
						row.upload_date = d
					} else {
						row.upload_date_other = d
						delete row.upload_date
					}
				}
			}

			if ('post_link' in row) {
				if (row.post_link) {
					const m = yt_api__video_url_parse(row.post_link)
					if (m) {
						row.id = m.id
						if (m.t) row.post_link_t = m.t
					} else {
						row.post_link_other = row.post_link
					}
				}
				delete row.post_link
			}

		})
	})

	// console.dir(xs_overview(raw, {unwrap: true, string_limit: 0}), {depth: 8})

	const _posts_raw = []
	const _channels_raw = raw.map(row=> {
		const {id, slug, posts, ...meta} = row
		posts && posts.map(row=> {
			const {id, ...meta} = row
			_posts_raw.push({id, meta})
		})
		return {id, slug, meta}
	})

	const out = {
		posts: [],
		channels: [],
	}
	const missing = {
		posts: [],
		channels: [],
	}

	_posts_raw.map(p=> {p.id?out.posts.push(p):missing.posts.push(p)})
	_channels_raw.map(p=> {p.id||p.slug?out.channels.push(p):missing.channels.push(p)})

	// console.dir(xs_overview([out], {unwrap: true, string_limit: 3}), {depth: 3})
	// console.dir(missing, {depth: 3})

	return {out, missing}
}


const extract_fields_grouped = (xs, {
	field_get = o=> o.id,
	parse = identity,
	group_get = parsed=> parsed,
} = {})=> {
	const fields = xs.map(field_get).filter(Boolean)
	const missing = xs.filter(v=> !field_get(v))

	const parsed = fields.map(v=> ({raw: v, parsed: parse(v)}))
	const groups = xs_group(parsed, {
		key_get: o=> o.parsed===null?null:group_get(o.parsed)
	})

	const failed = (groups.get(null) || []).map(a=> a.raw)
	groups.delete(null)

	return {
		groups,
		failed,
		missing,
	}	
}



const country_code_normalise_get = async ()=> {
	const regions = await yt_api__i18n_regions()
	
	const map = new Map()
	regions.map(r=> {
		map.set(r.id.toLowerCase(), r.id)
		r.title && map.set(r.title.toLowerCase(), r.id)
	})

	const extra = {
		'China': 'CN', 'CN': 'CN',

		'Czech': 'CZ',
		'cezch republic': 'CZ',
		'czech republic': 'CZ',
		'UK': 'GB',
		'USA': 'US',
		'Singapoore': 'SG',
		'Korea': 'KR',
		'UAE': 'AE',
		'The Netherlands': 'NL',
		'United kingdon': 'GB',
		'Taiwain': 'TW',
		'HongKong': 'HK',
	}
	Object.entries(extra).map(([k, v])=> {
		map.set(k.toLowerCase(), v)
	})

	return str=> {
		const res = map.get((str||'').trim().toLowerCase())
		return res?res:null
	}
}


let cache_dir_path_loaded = null
const cache_dir_get = async ()=> {
	return cache_dir_path_loaded
		? cache_dir_path_loaded
		: (cache_dir_path_loaded = await fs_dir_ensure_full('./local/cache'))
}

const json_cache_use = async ({id, fn})=> {
	// TODO: ensure id is valid filename (chars + length, or just use fs to check) + use path.join
	const cachefile = `${await cache_dir_get()}/${id}.json`
	const cache = await fs_json_file_read(cachefile)
	if (cache) return cache

	const d = await fn()
	await fs.promises.writeFile(cachefile, JSON.stringify(d))
	return d
}

const yt_api__i18n_regions = async ()=> {
	const raw = await json_cache_use({
		id: 'yt_api.i18n_regions',
		fn: ()=> yt_api.i18n_regions(),
	})
	
	const items = raw && raw.data && raw.data.items || []
	return items.map(v=> ({id: v.id, title: v.snippet && v.snippet.name || null}))
}

const yt_api__channel_url_parse = str=> {
	const yt_url_parse_regex = /www.youtube.com\/([^\/]*)\/([^\/]+)/
	const m = str.match(yt_url_parse_regex)
	if (!m) return null
	const [_, type, id] = m
	if (!['channel', 'user'].includes(type)) return null
	return {type, id}
}

const yt_api__video_url_parse = str=> {
	// https://www.youtube.com/watch?v=8OS6bnz67UY&t=117s
	// https://youtu.be/BTcQlBnKouM
	const yt_url_parse_regex = /(www\.)?(youtube\.com\/watch\?([^#\/]+)|youtu\.be\/([^?\/#]+))/
	const m = str.match(yt_url_parse_regex)
	if (!m) return null
	const [_all, _www, _or, qs, id] = m
	if (id) return {id}
	const qs_map = Object.fromEntries(qs.split('&').map(v=> v.split('=')))
	if (!qs_map.v) return null
	return {id: qs_map.v, t: qs_map.t}
}


module.exports = {main}
