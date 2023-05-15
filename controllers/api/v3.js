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
let apiController = {};


const MAX_PAGE_SIZE = 50;

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

  // Those fields should not be used as parameter for finding
  // This field is used to specify a projection
  field: {
    field: '', validation: validator.validateProjection,
  },
  // Those fields are used for pagination
  page: {
    field: '', validation: (page) => apiController.validatePage(page),
  },
  pageLimit: {
    field: '', validation: (page) => apiController.validatePageLimit(page),
  },
  // This field is used for conditions like: last_seen > xyz
  conditionField: {
    field: '',
    validation: (field) => apiController.validateDeviceProjection(field),
  },
};

const reducedFieldsByRelativePath = {
  default: reducedDeviceFields,
  lan_devices: reducedLanDevicesField,
  ap_survey: reducedApSurveyField,
};


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
    // Error from device_validator or from buildDeviceResponse
    let message = valid.err ? valid.err : valid.message.message;

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
    return {valid: false, err: t('mustBeAString')};
  }

  // Parse the number
  const pageNumber = parseInt(page);

  // Check if the number is valid
  if (!pageNumber || pageNumber < 1) {
    return {valid: false, err: t('invalidPageError', {errorline: __line})};
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
  let pageNumber = validation.value;

  // Check if the upper limit is valid
  if (pageNumber > MAX_PAGE_SIZE) {
    return {
      valid: false,
      err: t('invalidPageLimitError', {
        upperLimit: MAX_PAGE_SIZE,
        errorline: __line,
      }),
    };
  }

  return {valid: true, value: pageNumber};
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
  defaultProjection,
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
 * Parses an integer and returns an `Object` explaning if could or could not
 * parse the field.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} params - The `params` object that comes with the route.
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
    {},
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
 * @param {Object} params - The `params` object that comes with the route.
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
 * @param {Object} params - The `params` object that comes with the route.
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
      message: t('fieldWrongType', {dataType: 'Date/Number/Boolean'}),
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
          message: t('fieldWrongType', {dataType: type}),
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
  let mergedParams = {
    conditionField: null,
    page: null,
    pageLimit: null,
    field: null,
  };


  const paramNames = [{
    name: 'conditionField',
    execute: apiController.parseRouteConditionParameter,
  }, {
    name: 'page',
    execute: apiController.parseRouteIntParameter,
  }, {
    name: 'pageLimit',
    execute: apiController.parseRouteIntParameter,
  }, {
    name: 'field',
    execute: apiController.parseRouteStringArrayParameter,
  }];


  // Validate each parameter
  for (let index = 0; index < paramNames.length; index++) {
    let paramEntry = paramNames[index];

    // Validate the field
    validation = apiController.validateField(params, paramEntry.name);
    if (validation.valid) {
      // Execute
      let returnValue = paramEntry.execute(
        params, paramEntry.name, relativePath,
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
      params[paramEntry.name] !== null &&
      params[paramEntry.name] !== undefined
    ) {
      return response
        .status(validation.statusCode)
        .json(validation.message);
    }
  }


  // Try finding the device
  validation = await apiController.getDeviceByFields(
    params, defaultProjection, mergedParams['field'],
    mergedParams['conditionField'], mergedParams['page'],
    mergedParams['pageLimit'], relativePath, routeParameters,
  );


  return response
    .status(validation.statusCode)
    .json(validation.message);
};


/**
 * @exports controllers/deviceList
 */
module.exports = apiController;
