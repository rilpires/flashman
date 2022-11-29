/* global __line */
const DeviceModel = require('../../models/device');
const DeviceVersion = require('../../models/device_version');
const FirmwareModel = require('../../models/firmware');
const messaging = require('../messaging');
const mqtt = require('../../mqtts');
const crypt = require('crypto');
const deviceHandlers = require('./devices');
const DevicesAPI = require('../external-genieacs/devices-api');
const util = require('./util');
const t = require('../language').i18next.t;

let meshHandlers = {};

meshHandlers.genMeshID = function() {
  return crypt.randomBytes(10).toString('base64')
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

meshHandlers.genMeshKey = function() {
  return crypt.randomBytes(20).toString('base64')
              .replace(/\//g, '!').replace(/=/g, '');
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
  // Only change channels that are sent - covers cases where slaves are not
  // dual band. Changing the channel is only available for cable mesh
  if (slave.mesh_mode === 1) {
    if ('channel' in config && config.channel !== '') {
      slave.wifi_channel = config.channel;
    }
    if ('channel5ghz' in config && config.channel5ghz !== '') {
      slave.wifi_channel_5ghz = config.channel5ghz;
    }
  }
  // Only change power settings that are sent - covers cases where slaves are
  // not dual band. This can be freely adjusted for all mesh modes
  if ('power' in config && config.power !== '') {
    slave.wifi_power = config.power;
  }
  if ('power5ghz' in config && config.power5ghz !== '') {
    slave.wifi_power_5ghz = config.power5ghz;
  }
};

meshHandlers.syncSlaves = function(master, slaveCustomConfig=null) {
  if (master.mesh_slaves && master.mesh_slaves.length) {
    for (let i = 0; i < master.mesh_slaves.length; i++) {
      let slaveMac = master.mesh_slaves[i];
      DeviceModel.findById(slaveMac, function(err, slaveDevice) {
        if (err || !slaveDevice) {
          console.log(`Attempt to modify mesh slave ${slaveMac} from master `+
            `${master._id} failed: can't get slave device.`);
        } else {
          meshHandlers.syncSlaveWifi(master, slaveDevice);

          if (slaveCustomConfig && slaveCustomConfig[i]) {
            meshHandlers.syncSlaveCustomConfig(
              slaveDevice, slaveCustomConfig[i],
            );
          }
          slaveDevice.save().catch((err) => {
            console.log('Error saving on wi-fi slave sync: ' + err);
          });

          // Push updates to the Slave
          mqtt.anlixMessageRouterUpdate(slaveMac);
        }
      });
    }
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

meshHandlers.syncUpdateCancel = async function(masterDevice, status=1) {
  if (!masterDevice.mesh_slaves || masterDevice.mesh_slaves.length === 0) {
    // Abort if not a mesh master - why would this be called?
    return;
  }
  masterDevice.do_update = false;
  masterDevice.do_update_status = status;
  masterDevice.mesh_next_to_update = '';
  masterDevice.mesh_update_remaining = [];
  await masterDevice.save().catch((err) => {
    console.log('Error saving master device on mesh update: ' + err);
  });
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
        slaveDevice.save().catch((err) => {
          console.log('Error saving slave sync update cancel: ' + err);
        });
      }
    });
  });
};

