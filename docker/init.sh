#!/bin/bash

# Wait for MongoDB
start_ts=$(date +%s)
./wait-for-it.sh ${FLM_MONGODB_HOST}:${$FLM_MONGODB_PORT} -t 0
result=$?
if [ $result -eq 0 ]
then
    end_ts=$(date +%s)
    echo "$FLM_MONGODB_HOST:$FLM_MONGODB_PORT is available after $((end_ts - start_ts)) seconds"
fi

node bin/www
