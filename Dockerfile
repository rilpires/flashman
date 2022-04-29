FROM node:12

# APP information
MAINTAINER anlix "guisenges@gmail.com"

WORKDIR /app

COPY /app.js /mqtts.js /sio.js /LICENSE /package.json /docker/environment.config.json /docker/wait-for-it.sh /app/
COPY /bin /app/bin
COPY /controllers /app/controllers
COPY /models /app/models
COPY /public /app/public
COPY /routes /app/routes
COPY /views /app/views

# Run as root
RUN mkdir -p /app/public/firmwares \
	&& chown -R node:node /app /app/public/firmwares; \
	npm install npm@8 -g ; \
	npm --version

# Run as user node
USER node
RUN npm install --production

EXPOSE 8000
EXPOSE 1883
EXPOSE 8883

CMD bash /app/wait-for-it.sh ${FLM_MONGODB_HOST}:${FLM_MONGODB_PORT} -t 0 -- node bin/www
