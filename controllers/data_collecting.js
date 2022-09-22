/* global __line */

const util = require('./handlers/util');
const mqtt = require('../mqtts');
const DeviceModel = require('../models/device');
const ConfigModel = require('../models/config');
const deviceListController = require('./device_list.js');
const Config = require('../models/config');
const t = require('./language').i18next.t;

let dataCollectingController = {};


// receives data_collecting parameters object from service and from device and
// merges them, taking the device's version into consideration for
// compatibility, and returns the res data_collecting parameters.
dataCollectingController.mergeConfigs = function(service, device, version) {
  // default data collecting parameters to be sent, to device, in response.
  let res = { // nothing happens in device with these parameters.
    is_active: false,
    has_latency: false,
    ping_fqdn: '',
    alarm_fqdn: '',
    ping_packets: 100,
    burst_loss: false,
    wifi_devices: false,
    ping_and_wan: false,
  };

  // for each data_collecting parameter, in service, we copy its value.
  // This also makes the code compatible with a data base with no data
  // collecting parameters.
  // eslint-disable-next-line guard-for-in
  for (let parameter in service) res[parameter] = service[parameter];

  // combining 'device' and 'service' if data_collecting exists in 'device'.
  if (device !== undefined) {
    // for on/off buttons we apply bit wise AND when merging.
    let applyAnd = ['is_active', 'has_latency', 'burst_loss', 'wifi_devices',
                    'ping_and_wan'];
    // eslint-disable-next-line guard-for-in
    for (let name of applyAnd) {
      // device value && config value, if it exists in device.
      if (device[name] !== undefined) res[name] = res[name] && device[name];
    }
    // we use both 'is_active' and at least one of the measurement
    // to activate the service.
    res.is_active = res.is_active &&
                    (res.burst_loss || res.ping_and_wan || res.wifi_devices);

    // for values that device has preference, use it, if it exists.
    let devicePreference = ['ping_fqdn'];
    for (let name of devicePreference) {
      if (device[name] !== undefined) res[name] = device[name];
    }
  } else { // if data collecting doesn't exist for device, it won't collect.
    // but we have to send at least one variable to disabled it.
    res.is_active = false;
  }

  return res;
};


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
  if (v !== undefined && !validityFunc(v)) {
    error = t('fieldNameInvalid', {name: fieldName, errorline: __line});
  }
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

// functions to check a field in a received json.
const checkIsActive = (obj) =>
  checkField(obj, 'is_active', checkBooleanField);
const checkHaslatency = (obj) =>
  checkField(obj, 'has_latency', checkBooleanField);
const checkHasPingAndWan = (obj) =>
  checkField(obj, 'ping_and_wan', checkBooleanField);
const checkAlarmFqdn = (obj) =>
  checkField(obj, 'alarm_fqdn', util.isFqdnValid);
const checkPingFqdn = (obj) =>
  checkField(obj, 'ping_fqdn', util.isFqdnValid);
const checkPingFqdnToUnset = (obj) =>
  fieldExistenceForUnset(obj, 'ping_fqdn');
const checkPingPackets = (obj) => // so far, only value=100 is allowed.
  checkField(obj, 'ping_packets',
    checkNumericFieldInsideInterval(100, 100));
const checkHasBurstLoss = (obj) =>
  checkField(obj, 'burst_loss', checkBooleanField);
const checkHasWifiDevices = (obj) =>
  checkField(obj, 'wifi_devices', checkBooleanField);

// An Object class to be used as errors to be returned in responses.
// Every router http handler will have a final catch that expects an object of
// this class as argument.
// eslint-disable-next-line require-jsdoc
class HttpError extends Error {
  // eslint-disable-next-line require-jsdoc
  constructor(code, message) {
    super(message); // message will be sent in response's body json.
    this.code = code; // to set the responses code.
  }
}

// Throws errors found in received request body.
const checkBodyIsObject = function(body) {
  if (body.constructor !== Object) {
    throw new HttpError(400, t('bodyNotObject', {errorline: __line}));
  }
  return body;
};

