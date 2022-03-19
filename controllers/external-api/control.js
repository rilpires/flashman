
const request = require('request-promise-native');
const keyHandlers = require('../handlers/keys');

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
    let matchedConfig = await Config.findOne({is_default: true});
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
    matchedConfig = await Config.findOne({is_default: true});
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

controlController.getLicenseStatus = function(app, device) {
  return new Promise((resolve, reject) => {
    request({
      url: controlApiAddr + '/device/list',
      method: 'POST',
      json: {
        'secret': app.locals.secret,
        'all': false,
        'mac': device._id,
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
      return resolve({success: false, message: 'Erro: ' + err.message});
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
      return resolve({success: false, message: 'Erro na requisição'});
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
    (err) => Promise.reject({message: 'Erro no token fornecido'}),
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
      return resolve({success: false, message: 'Erro na requisição'});
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
      return resolve({success: false, message: 'Erro na requisição'});
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
      return resolve({success: false, message: 'Erro: ' + err.message});
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
      return resolve({success: false, message: 'Erro: ' + err.message});
    });
  });
};

controlController.meshLicenseCredit = async function(slaveId) {
  let matchedConfig = null;

  try {
    matchedConfig = await Config.findOne({is_default: true});
    if (!matchedConfig) {
      console.error('Error obtaining message config');
      return {success: false, message: 'Erro ao consultar configurações'};
    }
  } catch (err) {
    console.error('Error obtaining message config');
    return {success: false, message: 'Erro ao consultar configurações'};
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
      return resolve({success: false, message: 'Erro: ' + err.message});
    });
  });
};

module.exports = controlController;
