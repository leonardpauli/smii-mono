import ds from '@/datastore'

export default {
	path: '/tasker',
	// route level code-splitting
	// this generates a separate chunk (tasker.[hash].js) for this route
	// which is lazy-loaded when the route is visited.
	component: ()=> import(/* webpackChunkName: "tasker" */ '@/views/tasker'),
	meta: {
		body_fixed: true,
	},
	props: route=> ({
		wsp: ds.wsp, // for vue dev tools inspect
	}),
	children: [{
		path: '/',
		name: 'tasker',
		component: ()=> import(/* webpackChunkName: "tasker" */ '@/views/tasker/overview'),
	}, {
		path: ':task_id',
		name: 'tasker_task',
		component: ()=> import(/* webpackChunkName: "tasker" */ '@/views/tasker/task_detail'),
		props: route=> ({
			task: ds.wsp.task_list.find(n=> n.id===route.params.task_id*1),
		}),
	}],
}