const checkIdUrlParameter = function(id) {
  let mac = id.replace(/_/g, ':');
  if (!util.isMacValid(mac)) {
    throw new HttpError(400, t('idInvalidInUrlParams',
      {id: mac, errorline: __line}));
  }
  return id;
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
    let [exists, fullFieldName, value, error] =
      fieldCheckFunctions[i](obj);
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
const readChangesAndBuildMongoDBUpdateObject = function(changes) {
  let noChange = true; // will be changed if request contains any value.
  let update = {};
  // eslint-disable-next-line guard-for-in
  for (let changeKey in changes) {
    let change = changes[changeKey];
    if (change.obj !== undefined && change.obj.constructor === Object) {
      // getting and object where keys are full path field names and their
      // values to be set or unset.
      let fields =
        checkDataCollectingFields(change.obj, change.fieldChecks);
      if (Object.keys(fields).length > 0) { // if any existing and valid field.
        noChange = false; // at least one update will be made.
        update[changeKey] = fields; // build $set, or $unset, statement.
      }
    }
  }
  if (noChange) {
    throw new HttpError(400, t('receivedNoAlterations', {errorline: __line}));
  }
  return update;
};

// const buildMongoDBUpdateObject = function (fields, statement) {
//   let updateQuery = {};
//   updateQuery[statement] = {};
//   for (let name in fields) updateQuery[statement][name] = fields[name];
//   return updateQuery;
// }

// function to log an error and throw our custom built 'HttpError'.
const throwsHttpError = function(e, httpCode, jsonErrorMessage) {
  console.log(jsonErrorMessage);
  console.log(e);
  throw new HttpError(httpCode, jsonErrorMessage);
};

// function to be used to catch all errors in a handler and to send it
// in response.
const sendErrorResponse = (e, req, res, obj) => Promise.resolve()
  .then(() => {
    if (e instanceof HttpError) { // if error was built by us.
      res.status(e.code).json({message: e.message}); // sends error.
    } else { // if it's another error, we have a bug.
      // prints error found to stderr.
      console.error(`-- found a bug when handling ${req.method} `+
        `'${req.originalUrl}' at ${req._startTime.toISOString()}\n`, e, '\n');
      // sends generic error. Object sent can be passed at 4th argument.
      res.status(500).json(obj || {message: t('serverError',
        {errorline: __line})});
    }
  })
  .catch((e) => console.log('Error when sending error message in data '+
    'collecting response.\n', e)); // stdout debug message.

// function to be used to send successful response and body (if it exists).
const sendOkResponse = (res, json) => Promise.resolve()
  .then(() => json ? res.status(200).json(json) : res.status(200).end())
  .catch((e) => console.log('Error when sending ok for data collecting '+
    'response.\n', e)); // stdout debug message.

// returns data_collecting object inside Config.
dataCollectingController.returnServiceParameters = function(req, res) {
  return Promise.resolve()
  .then(() => ConfigModel.findOne({is_default: true}, 'data_collecting')
    .lean().exec()
    .catch((e) => throwsHttpError(e, 500, t('configFindError',
      {errorline: __line}))))
  .then((config) => sendOkResponse(res,
    (config && config.data_collecting) || {}))
  .catch((e) => sendErrorResponse(e, req, res));
};

// updates data_collecting object inside Config.
dataCollectingController.updateServiceParameters = function(req, res) {
  return Promise.resolve()
  .then(() => checkBodyIsObject(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body,
      fieldChecks: [checkIsActive, checkHaslatency, checkAlarmFqdn,
        checkPingFqdn, checkPingPackets, checkHasBurstLoss,
        checkHasWifiDevices, checkHasPingAndWan],
    },
  }))
  .then((update) => ConfigModel.updateOne({is_default: true}, update).exec()
    .catch((e) => throwsHttpError(e, 500, t('configFindError',
      {errorline: __line}))))
  .then((r) => sendOkResponse(res))
  .catch((e) => sendErrorResponse(e, req, res));
};

