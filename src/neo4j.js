const neo4j = require('neo4j-driver')
const neo4j_utils = require('@leonardpauli/utils/src/neo4j.js')(neo4j)

const {dlog} = require('@leonardpauli/utils/src/log.js')
const {
	catch_allow_code,
} = require('@leonardpauli/utils/src/misc.js')


const fragment = {
	
	neo4j_request (query, params = {}) {
		return neo4j_utils.execute_to_objects(this.session, query, params)
	},

	async neo4j_request_and_log (query, params = {}) {
		// console.dir({query, params})
		const res = await this.neo4j_request(query, params)
			.catch(error=> {
				console.dir({at: 'neo4j_request.error', query, error})
				return Promise.reject(error)
			})
		console.dir(res, {depth: 5})
	},

	async neo4j_ensure_constraint_node_property_unique (name, label, what='n.id') {
		const query = `create constraint ${name} on (n:${label}) assert ${what} is unique`
		const res = await this.neo4j_request(query)
			.catch(catch_allow_code('Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists'))
		dlog.time({at: 'neo4j_ensure_constraint_node_property_unique', name, res: res===null?'existing':'created'})
	},

	async neo4j_batch_process_all_nodes ({
		node_label,
		i: i_start = 0,
		size = 10000,
		query, // eg. where n.published_at is null set n.published_at = n.publishedAt

		match_query = `match (n:${node_label}) with n`,
		limit_query = `
			skip tointeger($i*$size) limit tointeger($size)
			with collect(n) as ns, count(n) as count_all
		`,
		perform_query = `
			${query}
			return count(n) as count
		`
	}) {
		let i = i_start
		
		const res = await this.neo4j_request(`${match_query} return count(n) as count`)
		const total = res[0].count
		dlog.time({at: 'batch.start', node_label, total})

		while (true) {
			const res = await this.neo4j_request(`
				${match_query}
				${limit_query}
				call apoc.cypher.doIt("
					unwind $ns as n
					with n
					${perform_query}
				", {ns: ns}) yield value
				return value, count_all
			`, {size, i})
			const {count_all, value} = res[0]
			const done = count_all<size
			dlog.time({
				...value,
				at: 'batch.done', i, count_all,
				progress: (i*size + count_all)/total,
			})
			if (done) break;
			i++
		}
		return i
	},

	async neo4j_batch_process_until ({
		size = 10000,
		node_label,

		match_query = `match (n:${node_label}) with n`,
		limit_query = `
			limit tointeger($size)
			with collect(n) as ns, count(n) as count_all
		`,
		perform_query = `
			${query}
			return count(n) as count
		`
	}) {
		let i = 0
		
		const res = await this.neo4j_request(`${match_query} return count(n) as count`)
		const total = res[0].count
		dlog.time({at: 'batch.start', node_label, total})

		while (true) {
			const res = await this.neo4j_request(`
				${match_query}
				${limit_query}
				call apoc.cypher.doIt("
					unwind $ns as n
					with n
					${perform_query}
				", {ns: ns}) yield value
				return value, count_all
			`, {size})
			const {count_all, value} = res[0]
			const done = count_all<size
			dlog.time({
				...value,
				at: 'batch.done', i, count_all,
				progress: (i*size + count_all)/total,
			})
			if (done) break;
			i++
		}
		return i
	},

}

module.exports = {default: fragment}
