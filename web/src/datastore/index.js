import {ds_make} from './base.js'
import config from '@/config'
// import api from '@/api'

const model = {
	workspace: {
		make: ({id, id_max})=> ({
			id, id_max,
			created_at: new Date()*1,
			task_list: [],
		}),
	},
	task: {
		make: ({id, title})=> ({
			id,
			title,
		}),
	},
}

const actions = {
	task_add ({title}) {
		const task = this.model.task.make({title, id: this.id_new()})
		this.wsp.task_list.push(task)
	},
}


const ds = ds_make({
	localStorage_key: config.localStorage_key,
	model, actions,
	workspace_model_get: ds=> ds.model.workspace,
})

export default ds
