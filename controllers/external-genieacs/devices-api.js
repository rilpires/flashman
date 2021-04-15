/*
The scripts in this directory are loaded by genieacs along with the provision
script. Configure genieacs' cwmp server parameter EXT_DIR to the following:
"path/to/flashman/controllers/external-genieacs"
*/

// ***** WARNING!!! *****
// DO NOT CHANGE THIS VARIABLE WITHOUT ALSO CHANGING THE COMMAND THAT ALTERS IT
// IN CONTROLLERS/UPDATE_FLASHMAN.JS! THIS LINE IS ALTERED AUTOMATICALLY WHEN
// FLASHMAN IS RESTARTED FOR ANY REASON
const INSTANCES_COUNT = 1;
const API_URL = 'http://localhost:$PORT/acs/';

const request = require('request');

const getFieldType = function(masterKey, key) {
  switch (masterKey+'-'+key) {
    case 'wifi2-channel':
    case 'wifi5-channel':
      return 'xsd:unsignedInt';
    case 'wifi2-enable':
    case 'wifi5-enable':
      return 'xsd:boolean';
    default:
      return 'xsd:string';
  }
};

const convertSubnetIntToMask = function(mask) {
  if (mask === 24) {
    return '255.255.255.0';
  } else if (mask === 25) {
    return '255.255.255.128';
  } else if (mask === 26) {
    return '255.255.255.192';
  }
  return '';
};

const convertWifiMode = function(mode, oui, model) {
  let ouiModelStr = model;
  switch (mode) {
    case '11g':
      if (ouiModelStr === 'IGD') return 'g';
      else if (ouiModelStr === 'F670L') return 'b,g';
      else if (ouiModelStr === 'HG8245Q2') return '11bg';
      else if (ouiModelStr === 'G-140W-C') return 'b,g';
      else if (ouiModelStr === 'GONUAC001') return 'bg';
      else return '11bg';
    case '11n':
      if (ouiModelStr === 'IGD') return 'n';
      else if (ouiModelStr === 'HG8245Q2') return '11bgn';
      else if (ouiModelStr === 'F670L') return 'b,g,n';
      else if (ouiModelStr === 'G-140W-C') return 'b,g,n';
      else if (ouiModelStr === 'GONUAC001') return 'bgn';
      else return '11bgn';
    case '11na':
      if (ouiModelStr === 'IGD') return 'n';
      else if (ouiModelStr === 'HG8245Q2') return '11na';
      else if (ouiModelStr === 'F670L') return 'a,n';
      else if (ouiModelStr === 'G-140W-C') return 'a,n';
      else if (ouiModelStr === 'GONUAC001') return 'an';
      else return '11na';
    case '11ac':
      if (ouiModelStr === 'IGD') return 'ac';
      else if (ouiModelStr === 'HG8245Q2') return '11ac';
      else if (ouiModelStr === 'F670L') return 'a,n,ac';
      else if (ouiModelStr === 'G-140W-C') return 'a,n,ac';
      else if (ouiModelStr === 'GONUAC001') return 'anac';
      else return '11ac';
    default:
      return '';
  }
};

const convertWifiBand = function(band) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20MHz';
    case 'HT40':
    case 'VHT40':
      return '40MHz';
    case 'VHT80':
      return '80MHz';
    default:
      return '';
  }
};

const convertField = function(masterKey, key, oui, model, value) {
  let result = {value: null, type: getFieldType(masterKey, key)};
  switch (masterKey+'-'+key) {
    case 'lan-subnet_mask':
      result.value = convertSubnetIntToMask(value); // convert to ip subnet
      break;
    case 'wifi2-enable':
    case 'wifi5-enable':
      result.value = (value > 0) ? true : false; // convert to boolean
      break;
    case 'wifi2-channel':
    case 'wifi5-channel':
      result.value = parseInt(value); // convert to integer
      break;
    case 'wifi2-mode':
    case 'wifi5-mode':
      result.value = convertWifiMode(value, oui, model); // convert to TR-069
      break;
    case 'wifi2-band':
    case 'wifi5-band':
      result.value = convertWifiBand(value); // convert to TR-069 format
      break;
    default:
      result.value = value; // no transformation necessary
  }
  return result;
};

