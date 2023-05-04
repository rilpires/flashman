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


// Functions
/**
 * Returns a device with reduced fields and without mongo functions. The
 * internal fields used by Flashman are removed alongside big fields like
 * `traceroute_results` and `current_diagnostic` among others. This function is
 * <b>NOT SAFE</b> to be used without a try and catch block due to the use of
 * the `find_one` function that can throw an error.
 *
 * @memberof controllers/api/v3
 *
 * @param {Object} filter - The query to be sent to mongo to return the
 * specified device. It will only return one device and will return the
 * first device it encounters with the filters passed.
 *
 * @return {Object} The lean device.
 *
 * @throws {Error} The mongo error associated when trying to query the device.
 */
apiController.getLeanDevice = function(filter) {
  let device = null;

  device = DeviceModel.findOne(
    // Filter the query
    filter,

    // Reduce fields
    {
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
    },
  ).lean();


  return device;
};


/**
 * Queries and returns the first device that matches the field passed as a URL
 * parameter.
 *
 * @memberof controllers/api/v3
 *
 * @param {HTTPRequest} request - The HTTP request.
 * @param {HTTPResponse} response - The HTTP response.
 *
 * @return {Object} The object containing:
 *  - `success` - If could found the device or not.
 *  - `message` - The error message if any occurred.
 *  - `device`  - The device if found.
 */
apiController.getDeviceByField = async function(request, response) {
  let validator = new Validator();

  // To add new routes to get devices in a specific way, just add the
  // parameter name that comes from the route, the field name in the device
  // model and the validator of the field.
  const allFields = [
    'pppoeUsername', 'mac', 'serialTR069', 'externalReferenceData', 'wanMac',
  ];
  const translateField = {
    pppoeUsername: {
      field: 'pppoe_user',
      validation: validator.validateUser,
    },
    mac: {
      field: '_id',
      validation: validator.validateMac,
    },
    serialTR069: {
      field: 'serial_tr069',
      validation: validator.validateUser,
    },
    externalReferenceData: {
      field: 'external_reference.data',
      validation: validator.validateDeviceName,
    },
    wanMac: {
      field: 'wan_bssid',
      validation: validator.validateMac,
    },
  };

  // Validate missing information
  if (!request || !request.params) {
    let responseMessage = {
    success: false,
    message: t('requestError', {errorline: __line}),
    device: {},
    };

    return response.status(500).json(responseMessage);
  }


  // Get the parameter in use
  let paramIndex = allFields.findIndex((field) => request.params[field]);

  // Check if parameter exists
  if (
    paramIndex < 0 || !request.params[allFields[paramIndex]] ||
    typeof request.params[allFields[paramIndex]] !== 'string'
  ) {
    let responseMessage = {
    success: false,
    message: t('fieldNotFound', {errorline: __line}),
    device: {},
    };

    return response.status(500).json(responseMessage);
  }

  let paramName = allFields[paramIndex];
  let fieldName = translateField[paramName].field;
  let checkFunc = translateField[paramName].validation;
  let param = request.params[paramName];


  // Check if parameter is valid
  let valid = checkFunc(param);
  if (!valid.valid) {
    let responseMessage = {
    success: false,
    message: valid.err,
    device: {},
    };

    return response.status(500).json(responseMessage);
  }


  // Build the query
  let query = {};
  query[fieldName] = param;


  // Get the device
  let device = null;
  try {
    // Search by PPPoE username and get the slim version of the device
    device = await apiController.getLeanDevice(query);

  // Error from mongo
  } catch (error) {
    console.log(
    'Failed to find device in getDeviceByField with error: ' + error,
    );

    let responseMessage = {
    success: false,
    message: t('databaseFindError', {errorline: __line}),
    device: {},
    };

    return response.status(500).json(responseMessage);
  }


  // if could not find the device
  if (!device) {
    let responseMessage = {
    success: false,
    message: t('noDevicesFound'),
    device: {},
    };

    return response.status(200).json(responseMessage);
  }

  // Found the device
  let responseMessage = {
    success: true,
    message: t('OK'),
    device: device,
  };

  return response.status(200).json(responseMessage);
};


/**
 * @exports controllers/deviceList
 */
module.exports = apiController;
