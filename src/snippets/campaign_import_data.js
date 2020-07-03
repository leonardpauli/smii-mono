const fs = require('fs')

const {yt_api} = require('../yt_api.js')
const {fs_json_file_read, fs_dir_ensure_full} = require('@leonardpauli/utils/src/fs.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {
	identity, obj_entries_map, obj_map, obj_map_values, xs_group,
	xs_sum, xs_concat,
	xs_overview, xs_number_overview,
} = require('@leonardpauli/utils/src/misc.js')
const {queries, example_channel_raw} = require('../queries.js')

const {
	extract_fields_grouped,
	country_code_normalise_get,
	cache_dir_get,
	json_cache_use,
	yt_api__i18n_regions,
	yt_api__channel_url_parse,
	yt_api__video_url_parse,

	clear_as_num,
	clear_as_date,
	clear_country_code,
	channel_url_parse,

	step_get,
	yt_dur_parse,
	xs_to_tsv,
} = require('./utils.js')

const {config} = require('../../config.js')


async function main () {

	if (true) return nordvpn_ingest.call(this)

}

async function nordvpn_ingest () {
	await country_code_normalise_get.fn_init()

	const campaign_id = 'nordvpn_jun20'

	const raw = require('../../local/nordvpn_rado_v2.json') // different format
	// const raw = require('../../local/nordvpn_rado_v3_20200701.json')
	// const raw = require('../../local/nordvpn_rado_v3_20200702.json')

	await campaign_import_data.call(this, {rows: raw, campaign_id})
	// await campaign_import_data({rows: raw, campaign_id})
	// await campaign_import_data({rows: raw, campaign_id})
}

async function campaign_import_data ({rows, campaign_id}) {
	// rows is many {url/id/slug, ...campaign_data, posts: [{url/id, ...campaign_data}, ...]}
	
	const rows_cleaned = rows.map(clean_row)

	const channels = rows_cleaned.map(({channel, campaign_data})=> ({channel, campaign_data}))
	const posts = xs_concat(rows_cleaned.map(({posts})=> posts))

	console.dir({channels, posts_count: posts.length, posts}, {depth: 4})
}

const clean_row = (row)=> {
	const {url: _url, profile_link, id, slug, posts, ...cd} = row
	const res = {}


	const channel = {id, slug}
	const url = _url || profile_link
	if (url) {
		const parsed = channel_url_parse(url)
		if (parsed.id && !channel.id) channel.id = parsed.id
		if (parsed.slug && !channel.slug) channel.slug = parsed.slug
		// TODO: avoid potential overwrite?
		if (parsed.other && !cd.url_other) cd.url_other = parsed.other
	}
	res.channel = channel


	res.campaign_data = campaign_data_flatten(cd)

	clear_country_code(res.campaign_data, 'country')

	clear_as_num(res.campaign_data, 'clicks')
	clear_as_num(res.campaign_data, 'sales')
	clear_as_num(res.campaign_data, 'revenue')
	clear_as_num(res.campaign_data, 'aov')


	if (posts && !Array.isArray(posts))
		throw new Error(`expected .posts to be array`)
	res.posts = !posts?[]:posts.map(clean_post)


	return res
}

const clean_post = (post_raw)=> {
	const {id, url: _url, post_link, ...cd} = post_raw
	const res = {}

	const post = {id}
	const url = _url || post_link
	if (url) {
		const m = yt_api__video_url_parse(url)
		if (m) {
			if (post.id && post.id!=m.id)
				throw new Error(`video id (${post.id}) + url id (${m.id}) mismatch`)
			if (!post.id) post.id = m.id
			// TODO: avoid potential overwrite?
			if (m.t && !cd.url_t) cd.url_t = m.t
		} else {
			// TODO: avoid potential overwrite?
			res.url_other = url
		}
	}
	res.post = post

	res.campaign_data = campaign_data_flatten(cd)

	clear_as_num(res.campaign_data, 'clicks')
	clear_as_num(res.campaign_data, 'sales')
	clear_as_num(res.campaign_data, 'cost')
	clear_as_date(res.campaign_data, 'upload_date')

	return res
}

const campaign_data_flatten = (raw)=> {
	const res = {}
	for (const [k, v] of Object.entries(raw)) {
		if (v===null || v===undefined) continue
		if (typeof v==='object') {
			if (Array.isArray(v)) {
				res[k] = JSON.stringify(v)
				continue
			}
			
			const keys = Object.keys(v)

			const is_currency_nested =
					keys.includes('amount') && (keys.length==1?true
				:(keys.includes('currency') && (keys.length==2?true
				: keys.includes('symbol'))))
			if (is_currency_nested) {
				res[k] = v.amount
				if (v.currency) res[k+'_currency'] = v.currency
				keys.filter(k=> !['amount', 'currency', 'symbol'].includes(k)).map((kk)=> {
					res[`${k}_${kk}`] = v[kk]
				})
				continue
			}

			res[k] = JSON.stringify(v)
			continue
		}
		if (v==='') continue
		res[k] = v
	}

	// TODO: use xs overview to find num fields with some (less) strings, and auto fix those
	// 	using eg. clear_as_num(row, 'clicks')

	return res
}


module.exports = {main, campaign_import_data}
