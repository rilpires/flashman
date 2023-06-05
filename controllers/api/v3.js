/* global __line */

/**
 * Device functions.
 * @namespace controllers/api/v3
 */


// Imports
const Validator = require('../../public/javascripts/device_validator');
const DeviceModel = require('../../models/device');
const TasksAPI = require('../../controllers/external-genieacs/tasks-api');
const deviceList = require('../../controllers/device_list');

const t = require('../language').i18next.t;


// Variables
let apiController = {};


const MAX_PAGE_SIZE = 50;
const MAXIMUM_ADD_TASK_TIMEOUT = 1; // In seconds

const validator = new Validator();

/**
 * Objects containing all fields in `device` model that will not be returned in
 * a full device.
 *
 * @memberof controllers/api/v3
 *
 * @type {Object<Boolean>}
 */
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
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
apiController.__testReducedDeviceFields = reducedDeviceFields;

/**
 * Objects containing all fields in `device.lan_devices` model that will be
 * returned when returning all `lan_devices` from a CPE.
 *
 * @memberof controllers/api/v3
 *
 * @type {Object<Boolean>}
 */
const reducedLanDevicesField = {
  'last_devices_refresh': true,
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

/**
 * Objects containing all fields in `device.ap_survey` model that will be
 * returned when returning `ap_survey` from a CPE.
 *
 * @memberof controllers/api/v3
 *
 * @type {Object<Boolean>}
 */
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

/**
 * A mapping object to map route parameter to `device` model parameter and it's
 * validation. Other fields can be added in order to only validate it but still
 * have the translation capability between what comes from the request and what
 * is being validated.
 *
 * @memberof controllers/api/v3
 *
 * @type {Object<Object>}
 */
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

  // Those fields should not be used as parameter for finding
  // This field is used to specify a projection
  fields: {
    field: '', validation: validator.validateProjection,
  },
  // Those fields are used for pagination
  page: {
    field: '', validation: (page, relativePath) => apiController
      .validatePage(page, relativePath),
  },
  pageLimit: {
    field: '', validation: (page, relativePath) => apiController
      .validatePageLimit(page, relativePath),
  },
  // This field is used for conditions like: last_seen > xyz
  conditionField: {
    field: '',
    validation: (field, relativePath) => apiController
      .validateDeviceProjection(field, relativePath),
  },
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
apiController.__testTranslationObject = translationObject;

/**
 * An object to fast convert which specific `device` field to return with the
 * reduced version of the `device` model field. It converts a field name in
 * `device` model to their specific reduced fields to be returned.
 */
const reducedFieldsByRelativePath = {
  default: reducedDeviceFields,
  lan_devices: reducedLanDevicesField,
  ap_survey: reducedApSurveyField,
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
apiController.__testReducedFieldsByRelativePath = reducedFieldsByRelativePath;


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
 *  - `json` - `Object`: The object to be returned to the user as the body;
 *  - `message` - `String`: The text of the error or OK.
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
    json: responseMessage,
    // If not valid, extra is the message
    message: valid ? t('OK') : extra,
  };
};


/**
 * A helper function to reduce code.
 *
 * @memberof controllers/api/v3
 *
 * @param {HTTPResponse} response - The HTTP response;
 * @param {Object} validation - The object containing at least the following
 * items:
 *  - `statusCode` - `Integer`: The status code of the response to be sent;
 *  - `message` - `String`: The message to be returned in the response.
 *
 * @return {HTTPResponse} The HTTP response.
 */
apiController.returnDevicesError = function(response, validation) {
  return response
    .status(validation.statusCode)
    .json({
      success: false,
      message: validation.message,
      devices: [],
    });
};


/**
 * Validates the HTTP request to check if `params` is not empty.
 *
 * @memberof controllers/api/v3
 *
 * @param {HTTPRequest} request - The HTTP request.
 * @param {Boolean} hasBody - If the request contains a body or not to be
 * tested.
 *
 * @return {Object} The object containing:
 *  - `valid` - `Boolean`: If the request is valid or not;
 *  - `statusCode` - `Integer`: The status response code in case of the request
 *    is not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 */
