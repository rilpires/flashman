const Config = require('../models/config');
const request = require('request-promise-native');

let messagingController = {};

const randomBackoff = function(factor, offset) {
  let interval = Math.random() * 1000; // scale to seconds
  interval *= factor; // scale to factor
  interval += (offset * 1000); // offset in seconds
  return Math.floor(interval);
};

const getMessagingConfig = async function() {
  let config = await Config.findOne({is_default: true},
                                    {messaging_configs: true}).lean();
  if (!config || !config.messaging_configs.functions_fqdn ||
      !config.messaging_configs.secret_token) {
    return null;
  }
  return config;
};

const getTokensFromDevice = function(device) {
  // Filter devices that have a FCM uid registered
  if (!device.lan_devices) return;
  return device.lan_devices.filter((d)=>d.fcm_uid).map((d)=>d.fcm_uid);
};

const sendMessage = async function(device, funcName, strName, data, retry=0) {
  let config = await getMessagingConfig();
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
    },
  }).then( (resp) => {
    console.log('Sent ' + strName + ' message to device ID ' + device._id);
  }, async (err) => {
    // Check for quota exceeded
    if (err.statusCode === 429 && retry <= 3) {
      // Retry with exponential backoff
      let interval = randomBackoff(retry+1, (retry*2)+1);
      await new Promise((resolve)=>setTimeout(resolve, interval));
      return sendMessage(device, funcName, strName, data, retry+1);
    }
    console.log('Error sending ' + strName + ' message');
  });
};

messagingController.sendUpdateMessage = function(device) {
  sendMessage(device, 'sendUpdateMsg', 'update', null);
};

messagingController.sendUpdateErrorMessage = function(device) {
  sendMessage(device, 'sendUpdateErrorMsg', 'update error', null);
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
