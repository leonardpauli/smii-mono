const {post} = require('@leonardpauli/utils/src/http_request.js')

const yt_api = {
	channel_by_username ({username}) {
		return this._channels({forUsername: username})
	},
	channels_by_ids ({ids}) {
		return this._channels({id: ids})
	},
	_channels (query) { // quota: 1+(2+2+2+2)
		return this.req({
			endpoint: '/channels',
			part: ['snippet', 'contentDetails', 'statistics', 'brandingSettings'],
			...query,
		})
	},
	search ({channelId, maxResults = 20}) { // quota: 100 !!!
		return this.req({
			endpoint: '/search',
			part: ['snippet'],
			channelId,
			order: 'date', type: 'video',
			maxResults,
		})
	},
	videos ({video_ids}) { // cost: 1+(2+2+2)quota per page request (eg. if just one req (even if for 5 vid ids), only 7 in quota)
		return this.req({
			endpoint: '/videos',
			part: ['snippet', 'contentDetails', 'statistics'],
			id: video_ids,
		})
	},
	commentThreads ({video_id, include_replies = false, maxResults = 20}) { // quota: 1?+(2[+2])
		return this.req({
			endpoint: '/commentThreads',
			part: include_replies? ['snippet', 'replies']: ['snippet'],
			videoId: video_id,
			order: 'relevance', // or time
			maxResults,
		})
	},
	playlistItems ({playlistId, only_contentDetails = false, maxResults = 20}) { // quota: 1+(2 or 2)
		return this.req({
			endpoint: '/playlistItems',
			part: only_contentDetails? ['contentDetails']: ['snippet'], // (more data found in video call)
			// contentDetails.(videoId, videoPublishedAt) == snippet.(resourceId.videoId, publishedAt)
			playlistId,
			maxResults,
		})
	},

	// https://developers.google.com/youtube/v3/docs/i18nRegions
	i18n_regions ({lang = 'en_US'} = {}) { // quota: 1+(1)
		return this.req({
			endpoint: '/i18nRegions',
			part: ['snippet'],
			hl: lang,
		})
	},

	async req ({endpoint, ...query}) {

		if (this.config.prevent_live_yt_reqs)
			throw new Error('config.prevent_live_yt_reqs')

		if (!this.config.key)
			throw new Error('yt: config.key not set')

		const res = await post({
			base_url: this.config.base_url,
			path: endpoint,
			query: {
				key: this.config.key,
				...query,
			},
			method: 'GET',
		}).then(res=> res.json_full())

		const json = {endpoint, query, date: new Date(), ...res}
		return json
	},

	config: null,
	async init (config) {
		this.config = config
	},
}

module.exports = {yt_api}
