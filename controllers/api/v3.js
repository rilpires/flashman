/* global __line */

/**
 * Device functions.
 * @namespace controllers/api/v3
 */


// Imports
const Validator = require('../../public/javascripts/device_validator');
const DeviceModel = require('../../models/device');

const t = require('../language').i18next.t;


// Variables
const validator = new Validator();

const reducedDeviceFields = {
  use_tr069: false,
  secure_tr069: false,
  alt_uid_tr069: false,
  acs_id: false,
  acs_sync_loops: false,
  recovering_tr069_reset: false,
  release: false,
  data_collecting: false,
  pppoe_password: false,
  pon_signal_measure: false,
  app_password: false,
  lan_devices: false,
  wrong_port_mapping: false,
  port_mapping: false,
  ap_survey: false,
  upnp_requests: false,
  mesh_slaves: false,
  mesh_id: false,
  mesh_key: false,
  bssid_mesh2: false,
  bssid_mesh5: false,
  mesh_routers: false,
  mesh_father: false,
  last_site_survey: false,
  last_devices_refresh: false,
  do_update: false,
  do_update_parameters: false,
  do_update_status: false,
  mesh_next_to_update: false,
  mesh_onlinedevs_remaining: false,
  mesh_update_remaining: false,
  mqtt_secret: false,
  mqtt_secret_bypass: false,
  firstboot_log: false,
  lastboot_log: false,
  apps: false,
  pending_app_secret: false,
  forward_index: false,
  blocked_devices_index: false,
  upnp_devices_index: false,
  ping_hosts: false,
  pingtest_results: false,
  wan_bytes: false,
  speedtest_results: false,
  last_speedtest_error: false,
  current_diagnostic: false,
  stop_coordinates_update: false,
  web_admin_password: false,
  do_tr069_update_connection_login: false,
  custom_tr069_fields: false,
  traceroute_max_hops: false,
  traceroute_number_probes: false,
  traceroute_max_wait: false,
  traceroute_results: false,
  // Extra fields
  temp_command_trap: false,
  current_speedtest: false,
  __v: false,
  traceroute_numberProbes: false,
  traceroute_route: false,
};

const reducedLanDevicesField = {
  'lan_devices.mac': true,
  'lan_devices.dhcp_name': true,
  'lan_devices.upnp_name': true,
  'lan_devices.is_blocked': true,
  'lan_devices.name': true,
  'lan_devices.port': true,
  'lan_devices.router_port': true,
  'lan_devices.dmz': true,
  'lan_devices.last_seen': true,
  'lan_devices.first_seen': true,
  'lan_devices.ip': true,
  'lan_devices.ipv6': true,
  'lan_devices.conn_type': true,
  'lan_devices.conn_speed': true,
  'lan_devices.wifi_freq': true,
  'lan_devices.wifi_signal': true,
  'lan_devices.wifi_snr': true,
  'lan_devices.wifi_mode': true,
  'lan_devices.upnp_permission': true,
  'lan_devices.ping': true,
};

const reducedApSurveyField = {
  'ap_survey.mac': true,
  'ap_survey.ssid': true,
  'ap_survey.freq': true,
  'ap_survey.signal': true,
  'ap_survey.width': true,
  'ap_survey.VHT': true,
  'ap_survey.last_seen': true,
  'ap_survey.first_seen': true,
};

const translationObject = {
  mac: {
    field: '_id', validation: validator.validateMac,
  },
  wanMac: {
    field: 'wan_bssid', validation: validator.validateMac,
  },
  externalReferenceData: {
    field: 'external_reference.data', validation: validator.validateDeviceName,
  },
  serialTR069: {
    field: 'serial_tr069', validation: validator.validateUser,
  },
  pppoeUsername: {
    field: 'pppoe_user', validation: validator.validateUser,
  },
  lanDeviceMac: {
    field: 'lan_devices.mac', validation: validator.validateMac,
  },
  lanDeviceName: {
    field: 'lan_devices.name', validation: validator.validateDeviceName,
  },

  // This field should not be used for anything despite the projection
  field: {
    field: '', validation: validator.validateProjection,
  },
};

