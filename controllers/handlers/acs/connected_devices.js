const DeviceModel = require('../../../models/device');
const DevicesAPI = require('../../external-genieacs/devices-api');
const TasksAPI = require('../../external-genieacs/tasks-api');
const utilHandlers = require('../util.js');
const sio = require('../../../sio');
const debug = require('debug')('ACS_CONNECTED_DEVICES');

let acsConnDevicesHandler = {};

const saveDeviceData = async function(mac, landevices) {
  if (!mac || !landevices) return;
  let device = await DeviceModel.findById(mac.toUpperCase());
  if (!device) return;
  landevices.forEach((lanDev)=>{
    let lanMac = lanDev.mac.toUpperCase();
    let registered = device.lan_devices.find((d)=>d.mac===lanMac);
    if (registered) {
      registered.dhcp_name = lanDev.name;
      registered.ip = lanDev.ip;
      registered.conn_type = (lanDev.wifi) ? 1 : 0;
      if (lanDev.rate) registered.conn_speed = lanDev.rate;
      if (lanDev.wifi_freq) registered.wifi_freq = lanDev.wifi_freq;
      if (lanDev.rssi) registered.wifi_signal = lanDev.rssi;
      if (lanDev.snr) registered.wifi_snr = lanDev.snr;
      if (lanDev.wifi_mode) registered.wifi_mode = lanDev.wifi_mode;
      registered.last_seen = Date.now();
    } else {
      device.lan_devices.push({
        mac: lanMac,
        dhcp_name: lanDev.name,
        ip: lanDev.ip,
        conn_type: (lanDev.wifi) ? 1 : 0,
        conn_speed: (lanDev.rate) ? lanDev.rate : undefined,
        wifi_signal: (lanDev.rssi) ? lanDev.rssi : undefined,
        wifi_freq: (lanDev.wifi_freq) ? lanDev.wifi_freq : undefined,
        wifi_snr: (lanDev.snr) ? lanDev.snr : undefined,
        wifi_mode: (lanDev.wifi_mode) ? lanDev.wifi_mode : undefined,
        last_seen: Date.now(),
        first_seen: Date.now(),
      });
    }
  });
  device.last_devices_refresh = Date.now();
  await device.save().catch((err) => {
    console.log('Error saving tr-069 device data ' + mac + ': ' + err);
  });
};

