
/**
 * Interface functions with the ACS.
 * @namespace controllers/handlers/acs/measure
 */

const DeviceModel = require('../../../models/device');
const DevicesAPI = require('../../external-genieacs/devices-api');
const Config = require('../../../models/config');
const utilHandlers = require('../util');
const sio = require('../../../sio');
const TasksAPI = require('../../external-genieacs/tasks-api');
const debug = require('debug')('ACS_DEVICES_MEASURES');

let acsMeasuresHandler = {};

const getCPEInstance = async function(acsID) {
  let device;

  // Check acs ID
  if (!acsID) return undefined;
  try {
    device = await DeviceModel.findOne(
      {acs_id: acsID},
      {
        use_tr069: true, acs_id: true, model: true,
        version: true, hw_version: true, connection_type: true,
      },
    ).lean();
  } catch (error) {
    console.error(
      'Could not get device in getCPEInstance: ' + error,
    );
    return undefined;
  }

  // Check if is a TR-069 valid device
  if (!device || !device.use_tr069) {
    console.error('Invalid device in getCPEInstance!');
    return undefined;
  }

  // Get the cpe instance
  let cpeInstance = DevicesAPI.instantiateCPEByModelFromDevice(device);

  if (!cpeInstance.success) {
    console.error('Invalid CPE in getCPEInstance!');
    return undefined;
  }

  return {
    mac: device._id,
    cpe: cpeInstance.cpe,
    conn_type: device.connection_type,
  };
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
acsMeasuresHandler.__testGetCPEInstance = getCPEInstance;

/**
 * Get WAN sent and received bytes, CPU usage, total memory, free memory from
 * GenieACS of the CPE with the `acsID`informed.
 *
 * @memberof controllers/handlers/acs/measure
 *
 * @param {String} acsID - The ACS ID of the device to fetch statistics from.
 */
acsMeasuresHandler.fetchWanBytesFromGenie = async function(acsID) {
  let CPEinfo = await getCPEInstance(acsID);
  if (!CPEinfo) return;
  let cpe = CPEinfo.cpe;
  let mac = CPEinfo.mac;

  const permissions = cpe.modelPermissions();
  const hasCPUUsage = permissions.features.hasCPUUsage;
  const hasMemoryUsage = permissions.features.hasMemoryUsage;
  let useLastIndexOnWildcard = permissions.useLastIndexOnWildcard;

  let fields = cpe.getModelFields();
  let recvField = fields.wan.recv_bytes;
  let sentField = fields.wan.sent_bytes;
  let statistics = fields.diagnostics.statistics;

  let cpuUsageField = hasCPUUsage && statistics.cpu_usage ?
    statistics.cpu_usage : '';
  let memoryUsageField = hasMemoryUsage && statistics.memory_usage ?
    statistics.memory_usage : '';
  let memoryFreeField = hasMemoryUsage && statistics.memory_free ?
    statistics.memory_free : '';
  let memoryTotalField = hasMemoryUsage && statistics.memory_total ?
    statistics.memory_total : '';

  let query = {_id: acsID};
  let projection =
    recvField.replace(/\.\*.*/g, '') + ',' +
    sentField.replace(/\.\*.*/g, '') +
    (hasCPUUsage && cpuUsageField ?
      ',' + cpuUsageField.replace(/\.\*.*/g, '') : ''
    ) +
    (hasMemoryUsage && memoryUsageField ?
      ',' + memoryUsageField.replace(/\.\*.*/g, '') : ''
    ) +
    (hasMemoryUsage && memoryFreeField ?
      ',' + memoryFreeField.replace(/\.\*.*/g, '') : ''
    ) +
    (hasMemoryUsage && memoryTotalField ?
      ',' + memoryTotalField.replace(/\.\*.*/g, '') : ''
    );


  let data = null;

  try {
    data = (await TasksAPI.getFromCollection('devices', query, projection))[0];
  } catch (error) {
    console.error(
      'Error getting statistics from GenieACS in fetchWanBytesFromGenie: ' +
      error,
    );

    return;
  }

  // Exit if data is invalid
  if (!data) return;


  let responseData = {};
  let wanBytes = {};
  let resources = {};


  // Check Received Bytes
  let checkRecv = utilHandlers.checkForNestedKey(
    data, recvField + '._value', useLastIndexOnWildcard,
  );

  // Check Sent Bytes
  let checkSent = utilHandlers.checkForNestedKey(
    data, sentField + '._value', useLastIndexOnWildcard,
  );

  // Check CPU usage
  let checkCPUUsage = permissions.features.hasCPUUsage ?
    utilHandlers.checkForNestedKey(
      data, cpuUsageField + '._value', useLastIndexOnWildcard,
    ) : false;

  // Check Memory usage
  let checkMemoryUsage = permissions.features.hasMemoryUsage ?
    utilHandlers.checkForNestedKey(
      data, memoryUsageField + '._value', useLastIndexOnWildcard,
    ) : false;

  let checkMemoryFree = permissions.features.hasMemoryUsage ?
    utilHandlers.checkForNestedKey(
      data, memoryFreeField + '._value', useLastIndexOnWildcard,
    ) : false;

  let checkMemoryTotal = permissions.features.hasMemoryUsage ?
    utilHandlers.checkForNestedKey(
      data, memoryTotalField + '._value', useLastIndexOnWildcard,
    ) : false;


  // Get Received and Sent Bytes
  if (checkRecv && checkSent) {
    wanBytes = {
      recv: utilHandlers.getFromNestedKey(
        data, recvField + '._value', useLastIndexOnWildcard,
      ),
      sent: utilHandlers.getFromNestedKey(
        data, sentField + '._value', useLastIndexOnWildcard,
      ),
    };
  }

  // Get CPU usage
  if (checkCPUUsage) {
    // Get the usage
    let usage = utilHandlers.getFromNestedKey(
      data, cpuUsageField + '._value', useLastIndexOnWildcard,
    );

    // Parse the usage
    let usageValue = parseInt(usage);

    // Assign the usage
    if (!isNaN(usageValue) && usageValue >= 0 && usageValue <= 100) {
      resources.cpu_usage = usageValue;

    // If the value is not valid, CPU usage does not pass in the check
    } else {
      checkCPUUsage = false;
    }
  }

  // Get Memory usage
  if (checkMemoryFree && checkMemoryTotal) {
    // Get the Total and Free
    let memoryFree = utilHandlers.getFromNestedKey(
      data, memoryFreeField + '._value', useLastIndexOnWildcard,
    );
    let memoryTotal = utilHandlers.getFromNestedKey(
      data, memoryTotalField + '._value', useLastIndexOnWildcard,
    );

    // Parse the values
    let memoryFreeValue = parseInt(memoryFree);
    let memoryTotalValue = parseInt(memoryTotal);

    // Assign the usage
    if (
      !isNaN(memoryFreeValue) && memoryFreeValue >= 0 &&
      !isNaN(memoryTotalValue) && memoryTotalValue >= 0 &&
      memoryFreeValue <= memoryTotalValue
    ) {
      resources.mem_usage = Math.ceil(
        (memoryTotalValue - memoryFreeValue) * 100 / memoryTotalValue,
      );

    // If the value is not valid, Memory usage does not pass in the check
    } else {
      checkMemoryFree = false;
      checkMemoryTotal = false;
    }
  }


  if (checkMemoryUsage) {
    // Get the ṕercentage
    let memoryPercentage = utilHandlers.getFromNestedKey(
      data, memoryUsageField + '._value', useLastIndexOnWildcard,
    );

    // Parse the valus
    let memoryPercentageValue = parseInt(memoryPercentage);

    // Assign the usage
    if (
      !isNaN(memoryPercentageValue) && memoryPercentageValue >= 0 &&
      memoryPercentageValue <= 100
    ) {
      resources.mem_usage = Math.ceil(memoryPercentageValue);

    // If the value is not valid, Memory usage does not pass in the check
    } else {
      checkMemoryUsage = false;
    }
  }

  // Only append resources if has CPU usage or has both Memory Free and
  // Memory Total or has Memory usage
  if (
    checkCPUUsage ||
    (checkMemoryFree && checkMemoryTotal) || checkMemoryUsage) {
    responseData.resources = resources;
  }

  // Check if must save the wan data
  if (checkRecv && checkSent) {
    // Update the device as it could have been changed during the request
    // (an async call with await) and thus causing mongoose to throw an error
    const device = await DeviceModel.findOne(
      {acs_id: acsID}, {wan_bytes: true, last_contact: true},
    ).exec().catch((e) => {
      console.error(
        'Could not get device in fetchWanBytesFromGenie: ' + e,
      );
    });
    if (device) {
      // Update information
      device.last_contact = Date.now();
      wanBytes = acsMeasuresHandler.appendBytesMeasure(
        device.wan_bytes,
        wanBytes.recv,
        wanBytes.sent,
      );
      device.wan_bytes = wanBytes;

      // Save the device
      await device.save().catch((err) => {
        console.log('Error saving device wan bytes: ' + err);
      });

      // Append to the final response
      responseData.wanbytes = wanBytes;
    }
  }

  // Report to frontend
  sio.anlixSendStatisticsNotification(mac, responseData);
};

acsMeasuresHandler.fetchPonSignalFromGenie = async function(acsID) {
  let CPEinfo = await getCPEInstance(acsID);
  if (!CPEinfo) return;
  let cpe = CPEinfo.cpe;
  let mac = CPEinfo.mac;

  let fields = cpe.getModelFields();
  let rxPowerField = fields.wan.pon_rxpower;
  let txPowerField = fields.wan.pon_txpower;
  let rxPowerFieldEpon = '';
  let txPowerFieldEpon = '';
  let projection = rxPowerField + ',' + txPowerField;

  if (fields.wan.pon_rxpower_epon && fields.wan.pon_txpower_epon) {
    rxPowerFieldEpon = fields.wan.pon_rxpower_epon;
    txPowerFieldEpon = fields.wan.pon_txpower_epon;
    projection += ',' + rxPowerFieldEpon + ',' + txPowerFieldEpon;
  }

  let query = {_id: acsID};
  let data = await TasksAPI.getFromCollection('devices', query, projection)
    .catch((err) => {
      console.log(`ERROR IN fetchPonSignalFromGenie TaskAPI: ${err}`);
      return;
    });
  if (!data || data.length == 0) return;
  data = data[0];
  let ponSignal = {};
  let ponArrayMeasures = {};

  let success = false;
  if (utilHandlers.checkForNestedKey(data, rxPowerField + '._value') &&
      utilHandlers.checkForNestedKey(data, txPowerField + '._value')) {
    success = true;
    ponSignal = {
      rxpower: utilHandlers.getFromNestedKey(
        data,
        rxPowerField + '._value',
      ),

      txpower: utilHandlers.getFromNestedKey(
        data,
        txPowerField + '._value',
      ),
    };
  } else if (
    utilHandlers.checkForNestedKey(data, rxPowerFieldEpon + '._value') &&
    utilHandlers.checkForNestedKey(data, txPowerFieldEpon + '._value')
  ) {
    success = true;
    ponSignal = {
      rxpower: utilHandlers.getFromNestedKey(
        data,
        rxPowerFieldEpon + '._value',
      ),

      txpower: utilHandlers.getFromNestedKey(
        data,
        txPowerFieldEpon + '._value',
      ),
    };
  }

  if (success) {
    let deviceEdit = await DeviceModel.findOne(
        {_id: mac},
        {
          pon_rxpower: true, pon_txpower: true,
          pon_signal_measure: true, last_contact: true,
        },
      ).exec().catch((e) => {
        console.error(
          'Could not get device in fetchPonSignalFromGenie: ' + e,
        );
      });

    let deviceModified = false;

    if (!deviceEdit) return;
    deviceEdit.last_contact = Date.now();

    // Pon Rx Power
    if (ponSignal.rxpower) {
      ponSignal.rxpower = cpe.convertToDbm(ponSignal.rxpower);

      // Do not modify if rxpower is invalid
      if (ponSignal.rxpower) {
        deviceEdit.pon_rxpower = ponSignal.rxpower;
        deviceModified = true;
      }
    }

    // Pon Tx Power
    if (ponSignal.txpower) {
      ponSignal.txpower = cpe.convertToDbm(ponSignal.txpower);

      // Do not modify if txpower is invalid
      if (ponSignal.txpower) {
        deviceEdit.pon_txpower = ponSignal.txpower;
        deviceModified = true;
      }
    }

    ponArrayMeasures = acsMeasuresHandler.appendPonSignal(
      deviceEdit.pon_signal_measure,
      ponSignal.rxpower,
      ponSignal.txpower,
    );

    if (Object.keys(ponArrayMeasures).length) {
      deviceEdit.pon_signal_measure = ponArrayMeasures;
      deviceModified = true;
    }

    // Only save the device if modified the device, reducing the quantity
    // of unneeded await and save calls
    if (deviceModified === true) {
      await deviceEdit.save().catch((err) => {
        console.log('Error saving pon signal: ' + err);
      });
    }
  }

  // Send notification for app if had at least one entry in
  // ponArrayMeasures
  if (Object.keys(ponArrayMeasures).length) {
    sio.anlixSendPonSignalNotification(
      mac,
      {ponsignalmeasure: ponArrayMeasures},
    );
  }

  return ponArrayMeasures;
};

acsMeasuresHandler.fetchUpStatusFromGenie = async function(acsID) {
  let CPEinfo = await getCPEInstance(acsID);
  if (!CPEinfo) return;
  let cpe = CPEinfo.cpe;
  let mac = CPEinfo.mac;

  let fields = cpe.getModelFields();
  let PPPoEUser = fields.wan.pppoe_user.replace(/\.\*.*/g, '');
  let upTimeField;
  let upTimePPPField;
  let rxPowerField;
  let txPowerField;
  let rxPowerFieldEpon;
  let txPowerFieldEpon;
  let query = {_id: acsID};
  let projection = fields.common.uptime + ',' + PPPoEUser;

  if (cpe.modelPermissions().wan.hasUptimeField) {
    upTimeField = fields.wan.uptime.replace(/\.\*.*/g, '');
    upTimePPPField = fields.wan.uptime_ppp.replace(/\.\*.*/g, '');
    projection += ',' + upTimeField + ',' + upTimePPPField;
  }

  if (fields.wan.pon_rxpower && fields.wan.pon_txpower) {
    rxPowerField = fields.wan.pon_rxpower;
    txPowerField = fields.wan.pon_txpower;
    projection += ',' + rxPowerField + ',' + txPowerField;
  }

  if (fields.wan.pon_rxpower_epon && fields.wan.pon_txpower_epon) {
    rxPowerFieldEpon = fields.wan.pon_rxpower_epon;
    txPowerFieldEpon = fields.wan.pon_txpower_epon;
    projection += ',' + rxPowerFieldEpon + ',' + txPowerFieldEpon;
  }

  let data = await TasksAPI.getFromCollection('devices', query, projection)
    .catch((err) => {
      console.log(`ERROR IN fetchUpStatusFromGenie TaskAPI: ${err}`);
      return;
    });
  if (!data || data.length == 0) return;
  data = data[0];

  let sysUpTime = 0;
  let wanUpTime = 0;
  let signalState = {};
  let ponSignal = {};

  let successSys = false;
  let successWan = false;
  let successRxPower = false;
  let checkFunction = utilHandlers.checkForNestedKey;
  let getFunction = utilHandlers.getFromNestedKey;

  if (checkFunction(data, fields.common.uptime + '._value')) {
    successSys = true;
    sysUpTime = getFunction(data, fields.common.uptime + '._value');
  }
  if (checkFunction(data, fields.wan.pppoe_user + '._value')) {
    successWan = true;
    let hasPPPoE = getFunction(data, fields.wan.pppoe_user + '._value');
    if (
      hasPPPoE && checkFunction(data, fields.wan.uptime_ppp + '._value')
    ) {
      wanUpTime = getFunction(data, fields.wan.uptime_ppp + '._value');
    }
  } else if (checkFunction(data, fields.wan.uptime + '._value')) {
    successWan = true;
    wanUpTime = getFunction(data, fields.wan.uptime + '._value');
  }
  if (checkFunction(data, rxPowerField + '._value') &&
      checkFunction(data, txPowerField + '._value')) {
    successRxPower = true;
    ponSignal = {
      rxpower: getFunction(data, rxPowerField + '._value'),
      txpower: getFunction(data, txPowerField + '._value'),
    };
  } else if (checkFunction(data, rxPowerFieldEpon + '._value') &&
             checkFunction(data, txPowerFieldEpon + '._value')) {
    successRxPower = true;
    ponSignal = {
      rxpower: getFunction(data, rxPowerFieldEpon + '._value'),
      txpower: getFunction(data, txPowerFieldEpon + '._value'),
    };
  }
  if (successSys || successWan || successRxPower) {
    let deviceEdit = await DeviceModel.findOne(
      {_id: mac},
      {
        pon_rxpower: true, pon_txpower: true,
        pon_signal_measure: true, last_contact: true,
        sys_up_time: true, wan_up_time: true,
      },
    ).exec().catch((e) => {
      console.error(
        'Could not get device in fetchUpStatusFromGenie: ' + e,
      );
    });
    if (successRxPower) {
      // covert rx and tx signal
      ponSignal.rxpower = cpe.convertToDbm(ponSignal.rxpower);
      ponSignal.txpower = cpe.convertToDbm(ponSignal.txpower);
      // send then
      let config = await Config.findOne(
        {is_default: true}, {tr069: true},
      ).lean();
      signalState = {
        rxpower: ponSignal.rxpower,
        threshold:
          config.tr069.pon_signal_threshold,
        thresholdCritical:
          config.tr069.pon_signal_threshold_critical,
        thresholdCriticalHigh:
          config.tr069.pon_signal_threshold_critical_high,
      };
      deviceEdit.pon_rxpower = ponSignal.rxpower;
      deviceEdit.pon_txpower = ponSignal.txpower;
      // append to device data structure
      ponSignal = acsMeasuresHandler.appendPonSignal(
        deviceEdit.pon_signal_measure,
        ponSignal.rxpower,
        ponSignal.txpower,
      );
      deviceEdit.pon_signal_measure = ponSignal;
    }
    if (successSys && deviceEdit.sys_up_time
        && deviceEdit.sys_up_time != sysUpTime) {
      /* only update last contact when sys up time from projection
       is different from the database, to avoid the bug of trigger
       this function, by mass trigger fetch up status, that entails
       bogus last contact refer */
      deviceEdit.last_contact = Date.now();
      sio.anlixSendUpStatusNotification(mac, {
        sysuptime: sysUpTime,
        wanuptime: wanUpTime,
        ponsignal: signalState,
      });
    }
    /* if sys up status is the same, so probably this functions
    was triggered by deleted task prompted by another fetch up
    status, then does not send data to front end */
    deviceEdit.sys_up_time = sysUpTime;
    deviceEdit.wan_up_time = wanUpTime;
    await deviceEdit.save().catch((err) => {
      console.log('Error saving device up status: ' + err);
    });
  }
};


/**
 * Check if the field passed does exist in Genie and get it's value.
 *
 * @memberof controllers/handlers/acs/measure
 *
 * @param {Object} data - The data that came from Genie.
 * @param {String} field - The ACS field of the cpe.
 * @param {Boolean} useLastIndexOnWildcard - If should use the last index in
 * field.
 *
 * @return {Object} The object containing:
 *  - `success`: If could extract the value properly.
 *  - `value`: The value extracted from Genie.
 */
const checkAndGetGenieField = function(
  data,
  field,
  useLastIndexOnWildcard = false,
) {
  let response = {success: false, value: null};

  if (!data || !field) return response;

  if (utilHandlers.checkForNestedKey(data, field + '._value')) {
    // Get the value
    let value = utilHandlers.getFromNestedKey(
      data,
      field/* + '._value'*/,
      useLastIndexOnWildcard,
    );

    // Validate and return
    if (value) {
      response.success = true;
      response.value = value._value;
    }
  }

  return response;
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
acsMeasuresHandler.__testCheckAndGetGenieField = checkAndGetGenieField;


/**
 * Get the WAN information data requested to the CPE from Genie.
 *
 * @memberof controllers/handlers/acs/measure
 *
 * @param {String} acsID - The ACS ID of the device.
 */
acsMeasuresHandler.fetchWanInformationFromGenie = async function(acsID) {
  let CPEinfo = await getCPEInstance(acsID);
  if (!CPEinfo) return;
  let cpe = CPEinfo.cpe;
  let mac = CPEinfo.mac;
  let conntype = CPEinfo.conn_type;

  let permissions = cpe.modelPermissions();
  let fields = cpe.getModelFields();
  let query = {_id: acsID};
  let projection = '';

  // Check PPPoE
  let hasPPPoE = conntype === 'pppoe' ? true : false;
  let suffixPPPoE = hasPPPoE ? '_ppp' : '';

  // Assign fields
  let assignFields = {
    wanIPv4Field: {
      permission: true,
      path: 'wan_ip',
    },
    wanIPv6Field: {
      permission: permissions.ipv6.hasAddressField,
      path: 'address',
      isIPv6: true,
    },
    maskIPv4Field: {
      permission: permissions.wan.hasIpv4MaskField,
      path: 'mask_ipv4',
    },
    maskIPv6Field: {
      permission: permissions.ipv6.hasMaskField,
      path: 'mask',
      isIPv6: true,
    },
    wanPPPoEAddressField: {
      permission: permissions.wan.hasIpv4RemoteAddressField,
      path: 'remote_address',
    },
    wanPPPoEMacField: {
      permission: permissions.wan.hasIpv4RemoteMacField,
      path: 'remote_mac',
    },
    gatewayIPv4Field: {
      permission: permissions.wan.hasIpv4DefaultGatewayField,
      path: 'default_gateway',
    },
    gatewayIPv6Field: {
      permission: permissions.ipv6.hasDefaultGatewayField,
      path: 'default_gateway',
      isIPv6: true,
    },
    dnsServerField: {
      permission: permissions.wan.hasDnsServerField,
      path: 'dns_servers',
    },
  };


  // Set all field names
  Object.keys(assignFields).forEach((fieldName) => {
    let fieldObject = assignFields[fieldName];

    // If does not have permission continue to the next field
    if (!fieldObject.permission) return;

    // Set the field according if has ipv6
    if (fieldObject.isIPv6 && permissions.features.hasIpv6Information) {
      fieldObject.field = fields.ipv6[fieldObject.path + suffixPPPoE];
    } else if (!fieldObject.isIPv6) {
      fieldObject.field = fields.wan[fieldObject.path + suffixPPPoE];
    }

    // If the field does not exist, continue to the next field
    if (!fieldObject.field) return;

    // If projection is not empty, add a comma
    if (projection) projection += ',';

    // Remove everything after * (included) to load the root of the field
    let fieldRoot = fieldObject.field.replace(/\.\*.*/g, '');

    // Add to projection
    projection += fieldRoot;
  });


  let data = null;
  let saveDevice = false;


  // Send the request
  try {
    data = (await TasksAPI.getFromCollection('devices', query, projection))[0];
  } catch (error) {
    console.error(
      'Error getting WAN information from GenieACS in' +
      'fetchWanInformationFromGenie: ' +
      error,
    );

    return;
  }

  // Check data
  if (!data) return;


  // Get all data
  Object.keys(assignFields).forEach((fieldName) => {
    let genieValue = null;
    let fieldObject = assignFields[fieldName];

    // Get the value from genie
    genieValue = checkAndGetGenieField(
      data,
      fieldObject.field,
      permissions.useLastIndexOnWildcard,
    );

    // Set the value and set to save the device
    if (genieValue.success) {
      fieldObject.value = genieValue.value;
      saveDevice = true;
    } else {
      fieldObject.value = '';
    }
  });


  // Try getting the mask
  let maskV6 = utilHandlers
    .getMaskFromAddress(assignFields.wanIPv6Field.value, true);

  if (!maskV6) maskV6 = '0';


  // Check if needs to save the device. Made this way to reduce unnecessary
  // save calls.
  if (saveDevice) {
    // Update the device as it could have been changed during the request
    // (an async call with await) and thus causing mongoose to throw an
    // error
    let device = await DeviceModel.findOne(
      {acs_id: acsID},
      {
        wan_ip: true, wan_ipv6: true, wan_ipv4_mask: true,
        wan_ipv6_mask: true, pppoe_ip: true, pppoe_mac: true,
        default_gateway_v4: true, default_gateway_v6: true,
        dns_server: true, last_contact: true,
      },
    ).exec().catch((e) => {
      console.error(
        'Could not get device in fetchWanInformationFromGenie: ' + e,
      );
    });

    if (device) {
      // Update last contact
      device.last_contact = Date.now();

      // Update fields
      // Address
      device.wan_ip = assignFields.wanIPv4Field.value;

      if (assignFields.wanIPv6Field.value != 'null') {
        // Remove the mask if came with it
        device.wan_ipv6 = assignFields.wanIPv6Field.value.split('/')[0];
      }

      // Mask
      let mask = parseInt(assignFields.maskIPv4Field.value);
      device.wan_ipv4_mask = (mask && mask > 0 && mask <= 32 ? mask : 0);

      mask = parseInt(
        assignFields.maskIPv6Field.value ?
        assignFields.maskIPv6Field.value : maskV6,
      );
      device.wan_ipv6_mask = (mask && mask > 0 && mask <= 128 ? mask : 0);

      // PPPoE
      if (hasPPPoE) {
        device.pppoe_ip = assignFields.wanPPPoEAddressField.value;
        device.pppoe_mac = assignFields.wanPPPoEMacField.value;
      }

      // Default Gateway
      device.default_gateway_v4 = assignFields.gatewayIPv4Field.value;
      device.default_gateway_v6 = assignFields.gatewayIPv6Field.value;

      // DNS Server
      device.dns_server = assignFields.dnsServerField.value;

      try {
        // Save the device
        await device.save();
      } catch (error) {
        console.error(
          'Error saving device in fetchWanInformationFromGenie: ' + error,
        );

        return;
      }
    }
  }

  // Always send the notification, even if there is no value
  sio.anlixSendWanInfoNotification(mac, {
    ipv4_address: assignFields.wanIPv4Field.value,
    ipv4_mask: assignFields.maskIPv4Field.value,

    // Remove the mask if came with it
    ipv6_address: assignFields.wanIPv6Field.value.split('/')[0],
    ipv6_mask: (
      assignFields.maskIPv6Field.value ?
      assignFields.maskIPv6Field.value : maskV6
    ),

    default_gateway_v4: assignFields.gatewayIPv4Field.value,
    default_gateway_v6: assignFields.gatewayIPv6Field.value,
    dns_server: assignFields.dnsServerField.value,

    wan_conn_type: hasPPPoE ? 'pppoe' : 'dhcp',
    pppoe_mac: assignFields.wanPPPoEMacField.value,
    pppoe_ip: assignFields.wanPPPoEAddressField.value,
  });
};


/**
 * Get the LAN information data requested to the CPE from Genie.
 *
 * @memberof controllers/handlers/acs/measure
 *
 * @param {String} acsID - The ACS ID of the device.
 */
acsMeasuresHandler.fetchLanInformationFromGenie = async function(acsID) {
  let CPEinfo = await getCPEInstance(acsID);
  if (!CPEinfo) return;
  let cpe = CPEinfo.cpe;
  let mac = CPEinfo.mac;
  let conntype = CPEinfo.conn_type;

  let permissions = cpe.modelPermissions();
  let fields = cpe.getModelFields();
  let query = {_id: acsID};
  let projection = '';


  // If does not have any IPv6 information, exit
  if (!permissions.features.hasIpv6Information) {
    // Send an empty notification to not stall frontend
    sio.anlixSendLanInfoNotification(mac, {
      prefix_delegation_addr: '',
      prefix_delegation_mask: '',
      prefix_delegation_local: '',
    });

    return;
  }


  // Check PPPoE
  let suffixPPPoE = conntype === 'pppoe' ? '_ppp' : '';


  // Assign fields
  let assignFields = {
    prefixAddressField: {
      permission: permissions.ipv6.hasPrefixDelegationAddressField,
      path: 'prefix_delegation_address',
    },
    prefixMaskField: {
      permission: permissions.ipv6.hasPrefixDelegationMaskField,
      path: 'prefix_delegation_mask',
    },
    prefixLocalAddressField: {
      permission: permissions.ipv6.hasPrefixDelegationLocalAddressField,
      path: 'prefix_delegation_local_address',
    },
  };


  // Set all field names
  Object.keys(assignFields).forEach((fieldName) => {
    let fieldObject = assignFields[fieldName];

    // If does not have permission continue to the next field
    if (!fieldObject.permission) return;

    fieldObject.field = fields.ipv6[fieldObject.path + suffixPPPoE];

    // If projection is not empty, add a comma
    if (projection) projection += ',';

    // Remove everything after * (included) to load the root of the field
    let fieldRoot = fieldObject.field.replace(/\.\*.*/g, '');

    // Add to projection
    projection += fieldRoot;
  });

  let data = null;
  let saveDevice = false;


  // Send the request
  try {
    data = (await TasksAPI.getFromCollection('devices', query, projection))[0];
  } catch (error) {
    console.error(
      'Error getting LAN information from GenieACS in' +
      'fetchLanInformationFromGenie: ' +
      error,
    );

    return;
  }

  // Check data
  if (!data) return;


  // Get all data
  Object.keys(assignFields).forEach((fieldName) => {
    let genieValue = null;
    let fieldObject = assignFields[fieldName];

    // Get the value from genie
    genieValue = checkAndGetGenieField(
      data,
      fieldObject.field,
      permissions.useLastIndexOnWildcard,
    );

    // Set the value and set to save the device
    if (genieValue.success) {
      fieldObject.value = genieValue.value;
      saveDevice = true;
    } else {
      fieldObject.value = '';
    }
  });


  // Try getting the mask
  let mask = utilHandlers
    .getMaskFromAddress(assignFields.prefixAddressField.value, true);

  if (!mask) mask = '';


  // Check if needs to save the device. Made this way to reduce unnecessary
  // save calls.
  if (saveDevice) {
    // Update the device as it could have been changed during the request
    // (an async call with await) and thus causing mongoose to throw an
    // error
    let device = await DeviceModel.findOne(
      {acs_id: acsID},
      {
        prefix_delegation_addr: true, prefix_delegation_mask: true,
        prefix_delegation_local: true, last_contact: true,
      },
    ).exec().catch((e) => {
      console.error(
        'Could not get device in fetchLanInformationFromGenie: ' + e,
      );
    });

    if (device) {
      // Update last contact
      device.last_contact = Date.now();

      // If prefixAddressField has '/', remove it
      assignFields.prefixAddressField.value =
        assignFields.prefixAddressField.value.split('/')[0];
      device.prefix_delegation_addr = assignFields.prefixAddressField.value;

      // If the mask field came empty, try using the one from the address
      device.prefix_delegation_mask = (
        assignFields.prefixMaskField.value ?
        assignFields.prefixMaskField.value : mask
      );

      device.prefix_delegation_local =
        assignFields.prefixLocalAddressField.value;

      try {
        // Save the device
        await device.save();
      } catch (error) {
        console.error(
          'Error saving device in fetchLanInformationFromGenie: ' + error,
        );

        return;
      }
    }
  }

  // Always send the notification, even if it is empty
  sio.anlixSendLanInfoNotification(mac, {
    prefix_delegation_addr: assignFields.prefixAddressField.value,
    prefix_delegation_mask: (
      assignFields.prefixMaskField.value ?
      assignFields.prefixMaskField.value : mask
    ),
    prefix_delegation_local: assignFields.prefixLocalAddressField.value,
  });
};


acsMeasuresHandler.appendBytesMeasure = function(original, recv, sent) {
  if (!original) original = {};
  try {
    let now = Math.floor(Date.now()/1000);
    let bytes = JSON.parse(JSON.stringify(original));
    if (Object.keys(bytes).length >= 300) {
      let keysNum = Object
        .keys(bytes)
        .map((keyNum) => {
          const parsedKeyNum = parseInt(keyNum);
          if (isNaN(parsedKeyNum)) {
            debug('parsedKeyNum is NaN!!!');
          }
          return parsedKeyNum;
        });
      let smallest = Math.min(...keysNum);
      delete bytes[smallest];
    }
    bytes[now] = [recv, sent];
    return bytes;
  } catch (e) {
    debug(`appendBytesMeasure Exception: ${e}`);
    return original;
  }
};

acsMeasuresHandler.appendPonSignal = function(original, rxPower, txPower) {
  if (!original) original = {};

  if (
    rxPower === null || rxPower === undefined || isNaN(rxPower) ||
    txPower === null || txPower === undefined || isNaN(txPower)
  ) {
    return original;
  }

  try {
    let now = Math.floor(Date.now() / 1000);
    let dbms = JSON.parse(JSON.stringify(original));
    if (Object.keys(dbms).length >= 100) {
      let keysNum = Object
        .keys(dbms)
        .map((keyNum) => {
          const parsedKeyNum = parseInt(keyNum);
          if (isNaN(parsedKeyNum)) {
            debug('parsedKeyNum is NaN!!!');
          }
          return parsedKeyNum;
        });
      let smallest = Math.min(...keysNum);
      delete dbms[smallest];
    }

    // Only append the values if are numbers
    dbms[now] = [rxPower, txPower];

    return dbms;
  } catch (e) {
    debug(`appendPonSignal Exception: ${e}`);
    return original;
  }
};

/**
 * @exports controllers/handlers/acs/measure
 */
module.exports = acsMeasuresHandler;
