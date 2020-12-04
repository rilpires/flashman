const localPackageJson = require('../package.json');
const exec = require('child_process').exec;
const fs = require('fs');
const requestLegacy = require('request');
const request = require('request-promise-native');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const commandExists = require('command-exists');
const tasksApi = require('./external-genieacs/tasks-api.js');
let Config = require('../models/config');
let updateController = {};

const returnStrOrEmptyStr = (query) =>
    (typeof query === 'string') ? query : '';

const isMajorUpgrade = function(target, current) {
  let targetMajor = parseInt(target.split('.')[0]);
  let currentMajor = parseInt(current.split('.')[0]);
  return targetMajor > currentMajor;
};

const versionCompare = function(foo, bar) {
  // Returns like C strcmp: 0 if equal, -1 if foo < bar, 1 if foo > bar
  let fooVer = foo.split('.').map((val) => {
   return parseInt(val);
  });
  let barVer = bar.split('.').map((val) => {
   return parseInt(val);
  });
  for (let i = 0; i < fooVer.length; i++) {
    if (fooVer[i] < barVer[i]) return -1;
    if (fooVer[i] > barVer[i]) return 1;
  }
  return 0;
};

const getRemoteVersion = function() {
  return new Promise((resolve, reject)=>{
    let jsonHost = localPackageJson.updater.jsonHost;
    let gitUser = localPackageJson.updater.githubUser;
    let gitRepo = localPackageJson.updater.githubRepo;
    let gitBranch = localPackageJson.updater.githubBranch;
    let url = 'https://' + jsonHost + '/' + gitUser + '/' + gitRepo + '/' +
              gitBranch + '/package.json';
    requestLegacy.get(url, (error, resp, body)=>{
      if (error || resp.statusCode !== 200) {
        reject();
      } else {
        resolve(JSON.parse(body).version);
      }
    });
  });
};

const getLocalVersion = function() {
  return localPackageJson.version;
};

const downloadUpdate = function(version) {
  return new Promise((resolve, reject)=>{
    exec('git add environment.config.json', (err, stdout, stderr) => {
      if (err) {
        return reject();
      } else {
        exec('git checkout .', (err, stdout, stderr) => {
          if (err) {
            return reject();
          } else {
            exec('git fetch', (err, stdout, stderr) => {
              if (err) {
                return reject();
              } else {
                exec('git checkout ' + version, (err, stdout, stderr) => {
                  if (err) {
                    return reject();
                  } else {
                    return resolve();
                  }
                });
              }
            });
          }
        });
      }
    });
  });
};

const updateDependencies = function() {
  return new Promise((resolve, reject)=>{
    exec('npm install --production', (err, stdout, stderr)=>{
      (err) ? reject() : resolve();
    });
  });
};

const isRunningUserOwnerOfDirectory = function() {
  return new Promise((resolve, reject) => {
    // Check if running user is the same on current directory
    const runningUserName = process.env.USER;
    exec('id -u ' + runningUserName, (err, stdout, stderr) => {
      if (stdout) {
        const runningUid = parseInt(stdout);
        if (!isNaN(runningUid)) {
          fs.stat('.', (err, stats) => {
            if (err) {
              return resolve(false);
            } else {
              const directoryUid = stats.uid;
              // If same user we can do commands safely
              if (directoryUid === runningUid) {
                return resolve(true);
              } else {
                return resolve(false);
              }
            }
          });
        } else {
          return resolve(false);
        }
      } else {
        return resolve(false);
      }
    });
  });
};

const rebootFlashman = function(version) {
  exec('pm2 reload environment.config.json &');
};

const errorCallback = function(res) {
  if (res) {
    Config.findOne({is_default: true}, function(err, config) {
      if (!err && config) {
        res.status(200).json({hasUpdate: config.hasUpdate, updated: false});
      } else {
        res.status(500).json({});
      }
    });
  }
};

