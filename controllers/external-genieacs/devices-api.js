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
  };
};

const getModelFields = function(oui, model) {
  let success = false;
  let message = 'Unknown error';
  let fields = {};
  switch (oui) {
    case '0C8063':
      switch (model) {
        case 'IGD':
          success = true;
          message = '';
          fields = getDefaultFields();
          break;
        default:
          message = 'Unknown Model';
      }
      break;
    default:
      message = 'Unknown OUI';
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
