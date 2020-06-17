const {yt_api} = require('../yt_api.js')
const {dlog} = require('@leonardpauli/utils/src/log.js')
const {queries, example_channel_raw} = require('../queries.js')

const {config} = require('../../config.js')

const yt_channel_id_linustechtips = 'UCXuqSBlHAE6Xw-yeJA0Tunw'
const yt_channel_username_beneater = 'eaterbc'


async function main () {

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
		${queries.channel_import({channel_raw: 'channel_raw'})}
		return n.title
	`, {channel_raw: example_channel_raw})



	false && await this.neo4j_request_and_log(
		queries['queue viz processors list']())
	false && await this.neo4j_request_and_log(
		queries['queue viz queued list']())


	false && await this.neo4j_request_and_log(
		queries['queue remove awaiting'])

	false && await this.neo4j_request_and_log(
		queries['queue reset "failed"']())

	false && await this.neo4j_request_and_log(
		queries['queue inspect stalling']({dur_str: '"PT1S"'}))

	false && await this.neo4j_request_and_log(
		queries['queue reset stalling "taken"']({dur_str: '"PT1S"'}))

	false && await this.neo4j_request_and_log(
		queries['queue add channels (from featured_channel, ordered by featured by channel size)']({count: 10}))


	false && await this.neo4j_request_and_log(
		queries['processor register/ensure and mark as started']({p_id: '$p_id'}), {
			p_id: config.processor_id,
		})

	false && await this.neo4j_request_and_log(
		queries['queue add channels by id once']({xs: '$xs'}), {
			xs: [yt_channel_id_linustechtips, "UCa6vGFO9ty8v5KZJXQxdhaw", "UCBgw11dCV17FJDsHxNGZBtA"],
		})
	false && await this.neo4j_request_and_log(queries['queue inspect with logs'])

	if (false) {
		const p_id = config.processor_id
		const res = await this.neo4j_request(queries['queue take awaiting']({p_id: '$p_id', count: 5}), {p_id})
		await this.batch_fetch_import_channels(res, {p_id})
	}


	false && await this.batch_fetch_import_channels([
		// {channel: {slug: yt_channel_username_beneater}},
		{channel: {slug: "non_existing_account_1234253092834091"}},
		// {channel: {id: yt_channel_id_linustechtips}},
	])

}

module.exports = {main}
