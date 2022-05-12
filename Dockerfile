FROM node:12-alpine

# APP information
MAINTAINER anlix "guisenges@gmail.com"

WORKDIR /app

COPY /app.js /mqtts.js /sio.js /migrations.js /LICENSE /package.json /docker/environment.config.json /docker/wait-for-courier.sh /docker/init.sh /webpack.* /app/
COPY /bin /app/bin
COPY /controllers /app/controllers
COPY /models /app/models
COPY /public /app/public
COPY /routes /app/routes
COPY /views /app/views

# Run as root
RUN apk update ; \
	apk add netcat-openbsd wget busybox-suid && rm -rf /var/cache/apk/* ; \
	mkdir -p /app/public/firmwares ; \
	chmod +x /app/init.sh ; \
	chmod +x /app/wait-for-courier.sh ; \
	npm install npm@8 -g ; \
	npm --version ; \
	npm config set fetch-retry-mintimeout 20000 ; \
	npm config set fetch-retry-maxtimeout 120000 ; \
	cp /app/wait-for-courier.sh /etc/periodic/daily ; \
	npm install ; \
	npm run build

EXPOSE 8000
EXPOSE 1883
EXPOSE 8883
EXPOSE 3000

CMD sh /app/init.sh
