
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const request = require('request-promise-native');
const NodeRSA = require('node-rsa');
const Config = require('../../models/config');
const App = require('../../app');

let keyHandlers = {};

keyHandlers.generateAuthKeyPair = async(function() {
  let keyRSA = new NodeRSA({b: 2048});
  let keyPub = keyRSA.exportKey('pkcs8-public-pem');
  let keyPriv = keyRSA.exportKey('pkcs8-pem');

  let config = await(Config.findOne({is_default: true}));
  if (!config) {
    return false;
  }
  config.auth_pubkey = keyPub;
  config.auth_privkey = keyPriv;
  await(config.save());

  return true;
});

keyHandlers.sendPublicKey = function(url) {
  // Avoid using async/await inside Promise
  return new Promise((resolve, reject) => {
    Config.findOne({is_default: true}, (err, matchedConfig) => {
      if (!matchedConfig || matchedConfig.auth_pubkey === '') {
        return reject();
      }

      request({
        url: url,
        method: 'PUT',
        json: {
          secret: App.locals.secret,
          pubkey: matchedConfig.auth_pubkey,
        },
      }).then((resp) => {
        return resolve();
      }, (err) => {
        return reject();
      });
    });
  });
};

keyHandlers.encryptMsg = async(function(b64Message) {
  let config = await(Config.findOne({is_default: true}));
  if (!config || config.auth_privkey === '') {
    return false;
  }
  let privKey = new NodeRSA();
  privKey.importKey(config.auth_privkey);
  const encryptedMsg = privKey.encrypt(b64Message, 'base64');

  return encryptedMsg;
});

module.exports = keyHandlers;
