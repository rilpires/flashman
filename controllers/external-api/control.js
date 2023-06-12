/* eslint-disable no-async-promise-executor */

/* global __line */

const request = require('request-promise-native');
const keyHandlers = require('../handlers/keys');
const t = require('../language').i18next.t;
const locals = require('../../locals');

let Config = require('../../models/config');

let controlApiAddr = 'http://localhost:9000/api';
if (process.env.production === 'true' || process.env.production === true) {
  controlApiAddr = 'https://controle.anlix.io/api';
}

const controlController = {};

controlController.checkPubKey = async function() {
  let newConfig = new Config({
    is_default: true,
    autoUpdate: true,
    pppoePassLength: 1,
  });

  try {
    let pubKeyUrl = controlApiAddr + '/flashman/pubkey/register';
    // Check default config
    let matchedConfig = await Config.findOne({is_default: true},
                                             {auth_privkey: true});
    // Check config existence and create one if not found
    if (!matchedConfig) {
      await newConfig.save().catch((err) => {
        console.log('Error saving first Config');
      });
      // Generate key pair
      await keyHandlers.generateAuthKeyPair();
      // Send public key to be included in firmwares
      await keyHandlers.sendPublicKey(pubKeyUrl, locals.getSecret());
    } else {
      // Check flashman key pair existence and generate it otherwise
      if (matchedConfig.auth_privkey === '') {
        await keyHandlers.generateAuthKeyPair();
        // Send public key to be included in firmwares
        await keyHandlers.sendPublicKey(pubKeyUrl, locals.getSecret());
      }
    }
  } catch (err) {
    if (err) console.error(err);
    // We only consider it as an error if it is production
    if (['true', true, 1].includes(process.env.production)) {
      throw err;
    }
  }
};

controlController.getMessageConfig = function() {
  return new Promise( async (resolve, reject) => {
    // We only consider it as an error if it is production, or else
    // all our not-production servers will not pass pre-initialization
    let onError = function(msg) {
      if (['true', true, 1].includes(process.env.production)) {
        if (msg) console.error(msg);
        return resolve();
      } else {
        console.log('Unable to getMessageConfig from control '
          + 'but proceding because !env.production');
        return resolve();
      }
    };
    let matchedConfig = null;
    try {
      matchedConfig = await Config.findOne({is_default: true},
                                          {messaging_configs: true});
      if (!matchedConfig) return resolve();
    } catch (err) {
      matchedConfig = null;
      return onError('Error obtaining message config');
    }
    request({
      url: controlApiAddr + '/message/config',
      method: 'POST',
      json: {
        secret: locals.getSecret(),
      },
    }).then(async (resp) => {
      if (resp && resp.token && resp.fqdn) {
        console.log('Obtained message config successfully!');
        matchedConfig.messaging_configs.secret_token = resp.token;
        matchedConfig.messaging_configs.functions_fqdn = resp.fqdn;
        await matchedConfig.save()
        .then(resolve)
        .catch((_) => {
          return onError('Error saving message config');
        });
      } else {
        onError('Invalid response from control about message config');
      }
    }, (err) => {
      onError('Error obtaining message config from control');
    });
  });
};

controlController.getLicenseStatus = function(deviceId) {
  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/device/list',
      method: 'POST',
      json: {
        'secret': locals.getSecret(),
        'all': false,
        'mac': deviceId,
      },
    }).then((res) => {
      if (res.success) {
        let isBlocked = (res.device.is_blocked === true ||
                         res.device.is_blocked === 'true');
        return resolve({success: true, isBlocked: isBlocked});
      } else {
        return resolve({success: false, message: res.message});
      }
    }, (err) => {
      return resolve({success: false, message: err.message});
    });
  });
};

controlController.changeLicenseStatus = function(blockStatus, devices) {
  if (!Array.isArray(devices)) {
    return {success: false,
            message: t('jsonInvalidFormat', {errorline: __line})};
  }
  const newBlockStatus = (blockStatus === true || blockStatus === 'true');
  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/device/block',
      method: 'POST',
      json: {
        'secret': locals.getSecret(),
        'block': newBlockStatus,
        'ids': devices,
      },
    }).then((res) => {
      if (res.success) {
        return resolve({success: true});
      } else {
        return resolve({success: false, message: res.message});
      }
    }, (err) => {
      return resolve({success: false, message: err.message});
    });
  });
};

controlController.authUser = function(name, password) {
  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/user',
      method: 'GET',
      auth: {
        user: name,
        pass: password,
      },
      timeout: 20000,
    }).then((res) => {
      return resolve({success: true, res: JSON.parse(res)});
    }, (err) => {
      return resolve({success: false, message:
        t('requestError', {errorline: __line})});
    });
  });
};

