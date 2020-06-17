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

	dlog({at: 'nordvpn_clean', load: 'nordvpn_rado_v2.json'})

	const raw = require('../../local/nordvpn_rado_v2.json')

	console.dir(xs_overview(raw.slice(2)), {depth: 3})
	return

	// inspect profile_links
	if (true) {
		const extraction = extract_fields_grouped(raw, {
			field_get: row=> row.profile_link,
			parse: yt_api__channel_url_parse,
			group_get: parsed=> parsed.type,
		})
		extraction.groups = obj_entries_map([...extraction.groups],
			v=> histogram_get(v, {key_get: o=> o.parsed.id, limit: 1}))
		console.dir({profile_link: extraction}, {depth: 3})
	}

	// inspect country
	if (true) {
		const country_code_normalise = await country_code_normalise_get()
		const info = {
			country: histogram_get(raw, {key_get: row=> country_code_normalise(row.country)})
		}
		console.dir(info, {depth: 3})
	}

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
	regions.map(a=> console.dir(a))
	
	const map = new Map()
	regions.map(r=> {
		map.set(r.id.toLowerCase(), r.id)
		r.title && map.set(r.title.toLowerCase(), r.id)
	})

	return str=> {
		const res = map.get((str||'').trim().toLowerCase())
		return res?res:'failed '+str
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


module.exports = {main}
