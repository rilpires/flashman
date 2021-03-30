const async = require('asyncawait/async');
const await = require('asyncawait/await');
const request = require('request-promise-native');
const mqtt = require('../mqtts');
const util = require('./handlers/util');

const DeviceModel = require('../models/device');
const ConfigModel = require('../models/config');

let dataCollectingController = {};


// returns undefined when field exists in request and is valid. if not, returns
// a string saying what is wrong.
const checkReqField = (req, fieldname, validityFunc) => {
  if (!req.body.hasOwnProperty(fieldname)) {
    return fieldname+' inexistente.';
  }
  if (!validityFunc(req.body[fieldname])) {
    return fieldname+' inválido.';
  }
};

// generic call for checking boolean parameters in request.
const checkBooleanField = (req, fieldname) => checkReqField(req, fieldname,
 (val) => val.constructor === Boolean);

const checkIsActive = (req) => checkBooleanField(req, 'is_active');
const checkHaslatency = (req) => checkBooleanField(req, 'has_latency');
const checkAlarmFqdn = (req) => checkReqField(req,
 'data_collecting_alarm_fqdn', util.isFqdnValid);
const checkPingFqdn = (req) => checkReqField(req,
 'data_collecting_ping_fqdn', util.isFqdnValid);
const checkPingPackets = (req) => checkReqField(req, 'ping_packets',
 (val) => val.constructor === Number && val > 0 && val <= 100);
const checkMac = (req) => checkReqField(req, 'mac', util.isMacValid);
const checkDevices = (req) => {
  if (!req.body.hasOwnProperty('devices')) {
    return 'devices inexistente.';
  }
  let devices = req.body.devices;
  let invalidDevices = {};
  for (let mac in devices) {
    devices[mac] = mac.toUpperCase(); // transform to uppercase
    if (!util.isMacValid(mac)) {
      invalidDevices[mac] = "invalid mac address";
    } else if (devices[mac].constructor !== Boolean) {
      invalidDevices[mac] = "not boolean value";
    }
  }
  if (Object.keys(invalidDevices).length > 0) {
    return {invalidDevices: invalidDevices};
  }
};

// This should check request json and company secret validity (API only)
const checkBodyAndSecret = function(req) {
  if (!util.isJSONObject(req.body)) {
    return [400, 'Erro no JSON recebido'];
  }
  if (!req.body.hasOwnProperty('secret')) {
    return [403, 'Não foi fornecido um secret para autenticação'];
  }
  if (req.body.secret !== req.app.locals.secret) {
    return [403, 'O secret fornecido não está correto'];
  }
  return [200, ''];
};


const handleErrors = function(req, extraHandlersArray) {
  let [errorCode, errorObj] = checkBodyAndSecret(req);
  if (errorCode !== 200) {
    res.status(errorCode).json({ message: errorObj });
    return false; // found a problem with request.
  }
  if (extraHandlersArray !== undefined
   && extraHandlersArray.constructor === Array
   && extraHandlersArray.length > 0) {
    return executeCustomRequestChecks(req, extraHandlersArray);
  }
  return true; // no problems found.
};

const executeCustomRequestChecks = function(req, extraHandlersArray) {
  // accumulating all errors in request, except the ones found in
  // checkBodyAndSecret().
  let errors = [];
  for (let i = 0; i < extraHandlersArray.length; i++) {
    let error = extraHandlersArray[i](req);
    if (error !== undefined) errors.push(error);
  }
  if (errors.length > 0) {
    req.status(400).json({message: errors}); // sending errors.
    return false; // found at least one problem with request.
  }
  return true; // no problems found.
};

// dataCollectingController.activateDevices = async(function(req, res) {
//   const customHandler = async(function(req) {
//     let content = req.body;
//     if (!content.hasOwnProperty('device_list') ||
//         !isArrayObject(content.device_list) ||
//         content.device_list.length < 1) {
//       return [500, 'Não foi fornecida uma lista de dispositivos'];
//     }
//     return content.device_list.reduce((status, device) => {
//       if (status[0] != 200) return status;
//       let mac = returnStrOrEmptyStr(device.mac).toUpperCase();
//       if (!mac) {
//         return [500, 'Um elemento da lista não forneceu endereço MAC'];
//       }
//       if (!mac.match(macRegex)) {
//         return [500, 'Um endereço MAC fornecido não é válido'];
//       }
//       try {
//         let device = await(DeviceModel.findById(mac));
//         if (!device) {
//           return [500, 'Um endereço MAC fornecido não está cadastrado'];
//         }
//       } catch (err) {
//         console.log(err);
//         return [500, 'Erro interno ao consultar o banco de dados'];
//       }
//       return status;
//     }, [200, '']);
//   });

