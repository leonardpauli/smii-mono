async function setup_constraints () {

	// create constraint campaign_id_unique on (c:Campaign) assert c.id is unique
	const unique_prop = (...args)=> this.neo4j_ensure_constraint_node_property_unique(...args)
	await unique_prop('channel_id_unique', 'Channel', 'n.id')
	// false && await unique_prop('channel_slug_unique', 'Channel', 'n.slug') // drop constraint channel_slug_unique
	await unique_prop('channel_yt_id_unique', 'Channel_yt', 'n.id')
	await unique_prop('channel_yt_slug_unique', 'Channel_yt', 'n.slug')
	await unique_prop('channel_ig_slug_unique', 'Channel_ig', 'n.slug')
	await unique_prop('playlist_id_unique', 'Playlist', 'n.id')
	await unique_prop('video_id_unique', 'Video', 'n.id')
	await unique_prop('country_yt_code', 'Country', 'n.yt_code')
	// await unique_prop('keyword_title_unique', 'Keyword', 'n.title')
	await unique_prop('processor_id_unique', 'Processor', 'n.id')
	await unique_prop('campaign_id_unique', 'Campaign', 'n.id')

}

module.exports = {
	setup_constraints,
}
