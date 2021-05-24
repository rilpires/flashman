#!/bin/bash

if [ "$#" -ne 2 ]
then
  echo "Erro! Especifique os argumentos!"
  echo "$0 <<EMPRESA>> <<CAMINHO PARA FIRMWARES BAIXADOS>>"
  echo "Exemplo:"
  echo "$0 meuprovedor /home/user/flashman/public/firmwares"
  exit -1
fi

COMPANY=$1
FIRMWARES_PATH="$2"
BACKBLAZE_ACCOUNT=""
BACKBLAZE_APPSECRET=""
BACKBLAZE_FLASHMAN_BUCKET="flashman-onpremise-$COMPANY"
ZIP_MONGODB_FNAME="$COMPANY"_dbdata.zip
ZIP_FIRMWARES_FNAME="$COMPANY"_firmwaredata.zip

# Test commands
#command -v pip > /dev/null
#if [ $? -ne 0 ]
#then
#  echo "Erro! Comando pip não encontrado!"
#  exit -1
#fi
command -v unzip > /dev/null
if [ $? -ne 0 ]
then
  echo "Erro! Comando unzip não encontrado!"
  exit -1
fi

# Setup
#pip install -q "setuptools>=20.2"
#pip install -q b2
command -v b2 > /dev/null
if [ $? -ne 0 ]
then
  echo "Erro! Comando b2 não encontrado!"
  exit -1
fi

b2 authorize-account $BACKBLAZE_ACCOUNT $BACKBLAZE_APPSECRET
if [ ! "$?" -eq 0 ]
then
  echo "Autenticação com backup remoto falhou. Abortando..."
  exit -1
fi
b2 get_bucket $BACKBLAZE_FLASHMAN_BUCKET
if [ ! "$?" -eq 0 ]
then
  echo "Bucket não encontrado. Abortando..."
  exit -1
fi

# Download backups
b2 download-file-by-name $BACKBLAZE_FLASHMAN_BUCKET "$ZIP_MONGODB_FNAME" ./"$ZIP_MONGODB_FNAME"
if [ ! "$?" -eq 0 ]
then
  echo "Não foi possível baixar o backup. Abortando..."
  exit -1
fi
b2 download-file-by-name $BACKBLAZE_FLASHMAN_BUCKET "$ZIP_FIRMWARES_FNAME" ./"$ZIP_FIRMWARES_FNAME"
if [ ! "$?" -eq 0 ]
then
  echo "Não foi possível baixar o backup. Abortando..."
  exit -1
fi

# Restore client MongoDB
unzip "$ZIP_MONGODB_FNAME" -d ./
mongorestore --db flashman --drop --archive=./"$COMPANY"_flashman.dump
rm "$ZIP_MONGODB_FNAME"
rm "$COMPANY"_flashman.dump
# Restore firmwares
unzip "$ZIP_FIRMWARES_FNAME" -d "$FIRMWARES_PATH"
rm "$ZIP_FIRMWARES_FNAME"

echo "Procedimento completo!"
exit 0
