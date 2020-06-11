const {
	noop,
} = require('@leonardpauli/utils/src/misc.js')


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
