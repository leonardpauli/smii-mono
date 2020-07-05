<template lang="pug">
.landing
	h1 smii-web
	i Collection of mini-modules towards a full-scale prototype
	h2 Modules
	ul
		li
			router-link(to="/tasker") Tasker
			.comment (dev example)
		li: router-link(to="/workers") Workers
</template>
<script>
export default {
}
</script>
<style lang="stylus" scoped>
.landing
	margin 30px
	padding 20px
	background hsl(0,0%,95%)
	
	h2
		margin-top 20px
		
	.comment
		margin-left 7px
		display inline-block
		text-decoration none
		opacity 0.7
		
</style>
