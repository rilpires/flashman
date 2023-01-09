FROM node:12.22.12-bullseye-slim

WORKDIR /app

COPY /app.js \
     /mqtts.js \
     /migrations.js \
     /sio.js \
     /LICENSE \
     /package.json \
     /docker/environment.config.json \
     /webpack.* \
     /docker/wait-for-it.sh \
     /docker/init.sh /app/
COPY /bin /app/bin
COPY /controllers /app/controllers
COPY /models /app/models
COPY /public/images /app/public/images
COPY /public/javascripts /app/public/javascripts
COPY /public/locales /app/public/locales
COPY /public/scss /app/public/scss
COPY /public/src /app/public/src
COPY /scripts /app/scripts
COPY /routes /app/routes
COPY /views /app/views

# Run as root
RUN mkdir -p /app/public/firmwares ; \
	chown -R node:node /app /app/public/firmwares ; \
    echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections ; \
    apt-get update ; \
    apt-get install -y --no-install-recommends dialog apt-utils ca-certificates cron dumb-init git python3-pip unzip zip ; \
    apt-get upgrade -y ; \
    update-ca-certificates ; \
    pip3 install b2 ; \
    ln -s /usr/local/bin/b2 /usr/bin/b2 ; \
    npm install npm@8 -g ; \
    npm config set fetch-retry-mintimeout 20000 ; \
    npm config set fetch-retry-maxtimeout 120000 ; \
    chmod +x /app/init.sh ;

# Run as user node
USER node
RUN npm install --production=false ; \
    npm run build ; \
    rm -rf /app/webpack.* ; \
    rm -rf /app/node_modules ; \
    rm -rf /app/public/src ; \
    rm -rf /app/public/scss ; \
    npm install --production

ENV production=true \
    name="flashman" \
    TZ="America/Sao_Paulo" \
    NODE_ENV="production" \
    FLM_MQTTS_DOMAIN="" \
    FLM_ACME_FILE="" \
    FLM_KEY_MQTT_FILE="" \
    FLM_CERT_MQTT_FILE="" \
    FLM_IMG_RELEASE_DIR="/app/public/firmwares/" \
    FLM_ALLOW_DEV_UPDATE_REST_DATA=false \
    FLM_MONGODB_HOST="localhost" \
    FLM_MONGODB_PORT=27017 \
    FLM_ADM_USER="admin" \
    FLM_ADM_PASS="flashman" \
    FLM_CONCURRENT_UPDATES_LIMIT=5 \
    FLM_WEB_PORT="8000" \
    FLM_NBI_ADDR="localhost" \
    FLM_GENIE_IGNORED=true \
    FLM_DOCKER_INSTANCE=1 \
    FLM_DOCKER_WAIT_GENIE=false \
    FLM_DOCKER_USE_CRON_BACKUP=false \
    AIX_PROVIDER="provider" \
    AIX_B2_BUCKET="" \
    AIX_B2_ACCOUNT="" \
    AIX_B2_SECRET=""

EXPOSE 8000
EXPOSE 1883
EXPOSE 8883

# Switch to root because we might need root privileges during the init script,
# specifically to enable cron if we are configuring automatic backup
# The init script will then switch back to user node before running Flashman
# This creates a small vulnerability in which the default user when exec'ing
# into the container will give you root priviliges, but the application itself
# is still running unprivileged:
# https://stackoverflow.com/questions/65574334/docker-is-it-safe-to-switch-to-non-root-user-in-entrypoint
USER root
CMD bash /app/init.sh