const reducedFieldsByRelativePath = {
  default: reducedDeviceFields,
  lan_devices: reducedLanDevicesField,
  ap_survey: reducedApSurveyField,
};

let apiController = {};


// Functions
/**
 * Builds the return response of functions that returns a `device` model. It is
 * an intermediate step to only return the response in the main function.
 *
 * @memberof controllers/api/v3
 *
 * @param {Boolean} valid - If the request/action/test was valid or not.
 * @param {Integer} statusCode - The response status code.
 * @param {String|Model} extra - It can be a string representing the
 * error that occurred or the `device` model.
 *
 * @return {Object} The object response to be decomposed and build the whole
 * HTTP response. It contains:
 *  - `valid` - `Boolean`: If the request was valid;
 *  - `statusCode` - `Integer`: The status code to be returned to the user;
 *  - `message` - `Object`: The object to be returned to the user as the body.
 */
apiController.buildDeviceResponse = function(valid, statusCode, extra) {
  let responseMessage = {
    success: valid,
    // If not valid, extra is the message
    message: valid ? t('OK') : extra,
    // If valid, extra is the device
    device: valid ? extra : {},
  };

  return {
    valid: valid,
    statusCode: statusCode,
    message: responseMessage,
  };
};


/**
 * Validates the HTTP request to check if `params` is not empty.
 *
 * @memberof controllers/api/v3
 *
 * @param {HTTPRequest} request - The HTTP request.
 *
 * @return {Object} The object containing:
 *  - `valid` - `bool`: If the request is valid or not;
 *  - `statusCode` - `int`: The status response code in case of the request is
 *    not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 */
apiController.validateRequest = function(request) {
  if (!request || !request.params) {
    return apiController.buildDeviceResponse(
      false, 400, t('requestError', {errorline: __line}),
    );
  }

  return {valid: true};
};


/**
 * Validates a field.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} params - The object that might contain the `field`.
 * @param {String} field - The field name to be validated.
 * `field`.
 *
 * @return {Object} The object containing:
 *  - `valid` - `bool`: If the `field` is valid or not;
 *  - `statusCode` - `int`: The status response code in case of the `field` is
 *    not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 */
apiController.validateField = function(params, field) {
  // Check the `params` and the `field`
  if (!params || !params[field] || typeof params[field] !== 'string') {
    return apiController.buildDeviceResponse(
      false, 400, field + ': ' + t('mustBeAString'),
    );
  }


  // Validate the field
  let validationFunction = translationObject[field].validation;
  let valid = validationFunction(params[field]);

  if (!valid.valid) {
    return apiController.buildDeviceResponse(
      false, 400, field + ': ' + valid.err,
    );
  }


  // Valid field
  return {valid: true};
};


/**
 * Validates a projection checking if the tree asked exists in `device` model
 * tree.
 *
 * @memberof controllers/api/v3
 *
 * @param {String} projection - The projection path.
 *
 * @return {Object} The object containing:
 *  - `valid` - `Boolean`: If the `projection` is valid or not;
 *  - `statusCode` - `Integer`: The status response code in case of the
 *    `projection` is not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 */
apiController.validateDeviceProjection = function(projection) {
  // Check if is a valid string
  if (!projection || typeof projection !== 'string') {
    return apiController.buildDeviceResponse(
      false, 400, t('mustBeAString'),
    );
  }


  // Check if only contains valid characters
  let validation = validator.validateProjection(projection);

  if (!validation.valid) {
    return apiController.buildDeviceResponse(
      false, 400, projection + ': ' + t('mustBeAString'),
    );
  }


  // Check if `device` model contains `projection`
  if (
    // Check against Device Model paths
    !Object.keys(DeviceModel.schema.paths).includes(projection) &&

    // Check against Device Model subpaths
    !Object.keys(DeviceModel.schema.subpaths).includes(projection)
  ) {
    return apiController.buildDeviceResponse(
      false, 400, projection + ': ' + t('fieldNotFound', {errorline: __line}),
    );
  }


  // Passed checks
  return {valid: true};
};


