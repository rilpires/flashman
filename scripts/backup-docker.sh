#!/bin/bash

FIRMWARES_PATH="$1"
COMPANY="$(cat /tmp/AIX_PROVIDER)"
BACKBLAZE_BUCKET="$(cat /tmp/AIX_B2_BUCKET)"
BACKBLAZE_ACCOUNT="$(cat /tmp/AIX_B2_ACCOUNT)"
BACKBLAZE_APPSECRET="$(cat /tmp/AIX_B2_SECRET)"
FLM_DOCKER_INSTANCE="$(cat /tmp/FLM_DOCKER_INSTANCE)"
ZIP_FIRMWARES_FNAME="${COMPANY}_firmwaredata.zip"
LOG="/tmp/backup-firmwares.log"

b2uploadfile(){
  echo "Uploading $2" >> $LOG
  DEST_FILE="$COMPANY/$3"
  if ! b2 upload_file "$1" "$2" "$DEST_FILE" >> $LOG 2>&1; then
    echo "[$0 ERROR] trying to upload $2, check logs at $LOG"
    rm -f "$2"
    echo "END|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
  fi
}

echo "START|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
echo "Generating logs at $LOG" | tee -a $LOG

if ! which zip > /dev/null; then
      echo "[$0 ERROR] zip command not found." | tee -a $LOG
      echo "END|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
      exit 1
fi

if ! which b2 > /dev/null; then
    echo "[$0 ERROR] b2 command not found." | tee -a $LOG
    echo "END|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

echo "Checking if this instance is the Flashman first container" >> $LOG
if [ "$FLM_DOCKER_INSTANCE" != "1" ]; then
    echo "This instance is not the first container. Exiting..." >> $LOG
    exit 0
fi

if ! b2 authorize-account $BACKBLAZE_ACCOUNT $BACKBLAZE_APPSECRET >> $LOG 2>&1; then
    echo "[$0 ERROR] Remote backup authentication failed, check logs at $LOG" | tee -a $LOG
    echo "END|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

echo "Checking bucket existence" >> $LOG
if ! b2 get_bucket $BACKBLAZE_BUCKET >> $LOG 2>&1; then
    echo "[$0 ERROR] Bucket $BACKBLAZE_BUCKET doesn't exist." | tee -a $LOG
    echo "END|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
fi

echo "Backing up Flashman firmwares" >> $LOG
if [ "$(ls -A $FIRMWARES_PATH)" ]; then
    if ! zip -j -r "/tmp/$ZIP_FIRMWARES_FNAME" "$FIRMWARES_PATH" >> $LOG 2>&1; then
        echo "[$0 ERROR] zipping $FIRMWARES_PATH, check logs at $LOG" | tee -a $LOG
        echo "END$(date "+%Y%m%d %H:%M:%S")" >> $LOG
        rm -f "/tmp/$ZIP_FIRMWARES_FNAME"
        exit 1
    fi
    b2uploadfile "$BACKBLAZE_BUCKET" "/tmp/$ZIP_FIRMWARES_FNAME" "$ZIP_FIRMWARES_FNAME"
    rm -f "/tmp/$ZIP_FIRMWARES_FNAME"
else
    echo "  [WARN] $FIRMWARES_PATH is empty, nothing to backup."
fi
