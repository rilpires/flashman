FROM nginx:alpine

RUN apk fix && apk update && apk add bash openssl

WORKDIR /shared
COPY ./controllers/external-genieacs/ ./external-genieacs/
COPY ./scripts/ ./scripts/
COPY ./docker/courier.conf /etc/nginx/conf.d/
# Put docker-certs-routine.sh to be executed before nginx bootstrap
# given that docker-entrypoint.sh executes scripts before start nginx
COPY ./scripts/docker-certs-routine.sh /docker-entrypoint.d
RUN chmod +x /docker-entrypoint.d/docker-certs-routine.sh ; \
	cp /docker-entrypoint.d/docker-certs-routine.sh /etc/periodic/weekly

EXPOSE 2332
