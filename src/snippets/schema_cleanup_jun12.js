const {dlog} = require('@leonardpauli/utils/src/log.js')


async function main () {

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

}

module.exports = {main}
