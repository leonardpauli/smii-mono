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

const {config} = require('../../config.js')



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
country_code_normalise_get.fn = ()=> {throw new Error(
	`await country_code_normalise_get.fn_init() first`)}
country_code_normalise_get.fn_init = async ()=> {
	country_code_normalise_get.fn = await country_code_normalise_get()
}


let cache_dir_path_loaded = null
const cache_dir_get = async ()=> {
	return cache_dir_path_loaded
		? cache_dir_path_loaded
		: (cache_dir_path_loaded = await fs_dir_ensure_full('./local/cache'))
}

const json_cache_use = async ({id, fn, clear_cache = false})=> {
	// TODO: ensure id is valid filename (chars + length, or just use fs to check) + use path.join
	// TODO: do filename mangling separately to ensure no unexpected collisions
	const cachefile = `${await cache_dir_get()}/${encodeURIComponent(''+id).trim().slice(0,250)}.json`
	if (!clear_cache) {
		const cache = await fs_json_file_read(cachefile)
		if (cache) return cache
	}

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



const clear_as_num = (row, k)=> {
	if (!row[k] && row[k]!==0) delete row[k]
	else if (typeof row[k]==='string') {
		const parsed = parseFloat(row[k])
		if (!isNaN(parsed)) row[k] = parsed
	}
}

const clear_as_date = (row, k)=> {
	if (!(k in row)) return
	if (!row[k]) {
		delete row[k]
	} else {
		const d = new Date(row[k])
		if (d && !isNaN(d.getDate())) {
			row[k] = d
		} else {
			row[k+'_other'] = d
			delete row[k]
		}
	}
}

const clear_country_code = (row, k)=> {
	if (!(k in row)) return
	if (!row[k]) {
		delete row[k]
	} else {
		const m = country_code_normalise_get.fn(row[k])
		// m = country_iso
		if (m) {
			row[k] = m
		} else {
			row[k+'_other'] = row[k]
			delete row[k]
		}
	}
}

const channel_url_parse = str=> {
	const row = {}
	if (!str) return row
	const m = yt_api__channel_url_parse(str)
	if (m && m.type==='channel') {
		row.id = m.id
	} else if (m && m.type==='user') {
		row.slug = m.id
	} else {
		row.other = str
	}
	return row
}



const step_get = ({prefix})=> {
	const tlog = ({at, ...rest})=> dlog.time({at: prefix+'.'+at, ...rest})
	const step = async ({id, fn, parse = v=> v, log = (v, _res)=> ({count: v.length}), clear_cache = false})=> {
		const res = await json_cache_use({
			id: prefix+'.'+id,
			fn,
			clear_cache,
		})
		const parsed = parse(res)
		tlog({at: id, ...log(parsed, res)})
		return parsed
	}
	return {step, tlog}
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



module.exports = {
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
}
