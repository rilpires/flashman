// const request = require('request-promise-native');
// const mqtt = require('../mqtts');
const util = require('./handlers/util');
const DeviceModel = require('../models/device');
const ConfigModel = require('../models/config');
const deviceListController = require('./device_list.js');

let dataCollectingController = {};

// // returns undefined when field exists in request and is valid. if not, returns
// // a string saying what is wrong.
// const checkReqField = (json, fieldname, validityFunc) => {
//   if (!json.hasOwnProperty(fieldname)) {
//     return fieldname+' inexistente.';
//   }
//   if (!validityFunc(json[fieldname])) {
//     return fieldname+' inválido.';
//   }
// };


// Executes a given validity function for 'fieldName's value, if 'fieldName'
// exists in 'obj' and returns 4 values:
// 1st: boolean that represents the existence of 'fieldName' in 'obj'.
// 2nd: complete fieldName path for data_collecting fields in ConfigModel.
// 3rd: the value for 'fieldName' in 'obj'.
// 4th: error message for defined and invalid values. undefined is allowed.
const checkField = (obj, fieldName, validityFunc) => {
  let v = obj[fieldName];
  let exists = v !== undefined;
  let error = undefined;
  if (v !== undefined && !validityFunc(v)) error = fieldName+' inválido';
  fieldName = 'data_collecting.'+fieldName;
  return [exists, fieldName, v, error];
};

// Checks if 'fieldName' exists in 'obj' and returns 4 values.:
// 1st: boolean that represents the existence of 'fieldName' in 'obj'.
// 2nd: complete fieldName path for data_collecting fields in ConfigModel.
// 3rd: the value for 'fieldName' in 'obj' is not used but can't be undefined.
// 4th: error message is not used.
const checkFieldExists = (obj, fieldName) => {
  let exists = obj[fieldName] !== undefined;
  let v = '';
  let error = undefined;
  fieldName = 'data_collecting.'+fieldName;
  return [exists, fieldName, v, error];
};

// generic check for boolean parameters in an object.
const checkBooleanField = (v) => v.constructor === Boolean;
// generic check for numeric parameters in an object.
const checkNumericField = (v) => v.constructor === Number;
// generic check for numeric parameters, inside an interval, in an object.
const checkNumericFieldInsideInterval = (min, max) =>
  (v) => checkNumericField(v) && v >= min && v <= max;

const checkIsActive = (obj) =>
  checkField(obj, 'is_active', checkBooleanField);
const checkHaslatency = (obj) =>
  checkField(obj, 'has_latency', checkBooleanField);
const checkAlarmFqdn = (obj) =>
  checkField(obj, 'alarm_fqdn', util.isFqdnValid);
const checkPingFqdn = (obj) =>
  checkField(obj, 'ping_fqdn', util.isFqdnValid);
const checkPingFqdnExists = (obj) => checkFieldExists(obj, 'ping_fqdn');
const checkPingPackets = (obj) => // so far, only value=100 is allowed.
  checkField(obj, 'ping_packets', checkNumericFieldInsideInterval(100, 100));
const checkId = (obj) => 
  checkField(obj, 'id', util.isMacValid);

// const checkIsActive = (json) => checkBooleanField(json, pref+'is_active');
// const checkHaslatency = (json) => checkBooleanField(json, pref+'has_latency');
// const checkAlarmFqdn = (json) => checkReqField(json,
//   pref+'alarm_fqdn', util.isFqdnValid);
// const checkPingFqdn = (json) => checkReqField(json,
//   pref+'ping_fqdn', util.isFqdnValid);
// const checkPingPackets = (json) => checkReqField(json, pref+'ping_packets',
//   (val) => val.constructor === Number && val > 0 && val <= 100);
// const checkMac = (json) => checkReqField(json, 'mac', util.isMacValid);

// const checkDevices = (json) => {
//   if (!json.hasOwnProperty('devices')) {
//     return 'devices inexistente.';
//   }
//   let devices = json.devices;
//   let invalidDevices = {};
//   for (let mac in devices) {
//     devices[mac] = mac.toUpperCase(); // transform to uppercase
//     if (!util.isMacValid(mac)) {
//       invalidDevices[mac] = "invalid mac address";
//     } else if (devices[mac].constructor !== Boolean) {
//       invalidDevices[mac] = "not boolean value";
//     }
//   }
//   if (Object.keys(invalidDevices).length > 0) {
//     return {invalidDevices: invalidDevices};
//   }
// };

