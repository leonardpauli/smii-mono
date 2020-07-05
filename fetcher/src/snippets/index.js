const {config} = require('../../config.js')
const enabled = config.use_snippet


async function main () {

	const {fs_json_file_read} = require('@leonardpauli/utils/src/fs.js')

	const rado3_1 = await fs_json_file_read('./local/nordvpn_rado_v3_20200701.json')
	const rado3_2 = await fs_json_file_read('./local/nordvpn_rado_v3_20200702.json')
	const rado3 = [...rado3_1, ...rado3_2]
	const codes_all = rado3.map(a=> a.code)
	const codes_unique = [...new Set(codes_all)]
	const codes = codes_unique.sort().slice(0, 5)

	console.dir(codes)

	await this.neo4j_request_and_log(`
		match (cam:Campaign {id: 'nordvpn_jun20'})
		MATCH (cam)--(:CampaignData)--(c:Channel_yt)
		match (c)-[:has_uploads]->(p:Playlist)
		match (p)--(v:Video)
		match (v)-[:has_description]->(t:Text)

		unwind $codes as code

		with t, v, code
		where t.text contains code
		return code, count(v), collect(v.id) as v_id
	`, {codes})
	return


	console.log('start')
	await this.neo4j_batch_process_all_nodes({
		match_query: `match (n:Video) with n`, //  order by n.id
		size: 1_000,
		query: `
			match (n)-[:has_description]->(t:Text)
			where t.text contains 'mapmen'
		`,
		return_query: `return count(n) as count`,
	})
	return

	// await require('./misc.js').setup_constraints.call(this)
	// await require('./schema_cleanup_jun12.js').main.call(this)
	// await require('./channel_yt_fetcher_snippets.js').main.call(this)
	await require('./video_yt_fetcher_snippets.js').main.call(this)
}

module.exports = {
	main,
	enabled,
}
