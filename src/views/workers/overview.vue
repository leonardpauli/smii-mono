<template lang="pug">
.overview
	.content
		h1 Overview
		pre
			| msg: {{msg}}

		ul
			li(v-for="task in $ds.wsp.task_list", :key="task.id")
				input(v-model="task.title")

		button.button_plain(@click="$ds.task_add({title: 'New task'})") Add task
</template>
<script>
import config from '@/config'

export default {
	data: ()=> ({
		msg: config.api.base_url,
	}),
}
</script>
<style lang="stylus" scoped>
.overview
	color green
	
</style>
