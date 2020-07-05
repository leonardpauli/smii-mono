# smii-api-20200527
*"home-cooked" api mapping json POST requests with action handlers (pre-processing, post-processing, + corresponding neo4j query to be executed)*

Used for social-media-influencer-insights project developed in part in collaboration with Tailify, 2020.

(re "home-cooked" api "framework", used for initial prototyping; should probably be ejected to/replaced by standard solutions if further development by external parties is wanted)

For licencing, contact us.


__Usage:__

- git clone (this repo) && cd (it)
- cp .env.example .env && vi .env # ensure correct
- npm i
- ./start_local.sh # (ctrl-c to stop)
- see example curls
- optional: see https://github.com/leonardpauli/js-utils/tree/jun2020 to link the "framework" for editing


__Example curls:__

- `curl 0.0.0.0:3000/api -X POST -w '\n\n%{http_code}\n' -d'{"action":"server_heartbeat"}' # expected: {"date": (iso string)}`
- `curl 0.0.0.0:3000/api -X POST -w '\n\n%{http_code}\n' -d'{"action":"neo4j_add1","payload":{"n":3}}' # expected: ... 4`
- `curl 0.0.0.0:3000/api -X POST -d'{"action":"channel.title | search.fuzzy","payload":{"q":"mrbeas"}}'`
