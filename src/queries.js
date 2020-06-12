
const example_channel_raw = {
  id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
  slug: 'linustechtips',

  rest: {
    title: 'Linus Tech Tips',
    image_default: 'https://yt3.ggpht.com/a/AATXAJzGUJdH8PJ5d34Uk6CYZmAMWtam2Cpk6tU_Qw=s88-c-k-c0xffffffff-no-rj-mo',
    image_medium: 'https://yt3.ggpht.com/a/AATXAJzGUJdH8PJ5d34Uk6CYZmAMWtam2Cpk6tU_Qw=s240-c-k-c0xffffffff-no-rj-mo',
    image_high: 'https://yt3.ggpht.com/a/AATXAJzGUJdH8PJ5d34Uk6CYZmAMWtam2Cpk6tU_Qw=s800-c-k-c0xffffffff-no-rj-mo',
    image_banner_default: 'https://yt3.ggpht.com/NXaFVEkrkdGsQcjLvmI8iQuzKFVlZJX770IT4C77dmQr0PI5LpZuhATjJf2yWXYgBQP8EwVBgTk=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
    image_banner_high: 'https://yt3.ggpht.com/NXaFVEkrkdGsQcjLvmI8iQuzKFVlZJX770IT4C77dmQr0PI5LpZuhATjJf2yWXYgBQP8EwVBgTk=w1920-fcrop64=1,00000000ffffffff-k-c0xffffffff-no-nd-rj'
  },
  
  published_at: '2008-11-25T00:46:52Z',
  fetched_at: '2020-06-12T13:21:29.859Z',
  
  view_count: '3732308836',
  post_count: '5010',

  subscriber_count: '11100000',
  subscriber_count_hidden: false,

  country: 'CA',

  keywords: 'unboxing\treview\tcomputer\thardware\tmotherboard\tintel\tamd\tnvidia\tgaming',
  description: 'Tech can be complicated; we try to make it easy.\n\nLinus Tech Tips is a passionate team of "professionally curious" experts in consumer technology and video production which aims to inform and educate people of all ages through entertaining videos. We create product reviews, step-by-step computer build guides, and a variety of other tech-focused projects.\n\nSchedule:\nNew videos every Saturday to Thursday @ 12pm Pacific\nLive podcasts every Friday @ 4:30pm Pacific\n\nKJ7ABS',
  left: '{"brandingSettings":{"channel":{"trackingAnalyticsAccountId":"UA-129736315-1","showRelatedChannels":true,"featuredChannelsTitle":"Featured Channels","featuredChannelsUrls":["UC0vBXGSyV14uvJ4hECDOl0Q","UCeeFfhMcJa1kjtfZAGskOCA","UCdBK94H6oZT2Q7l0-b0xmMg","UCBZiUUYeLfS5rIj4TQvgSvA","UCFLFc8Lpbwt4jPtY1_Ai5yA","UCt-oJR5teQIjOAxCmIQvcgA"],"unsubscribedTrailer":"SPoPwrQwm_g","profileColor":"#000000","country":"CA"}},"etag":"II5mdKEBXvsM-ZqrwyrFzDW_r-M"}',
  
  uploads_playlist_id: 'UUXuqSBlHAE6Xw-yeJA0Tunw',
  favorites_playlist_id: 'FLXuqSBlHAE6Xw-yeJA0Tunw',
}

const _text_node_replace = ({type, content})=> `
foreach(dummy in [1] |
  // TODO: remove prev, optimisable
  merge (n)-[:${type}]->(t:Text)
  detach delete t
)
foreach(dummy in case when ${content} is not null then [1] else [] end |
  merge (n)-[:${type}]->(:Text {text: ${content}})
)
`


const channel_import = ({with_add = ''} = {})=> `
// with $channel_raw as channel_raw
merge (n:Channel:Channel_yt {id: channel_raw.id})
set
  n += channel_raw.rest,
  
  n.slug = channel_raw.slug,

  n.published_at = case when channel_raw.published_at is null then null else datetime(channel_raw.published_at) end,
  n.fetched_at = case when channel_raw.fetched_at is null then null else datetime(channel_raw.fetched_at) end,

  n.view_count = toInteger(channel_raw.view_count),
  n.post_count = toInteger(channel_raw.post_count),

  n.subscriber_count = case when channel_raw.subscriber_count_hidden = true then null else toInteger(channel_raw.subscriber_count) end,

  n.country = channel_raw.country
with n, channel_raw ${with_add}


// foreach(dummy in [1] |
//   // TODO: remove prev, potentially creates dummy node
//   merge (n)-[r:has_country]->(:Country)
//   delete r
// )
foreach(dummy in case when channel_raw.country is not null then [1] else [] end |
  merge (n_country:Country {yt_code: channel_raw.country})
  merge (n)-[:has_country]->(n_country)
)

${_text_node_replace({
  type: 'has_keywords',
  content: 'channel_raw.keywords',
})}

${_text_node_replace({
  type: 'has_description',
  content: 'channel_raw.description',
})}

${_text_node_replace({
  type: 'has_left',
  content: 'channel_raw.left',
})}

foreach(dummy in case when channel_raw.uploads_playlist_id is not null then [1] else [] end |
  merge (p:Playlist {id: channel_raw.uploads_playlist_id})
  merge (n)-[:has_uploads]->(p)
)

foreach(dummy in case when channel_raw.favorites_playlist_id is not null then [1] else [] end |
  merge (p:Playlist {id: channel_raw.favorites_playlist_id})
  merge (n)-[:has_favorites]->(p)
)
`;


