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


		tlog({at: 'channel_ids start'})

		const channel_ids = await step({
			id: 'channel_ids',
			fn: ()=> campaign_extract_for_ml.call(this, {campaign_id}),
			parse: v=> [...new Set(v.map(r=> r.ch_id))],
		})

		const video_ids = await step({
			id: 'video_ids',
			fn: ()=> latest_video_ids_for_channels.call(this, {channel_ids, group_size: 10}),
			parse: v=> v.map(a=> a.v_id),
		})

		// // console.dir(video_ids.slice(2, 4))
		// // return

		// const d = await yt_api.videos({
		// 	video_ids: video_ids.slice(0, 100), // ['H7wx-35QSUM', 'Tp--FkiHyes'], // ['AjWRjVYA0PY', 'huKsSliDD3A'],
		// 	// also checkout the other .parts
		// })
		// console.dir(d, {depth: 8})
		// return

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
		// console.dir(by_channel, {depth: 2})

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

		const overview = xs_overview(Object.values(ch_stat_avgs_map))
		console.dir({ch_stat_avgs_overview: overview}, {depth: 7})

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

		return
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

async function campaign_extract_for_ml ({campaign_id}) {
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
		where cp = cpp and chd.sales_from_fees is not null and ch.fetched_at is not null
		return
			v.id as post_id,
			ch.id as ch_id,
			chd.country_iso as country,
			chd.category as category, // not normalized
			ch.title as ch_name

			// as cvr,
			// as ldr

			// cd.sales
			// cd.cost, // assumes cd.currency is same
			// chd.sales_from_fees
			// chd.revenue

			// ch.subscriber_count
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
	const yt_url_parse_regex = /(www\.)?(youtube\.com\/watch\?([^#]+)|youtu\.be\/([^?\/#]+))/
	const m = str.match(yt_url_parse_regex)
	if (!m) return null
	const [_all, _www, _or, qs, id] = m
	if (id) return {id}
	const qs_map = Object.fromEntries(qs.split('&').map(v=> v.split('=')))
	if (!qs_map.v) return null
	return {id: qs_map.v, t: qs_map.t}
}


module.exports = {main}
