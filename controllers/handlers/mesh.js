const DeviceModel = require('../../models/device');
const messaging = require('../messaging');
const mqtt = require('../../mqtts');
const crypt = require('crypto');
const deviceHandlers = require('./devices');

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

meshHandlers.buildTR069Changes = function(device, targetMode) {
  let changes = {mesh2: {}, mesh5: {}};
  switch (targetMode) {
    case 0:
    case 1:
      changes.mesh2.enable = false;
      changes.mesh5.enable = false;
      break;
    case 2:
      changes.mesh2.ssid = device.mesh_id;
      changes.mesh2.password = device.mesh_key;
      changes.mesh2.bssid = device.wifi_bssid;
      changes.mesh2.channel = device.wifi_channel;
      changes.mesh2.mode = device.wifi_mode;
      changes.mesh2.advertise = false;
      changes.mesh2.encryption = 'AESEncryption';
      changes.mesh2.enable = true;
      changes.mesh2.enable = true;
      changes.mesh5.enable = false;
      break;
    case 3:
      changes.mesh5.ssid = device.mesh_id;
      changes.mesh5.password = device.mesh_key;
      changes.mesh5.bssid = device.wifi_bssid_5ghz;
      changes.mesh5.channel = device.wifi_channel_5ghz;
      changes.mesh5.mode = device.wifi_mode_5ghz;
      changes.mesh5.advertise = false;
      changes.mesh5.encryption = 'AESEncryption';
      changes.mesh5.enable = true;
      changes.mesh2.enable = false;
      break;
    case 4:
      changes.mesh2.ssid = device.mesh_id;
      changes.mesh2.password = device.mesh_key;
      changes.mesh2.bssid = device.wifi_bssid;
      changes.mesh2.channel = device.wifi_channel;
      changes.mesh2.mode = device.wifi_mode;
      changes.mesh2.enable = true;
      changes.mesh2.advertise = false;
      changes.mesh2.encryption = 'AESEncryption';
      changes.mesh5.ssid = device.mesh_id;
      changes.mesh5.password = device.mesh_key;
      changes.mesh5.bssid = device.wifi_bssid_5ghz;
      changes.mesh5.channel = device.wifi_channel_5ghz;
      changes.mesh5.mode = device.wifi_mode_5ghz;
      changes.mesh5.advertise = false;
      changes.mesh5.encryption = 'AESEncryption';
      changes.mesh5.enable = true;
      break;
    default:
  }
  return changes;
};

/*
  This returns the lists of BSSID of devices
  in the mesh network
*/
meshHandlers.generateBSSIDLists = async function(device) {
  // If device is master we return empty lists
  if (!device.mesh_master) {
    return {
      mesh2: [],
      mesh5: [],
    };
  }
  const masterMacAddr = device.mesh_master.toUpperCase();
  let matchedMaster = await DeviceModel.findById(masterMacAddr,
  'mesh_master mesh_slaves mesh_mode')
  .catch((err) => {
    console.log('Erro interno');
    return;
  });
  if (!matchedMaster) {
    console.log('CPE indicado como primário não encontrado');
    return;
  }
  if (matchedMaster.mesh_mode === 0) {
    console.log('CPE indicado como primário não está em modo mesh');
    return;
  }
  if (matchedMaster.mesh_master) {
    console.log('CPE indicado como primário é secundário');
    return;
  }
  let bssids2 = [matchedMaster.devices_bssid_mesh2];
  let bssids5 = [matchedMaster.devices_bssid_mesh5];
  matchedMaster.mesh_slaves.forEach((slaveMac)=>{
    // We don't want to add it's own mesh BSSIDs
    if (slaveMac.toUpperCase() === device._id.toUpperCase()) {
      return;
    }
    DeviceModel.findById(slaveMac, 'bssid_mesh2 bssid_mesh5',
    function(err, matchedSlave) {
      if (err) {
        console.log('Attempt to access mesh slave '+ slaveMac +
                    ' failed: database error.');
      } else if (!matchedSlave) {
        console.log('Attempt to access mesh slave '+ slaveMac +
                    ' failed: devimasterDevicece not found.');
      } else {
        bssids2.push(matchedSlave.bssid_mesh2);
        bssids5.push(matchedSlave.bssid_mesh5);
      }
    });
  });
  return {
    mesh2: bssids2,
    mesh5: bssids5,
  };
};

module.exports = meshHandlers;
