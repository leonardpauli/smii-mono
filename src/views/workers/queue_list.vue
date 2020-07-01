<template lang="pug">
.queue_list
	.content
		h1 Queue List

		.section.fetch
			.options
				.opt
					label count:
					input(v-model="count")
				.opt
					label cutoff date:
					input(v-model="cutoff_date")
			button.button_plain(@click="refresh") Refresh
			.info: pre(v-if="refresh_res") {{refresh_res && JSON.stringify(refresh_res)}}

		.section
			.options
				.opt
					label priority:
					input(v-model="priority")
				.opt
					label ids/slugs:
					input(v-model="add_raw", placeholder='[{"id":"a"},{"slug":"b","id":"c"}, ...]')
			button.button_plain(@click="do_add_raw") Add to queue
			.info: pre(v-if="add_res") {{add_res && JSON.stringify(add_res)}}

		ul.search_res
			li.row(v-for="x in list", :key="x.q.id", :x="x.c")
				channel_card(:x="x.c", v-if="x.c")
				.more
					div(v-if="x.q.status!='done'") {{x.q.status}}
					div {{x.q.priority}}
					div(v-if="x.p_id") {{x.p_id && x.p_id.slice(-5)}}



</template>
<script>
import api from '@/api'
import config from '@/config'
import list_queued_mock from '@/api/mock_data/list_queued'
import channel_card from './channel_card'

const use_mock = false


export default {
	components: {channel_card},
	data: ()=> ({
		refresh_res: null,
		add_res: null,

		count: '30',
		cutoff_date: new Date(new Date()*1-1000*60*60*2).toISOString(),
		list_queued: use_mock? list_queued_mock: [],

		add_raw: '',
		priority: '1',
	}),
	computed: {
		list () {
			return this.list_queued.map(x=> ({
				q: x.q,
				c: {...x.c, country: x.country},
				p_id: x.p_id,
				status: x.q.status || 'added',
			}))
		},
	},
	mounted () {
		this.refresh()
	},
	methods: {
		async refresh () {
			const count = parseInt(this.count, 10)
			const cutoff_date = new Date(this.cutoff_date)
			
			this.refresh_res = 'Loading...'
			const res = await api.list_queued({count, cutoff_date})

			if (res && Array.isArray(res)) {
				this.list_queued = res
				this.refresh_res = null
			} else {
				this.refresh_res = res
			}
		},
		async do_add_raw () {
			const {add_raw} = this
			let parsed = null
			try {
				parsed = JSON.parse(add_raw)
			} catch (error) {
				this.res = {message: "Couldn't parse the json data, please check the formatting", error}
				return
			}

			this.add_res = 'Loading...'
			const res = await api.queue_add_many({xs: parsed, priority: parseFloat(this.priority) || 1})
			this.add_res = res

			await this.refresh()
		},
	},
}
</script>
<style lang="stylus" scoped>
.queue_list
	.section.fetch
		margin-top 30px
	.options
		display inline-block
		margin 0 10px
		.opt > label
			width 100px
			display inline-block
		.opt > input
			width 200px
	.info
		min-height 30px
	.search_res
		list-style-type none
		background hsl(0,0%,98%)
		border-radius 3px
		max-width 500px
		&>.row
			display flex
			flex-flow row
			.channel_card
				width 100%
			.more
				font-size 0.7em
				text-align right
				margin-right 10px
				margin-top 5px
	
</style>
