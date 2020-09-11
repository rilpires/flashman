/*
The scripts in this directory are loaded by genieacs along with the provision
script. Configure genieacs' cwmp server parameter EXT_DIR to the following:
"path/to/flashman/controllers/external-genieacs"
*/

const API_URL = 'http://localhost:8000/acs/';
const request = require('request');

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
      pppoe_user: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      pppoe_pass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
      rate: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.MaxBitRate',
      duplex: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.DuplexMode',
      wan_ip: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
      wan_ip_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
      uptime: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Uptime',
      uptime_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Uptime',
      recv_bytes: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.Stats.BytesReceived',
      sent_bytes: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.Stats.BytesSent',
    },
    lan: {
      router_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPInterface.1.IPInterfaceIPAddress',
      subnet_mask: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPInterface.1.IPInterfaceSubnetMask',
    },
    wifi2: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
    },
    wifi5: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable',
    },
    log: 'InternetGatewayDevice.DeviceInfo.DeviceLog',
    devices: {
      hosts: 'InternetGatewayDevice.LANDevice.1.Hosts',
      host_mac: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress',
      host_name: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName',
      host_ip: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress',
      wlan_count: 'InternetGatewayDevice.LANDevice.1.LANWLANConfigurationNumberOfEntries',
      assoc_count: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.TotalAssociations',
      associated: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice',
      assoc_mac: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceMACAddress',
    },
  };
};

const getHuaweiFields = function() {
  let fields = getDefaultFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Stats.EthernetBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Stats.EthernetBytesSent';
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/2/g, '5');
  fields.wifi5.password = fields.wifi5.password.replace(/2/g, '5');
  fields.wifi5.channel = fields.wifi5.channel.replace(/2/g, '5');
  fields.wifi5.mode = fields.wifi5.mode.replace(/2/g, '5');
  fields.wifi5.enable = fields.wifi5.enable.replace(/2/g, '5');
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_SNR';
  return fields;
};

const getModelFields = function(oui, model) {
  let success = true;
  let message = 'Unknown error';
  let fields = {};
  switch (oui+'-'+model) {
    case '00259E-HG8245Q2': // Huawei HG8245Q2
      message = '';
      fields = getHuaweiFields();
      break;
    case 'E01954-F670L': // ZTE F670L
      message = '';
      fields = getDefaultFields();
      break;
    case '000AC2-HG6245D': // Fiberhome AN5506-04-CG
      message = '';
      fields = getDefaultFields();
      break;
    case '0C8063-IGD': // TP-Link Archer C5
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
  request({
    url: API_URL + 'device/syn',
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

exports.getModelFields = getModelFields;
exports.getDeviceFields = getDeviceFields;
exports.syncDeviceData = syncDeviceData;
