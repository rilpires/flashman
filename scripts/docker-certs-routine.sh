#!/usr/bin/env bash

# Verify and create certs directory
cd /shared
if [ ! -d "certs" ]
then
    mkdir certs
fi

cd scripts
if [ -f /shared/certs/onu-certs/onuCert.key ] && [ -f /shared/certs/onu-certs/onuCA.key ]
then
  ./renew-onu-ca.sh /shared/certs flashman node
  ./renew-onu-cert.sh /shared/certs flashman node
  echo 'CERTS RENEWED'
else
  ./configure-onu-ssl.sh /shared/certs flashman node
  echo 'CERTS CREATED'
fi

chmod 755 -R /shared/certs
