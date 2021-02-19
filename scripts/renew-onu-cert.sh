#!/bin/sh

flashman_mqtt_cert_root=$1
flashman_domain=$2
destination_user=$3

cd "$flashman_mqtt_cert_root/onu-certs"

# Check if old certificate will expire in >30 days
if openssl x509 -checkend 2592000 -noout -in onuCert.pem
then
  # No action necessary, certificate is still good
  exit 0
fi

# Move old certificate files
chmod 600 onuCert.key onuCert.pem onuCert.key.old onuCert.pem.old
mv onuCert.key onuCert.key.old
mv onuCert.pem onuCert.pem.old
chmod 400 onuCert.key.old onuCert.pem.old

# Make sure new files are never world readable
umask 077

# New certificate private key
openssl genrsa -out onuCert.key 2048
# New certificate request
openssl req -new -key onuCert.key -subj "/C=BR/ST=Some-State/O=Anlix/CN=$flashman_domain" -out onuCert.csr
# New certificate - expire in 6 months
openssl x509 -req -in onuCert.csr -CA onuCA.pem -CAkey onuCA.key -CAcreateserial -out onuCert.pem -days 180 -sha256 -extfile onuCert.ext
# Remove now old certificate request
rm onuCert.csr

# Change file ownership and permissions
chown $destination_user onuCert.key onuCert.pem
chmod 400 onuCert.key onuCert.pem
