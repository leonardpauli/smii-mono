
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


const channel_import = `
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
with n, channel_raw


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

return 1
`;


const queries = {
  xPlus1: `return $x + 1 as res`,
  channel_import,  
}


module.exports = {queries, example_channel_raw}
