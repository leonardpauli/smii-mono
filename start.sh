#!/usr/bin/env bash
set -a; . ./.env; set +a # load .env
pwdSaved="$(pwd)"
cd ..
set -a; . .env.default; . .env; set +a # load .env
cd "$pwdSaved"

image_name='smii-fetcher-20200610'
container_name='smii_fetcher'

docker build -t $image_name .

docker kill $container_name &>/dev/null 
docker rm $container_name &>/dev/null

docker run -d \
	--name $container_name \
	-v "$(pwd)":/app \
	--network=$neo4j_container_net \
	-e neo4j_url="$neo4j_url" \
	-e neo4j_user="$neo4j_user" \
	-e neo4j_pass="$neo4j_pass" \
	-e processor_id="$processor_id" \
	-e yt_api_keys="$yt_api_keys" \
	$image_name
