#!/bin/bash

# Wait for MongoDB without a timeout
./wait-for-it.sh ${FLM_MONGODB_HOST}:${FLM_MONGODB_PORT} -t 0

if [ "$FLM_DOCKER_WAIT_GENIE" == "true" ]; then
  ./wait-for-it.sh ${FLM_NBI_ADDR}:7557 -t 0
fi

if [ "$FLM_DOCKER_USE_CRON_BACKUP" == "true" ]; then
  echo "Configuring backup script..."
  echo -n "$AIX_PROVIDER" > /tmp/AIX_PROVIDER
  echo -n "$AIX_B2_BUCKET" > /tmp/AIX_B2_BUCKET
  echo -n "$AIX_B2_ACCOUNT" > /tmp/AIX_B2_ACCOUNT
  echo -n "$AIX_B2_SECRET" > /tmp/AIX_B2_SECRET
  echo "Starting cron service..."
  service cron start
  crontab -l | { cat; echo "0 4 * * * bash /app/scripts/backup-docker.sh"; } | crontab -
fi

# Dumb init avoids node process running as the first process which is not
# recommended by NodeJS
dumb-init node bin/www
