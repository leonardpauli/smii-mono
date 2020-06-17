const fs = require('fs')

const {yt_api} = require('../yt_api.js')
const {fs_json_file_read} = require('@leonardpauli/utils/src/fs.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {
	identity, obj_entries_map, obj_map, xs_group,
	xs_overview, xs_number_overview,
} = require('@leonardpauli/utils/src/misc.js')
const {queries, example_channel_raw} = require('../queries.js')

const {config} = require('../../config.js')

const yt_channel_id_linustechtips = 'UCXuqSBlHAE6Xw-yeJA0Tunw'
const yt_channel_username_beneater = 'eaterbc'


async function main () {

	false && console.dir(await yt_api__i18n_regions())

	await nordvpn_clean.call(this)

	if (false) {
		const d = await yt_api.videos({
			video_ids: ['W-hVyrWfa2s'],
		})
		// const d = await yt_api.channels_by_ids({
		// 	ids: [yt_channel_id_linustechtips],
		// })
		console.dir(d, {depth: 7})
	}
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

	console.dir(xs_overview(raw.slice(10), {unwrap: true, string_limit: 0}), {depth: 8})

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


const yt_api__i18n_regions = async ()=> {
	const get_raw = async ()=> {
		const cachefile = './local/yt_api.i18n_regions.json'
		const cache = await fs_json_file_read(cachefile)
		if (cache) return cache

		const d = await yt_api.i18n_regions()
		await fs.promises.writeFile(cachefile, JSON.stringify(d))
		return d
	}

	const raw = await get_raw()
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
