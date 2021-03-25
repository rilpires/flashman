const localPackageJson = require('../package.json');
const exec = require('child_process').exec;
const fs = require('fs');
const requestLegacy = require('request');
const commandExists = require('command-exists');
const util = require('./handlers/util');
const controlApi = require('./external-api/control');
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

updateController.rebootGenie = function(instances) {
  // Treat bugged case where "max" parameter may set instance count to 0 upon
  // reloading the service - use value from nproc instead of bugged 0
  exec('nproc', (err, stdout, stderr)=>{
    if (instances === 0 || instances === '0') {
      instances = stdout.trim(); // remove trailing newline
    }
    // We do a stop/start instead of restart to avoid racing conditions when
    // genie's worker processes are killed and then respawned - this prevents
    // issues with ONU connections since exceptions lead to buggy exp. backoff
    exec('pm2 stop genieacs-cwmp', (err, stdout, stderr)=>{
      // Replace genieacs instances config with what flashman gives us
      let replace = 'const INSTANCES_COUNT = .*;';
      let newText = 'const INSTANCES_COUNT = ' + instances + ';';
      let sedExpr = 's/' + replace + '/' + newText + '/';
      let targetFile = 'controllers/external-genieacs/devices-api.js';
      let sedCommand = 'sed -i \'' + sedExpr + '\' ' + targetFile;
      exec(sedCommand, (err, stdout, stderr)=>{
        exec('pm2 start genieacs-cwmp');
      });
    });
  });
};

const rebootFlashman = function(version) {
  // Stop genieacs before reloading flashman - this prevents exceptions and
  // racing conditions when onus try to connect - we use the service name to
  // avoid booting genieacs on servers where it was never booted in the first
  // place (as opposed to using environment.genieacs.json)
  exec('pm2 stop genieacs-cwmp', (err, stdout, stderr)=>{
    // & necessary because otherwise process would kill itself and cause issues
    exec('pm2 reload environment.config.json &');
  });
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
        tr069ServerURL: matchedConfig.tr069.server_url,
        tr069WebLogin: matchedConfig.tr069.web_login,
        tr069WebPassword: matchedConfig.tr069.web_password,
        tr069WebRemote: matchedConfig.tr069.remote_access,
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
  let parameterName = // the tr069 name for inform interval.
   'InternetGatewayDevice.ManagementServer.PeriodicInformInterval';

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
    let config = await Config.findOne({is_default: true});
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


    // checking tr069 configuration fields.
    let tr069ServerURL = req.body['tr069-server-url'];
    let onuWebLogin = req.body['onu-web-login'];
    if (!onuWebLogin) {
      // in case of falsey value, use current one
      onuWebLogin = config.tr069.web_login;
    }
    let onuWebPassword = req.body['onu-web-password'];
    if (!onuWebPassword) {
      // in case of falsey value, use current one
      onuWebPassword = config.tr069.web_password;
    }
    let onuRemote = (req.body.onu_web_remote === 'on') ? true : false;
    // parsing fields to number.
    let tr069InformInterval = Number(req.body['inform-interval']);
    let tr069RecoveryThreshold =
      Number(req.body['lost-informs-recovery-threshold']);
    let tr069OfflineThreshold =
      Number(req.body['lost-informs-offline-threshold']);
    // if all fields are numeric,
    if (!isNaN(tr069InformInterval) && !isNaN(tr069RecoveryThreshold)
     && !isNaN(tr069OfflineThreshold)
     // and inform interval, recovery and offline values are within boundaries,
     && tr069InformInterval >= 60 && tr069InformInterval <= 86400
     && tr069RecoveryThreshold >= 1 && tr069RecoveryThreshold <= 100
     && tr069OfflineThreshold >= 2 && tr069OfflineThreshold <= 300
     // and recovery is smaller than offline.
     && tr069RecoveryThreshold < tr069OfflineThreshold) {
      // if received inform interval, in seconds, is different than saved
      // inform interval in milliseconds,
      if (tr069InformInterval*1000 !== config.tr069.inform_interval
       && !process.env.FLM_GENIE_IGNORED) { // and if there's a GenieACS. 
        // setting inform interval in genie for all devices and in preset.
        await updatePeriodicInformInGenieAcs(tr069InformInterval);
      }
      config.tr069 = { // create a new tr069 config with received values.
        server_url: tr069ServerURL,
        web_login: onuWebLogin,
        web_password: onuWebPassword,
        remote_access: onuRemote,
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


    // data collecting parameters.
    if (config.data_collecting === undefined) { // if parameters are undefined.
      config.data_collecting = { // set default parameters.
        is_active: false, has_latency: false, alarm_fqdn: '', ping_fqdn: '',
        ping_packets: 100,
      };
    }
    // if a parameter is defined and valid we assign it to config.
    let anyProblem = false; // goes to true if at least one value is invalid.
    let v; // shortening variable name.
    v = req.body['data_collecting_is_active'];
    if (!anyProblem && (v === undefined || v.constructor === Boolean)) {
      config.data_collecting.is_active = v;
    } else {
      anyProblem = true;
    }
    v = req.body['data_collecting_has_latency'];
    if (!anyProblem && (v === undefined || v.constructor === Boolean)) {
      config.data_collecting.has_latency = v;
    } else {
      anyProblem = true;
    }
    v = req.body['data_collecting_alarm_fqdn'];
    if (!anyProblem && (v === undefined || (v.constructor === String &&
    (((v = v.trim()) !== null && util.isFqdnValid(v)) || v === '')))) {
      config.data_collecting.alarm_fqdn = v;
    } else {
      anyProblem = true;
    }
    v = req.body['data_collecting_ping_fqdn'];
    if (!anyProblem && (v === undefined || (v.constructor === String &&
    (((v = v.trim()) !== null && util.isFqdnValid(v)) || v === '')))) {
      config.data_collecting.ping_fqdn = v;
    } else {
      anyProblem = true;
    }
    v = parseInt(req.body['data_collecting_ping_packets']);
    if (!anyProblem && (v === undefined || (!isNaN(v) && v > 0 && v <= 100))) {
      config.data_collecting.ping_packets = v;
    } else {
      anyProblem = true;
    }
    // if one single rule doesn't pass the test.
    // respond error without much explanation.
    if (anyProblem) return res.status(500).json({
      type: 'danger',
      message: 'Erro validando os campos relacionados a coleta de dados.',
    });


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