/**
 * Translates the field parameter that comes from the route to the `device`
 * model specific field.
 *
 * @memberof controllers/api/v3
 *
 * @param {String} field - The field name parameter that came from the route.
 *
 * @return {String} The `device` model field.
 */
apiController.translateField = function(field) {
  return translationObject[field].field;
};


/**
 * Returns a device with reduced fields and without mongo functions. The
 * internal fields used by Flashman are removed alongside big fields like
 * `traceroute_results` and `current_diagnostic` among others. This function is
 * <b>NOT SAFE</b> to be used without a try and catch block due to the use of
 * the `findOne` function that can throw an error. A projection can be passed to
 * this function. If the projection is null or the device does not have the
 * field passed, the whole device will be returned instead.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} filter - The query to be sent to mongo to return the
 * specified device. It will only return one device and will return the
 * first device it encounters with the filters passed.
 * @param {String} relativePath - The relative to search on. It narrows down the
 * query to that specific path.
 * @param {Object} projection - The projection fields to get the information
 * from. If null the whole device will be returned instead.
 * @param {String} backupProjection - The projection used as default when
 * `projection` is invalid.
 *
 * @return {Object} The lean device.
 *
 * @throws {Error} The mongo error associated when trying to query the device.
 */
apiController.getLeanDevice = function(
  filter,
  relativePath = null,
  projection = null,
  backupProjection = null,
) {
  let device = null;
  // Copy the `reducedDeviceFields` or use the `backupProjection`
  const defaultProjection = backupProjection ?
    backupProjection : {...reducedDeviceFields};

  // Use the `defaultProjection` if projection is not valid.
  let useProjection = defaultProjection;


  // Only use projection if available
  if (projection) useProjection = projection;


  // Prepare the aggregate pipeline
  let pipeline = [];

  // Filter the query
  pipeline.push({'$match': filter});

  // Only 1 item
  pipeline.push({'$limit': 1});

  // Split array if needed
  relativePath ? pipeline.push({$unwind: '$' + relativePath}) : null;

  // Re-apply query to make sure that is selecting the correct one, only if
  // splitted the array
  relativePath ? pipeline.push({'$match': filter}) : null;

  // Group then together
  if (relativePath) {
    let group = {'$group': {'_id': '$_id'}};
    group['$group'][relativePath] = {'$push': '$' + relativePath};

    pipeline.push(group);
  }

  // Reduce fields
  pipeline.push({'$project': useProjection});


  // Find the device
  device = DeviceModel.aggregate(pipeline).exec();


  return device;
};


/**
 * Queries and returns the first device that matches the fields passed as a URL
 * parameter. This function receives a default projection to be used as the base
 * to only show specific fields of the device, a projection that reduces the
 * fields returned to only, a parameters object that came from the user input
 * and will be used to gather the field values to find the device and args is a
 * list that contains all the other arguments passed that is key to find inside
 * the parameter object.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} defaultProjection - An object containing all the fields that
 * should not be returned to the user. But can be overrided by the `projection`.
 * @param {Array<String>} projections - Fields in the `device` model that will
 * only be returned. This option might override `defaultProjection` settings. It
 * can be `null`, using it as so will not reduce the returned fields to what the
 * user specified and will use the `defaultProjection`.
 * @param {Object} params - The object containing the keys setted by what was
 * defined in the route and what the user passed, with their respective values.
 * @param {String} relativePath - The relative to search on. It narrows down the
 * query to that specific path.
 * @param {Array<String>} routeParameters - All the keys that `params` should
 * contain inside of it.
 *
 * @return {Object} The object containing:
 *  - `valid` - `Boolean`: If the `projection` is valid or not;
 *  - `statusCode` - `Integer`: The status response code in case of the
 *    `projection` is not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 */
