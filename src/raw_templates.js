const {
	noop,
} = require('@leonardpauli/utils/src/misc.js')


const v_use_empty = false
const is_empty = v=> v==='' || v===undefined || v===null || (Array.isArray(v) && v.length===0)
const v = path=> (v, ctx)=> {
	const _is_empty = is_empty(v)
	if (!v_use_empty && _is_empty) return
	ctx.obj[path] = _is_empty? null: v
}
const v_rest = path=> (v, ctx)=> {
	const _is_empty = is_empty(v)
	if (!v_use_empty && _is_empty) return
	ctx.obj.rest[path] = _is_empty? null: v
}

const v_keywords = path=> (_v, ctx)=> {
	const res = keyword_extract(_v)
	console.log({_v, res})
	v(path)(res, ctx)
}

// str1 = 'some "hello" key "keyword" "space sepa rated" some "with, \\" sisi" maybe, even, comma'
// str2 = '"hello" key "keyword" "space sepa rated" some "with, \\" sisi" maybe, even, comma some'
// TODO: better handling of different quotes?
const keyword_extract_regex = /("|“)(([^"”\\]|\\"|\\”|\\)*)("|”)|([^"“ ]+)/g

const keyword_extract = s=> {
	if (is_empty(s)) return []
	const list = []
	let match = null
	while ((match = keyword_extract_regex.exec(s)) !== null) {
		const quoted = match[2]
		const nonquoted = match[5]
		if (quoted!==undefined) {
			list.push(quoted)
		} else if (nonquoted!==undefined) {
			list.push((nonquoted||'').replace(/,$/, ''))
		}
	}
	return list.filter(Boolean).map(a=> a.toLowerCase().replace(/“|”/g, ''))
}
// ;[keyword_extract(str1), keyword_extract(str2)]


const channel = {
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


module.exports = {channel}