meshHandlers.buildMeshChanges = function(
  device, meshChannel, beaconType, is5GHz) {
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

meshHandlers.buildTR069Changes = function(
  device,
  targetMode,
  wifiRadioState,
  meshChannel,
  meshChannel5,
  populateSSIDObjects,
) {
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  const beaconType = cpe.getBeaconType();
  let changes = {mesh2: {}, mesh5: {}, wifi2: {}, wifi5: {}};
  switch (targetMode) {
    case 0:
    case 1:
      changes.mesh2.enable = false;
      changes.mesh5.enable = false;
      // Set the parameters below to improve hand-off with custom Anlix firmware
      if (cpe.modelPermissions().mesh.setEncryptionForCable) {
        changes.wifi2.beacon_type = beaconType;
        changes.wifi5.beacon_type = beaconType;
        const wpaMode = cpe.getWPAEncryptionMode();
        const ieeeMode = cpe.getIeeeEncryptionMode();
        if (wpaMode != '') {
          changes.wifi2.encryption = wpaMode;
          changes.wifi5.encryption = wpaMode;
        }
        if (ieeeMode != '') {
          changes.wifi2.encryptionIeee = ieeeMode;
          changes.wifi5.encryptionIeee = ieeeMode;
        }
      }
      break;
    case 2:
      changes.mesh2 =
        meshHandlers.buildMeshChanges(device, meshChannel, beaconType, false);
      changes.mesh5.enable = false;

      // When enabling Wi-Fi set beacon type
      changes.wifi2.enable = wifiRadioState;
      changes.wifi2.beacon_type = beaconType;
      // Fix channel to avoid channel jumps
      changes.wifi2.channel = meshChannel;
      break;
    case 3:
      changes.mesh5 =
        meshHandlers.buildMeshChanges(device, meshChannel5, beaconType, true);
      changes.mesh2.enable = false;

      // When enabling Wi-Fi set beacon type
      changes.wifi5.enable = wifiRadioState;
      changes.wifi5.beacon_type = beaconType;
      // For best performance and avoiding DFS issues
      // all APs must work on a single 5GHz non-DFS channel
      changes.wifi5.channel = meshChannel5;
      break;
    case 4:
      changes.mesh2 =
        meshHandlers.buildMeshChanges(device, meshChannel, beaconType, false);
      changes.mesh5 =
        meshHandlers.buildMeshChanges(device, meshChannel5, beaconType, true);

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
    errors.push(t('meshModeInvalid', {errorline: __line}));
    if (abortOnError) {
      return {success: false, msg: errors.slice(-1)[0], errors: errors};
    }
  }
  if (targetMode === 0 && device.mesh_slaves.length > 0) {
    errors.push(t('cantDisableMeshWithSecondaries', {errorline: __line}));
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
    let isDevOn = (device.cpe_status.status == 1);
    // If CPE is tr-069 it must be online when enabling wifi mesh mode
    if (!isDevOn && isEnablingWifiMesh) {
      errors.push(t('cpeTr069NotOnline', {errorline: __line}));
      if (abortOnError) {
        return {success: false, msg: errors.slice(-1)[0], errors: errors};
      }
    }
  }

  const permissions = DeviceVersion.devicePermissions(device);
  const isMeshV1Compatible = permissions.grantMeshMode;
  const isMeshV2Compatible = permissions.grantMeshV2PrimaryModeCable ||
    permissions.grantMeshV2PrimaryModeWifi;

  if (!isMeshV1Compatible && !isMeshV2Compatible && targetMode > 0) {
    errors.push(t('cpeNotCompatibleWithMesh', {errorline: __line}));
    if (abortOnError) {
      return {success: false, msg: errors.slice(-1)[0], errors: errors};
    }
  }

  const isWifi5GHzCompatible = permissions.grantWifi5ghz;
  if (!isWifi5GHzCompatible && targetMode > 2) {
    errors.push(t('cpeNotCompatibleWithMesh5ghz', {errorline: __line}));
    if (abortOnError) {
      return {success: false, msg: errors.slice(-1)[0], errors: errors};
    }
  }
  return {
    success: errors.length === 0, msg: t('seeErrorsField'), errors: errors,
  };
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

meshHandlers.beginMeshUpdate = async function(masterDevice) {
  try {
    let matchedFirmware = await FirmwareModel.findByReleaseCombinedModel(
      masterDevice.release, masterDevice.model);
    matchedFirmware = matchedFirmware[0];
    if (!matchedFirmware || !matchedFirmware.flashbox_version) {
      return {'success': false};
    }
    const typeUpgrade = DeviceVersion.mapFirmwareUpgradeMesh(
      masterDevice.version, matchedFirmware.flashbox_version,
    );
    if (!typeUpgrade.unknownVersion) {
      // Mesh v2 -> v1
      if (typeUpgrade.current === 2 && typeUpgrade.upgrade === 1) {
        return {'success': false};
      // Mesh v1 -> v2
      } else if (typeUpgrade.current === 1 && typeUpgrade.upgrade === 2) {
        // Remaining devices are needed to differentiate between the first
        // time a device is updated the other times, as well as to rule out
        // which devices must not update in the future.
        masterDevice.mesh_update_remaining = [
          masterDevice._id, ...masterDevice.mesh_slaves,
        ];
        // update number of devices remaining to send onlinedevs info
        masterDevice.mesh_onlinedevs_remaining =
          masterDevice.mesh_slaves.length + 1;
        masterDevice.do_update_status = 20; // waiting for topology
        await masterDevice.save().catch((err) => {
          console.log('Error saving master device on mesh update: ' + err);
        });
        masterDevice.mesh_update_remaining.forEach((mac)=>{
          mqtt.anlixMessageRouterOnlineLanDevs(mac.toUpperCase());
        });
        deviceHandlers.timeoutUpdateAck(masterDevice._id, 'onlinedevs');
        return {'success': true};
      // Mesh v2 -> v2 or v1 -> v1
      } else {
        let fieldsToUpdate = {
          release: masterDevice.release,
          mesh_update_remaining: [
            masterDevice._id, ...masterDevice.mesh_slaves,
          ],
        };
        meshHandlers.updateMeshDevice(masterDevice._id, fieldsToUpdate);
        return {'success': true};
      }
    } else {
      return {'success': false};
    }
  } catch (err) {
    return {'success': false};
  }
};

meshHandlers.convertBSSIDToId = async function(device, bssid) {
  try {
    let masterMac = device.mesh_master;
    const matchedMaster = await DeviceModel.findById(
      masterMac, 'bssid_mesh2 bssid_mesh5 mesh_slaves',
    ).lean();
    if (!matchedMaster) {
      return '';
    }
    if (
      matchedMaster.bssid_mesh2 === bssid ||
      matchedMaster.bssid_mesh5 === bssid
    ) {
      return masterMac;
    }
    for (let i = 0; i < matchedMaster.mesh_slaves.length; i++) {
      const slaveMac = matchedMaster.mesh_slaves[i];
      // skip current device
      if (slaveMac === device._id) continue;
      const matchedSlave = await DeviceModel.findById(
        slaveMac, 'bssid_mesh2 bssid_mesh5',
      ).lean();
      if (!matchedSlave) {
        return '';
      }
      if (
        matchedSlave.bssid_mesh2 === bssid ||
        matchedSlave.bssid_mesh5 === bssid
      ) {
        return slaveMac;
      }
    }
  } catch (err) {
    console.log(err);
    return '';
  }
};

meshHandlers.updateMeshDevice = async function(deviceMac, fieldsToUpdate) {
  let matchedDevice;
  try {
    matchedDevice = await DeviceModel.findById(deviceMac);
    if (!matchedDevice) {
      console.log('Did not find master device in database');
      return;
    }
  } catch (err) {
    console.log(err);
    return;
  }
  matchedDevice.do_update = true;
  matchedDevice.do_update_status = 0; // waiting
  for (let [fieldKey, fieldVal] of Object.entries(fieldsToUpdate)) {
    matchedDevice[fieldKey] = fieldVal;
  }
  messaging.sendUpdateMessage(matchedDevice);
  await matchedDevice.save().catch((err) => {
    console.log('Error saving mesh device to update: ' + err);
  });
  mqtt.anlixMessageRouterUpdate(deviceMac);
  // Start ack timeout
  deviceHandlers.timeoutUpdateAck(deviceMac, 'update');
};

const propagateUpdate = async function(masterDevice, macOfUpdated,
                                       release, setQuery=undefined,
) {
  // Update remaining devices to update
  const meshUpdateRemaining =
    masterDevice.mesh_update_remaining.filter((mac) => mac !== macOfUpdated);
  masterDevice.mesh_update_remaining = meshUpdateRemaining;
  // Get current mesh versions in this update
  let matchedFirmware = await FirmwareModel.findByReleaseCombinedModel(
    masterDevice.release, masterDevice.model);
  matchedFirmware = matchedFirmware[0];
  if (!matchedFirmware || !matchedFirmware.flashbox_version) {
    return;
  }
  const typeUpgrade = DeviceVersion.mapFirmwareUpgradeMesh(
    masterDevice.version, matchedFirmware.flashbox_version,
  );
  if (typeUpgrade.unknownVersion) {
    return;
  }
  const isV1ToV2 = (typeUpgrade.current === 1 &&
                    typeUpgrade.upgrade === 2);

  if (isV1ToV2) {
    if (meshUpdateRemaining.length === 0) {
      // We only need to check setQuery here because the flow where mesh master
      // calls this function always ends here
      if (setQuery) {
        setQuery.mesh_update_remaining = [];
        setQuery.mesh_next_to_update = '';
      } else {
        masterDevice.mesh_next_to_update = '';
      }
    } else if (meshUpdateRemaining.length === 1) {
      // Last always will be the master
      masterDevice.mesh_next_to_update = masterDevice._id;
      await masterDevice.save().catch((err) => {
        console.log('Error saving mesh device to update: ' + err);
      });
      let fieldsToUpdate = {release: release};
      await meshHandlers.updateMeshDevice(
        masterDevice.mesh_next_to_update, fieldsToUpdate,
      );
    } else if (meshUpdateRemaining.length === 2) {
      // If there are only two devices left to update just mark the slave
      // that hasn't updated
      const nextDeviceToUpdate = meshUpdateRemaining.find((device)=>{
        return masterDevice.mesh_slaves.includes(device);
      });
      masterDevice.mesh_next_to_update = nextDeviceToUpdate;
      await masterDevice.save().catch((err) => {
        console.log('Error saving mesh device to update: ' + err);
      });
      let fieldsToUpdate = {release: release};
      await meshHandlers.updateMeshDevice(
        masterDevice.mesh_next_to_update, fieldsToUpdate,
      );
    } else {
      // At least three devices left to update in mesh v2 network
      masterDevice.mesh_onlinedevs_remaining =
        masterDevice.mesh_slaves.length + 1;
      // waiting for topology
      masterDevice.do_update_status = 20;
      const slaves = masterDevice.mesh_slaves;
      mqtt.anlixMessageRouterOnlineLanDevs(masterDevice._id);
      slaves.forEach((slave)=>{
        mqtt.anlixMessageRouterOnlineLanDevs(slave.toUpperCase());
      });
      // Set timeout for reception of onlinedevs
      deviceHandlers.timeoutUpdateAck(masterDevice._id, 'onlinedevs');
    }
  } else {
    if (meshUpdateRemaining.length > 0) {
      // All remanining update scenarios follows update list sequentially
      masterDevice.mesh_next_to_update = meshUpdateRemaining[0];
      await masterDevice.save().catch((err) => {
        console.log('Error saving mesh device to update: ' + err);
      });
      let fieldsToUpdate = {release: release};
      await meshHandlers.updateMeshDevice(
        masterDevice.mesh_next_to_update, fieldsToUpdate,
      );
    } else {
      // Just update mesh_update_remaining
      masterDevice.mesh_next_to_update = '';
      await masterDevice.save().catch((err) => {
        console.log('Error saving mesh device to update: ' + err);
      });
    }
  }
};

meshHandlers.syncUpdate = async function(device, setQuery, release) {
  // Only change information if device has slaves or a master
  if ((!device.mesh_slaves || device.mesh_slaves.length === 0) &&
      !device.mesh_master
  ) {
    return;
  }
  if (device.mesh_master) {
    // Device is a slave
    DeviceModel.findById(device.mesh_master, async function(err, masterDevice) {
      if (err) {
        console.log('Attempt to access mesh master '+ device.mesh_master +
                    ' failed: database error.');
      } else if (!masterDevice) {
        console.log('Attempt to access mesh master '+ device.mesh_master +
                    ' failed: device not found.');
      } else {
        await propagateUpdate(masterDevice, device._id, release);
      }
    });
  } else {
    // Device is master with at lease one slave
    if (device instanceof DeviceModel) {
      await propagateUpdate(device, device._id, release, setQuery);
    } else {
      try {
        let masterDevice = await DeviceModel.findById(device._id);
        await propagateUpdate(masterDevice, masterDevice._id, release,
                              setQuery);
      } catch (err) {
        console.log('Attempt to access mesh master ' + device._id +
                    ' failed: database error.');
      }
    }
  }
};

/* ************************************************************************** */
/* ***** Exclusive functions for mesh v1 to mesh v2 upgrade procedure ******* */
/* ************************************************************************** */

const getMeshRouters = async function(device) {
  let onlyOldMeshRoutersEntries = true;
  let enrichedMeshRouters = util.deepCopyObject(device.mesh_routers)
  .filter((meshRouter) => {
    // Remove entries related to wireless connection if cabled mesh only mode
    if (device.mesh_mode === 1 && meshRouter.iface !== 1) {
      return false;
    } else {
      return true;
    }
  })
  .map((meshRouter) => {
    meshRouter.is_old = deviceHandlers.isApTooOld(meshRouter.last_seen);
    // There is at least one updated entry
    if (!meshRouter.is_old) {
      onlyOldMeshRoutersEntries = false;
    }
    return meshRouter;
  });
  // If mesh routers list is empty or old and there are routers in mesh then
  // let's check if it's possible to populate mesh routers list by cabled
  // connections
  if (onlyOldMeshRoutersEntries || (device.mesh_mode === 1)) {
    let meshEntry = {
      mac: '',
      last_seen: Date.now(),
      conn_time: 0,
      rx_bytes: 0,
      tx_bytes: 0,
      signal: 0,
      rx_bit: 0,
      tx_bit: 0,
      latency: 0,
      iface: 1,
      n_conn_dev: 0,
    };
    if (device.mesh_master) { // Slave router
      let masterId = device.mesh_master.toUpperCase();
      let matchedMaster = await DeviceModel.findById(
        masterId,
        {last_contact: true,
         _id: true,
         wan_negociated_speed: true,
        }).lean();
      // If there is recent comm assume there is a cabled connection
      if (!deviceHandlers.isApTooOld(matchedMaster.last_contact)) {
        meshEntry.mac = matchedMaster._id;
        meshEntry.rx_bit = matchedMaster.wan_negociated_speed;
        meshEntry.tx_bit = matchedMaster.wan_negociated_speed;
        enrichedMeshRouters.push(meshEntry);
      }
    } else if (device.mesh_slaves) { // Master router
      for (let slaveMac of device.mesh_slaves) {
        let slaveId = slaveMac.toUpperCase();
        let matchedSlave = await DeviceModel.findById(
          slaveId,
          {last_contact: true,
           _id: true,
           wan_negociated_speed: true,
          }).lean();
        // If there is recent comm assume there is a cabled connection
        if (!deviceHandlers.isApTooOld(matchedSlave.last_contact)) {
          meshEntry.mac = matchedSlave._id;
          meshEntry.rx_bit = matchedSlave.wan_negociated_speed;
          meshEntry.tx_bit = matchedSlave.wan_negociated_speed;
          enrichedMeshRouters.push(meshEntry);
        }
      }
    }
  }
  return enrichedMeshRouters;
};

// This will return true if we infer that 'bssid' is
// generated from a device with label address 'mac'
// (specific driver related)
const isMacCompatible = function(bssid, mac) {
  let bssidHex = parseInt(bssid.replace(/:/g, ''), 16);
  let macHex = parseInt(mac.replace(/:/g, ''), 16);
  let atherosMask = 0x00FFFFFF0000;
  let mediatekMask = 0xFDFFFFCC0000;
  let maskTest = false;
  let diffTest = false;

  if ((bssidHex & atherosMask) == (macHex & atherosMask)) {
    maskTest = true;
  }
  if ((bssidHex & mediatekMask) == (macHex & mediatekMask)) {
    maskTest = true;
  }

  let macByte0 = macHex%256;
  let bssidByte0 = bssidHex%256;
  let diff = bssidByte0 - macByte0;
  if (diff < 0) {
    diff = -diff;
  }
  diffTest = (diff <= 3 || diff >= 253);

  return maskTest && diffTest;
};

// Function does a DFS to get the next device to update
const getNextToUpdateRec = function(meshTopology, newMac, devicesToUpdate) {
  let nextDevice;
  if (meshTopology[newMac] && meshTopology[newMac].length) {
    for (let i=0; i<meshTopology[newMac].length; i++) {
      const auxDevice = getNextToUpdateRec(
        meshTopology, meshTopology[newMac][i], devicesToUpdate);
      // Only choose a device that hasn't been updated yet
      if (devicesToUpdate.includes(auxDevice)) {
        nextDevice = auxDevice;
        break;
      } else {
        continue;
      }
    }
    // If all devices below newMac have already updated then newMac is next
    if (!nextDevice) {
      nextDevice = newMac;
    }
  } else {
    // If device doesn't have sons then we return it as next to update
    nextDevice = newMac;
  }
  return nextDevice;
};

const getPossibleMeshTopology = function(
  meshRouters, masterMac, slaves, meshMode,
) {
  const numAnnouncedDevices = meshRouters[masterMac].length;
  if (numAnnouncedDevices < slaves.length) {
    // If master doesn't see all the slaves immediately return.
    // Update won't be allowed.
    return {};
  }
  // If below this threshold do not add edge to topology
  const signalThreshold = -65;
  for (let i=0; i<numAnnouncedDevices; i++) {
    const meshRouter = meshRouters[masterMac][i];
    if (meshRouter.signal < signalThreshold ||
      (meshMode > 1 && meshRouter.iface == 1)
    ) {
      // If master doesn't see all the slaves immediately return.
      // If this is a WiFi mesh (meshMode > 1) and there is at least one cabled
      // connection (iface == 1) immediately return.
      // Update won't be allowed.
      return {};
    }
  }

  // We are now creating a new field "label_mac" in each meshRouter object.
  // We are only interested in master reading slave and slave reading master
  // We hope that we only infer a single match with it's network interface
  // and it's label mac address (ID).
  let invalidMatching = false;
  meshRouters[masterMac].forEach(function(meshRouter) {
    let inferredLabelMacs = Object.keys(meshRouters).filter(function(label) {
      return isMacCompatible(label, meshRouter.mac);
    });
    if (inferredLabelMacs.length < 1) {
      console.log(
        'Couldn\'t find any label mac address for slave ' + meshRouter.mac,
      );
      invalidMatching = true;
    } else if (inferredLabelMacs.length > 1) {
      console.log(
        'Ambiguous mac address inference for ' + meshRouter.mac,
      );
      invalidMatching = true;
    } else {
      meshRouter.label_mac = inferredLabelMacs[0];
    }
  });
  slaves.forEach(function(slaveMac) {
    let matchCount = 0;
    meshRouters[slaveMac].forEach(function(meshRouter) {
      if (isMacCompatible(masterMac, meshRouter.mac)) {
        meshRouter.label_mac = masterMac;
        matchCount += 1;
      }
    });
    if ( matchCount < 1 ) {
      console.log('Slave ' + slaveMac + ' can\'t match master mac.');
      invalidMatching = true;
    } else if ( matchCount > 1) {
      console.log(
        'Slave ' + slaveMac + ' is not sure about which interface is master',
      );
      invalidMatching = true;
    }
  });
  if (invalidMatching) {
    return {};
  }

  // this will be used for controlling update order
  // hash map where father is the key and value is list of sons
  let retObj = {};
  retObj[masterMac] = slaves;

  // We are sorting the slaves by rssi
  // This comes from an heuristic to send the update commands
  // in a proper order (weaker rssi first)
  // Also, we consider only the lower signal when reading
  // from both directions
  retObj[masterMac].sort(function(mac1, mac2) {
    let masterReadingSlave1 = meshRouters[masterMac].find(
      (router)=>router.label_mac == mac1,
    ).signal;
    let masterReadingSlave2 = meshRouters[masterMac].find(
      (router)=>router.label_mac == mac2,
    ).signal;
    let slave1ReadingMaster = meshRouters[mac1].find(
      (router)=>router.label_mac == masterMac,
    ).signal;
    let slave2ReadingMaster = meshRouters[mac2].find(
      (router)=>router.label_mac == masterMac,
    ).signal;

    let rssi1 = (masterReadingSlave1 > slave1ReadingMaster) ?
      (slave1ReadingMaster) : (masterReadingSlave1);
    let rssi2 = (masterReadingSlave2 > slave2ReadingMaster) ?
      (slave2ReadingMaster) : (masterReadingSlave2);
    return rssi1 - rssi2;
  });

  return retObj;
};

/*
  The topology we get uses bssids instead of mac addresses and flashman does
  not have access to the bssids of devices in mesh v1, therefore, only mesh
  networks that have a star topology, in mesh v1, are allowed to upgrade.
*/
const getMeshTopology = async function(meshRoutersData, master) {
  let meshTopology;
  // Devices in mesh v1
  meshTopology = getPossibleMeshTopology(
    meshRoutersData, master._id, master.mesh_slaves, master.mesh_mode,
  );
  if (!meshTopology || Object.keys(meshTopology).length === 0) {
    console.log(`UPDATE: Mesh network of primary device ${master._id} `+
    'is invalid');
    deviceHandlers.syncUpdateScheduler(master._id);
  }
  return meshTopology;
};

const markNextDeviceToUpdate = async function(master) {
  let meshRoutersData = {};
  // Gathers information from primary and secondary CPEs in the network
  // meshRoutersData is an object, where the key is the device's MAC and the
  // value is a list of objects, showing info of routers in the mesh network
  let enrichedMeshRouters = await getMeshRouters(master);
  meshRoutersData[master._id] = enrichedMeshRouters;
  try {
    for (let i = 0; i < master.mesh_slaves.length; i++) {
      const slaveMac = master.mesh_slaves[i].toUpperCase();
      let matchedSlave = await DeviceModel.findById(slaveMac).lean();
      if (matchedSlave == null) {
        return {
          success: false,
          message: t('secondaryCpeNotFound', {errorline: __line}),
        };
      }
      enrichedMeshRouters = await getMeshRouters(matchedSlave);
      meshRoutersData[slaveMac] = enrichedMeshRouters;
    }
  } catch (err) {
    return {success: false, message: err};
  }
  // Converts the two structures obtained previously to get a new topology
  // structure, where the key is the device MAC and the value is a list of it's
  // mesh sons.
  const meshTopology = await getMeshTopology(
    meshRoutersData, master);
  if (!meshTopology || Object.keys(meshTopology).length === 0) {
    return {
      success: false,
      message: t('meshTopologyGetError', {errorline: __line}),
    };
  }
  const meshNextToUpdate = getNextToUpdateRec(
    meshTopology, master._id, master.mesh_update_remaining);
  master.mesh_next_to_update = meshNextToUpdate;
  await master.save().catch((err) => {
    console.log('Error saving master device on next update: ' + err);
  });
  return {success: true};
};

meshHandlers.validateMeshTopology = async function(masterMac) {
  let matchedMaster;
  try {
    matchedMaster = await DeviceModel.findById(masterMac,
      {mesh_update_remaining: true, mesh_next_to_update: true,
       do_update_status: true, _id: true, release: true, mesh_slaves: true,
       mesh_routers: true, mesh_mode: true, mesh_master: true},
    );
    if (!matchedMaster) {
      console.log('Did not find master device in database');
      return;
    }
  } catch (err) {
    console.log(err);
    return;
  }
  if (matchedMaster.mesh_update_remaining.length <= 0) {
    return;
  }
  // There is an ongoing mesh update
  // Save the next device to update to the master device
  const meshInfoStatus = await markNextDeviceToUpdate(matchedMaster);
  if (!meshInfoStatus.success) {
    // reset master update parameters
    matchedMaster.mesh_next_to_update = '';
    matchedMaster.mesh_update_remaining = [];
    // error validating topology
    matchedMaster.do_update_status = 7;
    deviceHandlers.syncUpdateScheduler(matchedMaster._id);
    await matchedMaster.save().catch((err) => {
      console.log('Error saving master device topology validation: ' + err);
    });
  } else {
    // Before beginning the update process the next release is saved to master
    let fieldsToUpdate = {release: matchedMaster.release};
    // Update next device
    meshHandlers.updateMeshDevice(matchedMaster.mesh_next_to_update,
                                  fieldsToUpdate);
  }
};

/* ************************************************************************** */
/* *** End of Exclusive functions for mesh v1 to mesh v2 upgrade procedure ** */
/* ************************************************************************** */

module.exports = meshHandlers;
