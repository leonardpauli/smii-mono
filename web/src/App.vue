<template lang="pug">
	#app
		//- router-link(to="/") Home
		router-view
</template>

<script>
import {debounce} from '@/utils'

export default {
	name: 'App',
	mounted () {
		this.on_resize = debounce(100)(this.on_resize.bind(this))
		window.addEventListener('resize', this.on_resize)
		this.on_resize()
	},
	destroyed () {
		window.removeEventListener('resize', this.on_resize)
	},
	methods: {
		on_resize () {
			const vh = window.innerHeight/100
			document.documentElement.style.setProperty('--vh', `${vh}px`)
		},
	},
}
</script>
<style lang="stylus">

*
	margin 0px
	padding 0px
	box-sizing border-box
	
	// ios
	-webkit-tap-highlight-color transparent
	// TODO: enable :active : document.addEventListener("touchstart", function(){}, true);
	
body, html
	background hsl(0,0%,70%)
	
body.body_fixed
	width 100vw
	height 100%
	overflow hidden
	// border 1px solid red
	// background green
	position fixed // mobile safari // TODO: 1px scroll still? ontouchstart?: e.preventDefault necessary?

#app
	font-family Avenir, Helvetica, Arial, sans-serif
	-webkit-font-smoothing antialiased
	-moz-osx-font-smoothing grayscale
	color #2c3e50
	min-height 100%
	position relative
	


// default

hr
	border none
	border-bottom 1px solid hsla(0,0%,0%,0.1)

textarea
	&[readonly="readonly"]
		pointer-events none
				

// utils

.button_plain
	padding 7px 12px
	margin 7px
	border 1px solid hsl(0,0%,90%)
	border-radius 4px
	font-weight bold
	outline none
	background hsl(0,0%,100%)
	&:hover
		border 1px solid hsl(0,0%,85%)
	&:active
		background hsl(0,0%,96%)
	&:disabled
		opacity 0.5
		pointer-events none

.checkbox_plain
	display block
	$w = 20px
	width $w
	height $w
	border 1px solid hsl(0,0%,90%)
	border-radius 4px
	outline none
	background hsl(0,0%,100%)
	&:hover
		border 1px solid hsl(0,0%,85%)
	&:active
		background hsl(0,0%,96%)

textarea.textarea_plain
	outline none
	border none
	resize none
	margin 7px 0
	background hsl(0,0%,98%)
	border 1px solid hsl(0,0%,90%)
	border-radius 5px
	padding 7px 12px
	font-size 0.8em
		
	&:hover, &:active, &:focus
		background hsl(0,0%,99%)

</style>
