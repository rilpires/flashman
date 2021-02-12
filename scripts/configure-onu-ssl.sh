#!/bin/sh
  
flashman_mqtt_cert_root=$1
flashman_domain=$2
destination_user=$3

cd "$flashman_mqtt_cert_root"
if [ ! -d "onu-certs" ]
then
  mkdir onu-certs
fi
cd onu-certs

# Make sure files are never world readable
umask 077

# CA private key
openssl genrsa -out onuCA.key 4096
# CA cerficate - expire in 20 years
openssl req -x509 -new -nodes -key onuCA.key -sha256 -days 7305 -subj "/C=BR/ST=Some-State/O=Anlix/CN=Flashman ONU CA" -out onuCA.pem
# GenieACS certificate private key
openssl genrsa -out onuCert.key 2048
# GenieACS certificate request
openssl req -new -key onuCert.key -subj "/C=BR/ST=Some-State/O=Anlix/CN=$flashman_domain" -out onuCert.csr
# Certificate extensions
cat <<'EOF' >> onuCert.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
EOF
# GenieACS certificate - expire in 6 months
openssl x509 -req -in onuCert.csr -CA onuCA.pem -CAkey onuCA.key -CAcreateserial -out onuCert.pem -days 180 -sha256 -extfile onuCert.ext
# Remove now old certificate request
rm onuCert.csr

# Change file ownership and permissions
chown $destination_user onuCA.key onuCA.pem onuCA.srl onuCert.ext onuCert.key onuCert.pem
chmod 400 onuCA.key onuCA.pem onuCert.ext onuCert.key onuCert.pem
