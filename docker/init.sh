#!/bin/bash

# Wait for MongoDB without a timeout
./wait-for-it.sh ${FLM_MONGODB_HOST}:${FLM_MONGODB_PORT} -t 0

# Dump init avoids node process running as the first process which is not
# recommended by NodeJS
dumb-init node bin/www
