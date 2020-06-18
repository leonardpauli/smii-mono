// vue.config.js
module.exports = {
	configureWebpack: config=> {
		config.externals = config.externals || {}
		config.externals.perf_hooks = 'nodejs'

		if (process.env.NODE_ENV === 'production') {
			// ...
		} else {
			// ...
			// cache-bust for dev on ios
			config.output.filename = 'js/[name].[hash].js'
			config.output.chunkFilename = 'js/[name].[hash].js'
		}
	},
}
