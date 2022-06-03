#!/bin/sh
./wait-for-courier.sh

# wait for mongo
start_ts=$(date +%s)
while :
do
    nc -z ${FLM_MONGODB_HOST} ${FLM_MONGODB_PORT}
    result=$?
    if [[ $result -eq 0 ]]; then
        end_ts=$(date +%s)
        echo "$FLM_MONGODB_HOST:$FLM_MONGODB_PORT is available after $((end_ts - start_ts)) seconds"
        break
    fi
    sleep 1
done

# wait for nbi
start_ts=$(date +%s)
while :
do
    nc -z ${FLM_NBI_ADDR} ${FLM_NBI_PORT}
    result=$?
    if [[ $result -eq 0 ]]; then
        end_ts=$(date +%s)
        echo "$FLM_NBI_ADDR:$FLM_NBI_PORT is available after $((end_ts - start_ts)) seconds"
        break
    fi
    sleep 1
done

# init cron for daily update certs
crond -l 8 && echo 'cron inited...'
node bin/www
