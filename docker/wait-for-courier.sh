#!/bin/sh

start_ts=$(date +%s)
while :
do
    nc -z courier 2332
    result=$?
    if [[ $result -eq 0 ]]; then
        end_ts=$(date +%s)
        echo "courier:2332 is available after $((end_ts - start_ts)) seconds"
        break
    fi
    sleep 1
done
echo 'Courier is ready...'
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