acsConnDevicesHandler.fetchDevicesFromGenie = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    return;
  }
  if (!device || !device.use_tr069) {
    return;
  }
  let mac = device._id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let hostsField = fields.devices.hosts;
  let assocField = fields.devices.associated;
  assocField = assocField.split('.*')[0];
  let query = {_id: acsID};
  let projection = hostsField + ',' + assocField;
  if (fields.devices.associated_5) {
    let assoc5Field = fields.devices.associated_5;
    assoc5Field = assoc5Field.split('.*')[0];
    projection += projection + ',' + assoc5Field;
  }

  let genieData = await TasksAPI
    .getFromCollection('devices', query, projection).catch((err) => {
      console.log(`ERROR IN fetchDevicesFromGenie TaskAPI: ${err}`);
      return undefined;
    });

  let success = false;
  let hostKeys = [];
  let data = {};
  if (genieData) {
    data = genieData[0];

    success = true;
    let hostCountField = hostsField+'.HostNumberOfEntries._value';
    // Make sure we have a host count and associated devices fields
    if (utilHandlers.checkForNestedKey(data, hostCountField) &&
        utilHandlers.checkForNestedKey(data, assocField)) {
      utilHandlers.getFromNestedKey(data, hostCountField);
      // Host indexes might not respect order because of expired leases, so
      // we just use whatever keys show up
      let hostBaseField = fields.devices.hosts_template;
      let hostKeysRaw = utilHandlers.getFromNestedKey(data, hostBaseField);
      if (hostKeysRaw) {
        hostKeys = Object.keys(hostKeysRaw);
      }
      // Filter out meta fields from genieacs
      hostKeys = hostKeys.filter((k)=>k[0] && k[0]!=='_');
    } else {
      success = false;
    }
  }

  if (success) {
    let ifaces = cpe.getAssociatedInterfaces(fields);
    let iface2 = ifaces.iface2;
    let iface5 = ifaces.iface5;
    let devices = [];
    hostKeys.forEach((i)=>{
      let device = {};
      // Collect device mac
      let macKey = fields.devices.host_mac.replace('*', i);
      device.mac = utilHandlers.getFromNestedKey(data, macKey+'._value');
      if (typeof device.mac === 'string') {
        device.mac = device.mac.toUpperCase().replace(/-/g, ':');
      } else {
        // MAC is a mandatory string
        return;
      }
      // Collect device hostname
      let nameKey = fields.devices.host_name.replace('*', i);
      device.name = utilHandlers.getFromNestedKey(data, nameKey+'._value');
      if (typeof device.name !== 'string' || device.name === '') {
        // Needs a default name, use mac
        device.name = device.mac;
      }
      // Collect device ip
      let ipKey = fields.devices.host_ip.replace('*', i);
      device.ip = utilHandlers.getFromNestedKey(data, ipKey+'._value');
      if (typeof device.ip !== 'string') {
        // IP is mandatory
        return;
      }
      // Collect layer 2 interface
      let ifaceKey = fields.devices.host_layer2.replace('*', i);
      let l2iface = utilHandlers.getFromNestedKey(data, ifaceKey+'._value');
      let status = cpe.isDeviceConnectedViaWifi(l2iface, iface2, iface5);
      if (status.includes('wifi')) {
        device.wifi = true;
        if (status === 'wifi2') {
          device.wifi_freq = 2.4;
        } else if (status === 'wifi5') {
          device.wifi_freq = 5;
        }
      }
      // Collect connection speed from devices connected by cable
      if (!device.wifi && cpe.modelPermissions().features.cableRxRate) {
        // Collect connection speed, if available
        let rateKey = fields.devices.host_cable_rate.replace('*', i);
        rateKey += '._value';
        if (utilHandlers.checkForNestedKey(data, rateKey)) {
          let rate = utilHandlers.getFromNestedKey(data, rateKey);
          device.rate = cpe.convertCableRate(rate);
        }
      }
      // Collect host active if field can be trusted. If the field is
      // reliable, we break the flow to those devices that are inactive, and
      // store the rest as active. If the field is not reliable, we have to
      // check if it has the tree of connected devices. If so, we store that
      // device as non-active and revisit this information later. If not, we
      //  store that device as active to preserve legacy behavior
      let hostActiveKey = fields.devices.host_active.replace('*', i);
      hostActiveKey += '._value';
      if (
        cpe.modelPermissions().lan.LANDeviceCanTrustActive &&
        utilHandlers.checkForNestedKey(data, hostActiveKey)
      ) {
        let hostActive = utilHandlers.getFromNestedKey(
          data, hostActiveKey,
        );
        if (typeof hostActive === 'string') {
          let trueValues = ['true', '1'];
          hostActive = (trueValues.includes(hostActive.toLowerCase()));
        }
        if (!hostActive) {
          return;
        }
        device.wifiActive = true;
      } else {
        device.wifiActive =
          !cpe.modelPermissions().lan.LANDeviceHasAssocTree;
      }
      // Push basic device information
      devices.push(device);
    });

    if (cpe.modelPermissions().lan.LANDeviceHasAssocTree) {
      // Change iface identifiers to use only numerical identifier
      iface2 = iface2.split('.');
      iface5 = iface5.split('.');
      iface2 = iface2[iface2.length-1];
      iface5 = iface5[iface5.length-1];
      // Filter wlan interfaces
      let interfaces = Object.keys(utilHandlers.getFromNestedKey(
        data, assocField,
      ));
      interfaces = interfaces.filter((i)=>i[0]!='_');
      if (fields.devices.associated_5) {
        let splitField = fields.devices.associated_5.split('.');
        interfaces.push(splitField[splitField.length - 2]);
      }
      for (let iface of interfaces) {
        // Get active indexes, filter metadata fields
        assocField =
          cpe.assocFieldWildcardReplacer(fields.devices.associated, iface);
        let ifaceFreq;
        if (iface == iface2) {
          ifaceFreq = 2.4;
        } else if (iface == iface5) {
          ifaceFreq = 5;
        }
        if (
          !utilHandlers.checkForNestedKey(data, assocField) && ifaceFreq
        ) {
          // Device missing associated fields for this interface
          // Mark devices for this interface as active, missing data
          devices.forEach((d)=>{
            if (d.wifi && d.wifi_freq === ifaceFreq) d.wifiActive = true;
          });
        }
        let assocIndexes = utilHandlers.getFromNestedKey(data, assocField);
        if (assocIndexes) {
          assocIndexes = Object.keys(assocIndexes);
        } else {
          assocIndexes = [];
        }
        assocIndexes = assocIndexes.filter((i)=>i[0]!='_');
        for (let index of assocIndexes) {
          // Collect associated mac
          let macKey = cpe.assocDevicesWildcardReplacer(
            fields.devices.assoc_mac, iface, index);
          let macVal = utilHandlers.getFromNestedKey(
            data, macKey+'._value',
          );
          if (typeof macVal === 'string') {
            macVal = macVal.toUpperCase();
          } else {
            // MAC is mandatory
            continue;
          }
          let device = devices.find((d)=>d.mac.toUpperCase()===macVal);
          if (!device) continue;
          // If the execution flow reaches this point, it means that the
          // host stored in the Associated Devices tree exists in the host
          // list for that device, which means the connection for that host
          // is active
          device.wifiActive = true;
          device.wifi = true;
          device.wifi_freq = ifaceFreq;
          // Collect rssi, if available
          if (fields.devices.host_rssi) {
            let rssiKey = cpe.assocDevicesWildcardReplacer(
              fields.devices.host_rssi, iface, index);
            let rssiValue = utilHandlers.getFromNestedKey(
              data, rssiKey+'._value',
            );
            device.rssi = cpe.convertRssiValue(rssiValue);
          }
          // Collect explicit snr, if available - fallback on rssi value
          if (cpe.modelPermissions().lan.LANDeviceHasSNR) {
            let snrKey = cpe.assocDevicesWildcardReplacer(
              fields.devices.host_snr, iface, index);
            device.snr = utilHandlers.getFromNestedKey(
              data, snrKey+'._value',
            );
          } else if (fields.devices.host_rssi && device.rssi) {
            device.snr = parseInt(device.rssi)+95;
            if (isNaN(parseInt(device.rssi))) {
              debug(`device.rssi is NaN beware!!!`);
            }
          }
          // Collect mode, if available
          if (fields.devices.host_mode) {
            let modeKey = fields.devices.host_mode;
            modeKey = modeKey.replace('*', iface).replace('*', index);
            let modeVal = utilHandlers.getFromNestedKey(
              data, modeKey+'._value',
            );
            if (modeVal.includes('ac')) {
              device.wifi_mode = 'AC';
            } else if (modeVal.includes('n')) {
              device.wifi_mode = 'N';
            } else if (modeVal.includes('g')) {
              device.wifi_mode = 'G';
            }
            // Skip this device when following flag is enabled and mode
            // value is empty
            if (cpe.modelPermissions().lan.LANDeviceSkipIfNoWifiMode &&
                modeVal == '') {
              device.wifiActive = false;
            }
          }
          // Collect connection speed, if available
          if (fields.devices.host_rate) {
            let rateKey = cpe.assocDevicesWildcardReplacer(
              fields.devices.host_rate, iface, index);
            device.rate = utilHandlers.getFromNestedKey(
              data, rateKey+'._value',
            );
            device.rate = cpe.convertWifiRate(device.rate);
          }
          if (device.mac == device.name &&
            fields.devices.alt_host_name) {
            let nameKey = fields.devices.alt_host_name;
            nameKey = nameKey.replace('*', iface).replace('*', index);
            device.name = utilHandlers.getFromNestedKey(
              data, nameKey+'._value',
            );
          }
        }
      }
    }
    // Filter devices by active, always including wired connections
    devices = devices.filter((d) => !d.wifi || d.wifiActive);
    await saveDeviceData(mac, devices).catch(debug);
  }
  sio.anlixSendOnlineDevNotifications(mac, null);
};

module.exports = acsConnDevicesHandler;
