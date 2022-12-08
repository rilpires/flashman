#!/bin/bash

FIRMWARES_PATH="$FLM_IMG_RELEASE_DIR"
COMPANY="$AIX_PROVIDER"
BACKBLAZE_BUCKET="$AIX_B2_BUCKET"
BACKBLAZE_ACCOUNT="$AIX_B2_ACCOUNT"
BACKBLAZE_APPSECRET="$AIX_B2_SECRET"
ZIP_FIRMWARES_FNAME="${COMPANY}_firmwaredata.zip"
LOG="/tmp/restore-firmwares.log"

b2downloadfile(){
  echo "Downloading $2" >> $LOG
  DEST_FILE="$COMPANY/$2"
  if ! b2 download-file-by-name "$1" "$DEST_FILE" "$3" >> $LOG 2>&1; then
    echo "[$0 ERROR] trying to download $2, check logs at $LOG"
    rm -f "$3"
    echo "END|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
  fi
}

echo "START|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
echo "Generating logs at $LOG" | tee -a $LOG

if ! which unzip > /dev/null; then
      echo "[$0 ERROR] unzip command not found." | tee -a $LOG
      echo "END|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
      exit 1
fi

if ! which b2 > /dev/null; then
    echo "[$0 ERROR] b2 command not found." | tee -a $LOG
    echo "END|$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    exit 1
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

echo "Restoring Flashman firmwares" >> $LOG
b2downloadfile "$BACKBLAZE_BUCKET" "$ZIP_FIRMWARES_FNAME" "/tmp/$ZIP_FIRMWARES_FNAME"
if ! unzip -j -o "/tmp/$ZIP_FIRMWARES_FNAME" -d "$FIRMWARES_PATH" >> $LOG 2>&1; then
    echo "[$0 ERROR] unzipping $ZIP_FIRMWARES_FNAME to $FIRMWARES_PATH, check logs at $LOG" | tee -a $LOG
    echo "END$(date "+%Y%m%d %H:%M:%S")" >> $LOG
    rm -f "/tmp/$ZIP_FIRMWARES_FNAME"
    exit 1
fi
rm -f "/tmp/$ZIP_FIRMWARES_FNAME"
