#!/usr/bin/env bash
set -a; . ../.env.default; . ../.env; set +a # load .env

# todo: possibly use dockerfile? nah, goal is rim + portability is < ease of dev iteration atm

# start_command="npm i" # <- do this first launch to install deps
start_command="node src/main.js"

docker kill neo4j_api &>/dev/null 
docker rm neo4j_api &>/dev/null
docker run -d \
	--name neo4j_api \
	-v "$(pwd)":/app \
	-e neo4j_url="$neo4j_url" \
	-e neo4j_user="$neo4j_user" \
	-e neo4j_pass="$neo4j_pass" \
	-p $api_https_port:3000 \
	`#--network=$neo4j_container_net` \
	--workdir="/app" \
	node:14.2-alpine $start_command
