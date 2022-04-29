/* global __line */
const TasksAPI = require('./tasks-api');
const fs = require('fs');
const pathModule = require('path');
const t = require('../language').i18next.t;
const imageReleasesDir = process.env.FLM_IMG_RELEASE_DIR;

const GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
const GENIEPORT = (process.env.FLM_NBI_PORT || 7557);

let firmwaresAPI = {};

firmwaresAPI.receiveFile = function(filename) {
  return new Promise((resolve, reject) => {
    let stream = fs.createReadStream(
      pathModule.join(imageReleasesDir, filename));
    let chunks = [];
    stream.on('data', (chunk)=>chunks.push(chunk));
    stream.on('end', () => {
      let binData = Buffer.concat(chunks);
      resolve(binData);
    });
    stream.on('error', () => {
      reject(new Error(t('errorDownloadingFile', {errorline: __line})));
    });
  });
};

firmwaresAPI.uploadToGenie = async function(binData, firmware) {
  let path = '/files/'+firmware.filename;
  let options = {
    method: 'PUT',
    hostname: GENIEHOST,
    port: GENIEPORT,
    path: encodeURI(path),
    headers: {
      'fileType': '1 Firmware Upgrade Image',
      'oui': '',
      'productClass': firmware.model,
      'version': firmware.release,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(binData),
      'Expect': '100-continue',
    },
  };
  return await TasksAPI.request(options, binData);
};

firmwaresAPI.delFirmwareInGenie = async function(filename) {
  let path = '/files/'+filename;
  return await TasksAPI.request({method: 'DELETE', hostname: GENIEHOST,
    port: GENIEPORT, path: encodeURI(path)});
};

firmwaresAPI.getFirmwaresFromGenie = async function() {
  let ret;
  try {
    ret = await TasksAPI.getFromCollection('files', {});
  } catch (err) {
    ret = [];
  }
  return ret;
};

firmwaresAPI.sendUpgradeFirmware = async function(firmware, device) {
  let upgradeFirmwareTask = {
    name: 'download',
    instance: '1',
    fileType: '1 Firmware Upgrade Image',
    fileName: firmware.filename,
  };
  let result = await TasksAPI.addTask(device.acs_id, upgradeFirmwareTask);
  if (result.success) {
    return t('operationSuccessful');
  } else {
    return t('firmwareUpdateTaskDidNotFinsh', {errorline: __line});
  }
};

module.exports = firmwaresAPI;
