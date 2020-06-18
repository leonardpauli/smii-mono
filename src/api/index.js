const actions = {
	
	heartbeat () {
		return this.request({action: 'heartbeat'})
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
