#!/bin/bash
#Faz a restauracao do backup buscando no backblaze

VERSAO=2022052002
#2022052002 - substituir usos incorretos de aPrint, aErrorExit e aFalse pois este script nao define essas funcoes
#           - perguntar se o usuario quer continuar quando nao encontrar os arquivos ZIP_FIRMWARES_FNAME ou ZIP_CERTS_GENIE_FNAME
#2022052001 - nao considerar a falta do arquivo de certificado das onus no backup como erro, pois algumas empresas com instalacao antiga podem nao estar usando onu e nao terao esse arquivo no backup
#2022051901 - sempre criar a pasta de certificados de onu
#           - alterado nome de variavel de CERTS_PATH para ONU_CERTS_PATH
#           - o script estava considerando, erroneamente que o backup dos certificados onu gerava a pasta onu-certs, entao o backup dos certificados onu estavam sendo restaurados para a pasta errada
#2022022801 - correcao no parametro do mongorestore, pois o --nsInclude espera um padrao tipo "flashman.*" e nao apenas flashman
#2022020701 - para o mongorestore usar --nsInclude no lugar de --db que e considerado deprecated
#2022020401 - exibir apenas aviso quando nao conseguir fazer download dos firmwares
#2022020303 - ajustes para considerar apenas bucket unico com uma pasta para cada empresa; removidos valores de BACKBLAZE_ACCOUNT e BACKBLAZE_APPSECRET pois serao inseridos depois
#2022020302 - correcao de erro de sintaxe
#2022020301 - mostrar mensagens no terminal pois esse script eh executado de forma interativa; correcao da restauracao da base do GenieACS, faltava descompactar o backup; troca do nome do arquivo de backup; aviso da criacao e localizacao do arquivo de log; apagar arquivos intermediarios
#2022020201 - ajustes para a nova estrutura de buckets devido a limitacao da quantidade no backblaze; inclusao da restauracao do backup do genieacs

if [ "$#" != 2 ]; then
    cat <<EOF
[$0 ERRO] Numero de parametros invalido!

Como usar:
    $0 <<EMPRESA>> <<CAMINHO PARA FIRMWARES BAIXADOS>>
Exemplo:
    $0 meuprovedor /home/user/flashman/public/firmwares
EOF
    exit 1
fi

COMPANY="$1"
FIRMWARES_PATH="$2"
BACKBLAZE_ACCOUNT=""
BACKBLAZE_APPSECRET=""
BACKBLAZE_BUCKET="backup-onpremise"
ZIP_MONGODB_FNAME="${COMPANY}_dbdata.zip"
ZIP_FIRMWARES_FNAME="${COMPANY}_firmwaredata.zip"
ZIP_MONGODB_GENIE_FNAME="${COMPANY}_genieacs.zip"
ZIP_CERTS_GENIE_FNAME="${COMPANY}_onucertificates.zip"
LOG="$HOME/restore-flashman.log"

b2download(){
    echo "Fazendo o download de $2" >> $LOG
    SRC_FILE="$COMPANY/$2"
    if ! b2 download-file-by-name $1 $SRC_FILE $3 >> $LOG 2>&1; then
        rm -f $3
        if [ "$2" = "$ZIP_FIRMWARES_FNAME" ] || [ "$2" = "$ZIP_CERTS_GENIE_FNAME" ]; then
            echo "[AVISO] erro ao fazer o download de $2, se a empresa deveria ter este arquivo no backup, verifique $LOG" | tee -a $LOG
        else
            echo "[$0 ERRO] ao fazer o download de $2, verifique $LOG" | tee -a $LOG
            echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
            exit 1
        fi
    fi
}

echo "INICIO|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
echo "Gerando log em $LOG" | tee -a $LOG

if ! which unzip > /dev/null; then
    echo "[$0 ERRO] Comando unzip não encontrado" | tee -a $LOG
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

if ! which b2 > /dev/null; then
    echo "[$0 ERRO] Comando b2 não encontrado." | tee -a $LOG
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

echo "Autenticando no backblaze" | tee -a $LOG
if ! b2 authorize-account $BACKBLAZE_ACCOUNT $BACKBLAZE_APPSECRET >> $LOG 2>&1; then
    echo "[$0 ERRO] Autenticação com backup remoto falhou, verifique $LOG" | tee -a $LOG
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

echo "Verificando existencia do bucket" | tee -a $LOG
if ! b2 get_bucket $BACKBLAZE_BUCKET >> $LOG 2>&1; then
    echo "[$0 ERRO] Bucket $BACKBLAZE_BUCKET nao existe." | tee -a $LOG
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

b2download $BACKBLAZE_BUCKET "$ZIP_MONGODB_FNAME" "$ZIP_MONGODB_FNAME"
b2download $BACKBLAZE_BUCKET "$ZIP_FIRMWARES_FNAME" "$ZIP_FIRMWARES_FNAME"