//   // Handle request errors
//   let [errorCode, errorMsg] = await(!handleErrors(req, customHandler));
//   if (errorCode !== 200 && errorMsg !== '') {
//     return res.status(errorCode).json({
//       message: errorMsg,
//     });
//   }

//   // For each device, send MQTT message
//   let deviceList = req.body.device_list;
//   try {
//     deviceList.forEach((dev)=>{
//       let mac = dev.mac.toUpperCase();
//       let device = await(DeviceModel.findById(mac));
//       device.measure_config.is_active = true;
//       await(device.save());
//       mqtt.anlixMessageRouterMeasure(mac.toUpperCase(), 'on');
//     });
//     return res.status(200).end();
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       message: 'Erro interno ao consultar o banco de dados',
//     });
//   }
// });

// dataCollectingController.deactivateDevices = async(function(req, res) {
//   const customHandler = async(function(req) {
//     let content = req.body;
//     if (!content.hasOwnProperty('mac_list') ||
//         !isArrayObject(content.mac_list) ||
//         content.mac_list.length < 1) {
//       return [500, 'Não foi fornecida uma lista de dispositivos'];
//     }
//     return content.mac_list.reduce((status, mac)=>{
//       if (status[0] != 200) return status;
//       if (!mac.match(macRegex)) {
//         return [500, 'Um endereço MAC fornecido não é válido'];
//       }
//       try {
//         let device = await(DeviceModel.findById(mac.toUpperCase()));
//         if (!device) {
//           return [500, 'Um endereço MAC fornecido não está cadastrado'];
//         }
//       } catch (err) {
//         console.log(err);
//         return [500, 'Erro interno ao consultar o banco de dados'];
//       }
//       return [200, ''];
//     }, [200, '']);
//   });

//   // Handle request errors
//   let [errorCode, errorMsg] = await(!handleErrors(req, customHandler));
//   if (errorCode !== 200 && errorMsg !== '') {
//     return res.status(errorCode).json({
//       message: errorMsg,
//     });
//   }

//   // For each device, update config and send MQTT message
//   let macList = req.body.mac_list;
//   try {
//     macList.forEach((mac)=>{
//       let device = await(DeviceModel.findById(mac.toUpperCase()));
//       device.measure_config.is_active = false;
//       await(device.save());
//       mqtt.anlixMessageRouterMeasure(mac.toUpperCase(), 'off');
//     });
//     return res.status(200).end();
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       message: 'Erro interno ao consultar o banco de dados',
//     });
//   }
// });

// dataCollectingController.updateLicenseStatus = async(function(req, res) {
//   const customHandler = async(function(req) {
//     let content = req.body;
//     if (!content.hasOwnProperty('status')) {
//       return [500, 'Não foi fornecido um valor de status para a licença'];
//     }
//     return [200, ''];
//   });

//   // Handle request errors
//   let [errorCode, errorMsg] = await(!handleErrors(req, customHandler));
//   if (errorCode !== 200 && errorMsg !== '') {
//     return res.status(errorCode).json({
//       message: errorMsg,
//     });
//   }

//   // Save new license status in config
//   let status = req.body.status;
//   try {
//     let config = await(ConfigModel.findOne({is_default: true}));
//     if (!config) throw new {};
//     config.measure_configs.is_license_active = status;
//     await(config.save());
//     return res.status(200).end();
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       message: 'Erro acessando o banco de dados',
//     });
//   }
// });

// dataCollectingController.pingLicenseStatus = async(function() {
//   try {
//     let config = await(ConfigModel.findOne({is_default: true}));
//     if (!config || !config.measure_configs.is_active) return;
//     let controllerUrl = 'https://';
//     controllerUrl += config.measure_configs.controller_fqdn;
//     controllerUrl += '/license/status';
//     let body = await(request({
//       url: controllerUrl,
//       method: 'POST',
//       json: {
//         'secret': process.env.FLM_COMPANY_SECRET,
//       },
//     }));
//     config.measure_configs.is_license_active = body.is_active;
//     await(config.save());
//   } catch (err) {
//     console.log('Failed to update license status');
//     console.log(err);
//   }
// });

// const customHandler = async(function(req) {
//   let content = req.body;
//   if (!content.hasOwnProperty('status')) {
//     return [500, 'Não foi fornecido um valor de status para a licença'];
//   }
//   return [200, ''];
// });

