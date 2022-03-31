const FirmwaresAPI = require('../../external-genieacs/firmwares-api');
const FirmwareModel = require('../../../models/firmware');

let acsFirmwareHandler = {};

acsFirmwareHandler.addFirmwareInACS = async function(firmware) {
  let binData;
  try {
    binData = await FirmwaresAPI.receiveFile(firmware.filename);
  } catch (e) {
    return false;
  }
  try {
    await FirmwaresAPI.uploadToGenie(binData, firmware);
  } catch (e) {
    return false;
  }
  return true;
};

acsFirmwareHandler.delFirmwareInACS = async function(filename) {
  await FirmwaresAPI.delFirmwareInGenie(filename);
};

acsFirmwareHandler.upgradeFirmware = async function(device) {
  let firmwares;
  // verify existence in nbi through 7557/files/
  firmwares = await FirmwaresAPI.getFirmwaresFromGenie();

  let firmware = firmwares.find((f) => f.metadata.version == device.release);
  // if not exists, then add
  if (!firmware) {
    firmware = await FirmwareModel.findOne({
      model: device.model,
      release: device.release,
      cpe_type: 'tr069',
    });
    if (!firmware) {
      return {success: false,
        message: t('firmwareVersionNotFound', {errorline: __line})};
    } else {
      let response = await acsFirmwareHandler.addFirmwareInACS(firmware);
      if (!response) {
        return {success: false,
          message: t('firmwareInsertError', {errorline: __line})};
      }
    }
  }
  // trigger 7557/devices/<acs_id>/tasks POST 'name': 'download'
  let response = '';
  try {
    response = await FirmwaresAPI.sendUpgradeFirmware(firmware, device);
  } catch (e) {
    return {success: false, message: e.message};
  }
  return {success: true, message: response};
};

module.exports = acsFirmwareHandler;
