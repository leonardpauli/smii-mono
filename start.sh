#!/usr/bin/env bash
pwdSaved="$(pwd)"
cd ..
set -a; . .env.default; . .env; set +a # load .env
cd "$pwdSaved"
# set -a; . ./.env; set +a # load .env

image_name='smii-api-20200527'
container_name='smii_api'

docker build -t $image_name .

docker kill $container_name &>/dev/null 
docker rm $container_name &>/dev/null

docker run -d \
	--name $container_name \
	-v "$(pwd)":/app \
	-e neo4j_url="$neo4j_url" \
	-e neo4j_user="$neo4j_user" \
	-e neo4j_pass="$neo4j_pass" \
	-p $api_port:3000 \
	$image_name
