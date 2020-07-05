<template lang="pug">
.overview
	.content
		h1 Queue Graph s
		.context(ref="context")
			b loading...
</template>
<script>
import {Runtime, Inspector} from '@observablehq/runtime'
import define from './observable_queue_graph.js'

export default {
	mounted () {
		const runtime = new Runtime()
		this.runtime = runtime
		// const main = runtime.module(define, Inspector.into(this.$refs.context))
		// const main = runtime.module(define, Inspector.into(document.body));
		// https://github.com/observablehq/runtime/blob/master/README.md
		const main = runtime.module(define, name=> {
			if (name === 'viewport') {
				return new Inspector(this.$refs.context)
			}
			// if (name==="chart") {
			// 	return new Inspector(document.body.querySelector('.chart'))
			// }
		})

		// main.redefine('use_static_data', ()=> false)
		// main.redefine('list_queued_config', ()=> (
		// 	false?({
		// 		count: 5000,
		// 		cutoff_date: new Date('2019-06-15T20:01:17'),
		// 	}): ({
		// 		count: 300,
		// 		cutoff_date: new Date(new Date()*1-1000*60*60*2), // new Date("2020-06-15T20:35:43.625Z"),
		// 	})
		// ))
	},
	destroyed () {
		this.runtime.dispose()
	},
}
</script>
<style lang="stylus" scoped>
	
</style>
