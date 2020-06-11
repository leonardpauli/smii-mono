const {yt_api} = require('./yt_api.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')

const yt_channel_id_linustechtips = 'UCXuqSBlHAE6Xw-yeJA0Tunw'
const yt_channel_username_beneater = 'eaterbc'


async function tmp_scripts () {

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Video',
		size: 100_000,
		query: `
		where v.published_at is null
		set v.published_at = v.publishedAt
		`
	})
	
	/* // apoc refactor slower then my batch processing?
	dlog.time('start')
	await this.neo4j_request_and_log(`
		match (v:Video) with v limit 100000 with collect(v) as vs
		call apoc.refactor.rename.nodeProperty('publishedAt', 'published_at2', vs) yield committedOperations
		return committedOperations
	`)
	dlog.time('done')
	*/

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Video',
		size: 100_000,
		query: `
		where v.published_at is not null
		remove v.publishedAt
		`
	})


	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 30_000,
		query: `
		where v.fetched_at is null
		set v.fetched_at = v.fetchedAt
		remove v.fetchedAt
		`
	})

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 30_000,
		query: `
		where v.published_at is null and v.publishedAt is not null
		set v.published_at = v.publishedAt
		remove v.publishedAt
		`
	})

	true && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 30_000,
		query: `
		where v.post_count is null and v.video_count is not null
		set v.post_count = v.video_count
		remove v.video_count
		`
	})


	if (false) {
		const d = await yt_api.channel_by_username({
			username: yt_channel_username_beneater,
		})
		// const d = await yt_api.channels_by_ids({
		// 	ids: [yt_channel_id_linustechtips],
		// })
		console.dir(d, {depth: 7})
		
	}

	false && await this.batch_fetch_import_channels([
		{slug: yt_channel_username_beneater},
	])
}

module.exports = {tmp_scripts}
