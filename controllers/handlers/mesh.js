const DeviceModel = require('../../models/device');
const DeviceVersion = require('../../models/device_version');
const messaging = require('../messaging');
const mqtt = require('../../mqtts');
const crypt = require('crypto');
const deviceHandlers = require('./devices');
const DevicesAPI = require('../external-genieacs/devices-api');

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
          slaveDevice.save();

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
          deviceHandlers.timeoutUpdateAck(targetMac, 'update');
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

meshHandlers.buildTR069Changes = function(device, targetMode, wifiRadioState,
  meshChannel, meshChannel5GHz, populateSSIDObjects) {
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
      changes.mesh2.ssid = device.mesh_id;
      changes.mesh2.password = device.mesh_key;
      changes.mesh2.channel = meshChannel;
      changes.mesh2.mode = device.wifi_mode;
      changes.mesh2.advertise = false;
      changes.mesh2.encryption = 'AESEncryption';
      changes.mesh2.beacon_type = beaconType;
      changes.mesh2.auto = false;
      changes.mesh2.enable = true;
      changes.mesh5.enable = false;

      // When enabling Wi-Fi set beacon type
      changes.wifi2.enable = wifiRadioState;
      changes.wifi2.beacon_type = beaconType;
      // Fix channel to avoid channel jumps
      changes.wifi2.channel = meshChannel;
      break;
    case 3:
      changes.mesh5.ssid = device.mesh_id;
      changes.mesh5.password = device.mesh_key;
      changes.mesh5.channel = meshChannel5GHz;
      changes.mesh5.mode = device.wifi_mode_5ghz;
      changes.mesh5.advertise = false;
      changes.mesh5.encryption = 'AESEncryption';
      changes.mesh5.beacon_type = beaconType;
      changes.mesh5.auto = false;
      changes.mesh5.enable = true;
      changes.mesh2.enable = false;

      // When enabling Wi-Fi set beacon type
      changes.wifi5.enable = wifiRadioState;
      changes.wifi5.beacon_type = beaconType;
      // For best performance and avoiding DFS issues
      // all APs must work on a single 5GHz non-DFS channel
      changes.wifi5.channel = meshChannel5GHz;
      break;
    case 4:
      changes.mesh2.ssid = device.mesh_id;
      changes.mesh2.password = device.mesh_key;
      changes.mesh2.channel = meshChannel;
      changes.mesh2.mode = device.wifi_mode;
      changes.mesh2.enable = true;
      changes.mesh2.advertise = false;
      changes.mesh2.encryption = 'AESEncryption';
      changes.mesh2.beacon_type = beaconType;
      changes.mesh2.auto = false;
      changes.mesh5.ssid = device.mesh_id;
      changes.mesh5.password = device.mesh_key;
      changes.mesh5.channel = meshChannel5GHz;
      changes.mesh5.mode = device.wifi_mode_5ghz;
      changes.mesh5.advertise = false;
      changes.mesh5.encryption = 'AESEncryption';
      changes.mesh5.beacon_type = beaconType;
      changes.mesh5.auto = false;
      changes.mesh5.enable = true;

      // When enabling Wi-Fi set beacon type
      changes.wifi5.enable = wifiRadioState;
      changes.wifi5.beacon_type = beaconType;
      changes.wifi2.enable = wifiRadioState;
      changes.wifi2.beacon_type = beaconType;
      // For best performance and avoiding DFS issues
      // all APs must work on a single 5GHz non-DFS channel
      changes.wifi5.channel = meshChannel5GHz;
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

meshHandlers.beginMeshUpdate = async function(res, masterDevice) {
  // Remaining devices are needed to differentiate between the first
  // time a device is updated the other times, as well as to rule out
  // which devices mustn't update in the future.
  masterDevice.mesh_update_remaining = [
    masterDevice._id, ...masterDevice.mesh_slaves,
  ];
  // update number of devices remaining to send onlinedevs info
  masterDevice.mesh_onlinedevs_remaining = masterDevice.mesh_slaves.length + 1;
  masterDevice.do_update_status = 20; // waiting for topology
  await masterDevice.save();
  masterDevice.mesh_update_remaining.forEach((mac)=>{
    mqtt.anlixMessageRouterOnlineLanDevs(mac.toUpperCase());
  });
  deviceHandlers.timeoutUpdateAck(masterDevice._id, 'onlinedevs');
  res.status(200).json({'success': true});
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

// meshHandlers.getNextToUpdateRec = function(meshSons, newMac, devicesToUpdate) {
//   let nextDevice;
//   if (meshSons[newMac] && meshSons[newMac].length) {
//     for (let i=0; i<meshSons[newMac].length; i++) {
//       const auxDevice = meshHandlers.getNextToUpdateRec(
//         meshSons, meshSons[newMac][i], devicesToUpdate);
//       // Only choose a device that hasn't been updated yet
//       if (devicesToUpdate.includes(auxDevice)) {
//         nextDevice = auxDevice;
//         break;
//       } else {
//         continue;
//       }
//     }
//     // If all devices below newMac have already updated then newMac is next
//     if (!nextDevice) {
//       nextDevice = newMac;
//     }
//   } else {
//     // If device doesn't have sons then we return it as next to update
//     nextDevice = newMac;
//   }
//   return nextDevice;
// };

// // Used for mesh v1 update
// const getPossibleMeshTopology = function(meshRouters, masterMac, slaves) {
//   const numAnnouncedDevices = meshRouters[masterMac].length;
//   if (numAnnouncedDevices < slaves.length) {
//     // If master doesn't see all the slaves immediately return.
//     // Update won't be allowed.
//     return;
//   }
//   // If below this threshold do not add edge to topology
//   const signalThreshold = -65;
//   for (let i=0; i<numAnnouncedDevices; i++) {
//     const meshRouter = meshRouters[masterMac][i];
//     if (meshRouter.signal < signalThreshold) {
//       // If master doesn't see all the slaves immediately return.
//       // Update won't be allowed.
//       return;
//     }
//   }
//   // this will be used for controlling update order
//   // hash map where father is the key and value is list of sons
//   return {masterMac: slaves};
// };

// // Used for mesh v2 update
// const getExactMeshTopology = async function(meshFathers, masterMac) {
//   // this will be used for controlling update order
//   let meshSons = {};
//   let errorOccurred = false;
//   const macs = Object.keys(meshFathers);
//   for (let i = 0; i < macs.length; i++) {
//     if (errorOccurred) return;
//     const macKey = macs[i];
//     // We only analyse edges from the perspective of the slaves
//     if (macKey === masterMac) return;
//     const fatherMac = meshFathers[macKey].toUpperCase();
//     // hash map where father is the key and value is list of sons
//     if (!meshSons[fatherMac]) {
//       meshSons[fatherMac] = [macKey];
//     } else {
//       meshSons[fatherMac].push(macKey);
//     }
//   }
//   if (errorOccurred) return;
//   return meshSons;
// };

// /*
//   The topology we get uses bssids instead of mac addresses and flashman does
//   not have access to the bssids of devices in mesh v1, therefore, only mesh
//   networks that have a star topology, in mesh v1, are allowed to upgrade.
//   Devices in mesh v2 announce their mesh father. This allows the exact topology
//   to be discovered. We use that topology to choose the next device to upgrade.
// */
// meshHandlers.getMeshTopology = async function(
//   meshRouters, meshFathers, master,
// ) {
//   let hasFullTopologyInfo = true;
//   for (let i = 0; i < Object.keys(meshRouters).length; i++) {
//     const mac = Object.keys(meshRouters)[i].toUpperCase();
//     if (mac === master._id) continue;
//     if (!meshFathers[mac]) {
//       // all slaves in mesh v2 should have mesh father info
//       hasFullTopologyInfo = false;
//       break;
//     }
//   }
//   let meshTopology;
//   if (hasFullTopologyInfo) {
//     // Devices in mesh v2
//     meshTopology = await getExactMeshTopology(meshFathers, master._id);
//   } else {
//     // Devices in mesh v1
//     meshTopology = getPossibleMeshTopology(
//       meshRouters, master._id, master.mesh_slaves,
//     );
//     if (!meshTopology) {
//       // incompatible topology
//       master.do_update_status = 7;
//       console.log(`UPDATE: Mesh network of primary device ${master._id} `+
//       'doesn\'t have star topology');
//       // deviceHandlers.syncUpdateScheduler(master._id);
//       await master.save();
//     }
//   }
//   return meshTopology;
// };

// checks if master in mesh v1 is compatible with being master in mesh v2
// and if all slaves in mesh v1 are compatible with being slaves in mesh v2
meshHandlers.allowMeshV1ToV2 = async function(device) {
  try {
    const permissions = DeviceVersion.findByVersion(
      device.version, device.wifi_is_5ghz_capable, device.model,
    );
    if (!permissions.grantMeshV2PrimaryModeUpgrade) {
      // primary device in mesh v1 must have support to be primary in mesh v2
      return false;
    }
    for (let i = 0; i < device.mesh_slaves.length; i++) {
      const matchedSlave = await DeviceModel.findById(
        device.mesh_slaves[i], 'version is5ghzCapable model',
      ).lean();
      if (!matchedSlave) {
        return false;
      }
      const slavePermissions = DeviceVersion.findByVersion(
        matchedSlave.version,
        matchedSlave.wifi_is_5ghz_capable,
        matchedSlave.model,
      );
      if (!slavePermissions.grantMeshV2SecondaryModeUpgrade) {
        // secondary device in mesh v1 must have support
        // to be secondary in mesh v2
        return false;
      }
    }
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

meshHandlers.allowMeshUpgrade = async function(device, nextVersion) {
  if (device.mesh_master) {
    // Only master devices must call this function
    return false;
  }
  if (device.mesh_slaves && device.mesh_slaves.length) {
    // find out what kind of upgrade this is
    const typeUpgrade = DeviceVersion.mapFirmwareUpgradeMesh(
      device.version, nextVersion,
    );
    if (typeUpgrade.current && typeUpgrade.upgrade) {
      if (typeUpgrade.current === 2 && typeUpgrade.upgrade === 1) {
        // no mesh v2 -> v1 downgrade if in active mesh network
        return false;
      } else if (typeUpgrade.current === 1 && typeUpgrade.upgrade === 2) {
        // mesh v1 -> v2
        return await meshHandlers.allowMeshV1ToV2(device);
      } else {
        // allow mesh v1 -> v1 or mesh v2 -> v2
        return true;
      }
    } else {
      // allow development version
      return true;
    }
  } else {
    // Only restrictions are in active mesh networks
    return true;
  }
};

module.exports = meshHandlers;