apiController.validateRequest = function(request, hasBody = false) {
  if (!request || !request.params || !request.query) {
    return apiController.buildDeviceResponse(
      false, 400, t('requestError', {errorline: __line}),
    );

  // Validate the body if needed
  } else if (
    hasBody && (!request.body || request.body.constructor !== Object)
  ) {
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
 * @param {String} relativePath - The relative path in `device` model.
 *
 * @return {Object} The object containing:
 *  - `valid` - `Boolean`: If the `field` is valid or not;
 *  - `statusCode` - `Integer`: The status response code in case of the `field`
 *    is not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 */
apiController.validateField = function(params, field, relativePath = null) {
  // Check the `params` and the `field`
  if (!params || !params[field] || typeof params[field] !== 'string') {
    return apiController.buildDeviceResponse(
      false, 400, field + ': ' + t('mustBeAString'),
    );
  }


  // Validate the field
  let validationFunction = translationObject[field].validation;
  let valid = validationFunction(params[field], relativePath);

  if (!valid.valid) {
    // Error from device_validator or from buildDeviceResponse
    let message = valid.err ? valid.err : valid.message;

    return apiController.buildDeviceResponse(
      false, 400, field + ': ' + message,
    );
  }


  // Valid field
  return valid;
};


/**
 * Validates a projection checking if the tree asked exists in `device` model
 * tree.
 *
 * @memberof controllers/api/v3
 *
 * @param {String} projection - The projection path.
 * @param {String} relativePath - The relative path in `device` model.
 *
 * @return {Object} The object containing:
 *  - `valid` - `Boolean`: If the `projection` is valid or not;
 *  - `statusCode` - `Integer`: The status response code in case of the
 *    `projection` is not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 */
apiController.validateDeviceProjection = function(
  projection,
  relativePath = null,
) {
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
      false, 400, projection + ': ' + validation.err,
    );
  }


  // Add `relativePath`
  projection = (relativePath ? relativePath + '.' : '') + projection;


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
  return {valid: true, value: projection};
};


/**
 * Validates a page to check if the page passed is a `String` that can be
 * converted to an integer bigger than 0.
 *
 * @memberof controllers/api/v3
 *
 * @param {String} page - The page number as `String`.
 *
 * @return {Object} The object containing:
 *  - `valid` - `Boolean`: If the `projection` is valid or not;
 *  - `statusCode` - `Integer`: The status response code in case of the
 *    `projection` is not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 *  - `value` - `Integer`: Included only if valid. This is the validated page as
 *    `Integer`.
 */
apiController.validatePage = function(page) {
  // Check if page is a string and has at least 1 character
  if (!page || typeof page !== 'string' || page.length < 1) {
    return apiController.buildDeviceResponse(
      false, 400, t('mustBeAString'),
    );
  }

  // Parse the number
  const pageNumber = parseInt(page);

  // Check if the number is valid
  if (!pageNumber || pageNumber < 1) {
    return apiController.buildDeviceResponse(
      false, 400, t('invalidPageError', {errorline: __line}),
    );
  }

  return {valid: true, value: pageNumber};
};


/**
 * Validates a page limit to check if the value passed is a `String` that can be
 * converted to an integer bigger than 0 and smaller than `MAX_PAGE_SIZE`.
 *
 * @memberof controllers/api/v3
 *
 * @param {String} page - The page limit number as `String`.
 *
 * @return {Object} The object containing:
 *  - `valid` - `Boolean`: If the `projection` is valid or not;
 *  - `statusCode` - `Integer`: The status response code in case of the
 *    `projection` is not valid;
 *  - `message` - `Object`: The object of the response to be returned in case of
 *    an error.
 *  - `value` - `Integer`: Included only if valid. This is the validated page as
 *    `Integer`.
 */
apiController.validatePageLimit = function(page) {
  // Check if the page is valid
  let validation = apiController.validatePage(page);
  if (!validation.valid) return validation;

  // Get the number
  const pageNumber = validation.value;

  // Check if the upper limit is valid
  if (pageNumber > MAX_PAGE_SIZE) {
    return apiController.buildDeviceResponse(
      false,
      400,
      t('invalidPageLimitError', {
        upperLimit: MAX_PAGE_SIZE,
        errorline: __line,
      }),
    );
  }

  return {valid: true, value: pageNumber};
};


/**
 * Validates and return the list of items inside `params` splitted by ';'.
 * It validates if `params` and `field` exists and if `params` contains `field`.
 * If so, it splits this field inside `params` by ';' and checks if `options`
 * contains each parameter splitted and returns the array with all of those
 * parameters.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} params - An object containing `field`.
 * @param {String} field - The field name inside `params`.
 * @param {Array<String>} options - The list of possible inputs.
 *
 * @return {Object} It returns the object containing:
 *  - `valid` - `Boolean`: If it is valid or not;
 *  - `statusCode` - `Integer`: The status code in the case this message should
 *    be returned;
 *  - `message` - `String`: The error message wich occurred or 'OK';
 *  - `values` - `Array`: The array containing all splitted parameters from
 *    `params[field]`.
 */
