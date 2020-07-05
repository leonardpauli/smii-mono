async function setup_constraints () {
	// drop constraint channel_yt_slug_unique

	const unique = (...args)=> this.neo4j_ensure_constraint(...args)
	const index = (...args)=> this.neo4j_ensure_index(...args)
	// await index('channel_yt_slug_index', '(n:Channel_yt) on (n.slug)')
	
	await unique('channel_id_unique', '(n:Channel) assert n.id is unique')
	await unique('channel_yt_id_unique', '(n:Channel_yt) assert n.id is unique')
	await unique('slug_id_unique', '(n:Slug) assert (n.id) is unique')

	await unique('playlist_id_unique', '(n:Playlist) assert n.id is unique')
	await unique('video_id_unique', '(n:Video) assert n.id is unique')
	await unique('country_yt_code', '(n:Country) assert n.yt_code is unique')
	await unique('processor_id_unique', '(n:Processor) assert n.id is unique')
	await unique('campaign_id_unique', '(n:Campaign) assert n.id is unique')

	// call db.index.fulltext.createNodeIndex('channel_title_fulltext', ['Channel'], ['title'])
}

module.exports = {
	setup_constraints,
}
