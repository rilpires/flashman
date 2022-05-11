#!/bin/sh

# Verify and create certs directory
cd /shared
if [ ! -d "certs" ]
then
    mkdir certs
fi

cd scripts
if [ -f /shared/certs/onu-certs/onuCert.key ] && [ -f /shared/certs/onu-certs/onuCA.key ]
then
  echo 'Triggered certs Renewing'
  ./renew-onu-ca.sh /shared/certs flashman node
  ./renew-onu-cert.sh /shared/certs flashman node
else
  echo 'Trigerred certs creation'
  ./configure-onu-ssl.sh /shared/certs flashman node
  echo 'Certs created'
fi

chmod 755 -R /shared/certs