apiController.getDeviceByFields = async function(
  defaultProjection,
  projections = null,
  params,
  relativePath = null,
  routeParameters,
) {
  let query = {};
  let useProjection = null;

  // Get all extra arguments and append to the query
  for (let index = 0; index < routeParameters.length; index++) {
    // `paramName` is the name of the parameter that came from the route
    // specification
    let paramName = routeParameters[index];

    // Validate the parameter
    let validation = apiController.validateField(params, paramName);
    if (!validation.valid) return validation;

    // Add to the query. `fieldName` is the field name of the device model
    let fieldName = apiController.translateField(paramName);
    query[fieldName] = params[paramName];
  }


  // Validate each projection
  if (
    projections && projections.constructor === Array &&
    projections.length > 0
  ) {
    useProjection = {};

    // Loop every projection
    for (let index = 0; index < projections.length; index++) {
      // Validate the projection
      let validation = apiController.validateDeviceProjection(
        projections[index],
      );

      // If invalid, return the error
      if (!validation.valid) return validation;

      // Add to the `useProjection` object
      useProjection[projections[index]] = true;
    }
  }


  // Get the device
  let device = null;
  try {
    // Search by the URL params and get the slim version of the device. Although
    // It only returns one device, it returns as an array
    device = (await apiController.getLeanDevice(
      query, relativePath, useProjection, defaultProjection,
    ))[0];

  // Error from mongo
  } catch (error) {
    console.log(
      'Failed to find device in getDeviceByFields with error: ' + error,
    );

    return apiController.buildDeviceResponse(
      false, 500, t('databaseFindError', {errorline: __line}),
    );
  }


  // if could not find the device
  if (!device) {
    return apiController.buildDeviceResponse(
      false, 404, t('noDevicesFound'),
    );
  }

  // Found the device
  return apiController.buildDeviceResponse(
    true, 200, device,
  );
};


/**
 * Default entry point for `GET` requests for device. It tries to find one
 * device that matches all `routeParameters` and return the device if could find
 * it or an error with the message associated to it.
 *
 * @memberof controllers/api/v3
 *
 * @param {HTTPRequest} request - The HTTP request.
 * @param {HTTPResponse} response  - The HTTP response.
 * @param {String} relativePath - The relative path inside the `device` model.
 * It changes the query to only use allowed fields of that relative path and if
 * a field is passed, it will use it to build the full projection.
 * @param  {...String} routeParameters - All parameters passed through URL to be
 * used in the query.
 *
 * @return {Response} The return wil send the status code based on the REST API
 * and the body will contain:
 *  - `success` - `Boolean`: If could find the device or an error occurred;
 *  - `message` - `String`: The error message with occurred or 'OK'.
 *  - `device` - `Object`: The device if could find it.
 */
apiController.defaultGetRoute = async function(
  request,
  response,
  relativePath = null,
  ...routeParameters
) {
  // Validate the request
  let validation = apiController.validateRequest(request);

  if (!validation.valid) {
    return response
      .status(validation.statusCode)
      .json(validation.message);
  }


  // Use the specific default projection if the `relativePath` was specified,
  // otherwise use the default that is `reducedDeviceFields`.
  let defaultProjection = relativePath ?
    reducedFieldsByRelativePath[relativePath] : reducedDeviceFields;
  let params = request.params;
  let fields = null;


  // Validate the field
  validation = apiController.validateField(params, 'field');
  if (validation.valid) {
    // If field is not null, concatenate
    fields = params.field.split(';');

    // If has the `relativePath`, append each element with it
    if (relativePath) {
      fields.forEach((element, index, array) => {
        array[index] = relativePath + '.' + element;
      });
    }

  // If is invalid and not undefined or null return the error
  } else if (params.field !== null && params.field !== undefined) {
    return response
      .status(validation.statusCode)
      .json(validation.message);
  }


  // Try finding the device
  validation = await apiController.getDeviceByFields(
    defaultProjection, fields, params, relativePath, routeParameters,
  );


  return response
    .status(validation.statusCode)
    .json(validation.message);
};


/**
 * @exports controllers/deviceList
 */
module.exports = apiController;
