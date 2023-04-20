/* eslint-disable no-prototype-builtins */
/* global __line */
const DeviceModel = require('../../../models/device');
const DevicesAPI = require('../../external-genieacs/devices-api');
const TasksAPI = require('../../external-genieacs/tasks-api');
const utilHandlers = require('../util.js');
const sio = require('../../../sio');
const pako = require('pako');
const t = require('../../language').i18next.t;

let acsDeviceLogsHandler = {};

acsDeviceLogsHandler.fetchLogFromGenie = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    return;
  }
  if (!device || !device.use_tr069) {
    return;
  }
  let mac = device._id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let logField = cpe.getModelFields().log;
  let query = {_id: acsID};

  let data = await TasksAPI.getFromCollection('devices', query, logField)
    .catch((err) => {
      console.log(`ERROR IN fetchLog TaskAPI: ${err}`);
      return;
    });
  if (!data || data.length == 0) return;
  data = data[0];

  let success = false;
  if (!utilHandlers.checkForNestedKey(data, logField+'._value')) {
    data = t('logUnavailable', {errorline: __line});
  } else {
    success = true;
    data = utilHandlers.getFromNestedKey(data, logField+'._value');
  }
  let compressedLog = pako.gzip(data);
  if (success) {
    let deviceEdit = await DeviceModel.findById(mac);
    deviceEdit.last_contact = Date.now();
    deviceEdit.lastboot_date = Date.now();
    deviceEdit.lastboot_log = Buffer.from(compressedLog);
    await deviceEdit.save().catch((err) => {
      console.log('Error saving last boot log to database: ' + err);
    });
  }
  sio.anlixSendLiveLogNotifications(mac, compressedLog);
};

module.exports = acsDeviceLogsHandler;
