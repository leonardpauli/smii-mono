const fs = require('fs')
const {queries: fetcher_queries} = require('smii-fetcher-20200610/src/queries.js')


const action_list = [{
	title: 'server_heartbeat',
	type: 'generic',
	handler: async (ctx)=> ({
		date: new Date().toISOString(),
	}),
}, {
	title: 'neo4j_add1',
	type: 'neo4j_query',
	param_get: (ctx)=> ({n: ctx.payload.n}),
	query: `
		with 1+$n as a return a
	`,
}, {
	title: 'channel.title | search.fuzzy',
	type: 'neo4j_query',
	// TODO: put in deterministic setup script
	// match (c:Channel) return c limit 1
	// call db.index.fulltext.createNodeIndex('channel_title_fulltext', ['Channel'], ['title'])
	param_get: (ctx)=> ({q: ctx.payload.q}),
	extractor: (ctx, res)=> res[0],
	query: `
		with $q as q
		optional match (c_id:Channel_yt {id: q})
		optional match (:Slug {id: q})-[:has_channel]->(c_slug:Channel_yt)
		with q, collect(c_id)+collect(c_slug) as exact_match
		with q, exact_match, size(exact_match)>0 as has_exact
		call apoc.do.when(has_exact,
			"with $exact_match as xs return xs",
			"
			with $q as q
			call db.index.fulltext.queryNodes('channel_title_fulltext', $q+'~')
			yield node, score
			with node as fuzzy, score
			order by score desc limit 5
			return collect(fuzzy) as xs
			",
			{exact_match: exact_match, q: q}
		) yield value as res
		unwind res.xs as x
		return collect(x {.title, .id, .slug, .image_default, .view_count, .country}) as list
	`,
}, {
	title: 'channels by slug or id with 10 latest videos excerpt ignoring missing',
	type: 'neo4j_query',
	param_get: (ctx)=> ({xs: ctx.payload.xs}),
	// with [
	// 	{slug: 'beneater'},
	// 	{id: "UCCuK8BtBE41vZeoXYAoaFaQ"},
	// 	{id: 'UCXuqSBlHAE6Xw-yeJA0Tunw'},
	// 	{id: "UCH1Jp-23gV7jpHyB6vx7XwA"},
	// 	{slug: 'eaterbca'}
	// ] as xs
	extractor: (ctx, res)=> res,
	query: `
		unwind $xs as x
		optional match (c_id:Channel {id: x.id})
		optional match (c_slug:Channel {slug: x.slug})
		with collect(c_id)+collect(c_slug) as c_match
		unwind c_match as channel
		call apoc.cypher.run("
		with $channel as channel
		match (channel)-[:has_uploads]->(:Playlist)-[:has_video]->(v:Video)
		with channel, v
		order by v.publishedAt desc limit 10
		return channel, v as video
		", {channel: channel}) yield value
		return
			// channel {.id, .title, .subscriber_count, .view_count},
			value.channel.title as channel_title,
			value.channel.subscriber_count as subscriber_count,
			value.channel.view_count as view_count, // warn: not yet video view count
			value.video.id as video_id,
			tostring(value.video.publishedAt) as published_at
	`,
}, {
	title: 'viz.data.gen: Top 1000 channels (by view_count) with self-declared keyword x',
	type: 'neo4j_query',
	param_get: (ctx)=> ({tag: 'science'}),
	query: `
		match (k:Keyword {title: $tag})
		match (k)<--(c:Channel)
		where exists(c.title) and c.view_count > 1
		with {id: c.id, title: c.title, weight: c.view_count} as a
		order by c.weight desc
		limit 1000
		return collect(a) as out, max(a.weight) as weight_max
	`,
	handler: async (ctx)=> {
		const res = await ctx.action.type.field.handler.default(ctx)

		const wmax = res[0].weight_max
		const nodes = res[0].out.map(({weight, id, title})=> ({weight: neo4j.integer.toNumber(weight), id, title, group: 1}))
		const links = nodes.map(n=> ({source: n.id, target: tag, value: (n.weight || 0)/wmax}))
		nodes.push({id: tag, group: 2})

		await fs.promises.writeFile('./viz/force-directed-graph/data.json', JSON.stringify({nodes, links}))
	},
}, {
	title: 'viz.data.gen: 2',
	type: 'neo4j_query',
	param_get: (ctx)=> ({tag: 'fashion'}),
	query: `
		match (k:Keyword)
		where k.title in $tags
		match (k)<--(c:Channel)
		where exists(c.title) and c.view_count > 1
		with {id: c.id, title: c.title, weight: c.view_count} as a, {source: c.id, target: k.title}
		order by c.weight desc
		limit 1000
		return collect(a) as out, max(a.weight) as weight_max
	`,
	handler: async (ctx)=> {
		const res = await ctx.action.type.field.handler.default(ctx)

		const wmax = res[0].weight_max
		const nodes = res[0].out.map(({weight, id, title})=> ({weight: neo4j.integer.toNumber(weight), id, title, group: 1}))
		const links = nodes.map(n=> ({source: n.id, target: tag, value: (n.weight || 0)/wmax}))
		nodes.push({id: tag, group: 2})
		nodes.push({id: tag, group: 2})

		const filename = './viz/force-directed-graph/data.json'
		await fs.promises.writeFile(filename, JSON.stringify({nodes, links}))
		return {filename}
	},
}, {
	type: 'neo4j_query',
	title: 'queue.viz.processors.list',
	query: fetcher_queries['queue viz processors list'](),
}, {
	type: 'neo4j_query',
	title: 'queue.viz.queued.list',
	// TODO: do not hardcode arbitrary default values
	param_get: (ctx)=> ({cutoff_date: ctx.payload.cutoff_date || '20190101'}),
	query: ctx=> fetcher_queries['queue viz queued list']({
		count: parseInt(ctx.payload.count, 10) || 300,
		cutoff_date: '$cutoff_date',
	}),
}, {
	type: 'neo4j_query',
	title: 'queue.add.channels.random',
	query: fetcher_queries['queue add channels (rand 10 unqueued)'](),
}, {
	type: 'neo4j_query',
	title: 'queue.add.channels.featured',
	query: ctx=> fetcher_queries['queue add channels (from featured_channel, ordered by featured by channel size)']({
		count: parseInt(ctx.payload.count, 10) || 1,
	}),
}, {
	type: 'neo4j_query',
	title: 'queue.add.channels.by_id_once',
	param_get: ctx=> ({xs: ctx.payload.xs}),
	query: ctx=> fetcher_queries['queue add channels by id once']({
		xs: '$xs', priority: parseFloat(ctx.payload.priority) || 1}),
}]


module.exports = {action_list}
