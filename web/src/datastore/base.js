import Vue from 'vue'
import {circular_json_serializer} from '@/utils'

export const ds_make = ({
	localStorage_key,
	model, actions,
	workspace_model_get,
})=> {
	const ds = new Vue({
		data: {
			body_fixed: false,
			wsp: null,
		},
		computed: {
			data_dump () {
				const json = circular_json_serializer.circular_to_json(this.wsp)
				return json
			},
			id_max_parent () { return this.wsp || {id_max: 1} },
		},
		watch: {
			body_fixed (val) {
				window.document.body.classList.toggle('body_fixed', !!val)
			},
			data_dump (v) {
				// TODO: debounce?
				const str = JSON.stringify(v, null, 2)
				localStorage[localStorage_key] = str
			},
		},
		methods: {

			...actions,

			id_new () { return this.id_max_parent.id_max++ },

			storage_reset () {
				this.storage_set(workspace_model_get(this).make({
					id: this.id_new(), id_max: this.id_new()}))
			},
			storage_set (wsp) {
				
				// TODO: undo functionality? + clear ability to discard all data?
				localStorage[localStorage_key+'_prev'] = localStorage[localStorage_key]
				
				this.id_max_parent = wsp
				this.wsp = wsp
			},
			storage_set_attempt_parse (raw) {
				const p = parse_data_dump_attempt(raw)
				if (!p) return false
				this.storage_set(p)
			},
		},
	})

	ds.model = model
	ds.wsp = parse_data_dump_attempt(localStorage[localStorage_key])
		|| workspace_model_get(ds).make({id: ds.id_new(), id_max: ds.id_new()})

	return ds
}

const parse_data_dump_attempt = (raw)=> {
	if (!raw) return null

	let json = null
	try {
		json = JSON.parse(raw)
	} catch (e) {
		console.error(e)
		// eslint-disable-next-line no-alert
		alert('issue parsing; '+e)
		return null
	}

	const data = circular_json_serializer.circular_from_json(json)
	return data
}
