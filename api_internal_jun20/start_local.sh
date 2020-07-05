#!/usr/bin/env bash
set -a; . ./.env; set +a # load .env

# npm i # <- do this first launch to install deps
node src/main.js
