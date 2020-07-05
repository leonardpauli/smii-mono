import Vue from 'vue'
import VueRouter from 'vue-router'
import landing from '@/views/landing.vue'
import tasker_router from '@/views/tasker/router'
import workers_router from '@/views/workers/router'

Vue.use(VueRouter)

const landing_router = {
	path: '/',
	name: 'landing',
	component: landing,
}

const example_router = {
	path: '/example',
	name: 'example',
	// route level code-splitting
	// this generates a separate chunk (example.[hash].js) for this route
	// which is lazy-loaded when the route is visited.
	component: ()=> import(/* webpackChunkName: "example" */ '@/views/example.vue'),
}

const routes = [
	landing_router,
	tasker_router,
	workers_router,
	example_router,
]

const router = new VueRouter({
	mode: 'history',
	base: process.env.BASE_URL,
	routes,
})

export default router
