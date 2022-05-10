FROM node:12

# APP information
MAINTAINER anlix "guisenges@gmail.com"

WORKDIR /app

COPY /app.js /mqtts.js /sio.js /LICENSE /package.json /docker/environment.config.json /docker/wait-for-it.sh /docker/init.sh /webpack.* /app/
COPY /bin /app/bin
COPY /controllers /app/controllers
COPY /models /app/models
COPY /public /app/public
COPY /routes /app/routes
COPY /views /app/views

# Run as root
RUN mkdir -p /app/public/firmwares \
	&& chown -R node:node /app /app/public/firmwares ; \
	chmod +x /app/init.sh ; \
	npm install npm@8 -g ; \
	npm --version

# Run as user node
USER node
RUN npm install ; \
	npm run build

EXPOSE 8000
EXPOSE 1883
EXPOSE 8883
EXPOSE 3000

CMD bash /app/init.sh
