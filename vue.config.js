// vue.config.js
module.exports = {
	configureWebpack: config=> {
		config.externals = config.externals || {}
		config.externals.perf_hooks = 'nodejs'

		// TODO: failed attempt, remove
		// const ignore_tests = config.module.rules.filter(r=> r.test).map(r=> ({test: r.test}))
		// const default_rule = {oneOf: [...ignore_tests, {use: 'file-loader'}]}
		// config.module.rules.push(default_rule)
		
		// console.dir(config, {depth: 7}); process.exit()

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