const channel_import_queued_mark_done = ()=> `
// with "..." as p_id, [{q_id: "...", channel: {...}}] as xs
match (p:Processor {id: p_id})
unwind xs as x
with x.channel as channel_raw, x.q_id as q_id, p

${channel_import({with_add: ', q_id, p'})}

match (q:Queued {id: q_id})
set
  q.status = 'done',
  q.modified_at = datetime()
with q
optional match (q)<-[r:has_node]-(p:Processor)
delete r
`


const queries = {
  xPlus1: `return $x + 1 as res`,
  channel_import,
  channel_import_queued_mark_done,


['queue rand 10 unqueued channels for fetch']:
// match ()-[:has_featured_channel]->(c:Channel)
`
  match (c:Channel)
  where c.fetchedAt is null
  and not (c)<-[:has_node]-(:Queued)
  with c order by rand() limit 10 // return c
  merge (c)<-[:has_node]-(q:Queued {created_at: datetime(), priority: 1.0})
`,


['queue 10 unqueued channels for fetch (ordered by featured by channel size)']:
`
  match (c:Channel)
  where c.subscriber_count is not null
  with c order by c.subscriber_count desc // limit 1000 or add some rnd filter to make faster
  match (c)-[:has_featured_channel]->(fc:Channel)
  where fc.fetchedAt is null
  and not (fc)<-[]-(:Queued)
  with fc, c order by c.subscriber_count desc limit 10
  merge (fc)<-[:has_node]-(q:Queued {created_at: datetime(), priority: 1.0})
  // return c.subscriber_count, c.title, collect(fc)
`,


['inspect queue with logs']:
`
  match (q:Queued)-[:has_node]->(c:Channel)
  with q, c
  optional match (q)<-[:has_node]-(l:Log)
  with q, c, l
  order by q.priority desc, q.created_at asc
  return q, c as channel, collect(l) as logs
`,


['inspect queue stalling']:
// https://neo4j.com/docs/cypher-manual/current/functions/temporal/duration/
// with "PT1H" as dur_str
`
  match (q:Queued)-[:has_node]->(c:Channel)
  where q.status is not null and q.modified_at < datetime() - duration(dur_str)
  with q, c
  order by q.priority desc, q.created_at asc
  optional match (q)<-[:has_node]-(p:Processor)
  return p as processor, q as queued, c as channel
`,


['reset stalling "taken"']:
// with "PT1H" as dur_str
// with "PT3S" as dur_str
`
  match (q:Queued)-[:has_node]->(c:Channel)
  where q.status = "taken" and q.modified_at < datetime() - duration(dur_str)
  set q.status = null, q.modified_at = datetime()
  with q
  optional match (q)<-[r:has_node]-(p:Processor)
  delete r
  return count(q) as count
`,


['reset "failed"']:
// with "PT1H" as dur_str
// with "PT3S" as dur_str
`
  match (q:Queued)-[:has_node]->(c:Channel)
  where q.status = "failed" and q.modified_at < datetime() - duration(dur_str)
  set q.status = null, q.modified_at = datetime()
  with q
  optional match (q)<-[r:has_node]-(p:Processor)
  delete r
  return count(q) as count
`,


['register/ensure processor + mark as started']: ({p_id})=>
// ' .env
//  processor_id_file=.env.processor_id
//  [ ! -f "$processor_id_file" ] && openssl rand -base64 32 > "$processor_id_file"
//  processor_id=`cat $processor_id_file`
// ' config
//  id: process.env.processor_id
// await assert_unique('processor_id_unique', 'Processor', 'n.id')
`
  merge (p:Processor {id: ${p_id}})
  set
    p.started_at = datetime()
  create (l:Log {created_at: datetime(), at: "processor.start"})
  merge (p)<-[:has_node]-(l)
`,


['take from queue']:
// await assert_unique('queued_id_unique', 'Queued', 'n.id')
// assumes processor already registered
// with "..." as p_id
`
  match (p:Processor {id: p_id})
  with p
  match (q:Queued)-[:has_node]->(c:Channel)
  where q.status is null
  with p, q, c
  order by q.priority desc, q.created_at asc
  limit 2
  set
    q.status = 'taken',
    q.modified_at = datetime(),
    q.id = coalesce(q.id, apoc.create.uuid())
  merge (p)-[:has_node]->(q)
  return q.id as q_id, c as channel
`,


['add failing log message']:
// warn: "(q)<-[r:has_node]-(p:Processor)", r is not deleted to aid failure debugging
// with
//  {at: "yt_fetch", text: "some err"} as log_obj,
//  "1ae234e9-3c6c-457d-bb38-0dbcdcb67e8a" as q_id
`
  create (l:Log)
  set
    l += log_obj,
    l.created_at = datetime()
  with q_id, l
  match (q:Queued {id: q_id})
  set
    q.status = 'failed',
    q.modified_at = datetime()
  merge (q)<-[:has_node]-(l)
`,


['mark queued as success/done']: `
  // with "1ae234e9-3c6c-457d-bb38-0dbcdcb67e8a" as q_id
  match (q:Queued {id: q_id})
  set
    q.status = 'done',
    q.modified_at = datetime()
  with q
  optional match (q)<-[r:has_node]-(p:Processor)
  delete r
`,

}


module.exports = {queries, example_channel_raw}
