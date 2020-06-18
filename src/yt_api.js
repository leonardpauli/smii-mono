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
	videos ({video_ids}) { // cost: 1+(0+2+2+2+2)quota per page request (eg. if just one req (even if for 5 vid ids), only 9 in quota)
		// https://developers.google.com/youtube/v3/docs/videos/list
		/*
		id: 0
			(top-level)
			kind: 'youtube#video',
      etag: 'BeSxH9jeyIEIg4J4EnhU0CP14CI',
      id: 'huKsSliDD3A',
		
		snippet: 2
			publishedAt: '2020-02-23T09:15:00Z',
			channelId: 'UC9VMz-llpSHTIfOzuggf5zA',
			title: 'La Réalité du travail dans une entreprise Japonaise', // org locale
			description: '...',
			thumbnails: {
			  default:  { width:  120, height:  90, url: 'https://i.ytimg.com/vi/huKsSliDD3A/default.jpg' },
			  medium:   { width:  320, height: 180, url: 'https://i.ytimg.com/vi/huKsSliDD3A/mqdefault.jpg' },
			  high:     { width:  480, height: 360, url: 'https://i.ytimg.com/vi/huKsSliDD3A/hqdefault.jpg' },
			  standard: { width:  640, height: 480, url: 'https://i.ytimg.com/vi/huKsSliDD3A/sddefault.jpg' },
			  maxres:   { width: 1280, height: 720, url: 'https://i.ytimg.com/vi/huKsSliDD3A/maxresdefault.jpg' }
			},
			channelTitle: 'Japania',
			tags: ['travail au japon', 'réalité du travail au japon', ...],
			categoryId: '22',
			liveBroadcastContent: 'none',
			defaultLanguage: 'fr',
			localized: { // depending on .hl
			  title: 'La Réalité du travail dans une entreprise Japonaise',
			  description: '...'
			},
			defaultAudioLanguage: 'fr'

		statistics: 2
			viewCount: '79560',
      likeCount: '3434',
      dislikeCount: '102',
      favoriteCount: '0',
      commentCount: '529'

    contentDetails: 2
			duration: 'PT11M7S',
			dimension: '2d',
			definition: 'hd',
			caption: 'true',
			licensedContent: true,
			contentRating: {},
			projection: 'rectangular'
		localizations: 2 // set hl to 'en_US' instead to get en version for free in snippet.localized
			fr:
				title: 'Coronavirus: Ce qui a changé dans la vie au Japon (Covid-19)',
				description: '...'
			en:
				...
		recordingDetails: 2
			locationDescription: 'Tokyo',
			location: { latitude: 35.6761919, longitude: 139.6503106, altitude: 0 }

		// misc
		player: 0
			embedHtml: '<iframe width="480" height="270" src="//www.youtube.com/embed/AjWRjVYA0PY" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
		status: 2
			uploadStatus: 'processed',
			privacyStatus: 'public',
			license: 'youtube',
			embeddable: true,
			publicStatsViewable: true,
			madeForKids: false
		liveStreamingDetails: 2
		topicDetails: 2
		

		// owner only:
		fileDetails: 1
		processingDetails: 1
		suggestions: 1
		 */
		
		return this.req({
			endpoint: '/videos',
			part:
				['id', 'snippet', 'statistics', 'contentDetails', 'recordingDetails'],
				// ['snippet', 'contentDetails', 'statistics'],
			id: video_ids,
			hl: 'en_US',
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
