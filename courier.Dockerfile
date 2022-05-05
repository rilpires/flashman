FROM nginx:alpine

RUN apk fix

WORKDIR /shared
COPY ./controllers/external-genieacs/ ./external-genieacs/
COPY ./scripts/ ./scripts/
COPY ./courier.conf /etc/nginx/conf.d/

EXPOSE 2332