dataCollectingController.updateDataCollectingParameters =
async(function(req, res) {
  let checks = [checkIsActive, checkHaslatency, checkAlarmFqdn, checkPingFqdn,
   checkPingPackets];
  if (!handleErrors(checks)) return;

  // Set license to true and set data collecting fqdn.
  ConfigModel.updateOne({is_default: true}, {
    '$set': {
      'data_collecting.is_active': req.body.data_collecting_is_active || false,
      'data_collecting.has_latency': req.body.data_collecting_has_latency || false,
      'data_collecting.alarm_fqdn': req.body.data_collecting_alarm_fqdn || '',
      'data_collecting.ping_fqdn': req.body.data_collecting_ping_fqdn || '',
      'data_collecting.ping_packets': req.body.data_collecting_ping_packets || 100,
    }
  }, (err) => {
    if (err) {
      return res.status(500).json({
        message: 'Erro acessando o banco de dados',
      });
    }
    return res.status(200).end();
  });
});

// // expects a request body being an object where keys are MACs and values are
// // booleans.
// dataCollectingController.setLicenses = async(function(req, res) {
//   let checks = [checkDevices];
//   if (!handleErrors(checks)) {
//     return;
//   }

//   let devices = req.body.devices;
//   let macs = Object.keys(devices);

//   // if request had no devices.
//   if (macs.length === 0) {
//     return res.status(400).json({message: 'Nenhum dispositivo.'});
//   }

//   // check if devices exist in flashman.
//   let existingDevices = {};
//   let existingChangedDevices = {};
//   let unchangedDevices = [];
//   await(DeviceModel.find(
//   {_id: {$in: macs}}, {_id: 1, 'data_collecting.is_active': 1},
//   (docs, err) => {
//     if (err) {
//       return res.status(500).json({
//         message: "Erro ao acessar os dispotivos localmente."
//       });
//     }

//     // only existing devices will be returned.
//     let device;
//     for (let i = 0; i < docs.length; i++) {
//       device = docs[i];
//       existingDevices[device._id] = true;
//       if (device.data_collecting.is_active !== devices[device._id]) {
//         existingChangedDevices[device._id] = devices[device._id];
//       } else {
//         unchangedDevices.push(device._id);
//       }
//     };
//   }));

//   // saving unknown devices to return them with an error message later.
//   let unknownDevices = [];
//   for (let mac in devices) {
//     if (existingDevices[mac] === undefined) {
//       unknownDevices.push(mac);
//     }
//   }

//   let licenseControlBody = {};
//   // if there is at least one device.
//   if (Object.keys(existingChangedDevices).length > 0) {
//     try { // send devices to license-control
//       licenseControlBody = await(request({
//         url: "https://"+process.env.LC_FQDN+"/data_collecting/set/license",
//         method: 'POST',
//         json: {
//           'devices': existingChangedDevices,
//           'secret': process.env.FLM_COMPANY_SECRET,
//         },
//       }));
//     } catch (err) {
//       return res.status(500).json({
//         message: "Erro ao conectar ao controle de licensas."
//       });
//     }

//     // errors from license control come in 'message' field.
//     if (licenseControlBody.message !== undefined) {
//       return res.status(500).json(licenseControlBody);
//     }

//     // separate devices by license state and send MQTT messages.
//     let enabledDevices = [];
//     let disabledDevices = [];
//     for (let mac in licenseControlBody.devices) {
//       if (licenseControlBody.devices[mac] === true) {
//         enabledDevices.push(mac);
//         mqtt.anlixMessageRouterDataCollecting(mac, 'on');
//       } else if (licenseControlBody.devices[mac] === false) {
//         disabledDevices.push(mac);
//         mqtt.anlixMessageRouterDataCollecting(mac, 'off');
//       }
//     }

//     let objs = [
//       {macs: enabledDevices, val: true},
//       {macs: disabledDevices, val: false}
//     ];
//     for (let i = 0; i < objs.length; i++) {
//       let obj = objs[i];
//       // update locally for enabled devices and then disabled devices.
//       await(DeviceModel.update({_id: {$in: obj.macs}}, {
//         '$set': {'data_collecting.is_active': obj.val}
//       }, (err) => {
//         if (err) {
//           res.status(500).json({
//             message: 'error ao atualizar licensas no flashman.'
//           });
//         }
//       }));
//     }
//   }

//   // complement with unknown devices.
//   if (unknownDevices.length > 0) {
//     for (let i = 0; i < unknownDevices.length; i++) {
//       licenseControlBody[unknownDevices[i]] = 'inexistente no flashman.';
//     }
//   }
//   if (unchangedDevices.length > 0) {
//     for (let i = 0; i < unchangedDevices.length; i++) {
//       // repeating received value.
//       licenseControlBody[unchangedDevices[i]] = devices[unchangedDevices[i]];
//     }
//   }

//   // devices with problems in license-control will also be returned here.
//   res.json(licenseControlBody);
// });

module.exports = dataCollectingController;
