const {yt_api} = require('./yt_api.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {queries, example_channel_raw} = require('./queries.js')

const {config} = require('../config.js')

const yt_channel_id_linustechtips = 'UCXuqSBlHAE6Xw-yeJA0Tunw'
const yt_channel_username_beneater = 'eaterbc'


async function tmp_scripts () {

	const unique_prop = (...args)=> this.neo4j_ensure_constraint_node_property_unique(...args)
	const setup_constraints = false
	setup_constraints && await unique_prop('channel_id_unique', 'Channel', 'n.id')
	// false && await unique_prop('channel_slug_unique', 'Channel', 'n.slug') // drop constraint channel_slug_unique
	setup_constraints && await unique_prop('channel_yt_slug_unique', 'Channel_yt', 'n.slug')
	setup_constraints && await unique_prop('channel_ig_slug_unique', 'Channel_ig', 'n.slug')
	setup_constraints && await unique_prop('playlist_id_unique', 'Playlist', 'n.id')
	setup_constraints && await unique_prop('video_id_unique', 'Video', 'n.id')
	setup_constraints && await unique_prop('country_yt_code', 'Country', 'n.yt_code')
	// setup_constraints && await unique_prop('keyword_title_unique', 'Keyword', 'n.title')
	setup_constraints && await unique_prop('processor_id_unique', 'Processor', 'n.id')


	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Video',
		size: 100_000,
		query: `
		where n.published_at is null
		set n.published_at = n.publishedAt
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
			where n.published_at is not null
			remove n.publishedAt
		`
	})

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Video',
		size: 50_000,
		query: `set n :Post`
	})


	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 30_000,
		query: `
			where n.fetched_at is null
			set n.fetched_at = n.fetchedAt
			remove n.fetchedAt
		`
	})

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 30_000,
		query: `
			where n.published_at is null and n.publishedAt is not null
			set n.published_at = n.publishedAt
			remove n.publishedAt
		`
	})

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 30_000,
		query: `
			where n.post_count is null and n.video_count is not null
			set n.post_count = n.video_count
			remove n.video_count
		`
	})

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 30_000,
		query: `where n.subscriber_count = 0 remove n.subscriber_count`
	})

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 30_000,
		query: `set n :Channel_yt remove n:Youtube`
	})

	false && await this.neo4j_request_and_log(`
		match (channel:Channel)
		where (channel)-[:has_keyword]->(:Keyword)
		with channel as c
		limit 2
		match (n)-[:has_keyword]-(k:Keyword)
		return c.id, c.title, apoc.text.replace(apoc.text.join([x in collect(k.title) | apoc.text.replace(x, '\t', ' ')], '\t'), '[“”]', '') as ws
	`)

	false && await this.neo4j_batch_process_all_nodes({
		node_label: 'Channel',
		size: 20_000,
		query: `
		where (n)-[:has_keyword]->(:Keyword)
		with n
		match (n)-[:has_keyword]->(k:Keyword)
		with n, apoc.text.replace(apoc.text.join([x in collect(k.title) | apoc.text.replace(x, '\t', ' ')], '\t'), '[“”]', '') as kw
		merge (n)-[:has_keywords]->(:Text {text: kw})
		`
	})

	false && await this.neo4j_request_and_log(`
		match (:Channel)-[:has_keyword]->(n:Keyword)
		with n, size((n)<-[]-()) as deg
		where deg < 50
		with distinct n
		return count(n)
	`)

	false && await this.neo4j_batch_process_until({
		size: 1000,
		match_query: `
			match (:Channel)-[:has_keyword]->(n:Keyword)
			with n, size((n)<-[]-()) as deg
			where deg < 51
			with distinct n
		`,
		perform_query: `
			detach delete n
			return count(n)
		`,
	})

	if (false) {
		const res = await this.neo4j_request(`
			match (c:Channel)-[:has_keyword]->(k:Keyword)
			with k, size((k)<-[]-()) as deg
			return distinct k.title, deg order by deg desc limit 1000
			// detach delete k
		`)
		res.forEach(a=> console.dir(a))
	}


	if (false) {
		const d = await yt_api.channel_by_username({
			username: yt_channel_username_beneater,
		})
		// const d = await yt_api.channels_by_ids({
		// 	ids: [yt_channel_id_linustechtips],
		// })
		console.dir(d, {depth: 7})
		
	}

	false && await this.neo4j_request_and_log(queries.xPlus1, {x: 4})
	false && await this.neo4j_request_and_log(`
		with $channel_raw as channel_raw
		${queries.channel_import()}
		return n.title
	`, {channel_raw: example_channel_raw})


	false && await this.neo4j_request_and_log(
		queries['queue remove awaiting'])

	false && await this.neo4j_request_and_log(
		queries['queue inspect stalling']({dur_str: '"PT1S"'}))

	false && await this.neo4j_request_and_log(
		queries['queue reset stalling "taken"']({dur_str: '"PT1S"'}))

	false && await this.neo4j_request_and_log(
		queries['queue add unqueued channels for fetch (ordered by featured by channel size)']({count: 1}))


	false && await this.neo4j_request_and_log(
		queries['register/ensure processor + mark as started']({p_id: '$p_id'}), {
			p_id: config.processor_id,
		})

	false && await this.neo4j_request_and_log(
		queries['queue channels by id once']({xs: '$xs'}), {
			xs: [yt_channel_id_linustechtips, "UCa6vGFO9ty8v5KZJXQxdhaw", "UCBgw11dCV17FJDsHxNGZBtA"],
		})
	true && await this.neo4j_request_and_log(queries['queue inspect with logs'])

	if (true) {
		const p_id = config.processor_id
		const res = await this.neo4j_request(queries['queue take awaiting']({p_id: '$p_id', count: 5}), {p_id})
		await this.batch_fetch_import_channels(res, {p_id})
	}
	return


	false && await this.batch_fetch_import_channels([
		// {slug: yt_channel_username_beneater},
		{channel: {id: yt_channel_id_linustechtips}},
	])
}

module.exports = {tmp_scripts}
