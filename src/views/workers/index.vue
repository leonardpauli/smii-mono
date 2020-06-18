<template lang="pug">
.tasker
	router-view.main
	.sidebar
		
		router-link.link(:to="{name: 'workers'}") Overview
		router-link.link(:to="{name: 'worker_queue_graph'}") Queue Graph

	.header
		h3 smii-web
</template>
<script>
export default {
}
</script>
<style lang="stylus">

// mixins
.tasker > .main
	overflow-x scroll
	&> .content
		margin 50px auto
		width 90%
		max-width 1000px

		h1 > input
			margin-left 5px
			font-size 1em
			border none
			background none
			outline none
			border-radius 5px
			padding 0 7px
			
			&:hover, &:active, &:focus
				background hsl(0,0%,99%)
			
</style>
<style lang="stylus" scoped>
.tasker
	display grid
	grid-template-columns 250px 1fr
	grid-template-rows 50px 1fr
	grid-template-areas \
		"header header"\
		"sidebar main"
	position absolute
	top 0px; left 0px; right 0px; bottom: 0px
	height calc(var(--vh, 1vh) * 100)
	
	.header
		grid-area header
		z-index 2
		background hsl(0,0%,97%)
		border-bottom 1px solid hsl(0,0%,90%)
		display flex
		align-items center
		justify-content center
		
	.sidebar
		z-index 1
		grid-area sidebar
		background hsl(0,0%,96%)
		border-right 1px solid hsl(0,0%,90%)
		padding-top 20px
		overflow-x scroll
		padding-bottom 50px
		
		h3, h4, hr
			margin-top 15px
			margin-bottom 3px
			padding 0 15px
		hr
			margin-bottom 20px
		button
			margin-left 15px
		
		.link
			padding 7px 15px
			text-decoration none
			display block
			color hsl(0,0%,5%)
			box-sizing border-box
			border-left 2px solid transparent
			&:hover, &:active, &.active
				background hsla(0,0%,100%,0.6)
				border-left 2px solid hsl(0,0%,5%)
				
	.main
		grid-area main
		background hsl(0,0%,95%)
	
</style>