// // This should check request json and company secret validity (API only)
// const checkBodyAndSecret = function(req) {
//   if (!util.isJSONObject(req.body)) {
//     return [400, 'Erro no JSON recebido'];
//   }
//   if (!req.body.hasOwnProperty('secret')) {
//     return [403, 'Não foi fornecido um secret para autenticação'];
//   }
//   if (req.body.secret !== req.app.locals.secret) {
//     return [403, 'O secret fornecido não está correto'];
//   }
//   return [200, ''];
// };

// const anyErrors = function(req, extraHandlersArray) {
//   let [errorCode, errorObj] = checkBodyAndSecret(req);
//   if (errorCode !== 200) {
//     res.status(errorCode).json({ message: errorObj });
//     return true; // found a problem with request.
//   }
//   if (extraHandlersArray !== undefined
//    && extraHandlersArray.constructor === Array
//    && extraHandlersArray.length > 0) {
//     return executeCustomRequestChecks(req, extraHandlersArray);
//   }
//   return false; // no problems found.
// };

// const executeCustomRequestChecks = function(req, extraHandlersArray) {
//   // accumulating all errors in request, except the ones found in
//   // checkBodyAndSecret().
//   let errors = [];
//   for (let i = 0; i < extraHandlersArray.length; i++) {
//     let error = extraHandlersArray[i](req);
//     if (error !== undefined) errors.push(error);
//   }
//   if (errors.length > 0) {
//     req.status(400).json({message: errors}); // sending errors.
//     return true; // found at least one problem with request.
//   }
//   return false; // no problems found.
// };

// An Object class to be used as errors to be returned in responses.
// Every router http handler will have a final catch that expects an object of
// this class as argument.
class HttpError {
  constructor(code, message) {
    this.code = code // to set the responses code.
    this.message = message // to be sent in response's body json.
  }
}

// Throws errors found in given request body.
const checkBody = function(body) {
  if (body.constructor !== Object) throw new HttpError(400,
    'Erro no JSON recebido.');
  return body
};

// For each field check function in given array ('fieldCheckFunctions'), 
// executes the checks passing the given 'obj' and returns an object containing
// all fields with their names being their full path inside a MongoDB document 
// or throw error if any. This is very reusable because the data_collecting 
// parameters fields are defined identically in both Config and Device Models.
// Field check functions are functions
// that receive a json object and returns 4 values: if it exists in given 
// 'obj', the full path field name of a parameters, the 'obj's field value and
// an error message if the field check function produced any.
// If at least one error is returned form any field check function, an 
// HttpError is thrown where message is an array with all the error messages
// returned from field check functions.
const checkDataCollectingFields = function(obj, fieldCheckFunctions) {
  let errors = [];
  let fullFieldNames = {};
  for (let i = 0; i < fieldCheckFunctions.length; i++) {
    let [exists, fullFieldName, value, error] = fieldCheckFunctions[i](obj);
    if (error !== undefined) errors.push(error);
    else if (exists) fullFieldNames[fullFieldName] = value;
  }
  if (errors.length > 0) throw new HttpError(400, errors); // sending errors.
  return fullFieldNames
};


/* Expects the argument to be an object with the following structure:
  $set: { // MongoDB $set statement key.
    // object where keys are field names to be set and they values.
    obj: req.body.$set,
    // request body field check functions.
    fieldChecks: [checkIsActive, checkHaslatency, checkPingFqdn] 
  },
  $untset: { MongoDB $unset statement key.
    obj: req.body.$unset, // object where keys are fields to be unset. 
    fieldChecks: [checkPingFqdn] // request body field check functions.
  }
*/
// returns an object having MongoDB's update structure, having $set and $unset
// statements, if there was any set or unset received in a request.
const readChangesAndBuildMongoDBUpdateObject = function (changes) {
  let noChange = true; // will be changed if request contains any value.
  let update = {};
  for (let changeKey in changes) {
    change = changes[changeKey];
    if (change.obj !== undefined && change.obj.constructor === Object) {
      // getting and object where keys are full path field names and their 
      // values to be set.
      let fields = checkDataCollectingFields(change.obj, change.fieldChecks);
      if (Object.keys(fields).length > 0) { // if any existing and valid field.
        noChange = false; // we not at least one update will be made.
        update[changeKey] = fields; // build $set, or $unset, statement.
      }
    }
  }
  if (noChange) throw new HttpError(400, 'Nenhuma alteração recebida.');
  return update;
}

