<template lang="pug">
.overview
	.content
		h1 Overview
		//- pre
		//- 	| msg: {{msg}}

		input.search(v-model="value", @keydown="on_search_keydown($event)", placeholder="Search channel title/slug/id")
		pre(v-if="res") {{JSON.stringify(res, null, 2)}}

		ul.search_res
			li.channel_card(v-for="x in channels", :key="x.id")
				.image(:style="{backgroundImage: 'url('+x.image_default+')'}")
				.content
					.title {{x.title}}
					.sub
						.flare.slug(v-if="x.slug") {{x.slug}}
						.flare.view_count(v-if="x.view_count") {{x.view_count}}
						.flare.country(v-if="x.country") {{x.country}}

</template>
<script>
import api from '@/api'
import config from '@/config'
import {debounce} from '@/utils'

const channnels_ex_use = false
const channnels_ex = [{
	country: 'AU',
	id: 'UC2p_-lZWUyV3Wjk7-bVXqnA',
	title: 'Mr4Eva',
	image_default: 'https://yt3.ggpht.com/a/AATXAJzs-8TbL6TdcnqrTb5XskcNqPTEVBBkocVZYw=s88-c-k-c0xffffffff-no-rj-mo',
	view_count: 136435,
	slug: 'mr4eva',
},
{
	country: 'RU',
	id: 'UCo6DJdltbIub80bLiyJRv3w',
	title: 'MrGear',
	image_default: 'https://yt3.ggpht.com/a/AATXAJy_7axi61kb-C8B83xv14lckjjxToxFyN9PKg=s88-c-k-c0xffffffff-no-rj-mo',
	view_count: 2781293995,
	slug: 'mrgearofficial',
},
{
	country: 'US',
	id: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
	title: 'MrBeast',
	image_default: 'https://yt3.ggpht.com/a/AATXAJxw_LGTEbMXsHG5vKpcC639RuHOKAzfyXMW5g=s88-c-k-c0xffffffff-no-rj-mo',
	view_count: 4859675880,
	slug: 'mrbeast6000',
}]

export default {
	data: ()=> ({
		msg: config.api.base_url,
		res: null,
		value: '',
		channels: channnels_ex_use? channnels_ex: [],
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
		li.channel_card
			$h = 45px
			$ratio = (16/9)
			height $h
			display flex
			padding 8px
			box-sizing content-box
			&:not(:last-child)
				border-bottom 1px solid hsl(0,0%,95%)
			.image
				background-color hsl(0,0%,90%)
				background-repeat no-repeat
				background-size cover
				background-position center center
				height 100%
				width ($h * $ratio)
				margin-right 10px
			.content
				display flex
				flex-direction column
				justify-content space-around
			.title
				font-size 0.9em
				color #333
				font-weight bold
			.sub
				.flare
					font-size 0.7em
					color #333
					font-weight 500
					display inline-block
					padding 1px 8px
					background hsla(0,0%,90%,0.6)
					border-radius 1000px
					margin-right 5px
				.country
					background hsla(40,100%,90%,0.6)
				// .slug
				// .view_count
	
</style>