// Can we delete this function? not called anywhere
controlController.sendTokenControl = function(req, token) {
  return request({
    url: controlApiAddr + '/measure/token',
    method: 'POST',
    json: {
      'token': token,
    },
  }).then(
    (resp) => Promise.resolve(resp),
    (err) => Promise.reject({message: t('tokenError', {errorline: __line})}),
  );
};

controlController.isAccountBlocked = function() {
  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/user/blocked',
      method: 'POST',
      json: {
        'secret': locals.getSecret(),
      },
      timeout: 20000,
    }).then((res) => {
      if (res.success) {
        return resolve({success: true, isBlocked: res.blocked});
      } else {
        return resolve({success: false, message: res.message});
      }
    }, (err) => {
      return resolve({success: false, message:
        t('requestError', {errorline: __line})});
    });
  });
};

controlController.reportDevices = function(devicesArray) {
  let stdDevicesArray = [];
  for (let i = 0; i < devicesArray.length; i++) {
    stdDevicesArray[i] = {
      id: devicesArray[i]['serial_tr069'],
      model: devicesArray[i]['model'],
      modelversion: devicesArray[i]['version'],
    };
  }
  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/device/report',
      method: 'POST',
      json: {
        'secret': locals.getSecret(),
        'devices': stdDevicesArray,
      },
      timeout: 20000,
    }).then((res) => {
      if (res.success) {
        return resolve({success: true, noLicenses: res.nolicense,
                        licensesNum: res.licenses});
      } else {
        return resolve({success: false, message: res.message});
      }
    }, (err) => {
      return resolve({success: false, message:
        t('requestError', {errorline: __line})});
    });
  });
};

controlController.getPersonalizationHash = function() {
  return new Promise((resolve) => {
    request({
      url: controlApiAddr + '/user/appinfo',
      method: 'POST',
      json: {
        'secret': locals.getSecret(),
      },
    }).then((res) => {
      if (res.success) {
        return resolve({
          success: true,
          personalizationHash: res.personalizationHash,
          androidLink: res.androidLink,
          iosLink: res.iosLink,
        });
      } else {
        return resolve({success: false, message: res.message});
      }
    }, (err) => {
      return resolve({success: false, message: err.message});
    });
  });
};

controlController.getLicenseApiSecret = function() {
  return new Promise((resolve) => {
    request({
      url: controlApiAddr + '/user/apiinfo',
      method: 'POST',
      json: {
        'secret': locals.getSecret(),
      },
    }).then((res) => {
      if (res.success) {
        return resolve({
          success: true,
          apiSecret: res.licenseApiSecret,
          company: res.company,
        });
      } else {
        return resolve({success: false, message: res.message});
      }
    }, (err) => {
      return resolve({success: false, message: err.message});
    });
  });
};

controlController.meshLicenseCredit = async function(slaveId) {
  let matchedConfig = null;

  try {
    matchedConfig = await Config.findOne({is_default: true},
      {company: true, licenseApiSecret: true});
    if (!matchedConfig) {
      console.error('Error obtaining message config');
      return {success: false, message:
        t('configFindError', {errorline: __line})};
    }
  } catch (err) {
    console.error('Error obtaining message config');
    return {success: false, message:
      t('configFindError', {errorline: __line})};
  }

  return new Promise((resolve) => {
    request({
      url: controlApiAddr + '/license/mesh/set',
      method: 'POST',
      json: {
        'id': slaveId,
        'organization': matchedConfig.company,
        'license_api_secret': matchedConfig.licenseApiSecret,
        'activate_mesh': false,
      },
    }).then((res) => {
      if (res.success) {
        return resolve({
          success: true,
        });
      } else {
        return resolve({success: false, message: res.message});
      }
    }, (err) => {
      return resolve({success: false, message: err.message});
    });
  });
};

controlController.getApiUserLogin = function() {
  return new Promise((resolve) => {
    request({
      url: controlApiAddr + '/user/flashmanapiinfo',
      method: 'POST',
      json: {
        'secret': locals.getSecret(),
      },
    }).then((res) => {
      if (res.success) {
        return resolve({
          success: true,
          apiUser: res.flashmanApiUser,
          apiPass: res.flashmanApiPass,
          company: res.company,
        });
      } else {
        return resolve({success: false, message: res.message});
      }
    }, (err) => {
      return resolve({success: false, message: err.message});
    });
  });
};

module.exports = controlController;