apiController.validateOptions = function(params, field, options) {
  // Check if something is invalid and make sure that the field is the string
  // type
  if (
    !params || !field || !params[field] ||
    typeof params[field] !== 'string'
  ) {
    return apiController.buildDeviceResponse(
      false, 400, t('fieldInvalid', {errorline: __line}),
    );
  }

  // Split the input by ';'
  const splitted = params[field].split(';');

  let finalArray = [];

  // Check if options contains each parameter passed
  for (let index = 0; index < splitted.length; index++) {
    const element = splitted[index];

    // If the element is in options, append it to be returned
    if (options.includes(element)) finalArray.push(element);

    // Otherwise return the error
    else {
      return apiController.buildDeviceResponse(
        false, 400, t('fieldNameInvalid', {name: field, errorline: __line}),
      );
    }
  }


  // Build the response
  return {
    valid: true,
    statusCode: 200,
    message: t('OK'),
    value: finalArray,
  };
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
 * the `aggregate` function that can throw an error. A projection can be passed
 * to this function. If the projection is null or the device does not have the
 * field passed, the whole device will be returned instead.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} filter - The query to be sent to mongo to return the
 * specified device. It will only return one device and will return the
 * first device it encounters with the filters passed.
 * @param {String} relativePath - The relative to search on. It narrows down the
 * query to that specific path.
 * @param {Integer} page - The page number, starting from 1. This number
 * indicates how many entries in document to skip. It will be calculated
 * alonside with `pageLimit`.
 * @param {Integer} pageLimit - This value indicates how many entries per page
 * will be delivered. Indicates which entries will be shown alongside with
 * `page`.
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
  page = null,
  pageLimit = null,
  projection = null,
  backupProjection = null,
) {
  let device = null;
  // Copy the `reducedDeviceFields` or use the `backupProjection`
  const defaultProjection = backupProjection ?
    backupProjection : {...reducedDeviceFields};

  // Use the `defaultProjection` if projection is not valid.
  let useProjection = defaultProjection;


  // If page or pageLimit is invalid, set the default
  if (!page || page <= 0) page = 1;
  if (!pageLimit || pageLimit <= 0 || pageLimit > MAX_PAGE_SIZE) {
    pageLimit = MAX_PAGE_SIZE;
  }


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

  // Paginate
  pipeline.push({'$skip': (page - 1) * pageLimit});
  pipeline.push({'$limit': pageLimit});

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
 * @async
 *
 * @param {Object} params - The object containing the keys setted by what was
 * defined in the route and what the user passed, with their respective values.
 * @param {Object} defaultProjection - An object containing all the fields that
 * should not be returned to the user. But can be overrided by the `projection`.
 * @param {Array<String>} projections - Fields in the `device` model that will
 * only be returned. This option might override `defaultProjection` settings. It
 * can be `null`, using it as so will not reduce the returned fields to what the
 * user specified and will use the `defaultProjection`.
 * @param {Object} additionalQueries - An object containing addional queries to
 * be passed.
 * @param {Integer} page - The page number, starting from 1. This number
 * indicates how many entries in document to skip. It will be calculated
 * alonside with `pageLimit`.
 * @param {Integer} pageLimit - This value indicates how many entries per page
 * will be delivered. Indicates which entries will be shown alongside with
 * `page`.
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
  params,
  defaultProjection = null,
  projections = null,
  additionalQueries = null,
  page = null,
  pageLimit = null,
  relativePath = null,
  routeParameters,
) {
  let query = {};
  let useProjection = null;

  // Get all extra arguments and append to the query
  for (let index = 0; index < routeParameters.length; index++) {
    // `paramName` is the name of the parameter that came from the route
    // specification. Example: mac, pppoeUsername...
    let paramName = routeParameters[index];

    // Validate the parameter
    let validation = apiController.validateField(params, paramName);
    if (!validation.valid) return validation;

    // Add to the query. `fieldName` is the field name of the device model
    // Example: _id, pppoe_user...
    let fieldName = apiController.translateField(paramName);
    query[fieldName] = params[paramName];
  }

  // Append `additionalQueries`
  if (additionalQueries) {
    Object.keys(additionalQueries).forEach(
      (entryKey) => query[entryKey] = additionalQueries[entryKey],
    );
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
      query, relativePath, page, pageLimit, useProjection, defaultProjection,
    ))[0];

  // Error from mongo
  } catch (error) {
    console.error(
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
 * Parses an integer and returns an `Object` explaning if could or could not
 * parse the field.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} params - An object containing the `field`.
 * @param {String} field - The parameter name to be searched and parsed inside
 * `param`.
 *
 * @return {Object} The object containing the following items:
 *  - `valid` - `Boolean`: If the parser was valid or not;
 *  - `statusCode` - `Integer`: The status response code in case the
 *    parser errored;
 *  - `message` - `String`: The String of the response to be returned in case of
 *    an error;
 *  - `value` - `Integer`: The value parsed.
 */
apiController.parseRouteIntParameter = function(params, field) {
  const value = parseInt(params[field]);
  const isValid = !isNaN(value);

  let returnValue = apiController.buildDeviceResponse(
    isValid,
    isValid ? 200 : 400,
    isValid ? t('OK') : field + ': ' + t('valueInvalid'),
  );

  // Set the value to return
  returnValue['value'] = value;
  return returnValue;
};


/**
 * Parses an `Array` of `Strings` and split then by ';'. If `relativePath` is
 * passed, it will concatenate, at the beginning, each string with it.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} params - An object containing the `field`.
 * @param {String} field - The parameter name to be searched and parsed inside
 * `param`.
 * @param {String} relativePath - The relative path in `device` to be added if
 * needed.
 *
 * @return {Object} The object containing the following items:
 *  - `valid` - `Boolean`: If the parser was valid or not;
 *  - `statusCode` - `Integer`: The status response code in case the
 *    parser errored;
 *  - `message` - `String`: The String of the response to be returned in case of
 *    an error;
 *  - `value` - `Integer`: The value parsed.
 */
apiController.parseRouteStringArrayParameter = function(
  params, field, relativePath = null,
) {
  let fields = [];

  // Split by ;
  if (params[field] && typeof params[field] === 'string') {
    fields = params[field].split(';');
  }
  let isValid = fields.length > 0;

  // If has the `relativePath`, append each element with it
  if (relativePath && isValid) {
    fields.forEach((element, index, array) => {
      array[index] = relativePath + '.' + element;
    });
  }

  return {
    valid: isValid,
    statusCode: isValid ? 200 : 400,
    message: isValid ? t('OK') : field + ': ' + t('emptyField'),
    value: fields,
  };
};


/**
 * Parses a route condition passed as argument in URL. It builds a query to be
 * added when querying the device.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} params - An object containing the `field`.
 * @param {String} field - The parameter name to be searched and parsed inside
 * `param`.
 * @param {String} relativePath - The relative path in `device` to be added if
 * needed.
 *
 * @return {Object} The object containing the following items:
 *  - `valid` - `Boolean`: If the parser was valid or not;
 *  - `statusCode` - `Integer`: The status response code in case the
 *    parser errored;
 *  - `message` - `String`: The String of the response to be returned in case of
 *    an error;
 *  - `value` - `Object`: The queries to be added when searching the device.
 */
apiController.parseRouteConditionParameter = function(
  params, field, relativePath = null,
) {
  // Get the condition field and add the relative path if necessary
  // Parses automatically `params[field]` even if it is invalid
  let conditionField = (relativePath ? relativePath + '.' : '' ) +
    params[field];
  let type = null;


  // Get the type
  const paths = DeviceModel.schema.paths;
  const subpaths = DeviceModel.schema.subpaths;

  // Paths of `device` model
  if (paths[conditionField]) {
    type = paths[conditionField].instance;

  // Subpaths of `device` model
  } else if (subpaths[conditionField]) {
    type = subpaths[conditionField].instance;

  // If the field is invalid and does not exists
  } else {
    return {
      valid: false,
      statusCode: 400,
      message: conditionField + ': ' + t('fieldInvalid', {errorline: __line}),
      value: {},
    };
  }


  const conditions = [
    {name: 'greaterValue', operation: '$gt'},
    {name: 'equalValue', operation: '$eq'},
    {name: 'lowerValue', operation: '$lt'},
  ];

  // Loop condition parameters
  let queries = {};

  for (let index = 0; index < conditions.length; index++) {
    const cond = conditions[index];

    // Push the query operation and the value to an array
    if (params[cond.name]) {
      let value = null;
      let isValid = true;

      // If the `device`'s field is Date type
      if (type === 'Date') {
        value = new Date(params[cond.name]);

        // If it is not a valid date
        if (!value.getTime()) isValid = false;

      // If the `device`'s field is Number type
      } else if (type === 'Number') {
        value = parseInt(params[cond.name]);

        // If is not a valid integer
        if (isNaN(value)) isValid = false;

      // If the `device`'s field is Boolean type
      } else if (type === 'Boolean') {
        // If it is not 'true', 'false', '0' or '1' return error
        if (
          params[cond.name] !== 'true' && params[cond.name] !== 'false' &&
          params[cond.name] !== '0' && params[cond.name] !== '1'
        ) isValid = false;

        value = (
          params[cond.name] === 'true' ||
          params[cond.name] === '1' ?
          true : false
        );

      // If any other type
      } else {
        return {
          valid: false,
          statusCode: 400,
          message: t('fieldWrongType', {dataType: 'Date|Number|Boolean'}),
          value: {},
        };
      }


      // If invalid
      if (!isValid) {
        return {
          valid: false,
          statusCode: 400,
          message: t('fieldNameWrongType', {
            name: 'greaterValue/equalValue/lowerValue',
            dataType: type,
          }),
          value: {},
        };
      }

      // If valid, append to queries
      queries[conditionField] = {};
      queries[conditionField][cond.operation] = value;
    }
  }

  // Return if there is no condition to parse
  if (Object.keys(queries).length <= 0) {
    return {
      valid: false,
      statusCode: 400,
      message: field + ': ' + t('emptyField'),
      value: {},
    };
  }


  return {
    valid: true,
    statusCode: 200,
    message: t('OK'),
    value: queries,
  };
};


/**
 * Default entry point for `GET` requests for device. It tries to find one
 * device that matches all `routeParameters` and return the device if could find
 * it or an error with the message associated to it.
 *
 * @memberof controllers/api/v3
 *
 * @async
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
 *  - `message` - `String`: The error message wich occurred or 'OK'.
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
      .json(validation.json);
  }


  // Use the specific default projection if the `relativePath` was specified,
  // otherwise use the default that is `reducedDeviceFields`.
  let defaultProjection = relativePath ?
    reducedFieldsByRelativePath[relativePath] : reducedDeviceFields;
  let params = request.params;
  let queryParams = request.query;
  let mergedParams = {
    conditionField: null,
    page: null,
    pageLimit: null,
    fields: null,
  };


  const queryParamNames = [{
    name: 'conditionField',
    execute: apiController.parseRouteConditionParameter,
  }, {
    name: 'page',
    execute: apiController.parseRouteIntParameter,
  }, {
    name: 'pageLimit',
    execute: apiController.parseRouteIntParameter,
  }, {
    name: 'fields',
    execute: apiController.parseRouteStringArrayParameter,
  }];


  // Validate each query parameter
  for (let index = 0; index < queryParamNames.length; index++) {
    let paramEntry = queryParamNames[index];

    // Validate the field
    validation = apiController.validateField(
      queryParams, paramEntry.name, relativePath,
    );

    if (validation.valid) {
      // Execute
      let returnValue = paramEntry.execute(
        queryParams, paramEntry.name, relativePath,
      );

      // If invalid
      if (!returnValue.valid) {
        return response
          .status(returnValue.statusCode)
          .json({
            success: false,
            message: returnValue.message,
            device: {},
          });
      }

      // If valid, add to the `mergedParams`
      mergedParams[paramEntry.name] = returnValue.value;

    // If is invalid and not undefined or null return the error
    } else if (
      queryParams[paramEntry.name] !== null &&
      queryParams[paramEntry.name] !== undefined
    ) {
      return response
        .status(validation.statusCode)
        .json(validation.json);
    }
  }


  // Set default values
  mergedParams['page'] = mergedParams['page'] ?
    mergedParams['page'] : 1;
  mergedParams['pageLimit'] = mergedParams['pageLimit'] ?
    mergedParams['pageLimit'] : MAX_PAGE_SIZE;


  // Try finding the device
  validation = await apiController.getDeviceByFields(
    params, defaultProjection, mergedParams['fields'],
    mergedParams['conditionField'], mergedParams['page'],
    mergedParams['pageLimit'], relativePath, routeParameters,
  );


  return response
    .status(validation.statusCode)
    .json(validation.json);
};


/**
 * Searches for multiple devices and return them. It splits the devices by
 * pages. Each page can have 50 devices at maximum and be limited to return
 * less.
 *
 * @memberof controllers/api/v3
 *
 * @async
 *
 * @param {HTTPRequest} request - The HTTP request.
 * @param {HTTPResponse} response  - The HTTP response.
 *
 * @return {Response} The return wil send the status code based on the REST API
 * and the body will contain:
 *  - `success` - `Boolean`: If could find the device or an error occurred;
 *  - `message` - `String`: The error message wich occurred or 'OK'.
 *  - `devices` - `Object`: The devices if could find it.
 *  - `page` - `Integer`: The current page if could find the devices and no
 *    error occurred.
 *  - `pageLimit` - `Integer`: The limit of the devices per page if could find
 *    devices and no error occurred.
 *  - `totalPages` - `Integer`: The total amount of pages if could find devices
 *    and no error occurred.
 */
apiController.search = async function(request, response) {
  const returnError = (validation) => apiController.returnDevicesError(
    response, validation,
  );

  // Validate the request
  let validation = apiController.validateRequest(request);
  if (!validation.valid) return returnError(validation);


  let queryParams = request.query;
  let fullQuery = [];
  let querySetup = {};


  const booleanParameters = [
    {name: 'alert', translate: t('alert')},
    {name: 'online', translate: t('online')},
    {name: 'offline', translate: t('offline')},
    {name: 'unstable', translate: t('unstable')},
    {name: 'noSignal', translate: t('noSignal')},
    {name: 'flashbox', translate: 'flashbox'},
    {name: 'tr069', translate: 'tr069'},
  ];

  const selectParameters = [
    {name: 'signal', options: ['bad', 'weak', 'good']},
    {name: 'ipv6', options: ['off', 'on', 'unknown']},
    {name: 'mesh', options: ['off', 'on']},
    {name: 'mode', options: ['router', 'bridge']},
  ];

  const integerParameters = [
    {name: 'onlineFor', translate: t('online') + ' >'},
    {name: 'offlineFor', translate: t('offline') + ' >'},
  ];

  const stringParameters = [
    {name: 'query', isPath: false},
    {name: 'fields', isPath: true},
    {name: 'exclude', isPath: false},
  ];

  const pageParameters = [
    {name: 'page', default: 1},
    {name: 'pageLimit', default: MAX_PAGE_SIZE},
  ];


  // Parse boolean parameters
  for (let index = 0; index < booleanParameters.length; index++) {
    let param = booleanParameters[index];
    let value = '';

    // If the query does not have it, continue to the next iteration
    if (!queryParams[param.name]) continue;

    // Check if is a string
    if (typeof queryParams[param.name] !== 'string') {
      return returnError({
        statusCode: 400,
        message: param.name + ': ' + t('mustBeAString'),
      });
    }

    // Validate the parameter
    // False
    if (
      queryParams[param.name] === '0' ||
      queryParams[param.name].toLowerCase() === 'false'
    ) value = '';

    // True
    else if (
      queryParams[param.name] === '1' ||
      queryParams[param.name].toLowerCase() === 'true'
    ) value = param.translate;

    // Invalid
    else {
      return returnError({
        statusCode: 400,
        message: t('fieldNameInvalid', {name: param.name, errorline: __line}),
      });
    }

    // Append to the full query if value is not empty
    if (value) fullQuery.push(value);
  }

  // Parse select parameters
  for (let index = 0; index < selectParameters.length; index++) {
    let param = selectParameters[index];

    // If the query does not have it, continue to the next iteration
    if (!queryParams[param.name]) continue;

    // Check if is a string
    if (typeof queryParams[param.name] !== 'string') {
      return returnError({
        statusCode: 400,
        message: param.name + ': ' + t('mustBeAString'),
      });
    }

    // Validate
    let validation = apiController.validateOptions(
      queryParams, param.name, param.options,
    );

    // If invalid, return the error
    if (!validation.valid) return returnError(validation);

    // Append each value
    validation.value.forEach(
      // Even though some translations do not exists it will use the same name
      // as in complex search
      (element) => fullQuery.push(t(param.name) + ' ' + t(element)),
    );
  }

  // Parse interger parameters
  for (let index = 0; index < integerParameters.length; index++) {
    let param = integerParameters[index];

    // If the query does not have it, continue to the next iteration
    if (!queryParams[param.name]) continue;

    // Check if is a string
    if (typeof queryParams[param.name] !== 'string') {
      return returnError({
        statusCode: 400,
        message: param.name + ': ' + t('mustBeAString'),
      });
    }

    // Validate
    let validation = apiController.parseRouteIntParameter(
      queryParams, param.name,
    );

    // If the value is not valid, return the error
    if (!validation.valid) return returnError(validation);

    // Check if the value is positive and bigger than 0
    if (validation.value <= 0) {
      return returnError({
        statusCode: 400,
        message: param.name + ': ' + t('valueInvalid'),
      });
    }

    // Append the value
    fullQuery.push(param.translate + validation.value);
  }

  // Parse string parameters
  for (let index = 0; index < stringParameters.length; index++) {
    let param = stringParameters[index];

    // If the query does not have it, continue to the next iteration
    if (!queryParams[param.name]) continue;

    // Check if is a string
    if (typeof queryParams[param.name] !== 'string') {
      return returnError({
        statusCode: 400,
        message: param.name + ': ' + t('mustBeAString'),
      });
    }


    // Try splitting it
    let validation = apiController.parseRouteStringArrayParameter(
      queryParams, param.name, null,
    );

    if (!validation.valid) return returnError(validation);

    // Create the entry in `querySetup`
    querySetup[param.name] = [];

    // Pass by each parameter inside of value
    for (let project = 0; project < validation.value.length; project++) {
      let value = validation.value[project];

      // Validate the size
      if (value.length <= 0) {
        return returnError({
          statusCode: 400,
          message: t('fieldNameInvalid', {name: param.name, errorline: __line}),
        });
      }

      // If is a path or subpath of `device` model, validate it
      if (param.isPath) {
        // Validate
        let projectValidation = apiController.validateDeviceProjection(
          value, null,
        );

        // Check if valid
        if (!projectValidation.valid) {
          return returnError(projectValidation);
        }

        value = projectValidation.value;
      }

      // Push to array
      querySetup[param.name].push(value);
    }
  }

  // Parse pages parameters, use default if missing
  for (let index = 0; index < pageParameters.length; index++) {
    let param = pageParameters[index];

    // If the field exists
    if (queryParams[param.name]) {
      let validation = apiController.validateField(
        queryParams, param.name, null,
      );

      // If page does not exists, return the error
      if (!validation.valid) return returnError(validation);

      // Assign the value
      querySetup[param.name] = validation.value;

    // Otherwise, assign the default
    } else querySetup[param.name] = param.default;
  }

  // Parse other values
  // sortType
  // Set to use ascending if `sortType` is not provided
  let sortType = 1;
  if (queryParams['sortType'] && typeof queryParams['sortType'] === 'string') {
    // Descending
    if (
      queryParams['sortType'].toLowerCase() === 'desc' ||
      queryParams['sortType'].toLowerCase() === 'descending'
    ) sortType = -1;

    // Not ascending nor descending
    else if (
      queryParams['sortType'].toLowerCase() !== 'asc' &&
      queryParams['sortType'].toLowerCase() !== 'ascending'
    ) {
      return returnError({
        statusCode: 400,
        message: t('fieldNameInvalid', {name: 'sortType', errorline: __line}),
      });
    }
  }

  // sortOn
  if (queryParams['sortOn'] && typeof queryParams['sortOn'] === 'string') {
    // Validate it
    let validation = apiController.validateDeviceProjection(
      queryParams['sortOn'], null,
    );

    if (!validation.valid) return returnError(validation);

    // Append it
    querySetup['sort'] = {};
    querySetup['sort'][validation.value] = sortType;
  }

  // operation
  let isOperationOr = false;
  if (
    queryParams['operation'] &&
    typeof queryParams['operation'] === 'string'
  ) {
    // And
    if (
      queryParams['operation'].toLowerCase() === 'and'
    ) fullQuery.push(t('/and'));

    // Or
    else if (
      queryParams['operation'].toLowerCase() === 'or'
    ) {
      isOperationOr = true;
      fullQuery.push(t('/or'));

    // Invalid entry
    } else {
      return returnError({
        statusCode: 400,
        message: t('fieldNameInvalid', {name: 'operation', errorline: __line}),
      });
    }
  }

  // Enhance query with exclude
  if (querySetup['exclude']) {
    // If the `operation` is `or`, return an error
    if (isOperationOr) {
      return returnError({
        statusCode: 400,
        message: t('queryWithOrAndExclude', {errorline: __line}),
      });
    }

    querySetup['exclude'].forEach(
      (element) => fullQuery.push(t('/exclude') + ' ' + element),
    );
  }

  // Enhance query with names
  if (querySetup['query']) {
    fullQuery = fullQuery.concat(querySetup['query']);
  }

  // Get the projection
  let projection = reducedDeviceFields;

  if (querySetup['fields']) {
    projection = {};

    querySetup['fields'].forEach((element) => projection[element] = true);
  }

  // Build query options
  const queryOptions = {
    page: querySetup['page'],
    limit: querySetup['pageLimit'],
    lean: true,
    sort: querySetup['sort'] ? querySetup['sort'] : null,
    projection: projection,
  };

  // Get the final query from complex search
  const finalQuery = await deviceList.complexSearchDeviceQuery(fullQuery);

  // Get the device with pagination
  let devices = null;

  try {
    devices = await DeviceModel.paginate(finalQuery, queryOptions);

  // Error from mongo
  } catch (error) {
    console.error(
      'Failed to find device in search with error: ' + error,
    );

    return returnError({
      statusCode: 500,
      message: t('databaseFindError', {errorline: __line}),
    });
  }

  // if could not find the device
  if (
    !devices || !devices.docs || devices.docs.length <= 0
  ) {
    return returnError({
      statusCode: 404,
      message: t('noDevicesFound'),
    });
  }

  // Could find the device
  return response
    .status(200)
    .json({
      success: true,
      message: t('OK'),
      devices: devices.docs,
      page: devices.page,
      pageLimit: devices.limit,
      totalPages: devices.totalPages,
    });
};


/**
 * Adds a task to Genie. Only valid for TR-069 routers.
 *
 * @memberof controllers/api/v3
 *
 * @async
 *
 * @param {HTTPRequest} request - The HTTP request.
 * @param {HTTPResponse} response  - The HTTP response.
 */
apiController.postGenieTask = async function(request, response) {
  // Validate the request
  let validation = apiController.validateRequest(request, true);
  if (!validation.valid) {
    return response
      .status(validation.statusCode)
      .json({
        success: validation.valid,
        executed: false,
        message: validation.message,
      });
  }

  // Validate the MAC
  validation = apiController.validateField(request.params, 'mac');

  if (!validation.valid) {
    return response
      .status(validation.statusCode)
      .json({
        success: validation.valid,
        executed: false,
        message: validation.message,
      });
  }

  // Get the device ACS ID
  let device = null;

  try {
    device = await DeviceModel.findOne(
      {_id: request.params['mac'], use_tr069: true},
      {acs_id: true},
    ).lean();
  } catch (error) {
    console.error(
      'Failed to find device in postGenieTask with error: ' + error,
    );

    return response
      .status(500)
      .json({
        success: false,
        executed: false,
        message: t('databaseFindError', {errorline: __line}),
      });
  }

  // Check if could find device
  if (!device || !device.acs_id) {
    return response
      .status(404)
      .json({
        success: false,
        executed: false,
        message: t('noDevicesFound'),
      });
  }

  // Validate the task
  if (!request.body['task'] || request.body['task'].constructor !== Object) {
    return response
      .status(400)
      .json({
        success: false,
        executed: false,
        message: t('invalidTask', {errorline: __line}),
      });
  }

  // Get the task from the body
  let task = request.body['task'];
  let result = null;
  let connectionRequest = false;

  // Get `connectionRequest` from the body to wait or not the device to answer
  if (request.body['connectionRequest'] === true) connectionRequest = true;

  // Get the timeout from the body
  let timeout = parseInt(request.body['timeout']);
  timeout = (!timeout || timeout <= 0 ? MAXIMUM_ADD_TASK_TIMEOUT : timeout);

  // Try sending the task
  try {
    result = await TasksAPI.addTask(
      device.acs_id, task, null, timeout, connectionRequest,
    );
  } catch (error) {
    console.error(
      'Error adding task for ' + device.acs_id +
      ' to genie in postGenieTask with error: ' + error,
    );
    console.error('Fault generated by task:');
    console.error(JSON.stringify(task));

    return response
      .status(500)
      .json({
        success: false,
        executed: false,
        message: t('errorAddingTask', {errorline: __line}),
      });
  }

  // Return if could or could not add the task
  return response
    .status(result.success ? 200 : 400)
    .json({
      success: result.success,
      executed: result.executed,
      message: result.message,
    });
};


/**
 * Adds a task to Genie. Only valid for TR-069 routers.
 *
 * @memberof controllers/api/v3
 *
 * @async
 *
 * @param {HTTPRequest} request - The HTTP request.
 * @param {HTTPResponse} response  - The HTTP response.
 */
apiController.getGenieDeviceCollection = async function(request, response) {
  let device = null;
  let projection = '';

  // Validate the request
  let validation = apiController.validateRequest(request, true);
  if (!validation.valid) {
    return response
      .status(validation.statusCode)
      .json({
        success: validation.valid,
        message: validation.message,
        result: {},
      });
  }

  // Validate the MAC
  validation = apiController.validateField(request.params, 'mac');

  if (!validation.valid) {
    return response
      .status(validation.statusCode)
      .json({
        success: validation.valid,
        message: validation.message,
        result: {},
      });
  }

  // Get the device ACS ID
  try {
    device = await DeviceModel.findOne(
      {_id: request.params['mac'], use_tr069: true},
      {acs_id: true},
    ).lean();
  } catch (error) {
    console.error(
      'Failed to find device in getGenieDeviceCollection with error: ' + error,
    );

    return response
      .status(500)
      .json({
        success: false,
        message: t('databaseFindError', {errorline: __line}),
        result: {},
      });
  }

  // Check if could find device
  if (!device || !device.acs_id) {
    return response
      .status(404)
      .json({
        success: false,
        message: t('noDevicesFound'),
        result: {},
      });
  }

  // Split `fields` and join by comma
  let projectionFields = [];
  validation = apiController.validateField(request.query, 'fields');

  if (request.query['fields'] && validation.valid) {
    projectionFields = request.query['fields'].split(';');
  } else if (request.query['fields'] && !validation.valid) {
    return response
      .status(validation.statusCode)
      .json({
        success: false,
        message: validation.message,
        result: {},
      });
  }

  for (let index = 0; index < projectionFields.length; index++) {
    // If empty, skip to the next iteration
    if (!projectionFields[index]) continue;

    if (!projection) projection = projectionFields[index];
    else projection += ',' + projectionFields[index];
  }

  // Get the response from genie
  let result = {};

  try {
    result = await TasksAPI.getFromCollection(
      'devices', {_id: device.acs_id}, projection,
    );
  } catch (error) {
    console.error(
      'Error getting genie collection from device ' + device.acs_id +
      ' in getGenieDeviceCollection with error: ' + error,
    );

    return response
      .status(500)
      .json({
        success: false,
        message: t('errorGettingCollection', {errorline: __line}),
        result: {},
      });
  }

  // Prepare the response
  let status = 404;
  let responseJson = {
    success: false,
    message: t('noDevicesFound'),
    result: {},
  };

  if (result && result.constructor === Array && result.length > 0) {
    status = 200;

    responseJson = {
      success: true,
      message: t('OK'),
      result: result[0],
    };
  }

  return response
    .status(status)
    .json(responseJson);
};


/**
 * @exports controllers/deviceList
 */
module.exports = apiController;
