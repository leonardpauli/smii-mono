/*
legend:
  Processor
    id
  Queued
    id is Empty or Id // set when status is changed first time?
    created_at is Date
    priority is Float
      // default: 1; higher is higher priority, eg. should be taken before lower priority
    status is Enum(Empty, 'taken', 'failed', 'done')
    taken_at is Empty or Date // may be set even if status is null, eg. if reset:ed from stalling
    finished_at is Empty or Date // done or failed (see connected :Log for failure reason)

  Log
    at is String
    created_at

  Channel_yt is Channel
    id
  Text
    text is String

 */


// TODO: using non-param fields is dangerous (if accepting string from client,
// exposes arbitrary db access; only as internal snippets)
// {though somewhat neccessary atm as neo4j.cypher.limit doesn't support params?}


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
  likes_playlist_id: 'FLXuqSBlHAE6Xw-yeJA0Tuns', // mostly not used, better but in .left?

  featured_channel_ids: ['UCXuqSBlHAE6Xw-yeJA0Tunt', 'UCXuqSBlHAE6Xw-yeJA0Tunk'],
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

const channel_merge_match = ({channel_raw, with_add = '', c_var = 'n', set_other = false})=> `
foreach(dummy in case when ${channel_raw}.id is not null then [1] else [] end |
  merge (cmm_id:Channel_yt {id: ${channel_raw}.id})
  ${set_other?`set cmm_id.slug = ${channel_raw}.slug`:''}
)
foreach(dummy in case when ${channel_raw}.slug is not null then [1] else [] end |
  merge (cmm_slug:Channel_yt {slug: ${channel_raw}.slug})
  ${set_other?`set cmm_slug.id = ${channel_raw}.id`:''}
)
with ${channel_raw}${with_add}
match (${c_var}:Channel_yt)
where ${c_var}.id = ${channel_raw}.id or ${c_var}.slug = ${channel_raw}.slug
with ${c_var}, ${channel_raw}${with_add}
`

const channel_add_with_campaign = ({xs, campaign_id, with_add = ''})=>
/*
with [{
  id: 'UCb1cPPukAdNqMT8dzHRhS5Q',
  slug: null,
  meta: {
    influencer_handle: 'Neurodrome',
    status: 'Live',
    relationship: 'One-off',
    category: 'Politics',
    email: 'neurodromeyt@gmail.com',
    revenue: 1426,
    sales_from_fees: 18,
    country_iso: 'IT'
  }
},
{
  id: null,
  slug: 'franciscoherrera84',
  meta: {
    influencer_handle: 'Frankie Tech',
    status: 'Live',
    relationship: 'One-off',
    category: 'Tech',
    email: 'frankietechvideos@gmail.com',
    country_iso: 'HK'
  }
}] as xs, 'nordvpn_jun20' as campaign_id

 */
`
merge (campaign:Campaign {id: ${campaign_id}})
on create set campaign.created_at = datetime()
with ${xs} as xs, campaign
unwind xs as x

${channel_merge_match({channel_raw: 'x', with_add: ', campaign'+with_add, c_var: 'c'})}

merge (c)<-[:has_node]-(cd:CampaignData)<-[:has_campaign_data]-(campaign)
set cd += x.meta

// return c, cd, campaign
return count(distinct c), count(distinct cd), count(distinct campaign)
`

const video_add_with_campaign = ({xs, campaign_id, with_add = ''})=>
/*
with [{
  id: 'UCb1cPPuk',
  meta: {
    ...
  }
},
{
  id: 'UCffPPuk',
  meta: {
    ...
  }
}] as xs, 'nordvpn_jun20' as campaign_id
 */
`
merge (campaign:Campaign {id: ${campaign_id}})
on create set campaign.created_at = datetime()
with ${xs} as xs, campaign
unwind xs as x

merge (v:Video {id: x.id})
with x, v, campaign${with_add}

merge (v)<-[:has_node]-(cd:CampaignData)<-[:has_campaign_data]-(campaign)
set cd += x.meta

// return v, cd, campaign
return count(distinct v), count(distinct cd), count(distinct campaign)
`

