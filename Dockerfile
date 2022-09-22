FROM node:12

ENV production false
ENV name "flashman"
ENV log_date_format "YYYY-MM-DD HH:mm Z"
ENV TZ "America/Sao_Paulo"

ENV FLM_MQTTS_DOMAIN ""
ENV FLM_ACME_FILE ""
ENV FLM_KEY_MQTT_FILE ""
ENV FLM_CERT_MQTT_FILE ""
ENV FLM_IMG_RELEASE_DIR "./public/firmwares/"
ENV FLM_ALLOW_DEV_UPDATE_REST_DATA false
ENV FLM_MONGODB_HOST "localhost"
ENV FLM_MONGODB_PORT 27017
ENV FLM_ADM_USER "admin"
ENV FLM_ADM_PASS "flashman"
ENV FLM_CONCURRENT_UPDATES_LIMIT 5
ENV FLM_WEB_PORT "8000"
ENV FLM_GENIE_IGNORED true
ENV FLM_DOCKER_INSTANCE 0

WORKDIR /app

COPY /app.js /mqtts.js /migrations.js /sio.js /LICENSE /package.json /webpack.* /docker/wait-for-it.sh /docker/init.sh /app/
COPY /bin /app/bin
COPY /controllers /app/controllers
COPY /models /app/models
COPY /public /app/public
COPY /routes /app/routes
COPY /views /app/views

# Run as root
RUN mkdir -p /app/public/firmwares \
	&& chown -R node:node /app /app/public/firmwares
RUN apt-get update ; \
    npm install npm@8 -g ; \
    npm --version ; \
    npm config set fetch-retry-mintimeout 20000 ; \
    npm config set fetch-retry-maxtimeout 120000 ; \
    chmod +x /app/init.sh ;

# Run as user node
USER node
RUN npm install ; \
    npm run build

EXPOSE 8000
EXPOSE 1883
EXPOSE 8883

CMD bash /app/init.sh
