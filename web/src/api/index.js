const actions = {
	
	heartbeat () {
		return this.request({action: 'heartbeat'})
	},

	search_fuzzy ({q: _q}) {
		// TODO: trim on api side
		const q = (_q+'').trim()
		if (!q) return Promise.resolve({list: []})
		return this.request({action: 'channel.title | search.fuzzy', payload: {q}})
	},

	list_processors () { return this.request({action: 'queue.viz.processors.list'}) },
	list_queued ({
		count = 300,
		cutoff_date = new Date('2020-06-15T20:01:17'),
	} = {}) {
		return this.request({action: 'queue.viz.queued.list', payload: {
			count, cutoff_date: cutoff_date.toISOString()}})
	},
	queue_add_featured ({count = 1} = {}) {
		return this.request({action: 'queue.add.channels.featured', payload: {count}})
	},
	queue_add_many ({xs = [], priority = 1} = {}) {
		// xs: [{id, slug}]
		return this.request({action: 'queue.add.channels.by_id', payload: {xs, priority}})
	},

}

const api = {
	base_url: null,
	init ({base_url = 'http://localhost:3000/api'}) {
		this.base_url = base_url
	},

	request ({action, payload = {}}) {
		return fetch(this.base_url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({action, payload}),
		}).then(res=> res.json())
	},

	...actions,
}

export default api