const channel_import = ({channel_raw, with_add = ''})=> `
${channel_merge_match({channel_raw, with_add, c_var: 'n', set_other: true})}

set
  n :Channel,
  n += ${channel_raw}.rest,

  n.published_at = case when ${channel_raw}.published_at is null then null else datetime(${channel_raw}.published_at) end,
  n.fetched_at = case when ${channel_raw}.fetched_at is null then null else datetime(${channel_raw}.fetched_at) end,

  n.view_count = toInteger(${channel_raw}.view_count),
  n.post_count = toInteger(${channel_raw}.post_count),

  n.subscriber_count = case when ${channel_raw}.subscriber_count_hidden = true then null else toInteger(${channel_raw}.subscriber_count) end,

  n.country = ${channel_raw}.country
with n, ${channel_raw}${with_add}


// foreach(dummy in [1] |
//   // TODO: remove prev, potentially creates dummy node
//   merge (n)-[r:has_country]->(:Country)
//   delete r
// )
foreach(dummy in case when ${channel_raw}.country is not null then [1] else [] end |
  merge (n_country:Country {yt_code: ${channel_raw}.country})
  merge (n)-[:has_country]->(n_country)
)

${_text_node_replace({
  type: 'has_keywords',
  content: `${channel_raw}.keywords`,
})}

${_text_node_replace({
  type: 'has_description',
  content: `${channel_raw}.description`,
})}

${_text_node_replace({
  type: 'has_left',
  content: `${channel_raw}.left`,
})}

foreach(dummy in case when ${channel_raw}.uploads_playlist_id is not null then [1] else [] end |
  merge (p:Playlist {id: ${channel_raw}.uploads_playlist_id})
  merge (n)-[:has_uploads]->(p)
)

foreach(dummy in case when ${channel_raw}.favorites_playlist_id is not null then [1] else [] end |
  merge (p:Playlist {id: ${channel_raw}.favorites_playlist_id})
  merge (n)-[:has_favorites]->(p)
)

foreach(dummy in case when ${channel_raw}.likes_playlist_id is not null then [1] else [] end |
  merge (p:Playlist {id: ${channel_raw}.likes_playlist_id})
  merge (n)-[:has_likes]->(p)
)

foreach(fc_id in ${channel_raw}.featured_channel_ids |
  merge (fc:Channel_yt {id: fc_id})
  merge (n)-[:has_featured_channel]->(fc)
)

with n, ${channel_raw}${with_add}
`;


const channel_import_queued_mark_done = ({p_id, xs})=>
// with "..." as p_id, [{q_id: "...", channel: {...}}] as xs
`
match (p:Processor {id: p_id})
unwind xs as x
with x.channel as channel_raw, x.q_id as q_id, p

${channel_import({channel_raw: 'channel_raw', with_add: ', q_id, p'})}

match (q:Queued {id: q_id})
set
  q.status = 'done',
  q.finished_at = datetime()
with q
optional match (q)<-[r:has_node]-(p:Processor)
delete r
`