echo "Decompactando $ZIP_MONGODB_FNAME" | tee -a $LOG
if ! unzip -o $ZIP_MONGODB_FNAME -d ./ >> $LOG 2>&1; then
    echo "[$0 ERRO] ao descompactar $ZIP_MONGODB_FNAME, verifique $LOG" | tee -a $LOG
    rm -f $ZIP_MONGODB_FNAME ${COMPANY}_flashman.dump
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi
echo "Executando mongorestore" | tee -a $LOG
if ! mongorestore --nsInclude "flashman.*" --drop --archive=${COMPANY}_flashman.dump >> $LOG 2>&1; then
    echo "[$0 ERRO] ao executar mongorestore para ${COMPANY}_flashman.dump, verifique $LOG" | tee -a $LOG
    rm -f $ZIP_MONGODB_FNAME ${COMPANY}_flashman.dump
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi
rm -f $ZIP_MONGODB_FNAME ${COMPANY}_flashman.dump

echo "Restaurando firmwares" | tee -a $LOG
if [ -f "$ZIP_FIRMWARES_FNAME" ]; then
    if ! unzip -o "$ZIP_FIRMWARES_FNAME" -d "$FIRMWARES_PATH" >> $LOG 2>&1; then
        echo "[$0 ERRO] ao descompactar $ZIP_FIRMWARES_FNAME, verifique $LOG" | tee -a $LOG
        rm -f $ZIP_FIRMWARES_FNAME
        echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
        exit 1
    fi
    rm -f $ZIP_FIRMWARES_FNAME
else
    echo "[ERRO] Arquivo $ZIP_FIRMWARES_FNAME nao encontrado." | tee -a $LOG
        R=""
        while [ "$R" != "s" ] && [ "$R" != "n" ]; do
            echo "[AVISO] Arquivo $ZIP_FIRMWARES_FNAME. Continuar assim mesmo?[s|n]"
            read R
        done
        if [ "$R" = "n" ]; then
            exit 1
        else
            echo "Usuario escolheu continuar mesmo assim." | tee -a $LOG
        fi
fi

echo "Restaurando backups GenieACS" | tee -a $LOG
echo "Restaurando backup mongodb GenieACS" | tee -a $LOG
b2download "$BACKBLAZE_BUCKET" "$ZIP_MONGODB_GENIE_FNAME" "$ZIP_MONGODB_GENIE_FNAME"
if ! unzip -o $ZIP_MONGODB_GENIE_FNAME >> $LOG 2>&1; then
    echo "[$0 ERRO] ao descompactar $ZIP_MONGODB_GENIE_FNAME, verifique $LOG" | tee -a $LOG
    rm -f $ZIP_MONGODB_GENIE_FNAME ${COMPANY}_genieacs.dump
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi
if ! mongorestore --nsInclude "genieacs.*" --drop --archive=${COMPANY}_genieacs.dump >> $LOG 2>&1; then
    echo "[$0 ERRO] ao executar mongorestore para ${COMPANY}_genieacs.dump, verifique $LOG" | tee -a $LOG
    rm -f $ZIP_MONGODB_GENIE_FNAME ${COMPANY}_genieacs.dump
    echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi
rm -f $ZIP_MONGODB_GENIE_FNAME ${COMPANY}_genieacs.dump

echo "Restaurando backup certificados GenieACS" | tee -a $LOG
b2download "$BACKBLAZE_BUCKET" "$ZIP_CERTS_GENIE_FNAME" "$ZIP_CERTS_GENIE_FNAME"
ONU_CERTS_PATH="$(echo $FIRMWARES_PATH | sed 's,public/firmwares,certs,')/onu-certs"
if [ ! -d "$ONU_CERTS_PATH" ]; then
    echo -n "Criando $ONU_CERTS_PATH ... " | tee -a $LOG
    if mkdir -p $ONU_CERTS_PATH >> $LOG 2>&1; then
        echo "OK" | tee -a $LOG
    else
        echo "[$0 ERRO] ao tentar criar $ONU_CERTS_PATH" | tee -a $LOG
        exit 1
    fi
fi

if [ -f "$ZIP_CERTS_GENIE_FNAME" ]; then
    if ! unzip -o "$ZIP_CERTS_GENIE_FNAME" -d $ONU_CERTS_PATH >> $LOG 2>&1; then
        echo "[$0 ERRO] ao descompactar $ZIP_CERTS_GENIE_FNAME, verifique $LOG" | tee -a $LOG
        rm -f $ZIP_CERTS_GENIE_FNAME
        echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
        exit 1
    fi
    rm -f $ZIP_CERTS_GENIE_FNAME
else
    echo "[ERRO] Arquivo $ZIP_CERTS_GENIE_FNAME nao encontrado." | tee -a $LOG
        R=""
        while [ "$R" != "s" ] && [ "$R" != "n" ]; do
            echo "[AVISO] Arquivo $ZIP_CERTS_GENIE_FNAME. Continuar assim mesmo?[s|n]"
            read R
        done
        if [ "$R" = "n" ]; then
            exit 1
        else
            echo "Usuario escolheu continuar mesmo assim." | tee -a $LOG
        fi
fi

echo "Procedimento completo." | tee -a $LOG
echo "FIM|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
exit 0
