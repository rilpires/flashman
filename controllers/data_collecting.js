// const request = require('request-promise-native');
// const mqtt = require('../mqtts');
const util = require('./handlers/util');
const mqtt = require('../mqtts');
const DeviceModel = require('../models/device');
const ConfigModel = require('../models/config');
const deviceListController = require('./device_list.js');

let dataCollectingController = {};

// A function that treats body fields.
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

// A function that treats body fields.
// Returns existence of 'fieldName' in 'obj' and 3 other values.:
// 1st: boolean that represents the existence of 'fieldName' in 'obj'.
// 2nd: complete fieldName path for data_collecting fields in ConfigModel.
// 3rd: the value for 'fieldName' in 'obj' is not used but can't be undefined.
// empty string is used by MongoDB as value for fields to $unset.
// 4th: error message should be undefined to allow a field that doesn't exist
// to be valid.
const fieldExistenceForUnset = (obj, fieldName) => {
  let exists = obj[fieldName] !== undefined;
  fieldName = 'data_collecting.'+fieldName;
  return [exists, fieldName, '', undefined];
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
const checkPingFqdnToUnset = (obj) => 
  fieldExistenceForUnset(obj, 'ping_fqdn');
const checkPingPackets = (obj) => // so far, only value=100 is allowed.
  checkField(obj, 'ping_packets', checkNumericFieldInsideInterval(100, 100));
const checkId = (obj) => 
  checkField(obj, 'id', util.isMacValid);

// An Object class to be used as errors to be returned in responses.
// Every router http handler will have a final catch that expects an object of
// this class as argument.
class HttpError {
  constructor(code, message) {
    this.code = code; // to set the responses code.
    this.message = message; // to be sent in response's body json.
  }
}

// Throws errors found in given request body.
const checkBody = function(body) {
  if (body.constructor !== Object) throw new HttpError(400,
    'Erro no JSON recebido.');
  return body;
};

const checkIdUrlParameter = function(params) {
  params.id = params.id.replace(/_/g, ":");
  if (!util.isMacValid(params.id)) throw new HttpError(400, 
    `Erro no ID recebido: '${params.id}'.`);
  return params;
}

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
  return fullFieldNames;
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
      // values to be set or unset
      let fields = checkDataCollectingFields(change.obj, change.fieldChecks);
      if (Object.keys(fields).length > 0) { // if any existing and valid field.
        noChange = false; // at least one update will be made.
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

const throwsHttpError = function (e, httpCode, jsonErrorMessage) {
  console.log(jsonErrorMessage);
  console.log(e);
  throw new HttpError(httpCode, jsonErrorMessage);
}

const sendErrorResponse = (res, e) => Promise.resolve()
  .then(() => res.status(e.code).json({message: e.message}))
  .catch((e) => console.log('Error when sending error message in data '+
    'collecting response.\n', e));
  
const sendOkResponse = (res, json) => Promise.resolve()
  .then(() => json ? res.status(200).json(json) : res.status(200).end())
  .catch((e) => console.log('Error when sending ok for data collecting '+
    'response.\n', e));


dataCollectingController.returnServiceParameters = function(req, res) {
  return Promise.resolve()
  .then(() => checkBody(req.body))
  .then(() => ConfigModel.findOne({is_default: true}, 'data_collecting').lean()
    .exec().catch((e) => throwsHttpError(e, 500, 'Erro ao buscar os '+
      'parâmetros de coleta de dados.')))
  .then((config) => sendOkResponse(res, config.data_collecting || {}))
  .catch((e) => sendErrorResponse(res, e));
}

dataCollectingController.updateServiceParameters = function(req, res) {
  return Promise.resolve()
  .then(() => checkBody(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body,
      fieldChecks: [checkIsActive, checkHaslatency, checkAlarmFqdn,
        checkPingFqdn, checkPingPackets]
    }
  }))
  .then((update) =>  ConfigModel.updateOne({is_default: true}, update)
    .exec().catch((e) => throwsHttpError(e, 500, 'Erro ao salvar os '+
      'parâmetros do serviço de coleta de dados.')))
  .then((r) => sendOkResponse(res))
  .catch((e) => sendErrorResponse(res, e));
};

dataCollectingController.updateManyParameters = async function(req, res) {
  return Promise.resolve()
  .then(() => checkBody(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body.$set,
      fieldChecks: [checkIsActive, checkHaslatency, checkPingFqdn]
    },
    $unset: {
      obj: req.body.$unset,
      fieldChecks: [checkPingFqdnToUnset]
    }
  }))
  .then(async (update) => {
    let filter_list = req.body.filter_list;
    if (filter_list === undefined) throw new HttpError(400,
      'Filtro de busca não forncedo na alteração em massa dos parâmetros de '+
      'coleta de dados.');
    if (filter_list.constructor !== String) throw new HttpError(400,
      'Filtro de busca não é uma string na alteração em massa dos parâmetros '+
      'de coleta de dados.');
    filter_list = filter_list.split(',');
    return deviceListController.complexSearchDeviceQuery(filter_list)
      .then((select) => ({select, update}));
  })
  // .then((query) => {console.log('query', query)}
  .then((query) => DeviceModel.updateMany(query.select, query.update)
    .exec().catch((e) => throwsHttpError(e, 500, 'Erro ao salvar os '+
      'parâmetros de coleta de dados para vários dispositivos.')))
  .then(() => sendOkResponse(res))
  .catch((e) => sendErrorResponse(res, e));
}

dataCollectingController.returnDeviceParameters = function(req, res) {
  return Promise.resolve()
  .then(() => checkIdUrlParameter(req.params))
  .then(() => DeviceModel.findOne({_id: req.params.id}, 'data_collecting')
    .exec().catch((e) => throwsHttpError(e, 500, 'Erro ao buscar os '+
      `parâmetros de coleta de dados do dispositivo ${req.params.id}.`)))
  .then((device) => sendOkResponse(res, device.data_collecting || {}))
  .catch((e) => sendErrorResponse(res, e));
}

dataCollectingController.updateDeviceParameters = function(req, res) {
  return Promise.resolve()
  .then(() => checkIdUrlParameter(req.params))
  .then(() => checkBody(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body.$set,
      fieldChecks: [checkIsActive, checkHaslatency, checkPingFqdn]
    },
    $unset: {
      obj: req.body.$unset,
      fieldChecks: [checkPingFqdnToUnset]
    }
  }))
  .then((update) => DeviceModel.updateOne({_id: req.params.id}, update)
    .exec().catch((e) => throwsHttpError(e, 500, 'Erro ao salvar os '+
      `parâmetros de coleta de dados para o dispositivo ${req.params.id}.`)))
  .then(() => sendOkResponse(res))
  .then(() => Promise.resolve()
    .then(() => mqtt.anlixMessageRouterUpdate(req.params.id))
    .catch((e) => console.log('Error when forcing sync for device '
      +`'${req.params.id}' after saving data its collecting parameters.\n`, e)))
  .catch((e) => sendErrorResponse(res, e));
}

module.exports = dataCollectingController;
