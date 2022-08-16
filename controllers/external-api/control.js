
/* global __line */

const request = require('request-promise-native');
const keyHandlers = require('../handlers/keys');
const t = require('../language').i18next.t;

let Config = require('../../models/config');

let controlApiAddr = 'http://localhost:9000/api';
if (process.env.production === 'true' || process.env.production === true) {
  controlApiAddr = 'https://controle.anlix.io/api';
}

const controlController = {};

controlController.checkPubKey = async function(app) {
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
      await keyHandlers.sendPublicKey(pubKeyUrl, app.locals.secret);
    } else {
      // Check flashman key pair existence and generate it otherwise
      if (matchedConfig.auth_privkey === '') {
        await keyHandlers.generateAuthKeyPair();
        // Send public key to be included in firmwares
        await keyHandlers.sendPublicKey(pubKeyUrl, app.locals.secret);
      }
    }
  } catch (err) {
    console.error('Error retrieving Config collection from DB');
  }
};

controlController.getMessageConfig = async function(app) {
  let matchedConfig = null;

  try {
    matchedConfig = await Config.findOne({is_default: true},
                                         {messaging_configs: true});
    if (!matchedConfig) {
      console.error('Error obtaining message config');
      return;
    }
  } catch (err) {
    console.error('Error obtaining message config');
  }

  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/message/config',
      method: 'POST',
      json: {
        secret: app.locals.secret,
      },
    }).then((resp) => {
      if (resp && resp.token && resp.fqdn) {
        matchedConfig.messaging_configs.secret_token = resp.token;
        matchedConfig.messaging_configs.functions_fqdn = resp.fqdn;
        matchedConfig.save().catch((err) => {
          console.log('Error saving first Config');
        });
        console.log('Obtained message config successfully!');
      }
    }, (err) => {
      console.error('Error obtaining message config');
    });
  });
};

controlController.getLicenseStatus = function(app, deviceId) {
  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/device/list',
      method: 'POST',
      json: {
        'secret': app.locals.secret,
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

controlController.changeLicenseStatus = function(app, blockStatus, devices) {
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
        'secret': app.locals.secret,
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

controlController.isAccountBlocked = function(app) {
  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/user/blocked',
      method: 'POST',
      json: {
        'secret': app.locals.secret,
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

controlController.reportDevices = function(app, devicesArray) {
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
        'secret': app.locals.secret,
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

controlController.getPersonalizationHash = function(app) {
  return new Promise((resolve) => {
    request({
      url: controlApiAddr + '/user/appinfo',
      method: 'POST',
      json: {
        'secret': app.locals.secret,
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

controlController.getLicenseApiSecret = function(app) {
  return new Promise((resolve) => {
    request({
      url: controlApiAddr + '/user/apiinfo',
      method: 'POST',
      json: {
        'secret': app.locals.secret,
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

module.exports = controlController;