const getDefaultFields = function() {
  return {
    common: {
      mac: 'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.MACAddress',
      model: 'InternetGatewayDevice.DeviceInfo.ModelName',
      version: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
      ip: 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
    },
    wan: {
      pppoe_user: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Username',
      pppoe_pass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Password',
      rate: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.MaxBitRate',
      duplex: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.DuplexMode',
      wan_ip: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.1.ExternalIPAddress',
      wan_ip_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.ExternalIPAddress',
      uptime: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.1.Uptime',
      uptime_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Uptime',
      recv_bytes: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.Stats.BytesReceived',
      sent_bytes: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.Stats.BytesSent',
      pon_status: 'InternetGatewayDevice.WANDevice.1.WANGponInterfaceConfig.Status',
      pon_rxpower: 'InternetGatewayDevice.WANDevice.1.WANGponInterfaceConfig.RXPower',
      pon_txpower: 'InternetGatewayDevice.WANDevice.1.WANGponInterfaceConfig.TXPower'
    },
    lan: {
      router_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPInterface.1.IPInterfaceIPAddress',
      subnet_mask: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPInterface.1.IPInterfaceSubnetMask',
      lease_min_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MinAddress',
      lease_max_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MaxAddress',
    },
    wifi2: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
    },
    wifi5: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable',
    },
    log: 'InternetGatewayDevice.DeviceInfo.DeviceLog',
    devices: {
      hosts: 'InternetGatewayDevice.LANDevice.1.Hosts',
      hosts_template: 'InternetGatewayDevice.LANDevice.1.Hosts.Host',
      host_mac: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress',
      host_name: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName',
      host_ip: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress',
      host_layer2: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.Layer2Interface',
      associated: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice',
      assoc_total: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.TotalAssociations',
      assoc_mac: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceMACAddress',
    },
  };
};

const getHuaweiFields = function() {
  let fields = getDefaultFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Stats.EthernetBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Stats.EthernetBytesSent';
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/2/g, '5');
  fields.wifi5.password = fields.wifi5.password.replace(/2/g, '5');
  fields.wifi5.channel = fields.wifi5.channel.replace(/2/g, '5');
  fields.wifi5.auto = fields.wifi5.auto.replace(/2/g, '5');
  fields.wifi5.mode = fields.wifi5.mode.replace(/2/g, '5');
  fields.wifi5.enable = fields.wifi5.enable.replace(/2/g, '5');
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_SNR';
  return fields;
};