const queries = {
  xPlus1: `return $x + 1 as res`,
  channel_import,
  channel_import_queued_mark_done,
  channel_add_with_campaign,

  video_add_with_campaign,


['queue viz processors list']: ()=>
`
match (p:Processor)
optional match (l:Log)
return
  p {.id},
  collect(l {.at, .error, created_at: tostring(l.created_at)}) as logs
`,

['queue viz queued list']: ({count = '300', cutoff_date = '"20190101"'})=>
`
match (q:Queued)
with q, coalesce(q.finished_at, q.taken_at, q.created_at) as last_d
where last_d > datetime(${cutoff_date})
with q order by last_d desc limit ${count}
optional match (q)<-[:has_node]-(p:Processor)
optional match (q)-[:has_node]->(c:Channel_yt)
optional match (c)-[:has_featured_channel]->(fc:Channel_yt)
// optional match (c)-[:has_uploads]->(pl:Playlist)-[:has_video]->(v:Video)
with q, p, c, collect(fc.id) as featured
optional match (c)-[:has_country]->(cu:Country)
// return *
return
  q {.id, .priority, .status},
  p.id as p_id,
  c {.id, .slug, .title, fetched_at: tostring(c.fetched_at), .subscriber_count},
  cu.yt_code as country
`,


['queue add channels (rand 10 unqueued)']: ()=>
// match ()-[:has_featured_channel]->(c:Channel_yt)
`
  match (c:Channel_yt)
  where c.fetchedAt is null
  and not (c)<-[:has_node]-(:Queued)
  with c order by rand() limit 10 // return c
  merge (c)<-[:has_node]-(q:Queued {created_at: datetime(), priority: 1.0})
`,


['queue add channels (from featured_channel, ordered by featured by channel size)']: ({count = '10'} = {})=>
`
  match (c:Channel_yt)
  where c.subscriber_count is not null
  with c order by c.subscriber_count desc // limit 1000 or add some rnd filter to make faster
  match (c)-[:has_featured_channel]->(fc:Channel_yt)
  where fc.fetched_at is null
  and not (fc)<-[]-(:Queued)
  with fc, c order by c.subscriber_count desc limit ${count}
  merge (fc)<-[:has_node]-(q:Queued {created_at: datetime(), priority: 1.0})
  return c.subscriber_count, c.title, collect(fc.id)
`,


['queue add channels by id once']: ({xs, priority = 1.0})=>
`
  with ${xs} as xs
  unwind xs as x
  merge (c:Channel_yt {id: x})
  with c
  optional match (c)<-[:has_node]-(pq:Queued)
  where pq.status is null or pq.status = 'taken'
  with c, count(pq) as pqc

  // TODO: if exists, mod earliest.priority = max(earliest.priority, priority)?

  foreach(dummy in case when pqc = 0 then [1] else [] end |
    merge (c)<-[:has_node]-(q:Queued {created_at: datetime(), priority: ${priority}})
  )

  return count(c) as count, pqc as existing_queued_entries_count
`,


['queue inspect with logs']:
`
  match (q:Queued)-[:has_node]->(c:Channel_yt)
  with q, c
  optional match (q)<-[:has_node]-(l:Log)
  with q, c, l
  order by q.priority desc, q.created_at asc
  return
    tostring(coalesce(q.finished_at, q.taken_at, q.created_at)) as updated_at,
    duration.between(q.taken_at, q.finished_at).milliseconds as duration,
    q {.priority, .status},
    c {.id, .title, fetched_at: tostring(c.fetched_at)} as channel,
    collect(l {.at}) as logs
`,


['queue inspect stalling']: ({dur_str = '"PT1H"'})=>
// https://neo4j.com/docs/cypher-manual/current/functions/temporal/duration/
`
  match (q:Queued)-[:has_node]->(c:Channel_yt)
  where q.status = 'taken' and q.taken_at < datetime() - duration(${dur_str})
  with q, c
  order by q.priority desc, q.created_at asc
  optional match (q)<-[:has_node]-(p:Processor)
  return p as processor, q as queued, c as channel
`,

['queue inspect taken for processor']: ({p_id = '$p_id'})=>
`
  match (p:Processor {id: ${p_id}})
  with p
  match (p)-[:has_node]->(q:Queued)-[:has_node]->(c:Channel_yt)
  where q.status = 'taken'
  with q, c
  order by q.priority desc, q.created_at asc
  return q.id as q_id, tostring(q.taken_at) as taken_at, c {.id, .slug} as channel
`,


['queue reset stalling']: ({dur_str = '"PT1H"'})=>
`
  match (q:Queued)-[:has_node]->(c:Channel_yt)
  where q.status = 'taken' and q.taken_at < datetime() - duration(${dur_str})
  set q.status = null
  with q
  optional match (q)<-[r:has_node]-(p:Processor)
  delete r
  return count(q) as count
`,


['queue remove awaiting']:
`
  match (q:Queued)-[:has_node]->(c:Channel_yt)
  where q.status is null
  detach delete q
  return count(q) as count
`,


['queue reset "failed"']: ({dur_str = '"PT30S"'} = {})=>
`
  match (q:Queued)-[:has_node]->(c:Channel_yt)
  where q.status = "failed" and q.finished_at < datetime() - duration(${dur_str})
  set q.status = null, q.finished_at = null, q.taken_at = null
  with q
  optional match (q)<-[r:has_node]-(p:Processor)
  delete r
  return count(q) as count
`,


['processor register/ensure and mark as started']: ({p_id})=>
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


['queue take awaiting']: ({p_id, count})=>
// await assert_unique('queued_id_unique', 'Queued', 'n.id')
// assumes processor already registered
// with "..." as p_id
`
  match (p:Processor {id: ${p_id}})
  with p
  match (q:Queued)-[:has_node]->(c:Channel_yt)
  where q.status is null
  with p, q, c
  order by q.priority desc, q.created_at asc
  limit ${count}
  set
    q.status = 'taken',
    q.taken_at = datetime(),
    q.finished_at = null,
    q.id = coalesce(q.id, apoc.create.uuid())
  merge (p)-[:has_node]->(q)
  return q.id as q_id, c {.id, .slug} as channel
  // TODO: possibly also return .left.etag?
`,


['queue item mark as failed']: ({log_obj, q_id})=>
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
    q.finished_at = datetime()
  merge (q)<-[:has_node]-(l)
`,


['queue item mark as success/done']: `
  // with "1ae234e9-3c6c-457d-bb38-0dbcdcb67e8a" as q_id
  match (q:Queued {id: q_id})
  set
    q.status = 'done',
    q.finished_at = datetime()
  with q
  optional match (q)<-[r:has_node]-(p:Processor)
  delete r
`,

}


module.exports = {queries, example_channel_raw}
