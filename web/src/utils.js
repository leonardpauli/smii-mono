const {dlog} = require('@leonardpauli/utils/src/log.js')
const misc = require('@leonardpauli/utils/src/misc.js')
const browser = require('@leonardpauli/utils/src/misc.js')
const math = require('@leonardpauli/utils/src/misc.js')

const utils = {
	...misc,
	...browser,
	...math,
	dlog,
}

export default utils
export const circular_json_serializer = utils.circular_json_serializer
export const debounce = utils.debounce
