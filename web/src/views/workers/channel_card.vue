<template lang="pug">
li.channel_card
	.image(:style="{backgroundImage: 'url('+x.image_default+')'}")
	.content
		.title {{x.title}}
		.sub
			.flare.slug(v-if="x.slug") {{x.slug}}
			.flare.view_count(v-if="x.view_count") {{x.view_count}}
			.flare.country(v-if="x.country") {{x.country}}

</template>
<script>
export default {
	props: {
		x: {type: Object, required: true},
	},
}

export const channel_examples = [{
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
</script>
<style lang="stylus" scoped>
.channel_card
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