const updateFlashman = function(automatic, res) {
  getRemoteVersion().then((remoteVersion) => {
    let localVersion = getLocalVersion();
    let needsUpdate = versionCompare(remoteVersion, localVersion) > 0;
    let majorUpgrade = isMajorUpgrade(remoteVersion, localVersion);
    if (needsUpdate && majorUpgrade) {
      Config.findOne({is_default: true}, function(err, matchedConfig) {
        // Do not upgrade automatically for new major version, direct to docs
        if (err || !matchedConfig) return;
        matchedConfig.hasMajorUpdate = true;
        matchedConfig.save();
      });
      if (res) {
        res.status(200).json({
          hasMajorUpdate: true, hasUpdate: true, updated: false,
        });
      }
    } else if (!needsUpdate && !majorUpgrade) {
      Config.findOne({is_default: true}, function(err, matchedConfig) {
        if (err || !matchedConfig) return;
        matchedConfig.hasUpdate = false;
        matchedConfig.hasMajorUpdate = false;
        matchedConfig.save();
      });
      if (res) {
        res.status(200).json({hasUpdate: false, updated: false});
      }
    } else if (needsUpdate) {
      Config.findOne({is_default: true}, function(err, matchedConfig) {
        if (err || !matchedConfig) return errorCallback(res);
        matchedConfig.hasUpdate = true;
        matchedConfig.save();

        if (automatic) {
          commandExists('git', function(err, gitExists) {
            if (gitExists) {
              isRunningUserOwnerOfDirectory().then((isOwner) => {
                if (isOwner) {
                  downloadUpdate(remoteVersion)
                  .then(()=>{
                    return updateDependencies();
                  }, (rejectedValue)=>{
                    return Promise.reject(rejectedValue);
                  })
                  .then(()=>{
                    matchedConfig.hasUpdate = false;
                    matchedConfig.save((err)=>{
                      if (res) {
                        res.status(200).json({hasUpdate: false, updated: true});
                      }
                      rebootFlashman(remoteVersion);
                    });
                  }, (rejectedValue)=>{
                    errorCallback(res);
                  });
                } else {
                  res.status(200).json({hasUpdate: true, updated: false});
                }
              });
            } else {
              res.status(200).json({hasUpdate: true, updated: false});
            }
          });
        } else if (res) {
          res.status(200).json({hasUpdate: true, updated: false});
        }
      });
    } else if (res) {
      res.status(200).json({hasUpdate: false, updated: false});
    }
  }, () => errorCallback(res));
};

const sendTokenControl = function(req, token) {
  return request({
    url: 'https://controle.anlix.io/api/measure/token',
    method: 'POST',
    json: {
      'token': token,
    },
  }).then(
    (resp)=>Promise.resolve(resp),
    (err)=>Promise.reject({message: 'Erro no token fornecido'}),
  );
};

updateController.update = function() {
  if (process.env.FLM_DISABLE_AUTO_UPDATE !== 'true') {
    Config.findOne({is_default: true}, function(err, matchedConfig) {
      if (!err && matchedConfig) {
        updateFlashman(matchedConfig.autoUpdate, null);
      }
    });
  }
};

updateController.checkUpdate = function() {
  if (process.env.FLM_DISABLE_AUTO_UPDATE === 'true') {
    // Always return as updated if auto update is disabled
    Config.findOne({is_default: true}, function(err, matchedConfig) {
      if (!err && matchedConfig) {
        matchedConfig.hasUpdate = false;
        matchedConfig.save();
      }
    });
  } else {
    updateFlashman(false, null);
  }
};

updateController.apiUpdate = function(req, res) {
  if (process.env.FLM_DISABLE_AUTO_UPDATE === 'true') {
    // Always return as updated if auto update is disabled
    res.status(200).json({hasUpdate: false, updated: true});
  } else {
    Config.findOne({is_default: true}, function(err, matchedConfig) {
      if (!err && matchedConfig && matchedConfig.hasUpdate) {
        return res.status(200).json({hasUpdate: true, updated: false});
      } else {
        updateFlashman(false, res);
      }
    });
  }
};

