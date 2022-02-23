#!/bin/bash

#Faz upload dos firmwares e do dump do banco para o backblaze

VERSAO=2022020402
#2022020402 - nao considerar erro se o diretorio de firmwares estiver vazio
#2022020401 - apagar ZIP_MONGODB_FNAME depois de realizar o upload
#2022020303 - ajustes para considerar apenas bucket unico com uma pasta para cada empresa; removidos valores de BACKBLAZE_ACCOUNT e BACKBLAZE_APPSECRET pois serao inseridos depois
#2022020301 - correcao de nome de variavel; ajuste de gravacao de mensagens no log; aviso da criacao e localizacao do arquivo de log
#2022020201 - ajustes para a nova estrutura de buckets devido a limitacao da quantidade no backblaze; ajuste da geracao do arquivo zip do backup dos certificados do genieacs

if [ "$#" != 3 ]; then
    cat <<EOF
[$0 ERRO] Numero de parametros invalido!

Como usar:
    $0 <<EMPRESA>> <<CAMINHO PARA FIRMWARES BAIXADOS>> <<CAMINHO PARA FLASHMAN>>
Exemplo:
    $0 meuprovedor /home/user/flashman/public/firmwares /home/user/flashman
EOF
    exit 1
fi

COMPANY="$1"
FIRMWARES_PATH="$2"
FLASHMAN_PATH="$3"
BACKBLAZE_ACCOUNT=""
BACKBLAZE_APPSECRET=""
BACKBLAZE_BUCKET="backup-onpremise"
ZIP_MONGODB_FNAME="${COMPANY}_dbdata.zip"
ZIP_MONGODB_GENIE_FNAME="${COMPANY}_genieacs.zip"
ZIP_FIRMWARES_FNAME="${COMPANY}_firmwaredata.zip"
ZIP_CERTS_GENIE_FNAME="${COMPANY}_onucertificates.zip"
LOG="$HOME/backup-flashman.log"

b2uploadfile(){
    echo "Fazendo upload de $2" >> $LOG
    DEST_FILE="$COMPANY/$3"
    if ! b2 upload_file "$1" "$2" "$DEST_FILE" >> $LOG 2>&1; then
        echo "[$0 ERRO] ao tentar fazer upload de $2, verifique $LOG"
        rm -f "$2"
        echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
        exit 1
    fi
}

echo "INICIO|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
echo "Gerando log em $LOG" | tee -a $LOG

if ! which zip > /dev/null; then
      echo "[$0 ERRO] Comando zip não encontrado." | tee -a $LOG
      echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
      exit 1
fi

if ! which b2 > /dev/null; then
    echo "[$0 ERRO] Comando b2 não encontrado." | tee -a $LOG
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

if ! b2 authorize-account $BACKBLAZE_ACCOUNT $BACKBLAZE_APPSECRET >> $LOG 2>&1; then
    echo "[$0 ERRO] Autenticação com backup remoto falhou, verifique $LOG" | tee -a $LOG
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

echo "Verificando existencia do bucket" >> $LOG
if ! b2 get_bucket $BACKBLAZE_BUCKET >> $LOG 2>&1; then
    echo "[$0 ERRO] Bucket $BACKBLAZE_BUCKET nao existe." | tee -a $LOG
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

echo "Gerando backup do mongodb flashman" >> $LOG
if ! mongodump --db flashman --archive=/tmp/${COMPANY}_flashman.dump >> $LOG 2>&1; then
    echo "[$0 ERRO] ao gerar backup do mongodb flashman, verifique $LOG" | tee -a $LOG
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi
mv /tmp/${COMPANY}_flashman.dump ./

echo "Compactando ${COMPANY}_flashman.dump" >> $LOG
if ! zip -r "$ZIP_MONGODB_FNAME" ${COMPANY}_flashman.dump >> $LOG 2>&1; then
    echo "[$0 ERRO] ao compactar ${COMPANY}_flashman.dump, verifique $LOG"
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi
rm -f ${COMPANY}_flashman.dump
b2uploadfile "$BACKBLAZE_BUCKET" "$ZIP_MONGODB_FNAME" "$ZIP_MONGODB_FNAME"
rm -f $ZIP_MONGODB_FNAME

echo "Verificar se MongoDB GenieACS existe para realizar seu backup" >> $LOG
if [ $(mongo --eval 'db.getMongo().getDBNames().indexOf("genieacs")' --quiet) -ge 0 ]; then
    echo "Realizando dump do mongodb GenieACS" >> $LOG
    if ! mongodump --db genieacs --archive=/tmp/${COMPANY}_genieacs.dump >> $LOG 2>&1; then
        echo "[$0 ERRO] ao tentar realizar o dump do mongodb GenieACS"
        echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
        exit 1
    fi
    mv /tmp/${COMPANY}_genieacs.dump ./
    echo "Compactando ${COMPANY}_genieacs.dump" >> $LOG
    if ! zip -r "$ZIP_MONGODB_GENIE_FNAME" "$COMPANY"_genieacs.dump >> $LOG 2>&1; then
        echo "[$0 ERRO] ao compactar ${COMPANY}_flashman.dump, verifique $LOG" | tee -a $LOG
        echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
        exit 1
    fi
    rm -f ${COMPANY}_genieacs.dump
    b2uploadfile "$BACKBLAZE_BUCKET" "$ZIP_MONGODB_GENIE_FNAME" "$ZIP_MONGODB_GENIE_FNAME"
    rm -f $ZIP_MONGODB_GENIE_FNAME
    echo "Backup certificados GenieACS" >> $LOG
    cd ${FLASHMAN_PATH}/certs/
    if ! zip -j -r $HOME/$ZIP_CERTS_GENIE_FNAME onu-certs >> $LOG 2>&1; then
        echo "[$0 ERRO] ao compactar ${FLASHMAN_PATH}/certs/onu-certs, verifique $LOG" | tee -a $LOG
        echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
        rm -f $HOME/$ZIP_CERTS_GENIE_FNAME
        exit 1
    fi
    cd ~
    b2uploadfile "$BACKBLAZE_BUCKET" "$ZIP_CERTS_GENIE_FNAME" "$ZIP_CERTS_GENIE_FNAME"
    rm -f $ZIP_CERTS_GENIE_FNAME
fi

echo "Backup firmwares" >> $LOG
if [ "$(ls -A $FIRMWARES_PATH)" ]; then
    if ! zip -j -r $ZIP_FIRMWARES_FNAME "$FIRMWARES_PATH" >> $LOG 2>&1; then
        echo "[$0 ERRO] ao compactar $FIRMWARES_PATH, verifique $LOG" | tee -a $LOG
        echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
        exit 1
    fi
    b2uploadfile "$BACKBLAZE_BUCKET" "$ZIP_FIRMWARES_FNAME" "$ZIP_FIRMWARES_FNAME"
    rm -f $ZIP_FIRMWARES_FNAME
else
    echo "  [AVISO] Diretorio $FIRMWARES_PATH vazio, backup nao realizado."
fi

echo "Procedimento realizado com sucesso" >> $LOG
echo "FIM|$(date "+%Y%m%d %H:%M:%S")"
exit 0
