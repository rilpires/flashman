const DeviceModel = require('../models/device');
const Config = require('../models/config');

const request = require('request-promise-native');
const async = require('asyncawait/async');
const await = require('asyncawait/await');

let messagingController = {};

const getMessagingConfig = async(function() {
  let config = await(Config.findOne({is_default: true}));
  if (!config || !config.messaging_configs.functions_fqdn ||
      !config.messaging_configs.secret_token) {
    return null;
  }
  return config;
});

const getTokensFromDevice = function(device, funcName, strName, data) {
  // Filter devices that have a FCM uid registered
  return device.lan_devices.filter((d)=>d.fcm_uid).map((d)=>d.fcm_uid);
};

const sendMessage = async(function(device) {
  let config = await(getMessagingConfig());
  if (!config) {
    console.log('No valid config to send message');
    return;
  }
  let messageFqdn = config.messaging_configs.functions_fqdn;
  let messageSecret = config.messaging_configs.secret_token;
  let tokens = getTokensFromDevice(device);
  if (tokens.length === 0) {
    console.log('No FCM tokens registered to send message to');
    return;
  }
  request({
    url: 'https://' + messageFqdn + '/' + funcName,
    method: 'POST',
    json: {
      secret: messageSecret,
      token: tokens,
      data: data,
    }
  }).then((resp)=>{
    console.log('Sent ' + strName + ' message to device ID ' + device._id);
  }, (err)=>{
    console.log('Error sending ' + strName + ' message');
  });
});

messagingController.sendUpdateMessage = function(device) {
  sendMessage(device, 'sendUpdateMsg', 'update', null);
};

messagingController.sendUpdateDoneMessage = function(device) {
  sendMessage(device, 'sendUpdateOkMsg', 'update ok', null);
};

messagingController.sendUpnpMessage = function(device, mac, name) {
  let data = {
    mac: mac,
    name: name,
  };
  sendMessage(device, 'sendUpnpMessage', 'upnp', data);
};

module.exports = messagingController;
