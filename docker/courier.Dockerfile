FROM nginx:alpine

# APP information
MAINTAINER anlix "guisenges@gmail.com"

RUN apk fix && apk update && apk add bash openssl curl

WORKDIR /shared
COPY ./controllers/external-genieacs/ ./external-genieacs/
COPY ./scripts/ ./scripts/
COPY ./docker/courier.conf /etc/nginx/conf.d/

COPY ./scripts/docker-certs-routine.sh /docker-entrypoint.d
COPY ./scripts/init-cron.sh /docker-entrypoint.d
RUN chmod +x /docker-entrypoint.d/docker-certs-routine.sh ; \
	chmod +x /docker-entrypoint.d/init-cron.sh ; \
	cp /docker-entrypoint.d/docker-certs-routine.sh /etc/periodic/weekly

ENV FLASHMAN_FQDN="flashman.anlix.io"

EXPOSE 2332