updateController.apiForceUpdate = function(req, res) {
  if (process.env.FLM_DISABLE_AUTO_UPDATE === 'true') {
    // Always return as updated if auto update is disabled
    res.status(200).json({hasUpdate: false, updated: true});
  } else {
    updateFlashman(true, res);
  }
};

updateController.getAutoConfig = function(req, res) {
  Config.findOne({is_default: true}, function(err, matchedConfig) {
    if (!err && matchedConfig) {
      return res.status(200).json({
        auto: matchedConfig.autoUpdate,
        minlengthpasspppoe: matchedConfig.pppoePassLength,
        measureServerIP: matchedConfig.measureServerIP,
        measureServerPort: matchedConfig.measureServerPort,
        // transforming from milliseconds to seconds.
        tr069InformInterval: matchedConfig.tr069.inform_interval/1000,
        tr069RecoveryThreshold: matchedConfig.tr069.recovery_threshold,
        tr069OfflineThreshold: matchedConfig.tr069.offline_threshold,
      });
    } else {
      return res.status(200).json({
        auto: null,
        minlengthpasspppoe: 8,
      });
    }
  });
};

/* saving tr069 inform interval in genieacs for all devices. The errors thrown
 by this function have messages that are in portuguese, ready to be used in the
 user interface. */
const updatePeriodicInformInGenieAcs = async function(tr069InformInterval) {
  // getting devices ids from genie.
  let ids = await tasksApi.getFromCollection('devices', {}, '_id')
  .catch((e) => {
    console.error(e); // printing error to console.
    // throwing error message that can be given to user interface.
    throw new Error('Erro encontrando dispositivos do TR-069 no ACS.');
  });
  ids = ids.map((obj) => obj._id); // transforming object to string.


  let parameterName = // the tr069 name for inform interval.
   'InternetGatewayDevice.ManagementServer.PeriodicInformInterval';

  // preparing a task to each device to change inform interval in genieacs.
  let tasksChangeInform = new Array(ids.length); // one task for each device.
  for (let i = 0; i < tasksChangeInform.length; i++) {
    let taskInformInterval = {
      name: 'setParameterValues',
      parameterValues: [[parameterName, tr069InformInterval]],
      // genie accepts inform interval as seconds.
    };
    // executing a promise and not waiting for it.
    tasksChangeInform[i] = tasksApi.addTask(ids[i], taskInformInterval, false)
     .catch((e) => {
      console.error('error when sending inform interval for device id '+ids[i])
      // if error throw object containing respective device id and task.
      throw {task: taskInformInterval, id: ids[i], err: e};
    });
  }
  // sending task to genieacs and waiting all promises to finish.
  await Promise.all(tasksChangeInform).catch((e) => {
    console.error(e.err); // print error message.
    throw new Error('Erro ao salvar intervalo de informs do TR-069 no ACS '
     +`para dispositivo ${e.id}.`); // can be given to user interface.
  });

  // updating inform interval in genie preset.
  /* we already have a preset in genieacs which _id is 'inform'. first we get
 the whole preset then we change/add the periodic inform value and then we over
 wright that preset.*/
  let informPreset = await tasksApi.getFromCollection('presets',
   {_id: 'inform'}); // genie returns an object inside and array.
  informPreset = informPreset[0]; // getting the only object.
  // if the periodic inform parameter exists in preset.
  let foundPeriodicInform = false; // false means it doesn't exist.
  tr069InformInterval = ''+tr069InformInterval; // preset value is a string.
  // we will change the value if it exists.
  for (let i = 0; i < informPreset.configurations.length; i++) {
    if (informPreset.configurations[i].type === 'value'
     && informPreset.configurations[i].name === parameterName) {
      foundPeriodicInform = true; // true means periodic inform exist.
      informPreset.configurations[i].value = tr069InformInterval; // new value.
    }
  }
  // we will create a new value if it doesn't exist.
  if (!foundPeriodicInform) { // if it periodic inform doesn't exist in preset.
    // we add a new configuration.
    informPreset.configurations.push({type: 'value',
     name: parameterName, value: tr069InformInterval});
  }

  // saving preset to genieacs.
  await tasksApi.putPreset(informPreset).catch((e) => {
    console.error(e);
    throw new Error('Erro ao salvar intervalo de informs do TR-069 no ACS.');
  });
};

