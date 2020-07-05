import Vue from 'vue'
import App from './App.vue'
import router from './router'
import ds from './datastore'
import config from '@/config'
import api from '@/api'

Vue.config.productionTip = false

api.init(config.api)

Vue.prototype.$ds = ds

router.beforeEach((to, from, next)=> {

	ds.body_fixed = to.matched.reduce((prev, to)=> {
		const v = to.meta.body_fixed
		return typeof v === 'boolean'? v: prev
	}, false)
	
	next()
})

new Vue({
	router,
	render: h=> h(App),
}).$mount('#app')