// updates data_collecting object inside selected devices.
dataCollectingController.updateManyParameters = async function(req, res) {
  return Promise.resolve()
  .then(() => checkBodyIsObject(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body.$set,
      fieldChecks: [checkIsActive, checkHaslatency, checkPingFqdn,
        checkHasBurstLoss, checkHasWifiDevices, checkHasPingAndWan],
    },
    $unset: {
      obj: req.body.$unset,
      // for front-end, if user leave this field as empty string, it means
      // he wants to use the value from Config, instead of the device value.
      // so we remove the device's value and let the function
      // 'dataCollectingController.mergeConfigs()' work. The ping_fqdn is coded
      // to use the service value when device value is not present.
      fieldChecks: [checkPingFqdnToUnset],
    },
  }))
  .then((update) => {
    let filterList = req.body.filter_list;
    if (filterList === undefined) {
      throw new HttpError(400, t('fieldNameMissing',
        {name: 'filter_list', errorline: __line}));
    } else if (filterList.constructor !== String) {
      throw new HttpError(400, t('fieldNameWrongType',
        {name: 'filter_list', dataType: 'string', errorline: __line}));
    }
    filterList = filterList.split(',');
    return deviceListController.complexSearchDeviceQuery(filterList)
      .then((select) => ({select, update}));
  })
  // .then((query) => {console.log('query', query)}
  .then((query) => DeviceModel.updateMany(query.select, query.update).exec()
    .catch((e) => throwsHttpError(e, 500, t('cpeUpdateManyError',
      {errorline: __line}))))
  .then(() => sendOkResponse(res))
  .catch((e) => sendErrorResponse(e, req, res));
};

// returns data_collecting object of a given device.
dataCollectingController.returnDeviceParameters = function(req, res) {
  return Promise.resolve()
  .then(() => checkIdUrlParameter(req.params.id))
  .then(() => DeviceModel.findOne({_id: req.params.id}, 'data_collecting')
    .exec().catch((e) => throwsHttpError(e, 500,
      t('cpeIdNotFound', {id: req.params.id, errorline: __line}))))
  .then((device) => sendOkResponse(res, device.data_collecting || {}))
  .catch((e) => sendErrorResponse(e, req, res));
};

// updates data_collecting object inside a given device.
dataCollectingController.updateDeviceParameters = function(req, res) {
  return Promise.resolve()
  .then(() => checkIdUrlParameter(req.params.id))
  .then(() => checkBodyIsObject(req.body))
  .then(() => readChangesAndBuildMongoDBUpdateObject({
    $set: {
      obj: req.body.$set,
      fieldChecks: [checkIsActive, checkHaslatency, checkPingFqdn,
        checkHasBurstLoss, checkHasWifiDevices, checkHasPingAndWan],
    },
    $unset: {
      obj: req.body.$unset,
      fieldChecks: [checkPingFqdnToUnset],
    },
  }))
  .then((update) => DeviceModel.updateOne({_id: req.params.id}, update)
    .exec().catch((e) => throwsHttpError(e, 500,
      t('cpeUpdateError', {id: req.params.id, errorline: __line}))))
  .then(() => sendOkResponse(res))
  .then(() => Promise.resolve()
    .then(() => mqtt.anlixMessageRouterUpdate(req.params.id))
    .catch((e) => console.log('Error when forcing mqtt sync for device '
      +`'${req.params.id}' after saving its data_collecting parameters.\n`, e)))
  .catch((e) => sendErrorResponse(e, req, res));
};

// returns data_collecting object inside Config in a format used by routers.
dataCollectingController.getConfig = function(req, res) {
  Config.findOne({is_default: true}, {data_collecting: true},
  function(err, matchedConfig) {
    if (!err && matchedConfig) {
      return res.status(200).json({
        data_collecting_is_active: matchedConfig.data_collecting.is_active,
        data_collecting_alarm_fqdn: matchedConfig.data_collecting.alarm_fqdn,
        data_collecting_ping_fqdn: matchedConfig.data_collecting.ping_fqdn,
        data_collecting_ping_packets:
          matchedConfig.data_collecting.ping_packets,
      });
    } else {
      return res.status(500).json({
        type: 'danger',
        message: t('configFindError', {errorline: __line}),
      });
    }
  });
};

module.exports = dataCollectingController;
