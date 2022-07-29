const DeviceModel = require('../../../models/device');
const DevicesAPI = require('../../external-genieacs/devices-api');
const utilHandlers = require('../util.js');
const sio = require('../../../sio');
const http = require('http');
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
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async () => {
      if (data.length > 0) {
        try {
          data = JSON.parse(data)[0];
        } catch (err) {
          debug(err);
          data = '';
        }
      }
      let success = true;
      let hostKeys = [];
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
      if (success) {
        let iface2 = fields.wifi2.ssid.replace('.SSID', '');
        let iface5 = fields.wifi5.ssid.replace('.SSID', '');
        let devices = [];
        hostKeys.forEach((i)=>{
          console.log(i);
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
          // If the host active field can be trusted, push the device's basic
          // information. Otherwise, always push basic device information
          if (cpe.modelPermissions().lan.canTrustActive) {
            let activeKey = fields.devices.host_active.replace('*', i);
            let hostActive = utilHandlers.getFromNestedKey(
              data, activeKey+'._value',
            );
            if (hostActive) {
              devices.push(device);
            }
          } else {
            devices.push(device);
          }
        });

        if (fields.devices.host_rssi || fields.devices.host_snr) {
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
            assocField = fields.devices.associated.replace(
              /WLANConfiguration\.[0-9*]+\./g,
              'WLANConfiguration.' + iface + '.',
            );
            let assocIndexes = utilHandlers.getFromNestedKey(
              data, assocField,
            );
            if (assocIndexes) {
              assocIndexes = Object.keys(assocIndexes);
            } else {
              assocIndexes = [];
            }
            assocIndexes = assocIndexes.filter((i)=>i[0]!='_');
            for (let index of assocIndexes) {
              // Collect associated mac
              let macKey = fields.devices.assoc_mac;
              macKey = macKey.replace('*', iface).replace('*', index);
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
              // Mark device as a wifi device
              device.wifi = true;
              if (iface == iface2) {
                device.wifi_freq = 2.4;
              } else if (iface == iface5) {
                device.wifi_freq = 5;
              }
              // Collect rssi, if available
              if (fields.devices.host_rssi) {
                let rssiKey = fields.devices.host_rssi;
                rssiKey = rssiKey.replace('*', iface).replace('*', index);
                let rssiValue = utilHandlers.getFromNestedKey(
                  data, rssiKey+'._value',
                );
                device.rssi = cpe.convertRssiValue(rssiValue);
              }
              // Collect explicit snr, if available - fallback on rssi value
              if (cpe.modelPermissions().lan.listLANDevicesSNR) {
                let snrKey = fields.devices.host_snr;
                snrKey = snrKey.replace('*', iface).replace('*', index);
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
                // Skip this device when following flag is enable
                if (cpe.modelPermissions().lan.skipIfNoWifiMode) {
                  // Skip this device if mode value is empty
                  if (modeVal == '') {
                    const devIdx = devices.indexOf(device);
                    devices.splice(devIdx, 1);
                    continue;
                  }
                }
              }
              // Collect connection speed, if available
              if (fields.devices.host_rate) {
                let rateKey = fields.devices.host_rate;
                rateKey = rateKey.replace('*', iface).replace('*', index);
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
        await saveDeviceData(mac, devices).catch(debug);
      }
      sio.anlixSendOnlineDevNotifications(mac, null);
    });
  });
  req.end();
};

module.exports = acsConnDevicesHandler;
