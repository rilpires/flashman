#!/usr/bin/env bash
./wait-for-it.sh courier:2332 -t 0 -- echo 'Courier is ready...'
echo 'Retrieving certs...'
rm -rf /app/certs
cd /app
while :
do
    sleep 15
    wget -r --no-parent --reject "index.html*" -nd -P certs 'http://courier:2332/files/certs' >/dev/null 2>/dev/null
    ret=$?
    echo $ret
    [[ ! -d '/app/certs' ]] || break
done
find /app/certs -type d -exec chmod 755 {} \;
find /app/certs -type f -exec chmod 400 {} \;
echo 'Certs succesfully downloaded...'
./wait-for-it.sh ${FLM_MONGODB_HOST}:${FLM_MONGODB_PORT} -t 0 -- node bin/www