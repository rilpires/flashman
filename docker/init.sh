#!/bin/bash

# Wait for MongoDB without a timeout
./wait-for-it.sh ${FLM_MONGODB_HOST}:${FLM_MONGODB_PORT} -t 0

dumb-init node bin/www
