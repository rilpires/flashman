#!/bin/bash

if [ "$#" -ne 2 ]
then
  echo "Erro! Especifique os argumentos!"
  echo "$0 <<EMPRESA>> <<CAMINHO PARA FIRMWARES BAIXADOS>>"
  echo "Exemplo:"
  echo "$0 meuprovedor /home/user/flashman/public/firmwares"
  exit -1
fi

COMPANY="$1"
FIRMWARES_PATH="$2"
BACKBLAZE_ACCOUNT=""
BACKBLAZE_APPSECRET=""
BACKBLAZE_FLASHMAN_BUCKET="flashman-onpremise-$COMPANY"
ZIP_MONGODB_FNAME="$COMPANY"_dbdata.zip
ZIP_FIRMWARES_FNAME="$COMPANY"_firmwaredata.zip

# Test commands
command -v pip > /dev/null
if [ $? -ne 0 ]
then
  echo "Erro! Comando pip não encontrado!"
  exit -1
fi
command -v zip > /dev/null
if [ $? -ne 0 ]
then
  echo "Erro! Comando zip não encontrado!"
  exit -1
fi

# Setup
pip install -q "setuptools>=20.2"
pip install -q b2
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
  echo "Criando bucket para armazenamento de backups..."
  b2 create-bucket $BACKBLAZE_FLASHMAN_BUCKET allPrivate
  if [ ! "$?" -eq 0 ]
  then
    echo "Bucket não foi criado com sucesso. Abortando..."
    exit -1
  fi
fi

# Backup MongoDB Flashman
mongodump --db flashman --archive=/tmp/"$COMPANY"_flashman.dump
mv /tmp/"$COMPANY"_flashman.dump ./

zip -r "$ZIP_MONGODB_FNAME" ./"$COMPANY"_flashman.dump
b2 upload_file "$BACKBLAZE_FLASHMAN_BUCKET" "$ZIP_MONGODB_FNAME" "$ZIP_MONGODB_FNAME"
if [ ! "$?" -eq 0 ]
then
  echo "Não foi possível realizar o upload do backup!"
  rm "$ZIP_MONGODB_FNAME"
  rm "$COMPANY"_flashman.dump
  echo "Abortando..."
  exit -1
fi
rm "$ZIP_MONGODB_FNAME"
rm "$COMPANY"_flashman.dump

# Backup firmwares
zip -j -r "$ZIP_FIRMWARES_FNAME" "$FIRMWARES_PATH"
b2 upload_file "$BACKBLAZE_FLASHMAN_BUCKET" "$ZIP_FIRMWARES_FNAME" "$ZIP_FIRMWARES_FNAME"
if [ ! "$?" -eq 0 ]
then
  echo "Não foi possível realizar o upload do backup!"
  echo "Abortando..."
  exit -1
fi
rm "$ZIP_FIRMWARES_FNAME"

echo "Procedimento realizado com sucesso!"
exit 0
