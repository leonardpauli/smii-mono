<template lang="pug">
.overview
	.content
		h1 Overview
		ul
			li(v-for="task in $ds.wsp.task_list", :key="task.id")
				input(v-model="task.title")

		button.button_plain(@click="$ds.task_add({title: 'New task'})") Add task
</template>
<script>
export default {
}
</script>
<style lang="stylus" scoped>
.overview
	color green
	
</style>