updateController.setAutoConfig = async function(req, res) {
  try {
    let config = await(Config.findOne({is_default: true}));
    if (!config) throw new {message: 'Erro ao encontrar configuração base'};
    config.autoUpdate = req.body.autoupdate == 'on' ? true : false;
    config.pppoePassLength = parseInt(req.body['minlength-pass-pppoe']);
    let measureServerIP = req.body['measure-server-ip'];
    let ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (measureServerIP && !measureServerIP.match(ipRegex)) {
      return res.status(500).json({
        type: 'danger',
        message: 'Erro validando os campos',
      });
    }
    let measureServerPort = parseInt(req.body['measure-server-port']);
    if (isNaN(measureServerPort)) {
      // No change
      measureServerPort = config.measureServerPort;
    }
    if (measureServerPort && (measureServerPort < 1 || measureServerPort > 65535)) {
      return res.status(500).json({
        type: 'danger',
        message: 'Erro validando os campos',
      });
    }
    config.measureServerIP = measureServerIP;
    config.measureServerPort = measureServerPort;
    let message = 'Salvo com sucesso!';
    let updateToken = (req.body.token_update === 'on') ? true : false;
    let measureToken = returnStrOrEmptyStr(req.body['measure-token']);
    // Update configs if either no token is set and form sets one, or
    // if one is already set and checkbox to update was marked
    if ((!config.measure_configs.auth_token || updateToken) &&
        measureToken !== '') {
      let controlResp = await(sendTokenControl(req, measureToken));
      if (!('controller_fqdn' in controlResp) ||
          !('zabbix_fqdn' in controlResp)) {
        throw new {};
      }
      config.measure_configs.is_active = true;
      config.measure_configs.is_license_active = true;
      config.measure_configs.auth_token = measureToken;
      config.measure_configs.controller_fqdn = controlResp.controller_fqdn;
      config.measure_configs.zabbix_fqdn = controlResp.zabbix_fqdn;
      message += ' Seus dispositivos começarão a medir em breve.';
    }

    // // checking tr069 configuration fields.
    // parsing fields to number.
    let tr069InformInterval = Number(req.body['inform-interval']);
    let tr069RecoveryThreshold =
      Number(req.body['lost-informs-recovery-threshold']);
    let tr069OfflineThreshold =
      Number(req.body['lost-informs-offline-threshold']);
    // if all fields are numeric;
    if (!isNaN(tr069InformInterval) && !isNaN(tr069RecoveryThreshold)
        && !isNaN(tr069OfflineThreshold)
     // and inform interval, recovery and offline values are within boundaries,
     && tr069InformInterval >= 60 && tr069InformInterval <= 86400
     && tr069RecoveryThreshold >= 1 && tr069RecoveryThreshold <= 100
     && tr069OfflineThreshold >= 2 && tr069OfflineThreshold <= 300
     // and recovery is smaller than offline.
     && tr069RecoveryThreshold < tr069OfflineThreshold) {
      config.tr069 = { // create a new tr069 config with received values.
        // transforming from seconds to milliseconds.
        inform_interval: tr069InformInterval*1000,
        recovery_threshold: tr069RecoveryThreshold,
        offline_threshold: tr069OfflineThreshold,
      };
    } else { // if one single rule doesn't pass the test.
      // respond error without much explanation.
      return res.status(500).json({
        type: 'danger',
        message: 'Erro validando os campos relacionados ao TR-069.',
      });
    }
    // // setting inform interval in genie for all devices and in preset.
    let presetResponse = await updatePeriodicInformInGenieAcs(
     tr069InformInterval)

    await(config.save());
    return res.status(200).json({
      type: 'success',
      message: message,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      type: 'danger',
      message: (err.message) ? err.message : 'Erro salvando configurações',
    });
  }
};

module.exports = updateController;
