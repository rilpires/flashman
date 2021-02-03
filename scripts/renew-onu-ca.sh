#!/bin/sh

flashman_mqtt_cert_root=$1
flashman_domain=$2
destination_user=$3

cd "$flashman_mqtt_cert_root/onu-certs"

# Check if old CA certificate will expire in >30 days
if openssl x509 -checkend 2592000 -noout -in onuCA.pem
then
  # Check if old CA certificate will expire in >5 years
  if openssl x509 -checkend 157680000 -noout -in onuCA.pem
  then
    # No action necessary, certificate is still good
    exit 0
  fi
  # Otherwise, we should generate a new CA certificate
  if [ -f onuCA.pem.new ]
  then
    exit 0
  fi
  # Make sure new files are never world readable
  umask 077
  # CA cerficate - expire in 20 years
  openssl req -x509 -new -nodes -key onuCA.key -sha256 -days 7305 -subj "/C=BR/ST=Some-State/O=Anlix/CN=Flashman ONU CA" -out onuCA.pem.new
  # Change file ownership and permissions
  chown $destination_user onuCA.pem.new
  chmod 400 onuCA.pem.new
  exit 0
fi

# Otherwise, we replace old CA and generate a new server certificate
# Move old certificate files
chmod 600 onuCA.pem onuCA.pem.new onuCert.key onuCert.pem onuCert.key.old onuCert.pem.old
mv onuCA.pem onuCA.pem.old
mv onuCA.pem.new onuCA.pem
mv onuCert.key onuCert.key.old
mv onuCert.pem onuCert.pem.old
chmod 400 onuCA.pem.old onuCA.pem onuCert.key.old onuCert.pem.old

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

