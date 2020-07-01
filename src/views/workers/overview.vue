<template lang="pug">
.overview
	.content
		h1 Overview
		//- pre
		//- 	| msg: {{msg}}

		input.search(v-model="value", @keydown="on_search_keydown($event)", placeholder="Search channel title/slug/id")
		pre(v-if="res") {{JSON.stringify(res, null, 2)}}

		ul.search_res
			channel_card(v-for="x in channels", :key="x.id", :x="x")

</template>
<script>
import api from '@/api'
import config from '@/config'
import {debounce} from '@/utils'
import channel_card, {channel_examples} from './channel_card'

const channnels_ex_use = false

export default {
	components: {channel_card},
	data: ()=> ({
		msg: config.api.base_url,
		res: null,
		value: '',
		channels: channnels_ex_use? channel_examples: [],
	}),
	watch: {
		value (v) {
			this.value_changed(v)
		},
	},
	mounted () {
		// TODO: get token + cancel if keydown/up/enter
		this.search_debounced = debounce(300)(this.search_debounced.bind(this))
		this.value_changed(this.value)
	},
	methods: {
		value_changed (v) {
			this.search_debounced({q: v})
		},
		async search_debounced ({q}) {
			const res = await api.search_fuzzy({q})

			if (res && res.list) {
				this.channels = res.list
				this.res = null
			} else {
				this.res = res
			}
		},
		on_search_keydown (e) {
			if (e.key==='Enter') {
				e.preventDefault()
			} else if (e.key==='ArrowDown') {
				e.preventDefault()
			} else if (e.key==='ArrowUp') {
				e.preventDefault()
			}
		},
	},
}
</script>
<style lang="stylus" scoped>
.overview
	.search_res
		list-style-type none
		background hsl(0,0%,98%)
		border-radius 3px
		max-width 500px
	
</style>