const getZTEFields = function() {
  let fields = getDefaultFields();
  fields.wan.recv_bytes = fields.wan.recv_bytes.replace(/WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig');
  fields.wan.sent_bytes = fields.wan.sent_bytes.replace(/WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig');
  fields.wan.pon_status = fields.wan.pon_status.replace(/WANGponInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig');
  fields.wan.pon_rxpower = fields.wan.pon_status.replace(/WANGponInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig');
  fields.wan.pon_txpower = fields.wan.pon_status.replace(/WANGponInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig');
  fields.wan.pon_bytes_received = 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.Stats.BytesReceived';
  fields.wan.pon_bytes_sent = 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.Stats.BytesSent';
  fields.wan.pon_bytes_drop_packets = 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.Stats.DropPackets';
  fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/2/g, '5');
  fields.wifi5.password = fields.wifi5.password.replace(/2/g, '5');
  fields.wifi5.channel = fields.wifi5.channel.replace(/2/g, '5');
  fields.wifi5.auto = fields.wifi5.auto.replace(/2/g, '5');
  fields.wifi5.mode = fields.wifi5.mode.replace(/2/g, '5');
  fields.wifi5.enable = fields.wifi5.enable.replace(/2/g, '5');
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_SNR';
  return fields;
};

const getNokiaFields = function() {
  let fields = getDefaultFields();
  fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/2/g, '5');
  fields.wifi5.password = fields.wifi5.password.replace(/2/g, '5');
  fields.wifi5.channel = fields.wifi5.channel.replace(/2/g, '5');
  fields.wifi5.auto = fields.wifi5.auto.replace(/2/g, '5');
  fields.wifi5.mode = fields.wifi5.mode.replace(/2/g, '5');
  fields.wifi5.enable = fields.wifi5.enable.replace(/2/g, '5');
  return fields;
};

const getStavixFields = function() {
  let fields = getDefaultFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_status = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.Status';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower';
  fields.wan.pon_bytes_received = 'InternetGatewayDevice.WANDevice.1.X_RTK_GponInterfaceConfig.BytesReceived';
  fields.wan.pon_bytes_sent = 'InternetGatewayDevice.WANDevice.1.X_RTK_GponInterfaceConfig.BytesSent';
  fields.wan.pon_bytes_drop_packets = 'InternetGatewayDevice.WANDevice.1.X_RTK_GponInterfaceConfig.DropPackets';
  fields.wifi2.ssid = fields.wifi5.ssid.replace(/2/g, '6');
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/2/g, '1');
  fields.wifi2.password = fields.wifi5.password.replace(/2/g, '6');
  fields.wifi5.password = fields.wifi5.password.replace(/2/g, '1');
  fields.wifi2.channel = fields.wifi5.channel.replace(/2/g, '6');
  fields.wifi5.channel = fields.wifi5.channel.replace(/2/g, '1');
  fields.wifi2.auto = fields.wifi5.auto.replace(/2/g, '6');
  fields.wifi5.auto = fields.wifi5.auto.replace(/2/g, '1');
  fields.wifi2.mode = fields.wifi5.mode.replace(/2/g, '6');
  fields.wifi5.mode = fields.wifi5.mode.replace(/2/g, '1');
  fields.wifi2.enable = fields.wifi5.enable.replace(/2/g, '6');
  fields.wifi5.enable = fields.wifi5.enable.replace(/2/g, '1');
  return fields;
};

const getModelFields = function(oui, model) {
  let success = true;
  let message = 'Unknown error';
  let fields = {};
  switch (model) {
    case 'HG8245Q2': // Huawei HG8245Q2
      message = '';
      fields = getHuaweiFields();
      break;
    case 'F670L': // ZTE F670L
      message = '';
      fields = getZTEFields();
      break;
    case 'G-140W-C': // Nokia G-140W-C
    case 'G%2D140W%2DC': // URI encoded
      message = '';
      fields = getNokiaFields();
      break;
    case 'GONUAC001': // Greatek Stavix G421R
      message = '';
      fields = getStavixFields();
      break;
    case 'HG6245D': // Fiberhome AN5506-04-CG
      message = '';
      fields = getDefaultFields();
      break;
    case 'IGD': // TP-Link Archer C5
      message = '';
      fields = getDefaultFields();
      break;
    default:
      success = false;
      message = 'Unknown Model';
      fields = getDefaultFields();
  }
  return {
    success: success,
    message: message,
    fields: fields,
  };
};

const getDeviceFields = function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.oui || !params.model) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  return callback(null, getModelFields(params.oui, params.model));
};

const syncDeviceData = function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.data || !params.acs_id) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  let url = API_URL;
  let numInstances = INSTANCES_COUNT;
  if (numInstances > 1) {
    // More than 1 instance - share load between instances 1 and N-1
    // We ignore instance 0 for the same reason we ignore it for router syn
    // Instance 0 will be at port 8000, instance i will be at 8000+i
    let target = Math.floor(Math.random()*(numInstances-1)) + 8001;
    url = url.replace('$PORT', target.toString());
  } else {
    // Only 1 instance - force on instance 0
    url = url.replace('$PORT', '8000');
  }
  request({
    url: url + 'device/syn',
    method: 'POST',
    json: params,
  },
  function(error, response, body) {
    if (error) {
      return callback(null, {
        success: false,
        message: 'Error contacting Flashman',
      });
    }
    if (response.statusCode === 200) {
      if (body.success) {
        return callback(null, {success: true});
      } else if (body.message) {
        return callback(null, {
          success: false,
          message: body.message,
        });
      } else {
        return callback(null, {
          success: false,
          message: (body.message) ? body.message : 'Error in Flashman process',
        });
      }
    } else {
      return callback(null, {
        success: false,
        message: (body.message) ? body.message : 'Error in Flashman request',
      });
    }
  });
};

exports.convertField = convertField;
exports.getModelFields = getModelFields;
exports.getDeviceFields = getDeviceFields;
exports.syncDeviceData = syncDeviceData;