// const buildMongoDBUpdateObject = function (fields, statement) {
//   let updateQuery = {};
//   updateQuery[statement] = {};
//   for (let name in fields) updateQuery[statement][name] = fields[name];
//   return updateQuery;
// }

const printErrorAndThrows = function (e, code, message) {
  console.log(message);
  console.log(e);
  throw new HttpError(code, message)
}

const sendErrorResponse = (res, e) => 
  res.status(e.code).json({message: e.message});
const sendOkResponse = (res, json) => 
json === undefined ? res.status(200).end() : res.status(200).json(json);

dataCollectingController.returnServiceParameters = function
(req, res) {
  Promise.resolve()
  .then(() => checkBody(req.body))
  .then(() => ConfigModel.findOne({is_default: true}, 'data_collecting')
    .exec().catch((e) => printErrorAndThrows(e, 500, 'Erro ao buscar os '+
      'parâmetros de coleta de dados.')))
  .then((config) => sendOkResponse(res, config.data_collecting || {}))
  .catch((e) => sendErrorResponse(res, e));
}

dataCollectingController.updateServiceParameters = function
(req, res) {
  Promise.resolve()
  .then(() => checkBody(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body,
      fieldChecks: [checkIsActive, checkHaslatency, checkAlarmFqdn,
        checkPingFqdn, checkPingPackets]
    }
  }))
  .then((update) =>  ConfigModel.updateOne({is_default: true}, update)
    .exec().catch((e) => printErrorAndThrows(e, 500, 'Erro ao salvar os '+
      'parâmetros do serviço de coleta de dados.')))
  .then((r) => sendOkResponse(res))
  .catch((e) => sendErrorResponse(res, e));
};

dataCollectingController.updateManyParameters = async function
(req, res) {
  Promise.resolve()
  .then(() => checkBody(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body.$set,
      fieldChecks: [checkIsActive, checkHaslatency, checkPingFqdn]
    },
    $unset: {
      obj: req.body.$unset,
      fieldChecks: [checkPingFqdnExists]
    }
  }))
  .then(async (update) => {
    let filter_list = req.body.filter_list;
    if (filter_list === undefined) throw new HttpError(400,
      'Filtro de busca não forncedo na alteração em massa dos parâmetros de '+
      'coleta de dados.')
    if (filter_list.constructor !== String) throw new HttpError(400,
      'Filtro de busca não é uma string na alteração em massa dos parâmetros '+
      'de coleta de dados.')
    filter_list = filter_list.split(',');
    return deviceListController.complexSearchDeviceQuery(filter_list)
      .then((select) => ({select, update}));
  })
  // .then((query) => {console.log('query', query)}
  .then((query) => DeviceModel.updateMany(query.select, query.update)
    .exec().catch((e) => printErrorAndThrows(e, 500, 'Erro ao salvar os '+
      'parâmetros de coleta de dados para vários dispositivos.')))
  .then(() => sendOkResponse(res))
  .catch((e) => sendErrorResponse(res, e));
}

dataCollectingController.returnDeviceParameters = function
(req, res) {
  Promise.resolve()
  .then(() => checkBody(req.body))
  .then(() => checkDataCollectingFields(req.body, [checkId]))
  .then(() => DeviceModel.findOne({_id: req.body.id}, 'data_collecting')
    .exec().catch((e) => printErrorAndThrows(e, 500, 'Erro ao buscar os '+
      `parâmetros de coleta de dados do dispositivo ${req.body.id}.`)))
  .then((config) => sendOkResponse(res, parameters || {}))
  .catch((e) => sendErrorResponse(res, e));
}

dataCollectingController.updateDeviceParameters = async function
(req, res) {
  Promise.resolve()
  .then(() => checkBody(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body.$set,
      fieldChecks: [checkIsActive, checkHaslatency, checkPingFqdn]
    },
    $unset: {
      obj: req.body.$unset,
      fieldChecks: [checkPingFqdnExists]
    }
  }))
  .then((update) => DeviceModel.updateOne({_id: req.body.id}, update)
    .exec().catch((e) => printErrorAndThrows(e, 500, 'Erro ao salvar os '+
      `parâmetros de coleta de dados para o dispositivo ${req.body.id}.`)))
  .then(() => sendOkResponse(res))
  .catch((e) => sendErrorResponse(res, e));
}


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
