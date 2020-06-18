<template lang="pug">
.task_detail
	.content
		h1 task_detail: {{task.title}}
</template>
<script>
export default {
	props: {
		task: {type: Object},
	},
}
</script>
<style lang="stylus" scoped>
.task_detail
	color green
	
</style>
