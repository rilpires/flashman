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
  echo "Triggered certs Renewing in the domain $FLASHMAN_FQDN"
  ./renew-onu-ca.sh /shared/certs $FLASHMAN_FQDN node
  ./renew-onu-cert.sh /shared/certs $FLASHMAN_FQDN node
  echo 'Renewing routine: done'
else
  echo "Trigerred certs creation in the domain $FLASHMAN_FQDN"
  ./configure-onu-ssl.sh /shared/certs $FLASHMAN_FQDN node
  echo 'Certs created'
fi

chmod 755 -R /shared/certs
