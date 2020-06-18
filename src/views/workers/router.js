import ds from '@/datastore'

export default {
	path: '/workers',
	// route level code-splitting
	// this generates a separate chunk (workers.[hash].js) for this route
	// which is lazy-loaded when the route is visited.
	component: ()=> import(/* webpackChunkName: "workers" */ '@/views/workers'),
	meta: {
		body_fixed: true,
	},
	props: route=> ({
		wsp: ds.wsp, // for vue dev tools inspect
	}),
	children: [{
		path: '/',
		name: 'workers',
		component: ()=> import(/* webpackChunkName: "workers" */ '@/views/workers/overview'),
	}, {
		path: ':task_id',
		name: 'workers_task',
		component: ()=> import(/* webpackChunkName: "workers" */ '@/views/workers/task_detail'),
		props: route=> ({
			task: ds.wsp.task_list.find(n=> n.id===route.params.task_id*1),
		}),
	}],
}
