const DeviceModel = require('../../models/device');
const DeviceVersion = require('../../models/device_version');
const messaging = require('../messaging');
const mqtt = require('../../mqtts');
const crypt = require('crypto');
const deviceHandlers = require('./devices');
const DevicesAPI = require('../external-genieacs/devices-api');
const acsDeviceInfo = require('../acs_device_info.js');

let meshHandlers = {};

meshHandlers.genMeshID = function() {
  return crypt.randomBytes(10).toString('base64')
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
};

meshHandlers.genMeshKey = function() {
  return crypt.randomBytes(20).toString('base64')
              .replace(/\//g, '!').replace(/\=/g, '');
};

meshHandlers.syncSlaveWifi = function(master, slave) {
  slave.mesh_mode = master.mesh_mode;
  slave.mesh_id = master.mesh_id;
  slave.mesh_key = master.mesh_key;
  slave.wifi_ssid = master.wifi_ssid;
  slave.wifi_password = master.wifi_password;
  slave.wifi_band = master.wifi_band;
  slave.wifi_mode = master.wifi_mode;
  slave.wifi_state = master.wifi_state;
  slave.wifi_hidden = master.wifi_hidden;
  slave.isSsidPrefixEnabled = master.isSsidPrefixEnabled;
  if (master.mesh_mode !== 1) { // For cable mode see Custom Config
    slave.wifi_channel = master.wifi_channel;
  }
  if (slave.wifi_is_5ghz_capable) {
    slave.wifi_ssid_5ghz = master.wifi_ssid_5ghz;
    slave.wifi_password_5ghz = master.wifi_password_5ghz;
    slave.wifi_band_5ghz = master.wifi_band_5ghz;
    slave.wifi_mode_5ghz = master.wifi_mode_5ghz;
    slave.wifi_state_5ghz = master.wifi_state_5ghz;
    slave.wifi_hidden_5ghz = master.wifi_hidden_5ghz;
    if (master.mesh_mode !== 1) { // For cable mode see Custom Config
      slave.wifi_channel_5ghz = master.wifi_channel_5ghz;
    }
  }
};

meshHandlers.syncSlaveCustomConfig = function(slave, config) {
  if (('kind' in config) && (config.kind !== '') &&
      ('data' in config) && (config.data !== '')
  ) {
    slave.external_reference.kind = config.kind;
    slave.external_reference.data = config.data;
  }
  if (('channel' in config) && (config.channel !== '') &&
      ('channel5ghz' in config) && (config.channel5ghz !== '') &&
      (slave.mesh_mode === 1) // Cable only
  ) {
    slave.wifi_channel = config.channel;
    slave.wifi_channel_5ghz = config.channel5ghz;
  }
  if (('power' in config) && (config.power !== '') &&
      ('power5ghz' in config) && (config.power5ghz !== '')) {
    slave.wifi_power = config.power;
    slave.wifi_power_5ghz = config.power5ghz;
  }
};

meshHandlers.syncSlaves = function(master, slaveCustomConfig=null) {
  for (let i = 0; i < master.mesh_slaves.length; i++) {
    let slaveMac = master.mesh_slaves[i];
    DeviceModel.findById(slaveMac, function(err, slaveDevice) {
      if (err) {
        console.log('Attempt to modify mesh slave '+ slaveMac +' from master ' +
          master._id + ' failed: cant get slave device.');
      } else if (!slaveDevice) {
        console.log('Attempt to modify mesh slave '+ slaveMac +' from master ' +
          master._id + ' failed: cant get slave device.');
      } else {
        meshHandlers.syncSlaveWifi(master, slaveDevice);

        if (slaveCustomConfig && slaveCustomConfig[i]) {
          meshHandlers.syncSlaveCustomConfig(slaveDevice, slaveCustomConfig[i]);
        }
        slaveDevice.save();

        // Push updates to the Slave
        mqtt.anlixMessageRouterUpdate(slaveMac);
      }
    });
  }
};

meshHandlers.enhanceSearchResult = async function(result) {
  // Add mesh siblings/master if they are not in the results
  // Convert result array to object with mac keys for O(1) search
  let addedMacs = {};
  result.forEach((r)=> {
    addedMacs[r._id]=true;
  });
  let extraResults = [];
  for (let i = 0; i < result.length; i++) {
    try {
      let device = result[i];
      let masterMac = device.mesh_master;
      if (masterMac != '' && !addedMacs[masterMac]) {
        // Slave is in results, but master isnt - add master and other slaves
        addedMacs[masterMac] = true;
        let masterReg = await DeviceModel.findById(masterMac).lean();
        if (masterReg) {
          extraResults.push(masterReg);
          device = masterReg; // Update device for next step, to add slaves
        }
      }
      if (device.mesh_slaves && device.mesh_slaves.length > 0) {
        // Master is in results, make sure all slaves are as well
        for (let s = 0; s < device.mesh_slaves.length; s++) {
          let slaveMac = device.mesh_slaves[s];
          if (!addedMacs[slaveMac]) {
            addedMacs[slaveMac] = true;
            let slaveReg = await DeviceModel.findById(slaveMac).lean();
            if (slaveReg) {
              extraResults.push(slaveReg);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
  return extraResults;
};

meshHandlers.propagateUpdate = async function(targetMac, release) {
  DeviceModel.findById(targetMac, function(err, device) {
    if (err) {
      console.log('Attempt to access mesh slave '+ targetMac +
                  ' failed: database error.');
    } else if (!device) {
      console.log('Attempt to access mesh slave '+ targetMac +
                  ' failed: device not found.');
    } else {
      device.do_update = true;
      device.do_update_status = 0; // waiting
      device.release = release;
      messaging.sendUpdateMessage(device);
      device.save(function(err) {
        if (!err) {
          mqtt.anlixMessageRouterUpdate(targetMac);
          // Start ack timeout
          deviceHandlers.timeoutUpdateAck(targetMac);
        }
      });
    }
  });
};

meshHandlers.updateMaster = async function(slaveMac, masterMac, release) {
  DeviceModel.findById(masterMac, function(err, masterDevice) {
    if (err) {
      console.log('Attempt to access mesh master '+ masterMac +
                  ' failed: database error.');
    } else if (!masterDevice) {
      console.log('Attempt to access mesh master '+ masterMac +
                  ' failed: device not found.');
    } else {
      masterDevice.do_update_mesh_remaining -= 1;
      masterDevice.save();
      // Propagate update to next slave
      let index = masterDevice.mesh_slaves.findIndex((s)=>s===slaveMac) + 1;
      if (index > 0 && index < masterDevice.mesh_slaves.length) {
        meshHandlers.propagateUpdate(masterDevice.mesh_slaves[index], release);
      }
    }
  });
};

meshHandlers.syncUpdate = function(device, setQuery, release) {
  // Only change information if device has slaves or a master
  if ((!device.mesh_slaves || device.mesh_slaves.length === 0) &&
      !device.mesh_master) {
    return;
  }
  // If this is a master device, decrement remaining counter and propagate
  // update to first slave in the list
  if (device.mesh_slaves && device.mesh_slaves.length > 0) {
    let current = device.do_update_mesh_remaining;
    device.do_update_mesh_remaining = current - 1; // Used in device response
    setQuery.do_update_mesh_remaining = current - 1;
    meshHandlers.propagateUpdate(device.mesh_slaves[0], release);
  }
  // If this is a slave device, we simply update master information
  if (device.mesh_master) {
    meshHandlers.updateMaster(device._id, device.mesh_master, release);
  }
};

meshHandlers.syncUpdateCancel = function(masterDevice, status=1) {
  if (!masterDevice.mesh_slaves || masterDevice.mesh_slaves.length === 0) {
    // Abort if not a mesh master - why would this be called?
    return;
  }
  masterDevice.mesh_slaves.forEach((slaveMac)=>{
    DeviceModel.findById(slaveMac, function(err, slaveDevice) {
      if (err) {
        console.log('Attempt to access mesh slave '+ slaveMac +
                    ' failed: database error.');
      } else if (!slaveDevice) {
        console.log('Attempt to access mesh slave '+ slaveMac +
                    ' failed: device not found.');
      } else {
        slaveDevice.do_update = false;
        slaveDevice.do_update_status = status;
        slaveDevice.save();
      }
    });
  });
};

const buildMeshChanges = function(device, meshChannel, beaconType, is5GHz) {
  let changes = {};
  changes.ssid = device.mesh_id;
  changes.password = device.mesh_key;
  changes.channel = meshChannel;
  changes.mode = (is5GHz) ? device.wifi_mode_5ghz : device.wifi_mode;
  changes.advertise = false;
  changes.encryption = 'AESEncryption';
  changes.beacon_type = beaconType;
  changes.auto = false;
  changes.enable = true;
  return changes;
};

const buildTR069Changes = function(
  device,
  targetMode,
  wifiRadioState,
  meshChannel,
  meshChannel5,
  populateSSIDObjects,
) {
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  const beaconType = DevicesAPI.getBeaconTypeByModel(model);
  let changes = {mesh2: {}, mesh5: {}, wifi2: {}, wifi5: {}};
  switch (targetMode) {
    case 0:
    case 1:
      changes.mesh2.enable = false;
      changes.mesh5.enable = false;
      break;
    case 2:
      changes.mesh2 = buildMeshChanges(device, meshChannel, beaconType, false);
      changes.mesh5.enable = false;

      // When enabling Wi-Fi set beacon type
      changes.wifi2.enable = wifiRadioState;
      changes.wifi2.beacon_type = beaconType;
      // Fix channel to avoid channel jumps
      changes.wifi2.channel = meshChannel;
      break;
    case 3:
      changes.mesh5 = buildMeshChanges(device, meshChannel5, beaconType, true);
      changes.mesh2.enable = false;

      // When enabling Wi-Fi set beacon type
      changes.wifi5.enable = wifiRadioState;
      changes.wifi5.beacon_type = beaconType;
      // For best performance and avoiding DFS issues
      // all APs must work on a single 5GHz non-DFS channel
      changes.wifi5.channel = meshChannel5;
      break;
    case 4:
      changes.mesh2 = buildMeshChanges(device, meshChannel, beaconType, false);
      changes.mesh5 = buildMeshChanges(device, meshChannel5, beaconType, true);

      // When enabling Wi-Fi set beacon type
      changes.wifi5.enable = wifiRadioState;
      changes.wifi5.beacon_type = beaconType;
      changes.wifi2.enable = wifiRadioState;
      changes.wifi2.beacon_type = beaconType;
      // For best performance and avoiding DFS issues
      // all APs must work on a single 5GHz non-DFS channel
      changes.wifi5.channel = meshChannel5;
      // Fix channel to avoid channel jumps
      changes.wifi2.channel = meshChannel;
      break;
    default:
  }
  // New VAP object has been created, we must change the following fields
  if (populateSSIDObjects) {
    changes.mesh2.rates = '1,2,5.5,6,11,12,18,24,36,48,54';
    changes.mesh2.radio_info = 'InternetGatewayDevice.LANDevice.1.WiFi.Radio.1';
    changes.mesh5.rates = '36,40,44,48,52,56,60,64,100,104,'+
    '108,112,116,120,124,128';
    changes.mesh5.radio_info = 'InternetGatewayDevice.LANDevice.1.WiFi.Radio.2';
  }
  return changes;
};

// this function should be called before calling setMeshMode
meshHandlers.validateMeshMode = async function(
  device, targetMode, abortOnError = true,
) {
  let errors = [];
  if (isNaN(targetMode) || targetMode < 0 || targetMode > 4) {
    errors.push('Modo mesh inválido');
    if (abortOnError) {
      return {success: false, msg: errors.slice(-1)[0], errors: errors};
    }
  }
  if (targetMode === 0 && device.mesh_slaves.length > 0) {
    errors.push('Não é possível desabilitar o mesh com secundários associados');
    if (abortOnError) {
      return {success: false, msg: errors.slice(-1)[0], errors: errors};
    }
  }

  const isEnablingWifiMesh = (
    (targetMode !== device.meshMode) &&
    (
      (targetMode === 4) || // Enabling at least one Wi-Fi
      (targetMode === 2 && device.mesh_mode !== 4) || // Enabling 2.4GHz Wi-Fi
      (targetMode === 3 && device.mesh_mode !== 4) // Enagling 5GHz Wi-Fi
    )
  );

  if (device.use_tr069) {
    let isDevOn = false;
    // tr069 time thresholds for device status.
    let tr069Times = await deviceHandlers.buildTr069Thresholds();
    if (device.last_contact >= tr069Times.recovery) {
      isDevOn = true;
    }
    // If CPE is tr-069 it must be online when enabling wifi mesh mode
    if (!isDevOn && isEnablingWifiMesh) {
      errors.push('CPE TR-069 não está online');
      if (abortOnError) {
        return {success: false, msg: errors.slice(-1)[0], errors: errors};
      }
    }
  }

  const permissions = DeviceVersion.findByVersion(
    device.version,
    device.wifi_is_5ghz_capable,
    device.model,
  );
  const isMeshV1Compatible = permissions.grantMeshMode;
  const isMeshV2Compatible = permissions.grantMeshV2PrimaryMode;

  if (!isMeshV1Compatible && !isMeshV2Compatible && targetMode > 0) {
    errors.push('CPE não é compatível com o mesh');
    if (abortOnError) {
      return {success: false, msg: errors.slice(-1)[0], errors: errors};
    }
  }

  const isWifi5GHzCompatible = permissions.grantWifi5ghz;
  if (!isWifi5GHzCompatible && targetMode > 2) {
    errors.push('CPE não é compatível com o mesh 5GHz');
    if (abortOnError) {
      return {success: false, msg: errors.slice(-1)[0], errors: errors};
    }
  }
  return {
    success: errors.length === 0, msg: 'Ver campo "errors"', errors: errors,
  };
};

// Should be called after validating mesh configuration
meshHandlers.configTR069VirtualAP = async function(device, targetMode) {
  const wifiRadioState = 1;
  const meshChannel = 7;
  const meshChannel5GHz = 40; // Value has better results on some routers

  const hasMeshVAPObject = DeviceVersion.findByVersion(
    device.version,
    device.wifi_is_5ghz_capable,
    device.model,
  ).grantMeshVAPObject;
  /*
    If device doesn't have SSID Object by default, then
    we need to check if it has been created already.
    If it hasn't, we will create both the 2.4 and 5GHz mesh AP objects
    IMPORTANT: even if target mode is 1 (cable) we must create these
    objects because, in that case, we disable the virtual APs. If the
    objects don't exist yet this will cause an error!
  */
  let createOk = {populate: false};
  if (!hasMeshVAPObject && targetMode > 0) {
    createOk = await acsDeviceInfo.createVirtualAPObjects(device.acs_id);
    if (!createOk.success) {
      return {success: false, msg: createOk.msg};
    }
  }
  // Set the mesh parameters on the TR-069 fields
  let changes = buildTR069Changes(
    device,
    targetMode,
    wifiRadioState,
    meshChannel,
    meshChannel5GHz,
    createOk.populate,
  );
  const updated = await acsDeviceInfo.updateInfo(device, changes, true);
  if (!updated) {
    return {success: false, msg: 'Erro ao enviar parâmetros mesh para a CPE'};
  }
  return {success: true};
};

// Should be called after updating TR-069 CPE through ACS
meshHandlers.ensureBssidCollected = async function(device, targetMode) {
  /*
    Some devices have an invalid BSSID until the AP is enabled
    If the device doesn't have the bssid yet we have to fetch it
  */
  if (
    // If we dont have 2.4GHz bssid and mesh mode requires 2.4GHz network
    (!device.bssid_mesh2 && (targetMode === 2 || targetMode === 4)) ||
    // If we dont have 5GHz bssid and mesh mode requires 5GHz network
    (!device.bssid_mesh5 && (targetMode === 3 || targetMode === 4))
  ) {
    // It might take some time for some CPEs to enable their Wi-Fi interface
    // after the command is sent. Since the BSSID is only available after the
    // interface is up, we need to wait here to ensure we get a valid read
    await new Promise((r)=>setTimeout(r, 4000));
    const bssidsObj = await acsDeviceInfo.getMeshBSSIDFromGenie(
      device.acs_id, targetMode,
    );
    if (!bssidsObj.success) {
      return bssidsObj;
    }
    if (targetMode === 2 || targetMode === 4) {
      device.bssid_mesh2 = bssidsObj.bssid_mesh2;
    }
    if (targetMode === 3 || targetMode === 4) {
      device.bssid_mesh5 = bssidsObj.bssid_mesh5;
    }
  }
  return {success: true};
};

// Final step in mesh configuration pipeline
meshHandlers.setMeshMode = function(device, targetMode) {
  const wifiRadioState = 1;
  const meshChannel = 7;
  const meshChannel5GHz = 40; // Value has better results on some routers

  // Assure radios are enabled and correct channels are set
  if (targetMode === 2 || targetMode === 4) {
    device.wifi_channel = meshChannel;
    device.wifi_state = wifiRadioState;
  }
  if (targetMode === 3 || targetMode === 4) {
    // For best performance and avoiding DFS issues
    // all APs must work on a single 5GHz non-DFS channel
    device.wifi_channel_5ghz = meshChannel5GHz;
    device.wifi_state_5ghz = wifiRadioState;
  }
  device.mesh_mode = targetMode;
};

/*
  This returns the lists of BSSID of devices
  in the mesh network
*/
meshHandlers.generateBSSIDLists = async function(device) {
  let emptyBssidObj = {mesh2: [], mesh5: []};
  if (!device.mesh_master && !device.mesh_slaves) {
    // not in a mesh network
    return emptyBssidObj;
  }
  let matchedMaster;
  if (!device.mesh_master) {
    matchedMaster = device;
  } else {
    let masterMacAddr = device.mesh_master.toUpperCase();
    matchedMaster = await DeviceModel.findById(masterMacAddr,
    'mesh_master mesh_slaves mesh_mode bssid_mesh2 bssid_mesh5')
    .catch((err) => {
      console.log('DB access error');
      return emptyBssidObj;
    });
    if (!matchedMaster) {
      return emptyBssidObj;
    }
  }
  if (matchedMaster.mesh_mode === 0) {
    return emptyBssidObj;
  }
  if (matchedMaster.mesh_master) {
    return emptyBssidObj;
  }
  let bssids2 = [];
  let bssids5 = [];
  /*
    if device is slave then we push master bssids
    if not, we don't push anything
  */
  if (device.mesh_master) {
    bssids2.push(matchedMaster.bssid_mesh2);
    bssids5.push(matchedMaster.bssid_mesh5);
  }
  for (let i=0; i<matchedMaster.mesh_slaves.length; i++) {
    const slaveMac = matchedMaster.mesh_slaves[i].toUpperCase();
    // We don't want to add it's own mesh BSSIDs
    if (slaveMac === device._id.toUpperCase()) {
      continue;
    }
    let matchedSlave = await DeviceModel.findById(
    slaveMac, 'bssid_mesh2 bssid_mesh5')
    .catch((err) => {
      console.log('DB access error');
      return emptyBssidObj;
    });
    if (matchedSlave) {
      bssids2.push(matchedSlave.bssid_mesh2);
      bssids5.push(matchedSlave.bssid_mesh5);
    }
  }
  return {
    mesh2: bssids2,
    mesh5: bssids5,
  };
};

module.exports = meshHandlers;
