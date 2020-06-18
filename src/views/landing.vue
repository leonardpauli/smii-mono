<template lang="pug">
.landing
	h1 PROJECT
	i ...
	h2 Modules
	ul
		li: router-link(to="/tasker") Tasker
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
		
</style>
