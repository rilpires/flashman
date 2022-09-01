/* global __line */

const localPackageJson = require('../package.json');
const localEnvironmentJson = require('../environment.config.json');
const exec = require('child_process').exec;
const fs = require('fs');
const requestLegacy = require('request');
const commandExists = require('command-exists');
const controlApi = require('./external-api/control');
const tasksApi = require('./external-genieacs/tasks-api.js');
const Validator = require('../public/javascripts/device_validator');
const language = require('./language');
const util = require('./handlers/util');
const deviceHandler = require('./handlers/devices');
const t = language.i18next.t;
let Config = require('../models/config');
let Devices = require('../models/device');
let updateController = {};

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

const getRemotePackage = function() {
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
        resolve(JSON.parse(body));
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
    exec('rm package-lock.json', (err, stdout, stderr)=>{
      exec('npm install --production', (err, stdout, stderr)=>{
        (err) ? reject() : resolve();
      });
    });
  });
};

const updateGenieRepo = function(ref) {
  let fetch = 'cd ../genieacs && git fetch';
  let checkoutCurr = 'cd ../genieacs && git checkout .';
  let checkoutNext = 'cd ../genieacs && git checkout ' + ref;
  let install = 'cd ../genieacs && npm install';
  let build = 'cd ../genieacs && npm run build';
  let reloadNbi = 'pm2 reload genieacs-nbi';
  let reloadFs = 'pm2 reload genieacs-fs';
  return new Promise((resolve, reject)=>{
    exec(fetch, (err, stdout, stderr)=>{
      if (err) return reject();
      exec(checkoutCurr, (err, stdout, stderr) => {
        exec(checkoutNext, (err, stdout, stderr) => {
          if (err) return reject();
          exec(install, (err, stdout, stderr) => {
            if (err) return reject();
            exec(build, (err, stdout, stderr) => {
              if (err) return reject();
              exec(reloadNbi, (err, stdout, stderr) => {
                if (err) return reject();
                exec(reloadFs, (err, stdout, stderr) => {
                  if (err) return reject();
                  return resolve();
                });
              });
            });
          });
        });
      });
    });
  });
};

const updateGenieACS = function(upgrades) {
  return new Promise((resolve, reject) => {
    let field = 'InternetGatewayDevice.ManagementServer.PeriodicInformInterval';
    Config.findOne({is_default: true}).then((config)=>{
      if (!config) {
        console.log('Error reading configs from database in update GenieACS!');
        return reject();
      }
      // Update genie repository if needed
      let waitForUpdate;
      if (upgrades.updateGenie) {
        console.log('Updating GenieACS version...');
        waitForUpdate = updateGenieRepo(upgrades.newGenieRef);
      } else {
        waitForUpdate = Promise.resolve();
      }
      // Update provision script if needed
      let waitForProvision;
      if (upgrades.updateProvision) {
        try {
          let provisionScript = fs.readFileSync(
            './controllers/external-genieacs/provision.js', 'utf8',
          );
          console.log('Updating GenieACS provision...');
          waitForProvision = tasksApi.putProvision(provisionScript, 'flashman');
        } catch (e) {
          waitForProvision = Promise.reject();
        }
      } else {
        waitForProvision = Promise.resolve();
      }
      // Update preset json if needed
      let waitForPreset;
      if (upgrades.updatePreset) {
        try {
          let preset = JSON.parse(fs.readFileSync(
            './controllers/external-genieacs/flashman-preset.json',
          ));
          // Alter the periodic inform interval based on database config
          let interval = '' + parseInt(config.tr069.inform_interval / 1000);
          preset.configurations.find((c) => c.name === field).value = interval;
          preset._id = 'inform';
          console.log('Updating GenieACS preset...');
          waitForPreset = tasksApi.putPreset(preset);
        } catch (e) {
          waitForPreset = Promise.reject();
        }
      } else {
        waitForPreset = Promise.resolve();
      }
      // Wait for all promises and check results
      let promises = [waitForUpdate, waitForProvision, waitForPreset];
      Promise.allSettled(promises).then((values)=>{
        if (values[0].status !== 'fulfilled') {
          console.log('Error updating GenieACS repository!');
        }
        if (values[1].status !== 'fulfilled') {
          console.log('Error updating GenieACS provision script!');
        }
        if (values[2].status !== 'fulfilled') {
          console.log('Error updating GenieACS preset json!');
        }
        if (values.some((v) => v.status !== 'fulfilled')) {
          return reject();
        } else {
          console.log('GenieACS updated successfully!');
          return resolve();
        }
      });
    });
  });
};

const updateProvisionsPresets = function() {
  return new Promise((resolve, reject) => {
    // Get config from database
    Config.findOne({is_default: true}).then((config)=>{
      if (!config) {
        console.log('Error reading configs from database in update GenieACS!');
        return resolve();
      }
      // Update diagnostic provision script
      let waitForProvision;
      try {
        let provisionScript = fs.readFileSync(
          './controllers/external-genieacs/diagnostic-provision.js', 'utf8',
        );
        console.log('Updating GenieACS provision...');
        waitForProvision = tasksApi.putProvision(provisionScript, 'diagnostic');
      } catch (e) {
        waitForProvision = Promise.reject();
      }

      // Update preset jsons
      let waitForBootstrapPreset;
      try {
        let preset = JSON.parse(fs.readFileSync(
          './controllers/external-genieacs/bootstrap-preset.json',
        ));
        console.log('Updating Genie bootstrap-preset...');
        waitForBootstrapPreset = tasksApi.putPreset(preset);
      } catch (e) {
        waitForBootstrapPreset = Promise.reject();
      }
      let waitForBootPreset;
      try {
        let preset = JSON.parse(fs.readFileSync(
          './controllers/external-genieacs/boot-preset.json',
        ));
        console.log('Updating Genie boot-preset...');
        waitForBootPreset = tasksApi.putPreset(preset);
      } catch (e) {
        waitForBootPreset = Promise.reject();
      }
      let waitForPeriodicPreset;
      try {
        let preset = JSON.parse(fs.readFileSync(
          './controllers/external-genieacs/periodic-preset.json',
        ));
        console.log('Updating Genie periodic-preset...');
        waitForPeriodicPreset = tasksApi.putPreset(preset);
      } catch (e) {
        waitForPeriodicPreset = Promise.reject();
      }
      let waitForDiagPreset;
      try {
        let preset = JSON.parse(fs.readFileSync(
          './controllers/external-genieacs/diagnostic-preset.json',
        ));
        console.log('Updating Genie diagnostic-preset...');
        waitForDiagPreset = tasksApi.putPreset(preset);
      } catch (e) {
        waitForDiagPreset = Promise.reject();
      }

      // Wait for all promises and check results
      let promises = [waitForProvision, waitForBootstrapPreset,
                      waitForBootPreset, waitForPeriodicPreset,
                      waitForDiagPreset];
      Promise.allSettled(promises).then((values)=>{
        if (values[0].status !== 'fulfilled') {
          console.log('Error updating Genie diagnostic-provision script!');
        }
        if (values[1].status !== 'fulfilled') {
          console.log('Error updating Genie bootstrap-preset json!');
        }
        if (values[2].status !== 'fulfilled') {
          console.log('Error updating Genie boot-preset json!');
        }
        if (values[3].status !== 'fulfilled') {
          console.log('Error updating Genie periodic-preset json!');
        }
        if (values[4].status !== 'fulfilled') {
          console.log('Error updating Genie diagnostic-preset json!');
        }
        if (values.some((v) => v.status !== 'fulfilled')) {
          return resolve();
        } else {
          console.log('GenieACS updated successfully!');
          return resolve();
        }
      });
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

const checkGenieNeedsUpdate = function(remotePackageJson) {
  return new Promise((resolve, reject)=>{
    let updateGenie = false;
    let updateProvision = false;
    let updatePreset = false;
    if (!remotePackageJson.genieacs || !localPackageJson.genieacs) {
      // Either remote or local dont have genieacs information - cannot compare
      // data, so it makes no sense to upgrade anything
      return resolve({
        'updateGenie': updateGenie,
        'updateProvision': updateProvision,
        'updatePreset': updatePreset,
      });
    }
    exec('[ -d "../genieacs" ]', (err, stdout, stderr) => {
      if (err) {
        // No genieacs directory - no TR-069 installation, so no upgrades
        return resolve({
          'updateGenie': updateGenie,
          'updateProvision': updateProvision,
          'updatePreset': updatePreset,
        });
      }
      let localGenieRef = localPackageJson.genieacs.ref;
      let remoteGenieRef = remotePackageJson.genieacs.ref;
      if (localGenieRef && remoteGenieRef &&
          localGenieRef !== remoteGenieRef) {
        // GenieACS version has changed, needs to update it
        updateGenie = true;
      }
      let localProvisionHash = localPackageJson.genieacs.provisionHash;
      let remoteProvisionHash = remotePackageJson.genieacs.provisionHash;
      if (localProvisionHash && remoteProvisionHash &&
          localProvisionHash !== remoteProvisionHash) {
        // Provision script has changed, needs to update it
        updateProvision = true;
      }
      let localPresetHash = localPackageJson.genieacs.presetHash;
      let remotePresetHash = remotePackageJson.genieacs.presetHash;
      if (localPresetHash && remotePresetHash &&
          localPresetHash !== remotePresetHash) {
        // Preset json has changed, needs to update it
        updatePreset = true;
      }
      return resolve({
        'updateGenie': updateGenie,
        'updateProvision': updateProvision,
        'updatePreset': updatePreset,
        'newGenieRef': remoteGenieRef,
      });
    });
  });
};

const stopInsecureGenieACS = function() {
  exec('pm2 stop genieacs-cwmp-http');
};

const startInsecureGenieACS = function() {
  exec('pm2 start genieacs-cwmp-http');
};

updateController.rebootGenie = function(instances) {
  // Treat bugged case where pm2 may fail to provide the number of instances
  // correctly - it may be 0 or undefined, and we must then rely on both the
  // envitonment.config.json file and nproc to tell us how many flashman
  // instances there are
  Config.findOne({is_default: true}).then((config)=>{
    exec('nproc', (err, stdout, stderr)=>{
      instances = parseInt(instances);
      if (isNaN(instances)) {
        instances = parseInt(localEnvironmentJson.apps[0].instances);
        if (isNaN(instances)) {
          instances = parseInt(stdout.trim()); // remove trailing newline
        }
      }
      // If somehow is still NaN, replace with 1 as a fallback
      if (isNaN(instances)) {
        instances = '1';
      } else {
        instances = instances.toString(); // Merely for type safety
      }
      // We do a stop/start instead of restart to avoid racing conditions when
      // genie's worker processes are killed and then respawned - this prevents
      // issues with CPEs connections since exceptions lead to buggy exp.backoff
      let pm2Command = 'pm2 stop genieacs-cwmp genieacs-cwmp-http';
      exec(pm2Command, async (err, stdout, stderr)=>{
        // Replace genieacs instances config with what flashman gives us
        let replace = 'const INSTANCES_COUNT = .*;';
        let newText = 'const INSTANCES_COUNT = ' + instances + ';';
        let sedExpr = 's/' + replace + '/' + newText + '/';
        let targetFile = 'controllers/external-genieacs/devices-api.js';
        let sedCommand = 'sed -i \'' + sedExpr + '\' ' + targetFile;

        // Update genieACS provisions and presets
        console.log('Updating genieACS provisions and presets');
        await updateProvisionsPresets();

        exec(sedCommand, (err, stdout, stderr)=>{
          exec('pm2 start genieacs-cwmp');
          if (config.tr069.insecure_enable) {
            exec('pm2 start genieacs-cwmp-http');
          }
        });
      });
    });
  });
};

const rebootFlashman = function(version) {
  // Stop genieacs before reloading flashman - this prevents exceptions and
  // racing conditions when onus try to connect - we use the service name to
  // avoid booting genieacs on servers where it was never booted in the first
  // place (as opposed to using environment.genieacs.json)
  exec('pm2 stop genieacs-cwmp genieacs-cwmp-http', (err, stdout, stderr)=>{
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
  getRemotePackage().then((remotePackage) => {
    let remoteVersion = remotePackage.version;
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
                  let genieUpgrades;
                  checkGenieNeedsUpdate(remotePackage)
                  .then((result)=>{
                    genieUpgrades = result;
                    return downloadUpdate(remoteVersion);
                  }, (rejectedValue)=>{
                    return Promise.reject(rejectedValue);
                  })
                  .then(()=>{
                    return updateDependencies();
                  }, (rejectedValue)=>{
                    return Promise.reject(rejectedValue);
                  })
                  .then(()=>{
                    return updateGenieACS(genieUpgrades);
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
        bypassMqttSecretCheck: matchedConfig.mqtt_secret_bypass,
        measureServerIP: matchedConfig.measureServerIP,
        measureServerPort: matchedConfig.measureServerPort,
        blockLicenseAtDeviceRemoval: matchedConfig.blockLicenseAtDeviceRemoval,
        tr069ServerURL: matchedConfig.tr069.server_url,
        tr069WebLogin: matchedConfig.tr069.web_login,
        tr069WebPassword: matchedConfig.tr069.web_password,
        tr069WebRemote: matchedConfig.tr069.remote_access,
        // transforming from milliseconds to seconds.
        tr069InformInterval: matchedConfig.tr069.inform_interval/1000,
        tr069SyncInterval: matchedConfig.tr069.sync_interval/1000,
        tr069RecoveryThreshold: matchedConfig.tr069.recovery_threshold,
        tr069OfflineThreshold: matchedConfig.tr069.offline_threshold,
        tr069STUNEnable: matchedConfig.tr069.stun_enable,
        tr069InsecureEnable: matchedConfig.tr069.insecure_enable,
        hasNeverEnabledInsecureTR069:
          matchedConfig.tr069.has_never_enabled_insecure,
        pon_signal_threshold: matchedConfig.tr069.pon_signal_threshold,
        pon_signal_threshold_critical:
          matchedConfig.tr069.pon_signal_threshold_critical,
        pon_signal_threshold_critical_high:
          matchedConfig.tr069.pon_signal_threshold_critical_high,
        isClientPayingPersonalizationApp: (
          matchedConfig.personalizationHash !== '' ? true : false),
        isSsidPrefixEnabled: matchedConfig.isSsidPrefixEnabled,
        ssidPrefix: matchedConfig.ssidPrefix,
        wanStepRequired: matchedConfig.certification.wan_step_required,
        ipv4StepRequired: matchedConfig.certification.ipv4_step_required,
        speedTestStepRequired:
          matchedConfig.certification.speedtest_step_required,
        ipv6StepRequired: matchedConfig.certification.ipv6_step_required,
        dnsStepRequired: matchedConfig.certification.dns_step_required,
        flashStepRequired: matchedConfig.certification.flashman_step_required,
        language: matchedConfig.language,
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
    throw new Error(t('geniePresetPutError', {errorline: __line}));
  });
};

const migrateDevicePrefixes = async function(config, oldPrefix) {
  // We must update the devices already in database with new values for their
  // local flag, based on the SSID that was already saved and their local flag
  let projection = {
    _id: 1, wifi_ssid: 1, wifi_ssid_5ghz: 1,
    isSsidPrefixEnabled: 1, wifi_is_5ghz_capable: 1,
  };
  // Make sure old prefix is an empty string if it is not set
  if (typeof oldPrefix !== 'string') {
    oldPrefix = '';
  }
  let devices;
  try {
    devices = await Devices.find({}, projection);
  } catch (e) {
    console.log('Error querying devices for prefix migration: ' + e);
    return;
  }
  console.log('Starting prefix migration for all devices');
  devices.forEach(async (device)=>{
    try {
      let localPrefixFlag = device.isSsidPrefixEnabled;
      let fullSsid2;
      if (localPrefixFlag) {
        fullSsid2 = oldPrefix + device.wifi_ssid;
      } else {
        fullSsid2 = device.wifi_ssid;
      }
      let fullSsid5 = '';
      if (device.wifi_is_5ghz_capable) {
        if (localPrefixFlag) {
          fullSsid5 = oldPrefix + device.wifi_ssid_5ghz;
        } else {
          fullSsid5 = device.wifi_ssid_5ghz;
        }
      }
      let cleanSsid2 = deviceHandler.cleanAndCheckSsid(
        config.ssidPrefix, fullSsid2,
      );
      let cleanSsid5 = deviceHandler.cleanAndCheckSsid(
        config.ssidPrefix, fullSsid5,
      );
      let hasPrefix2 = (cleanSsid2.ssid !== fullSsid2);
      let hasPrefix5 = (fullSsid5 === '' || cleanSsid5.ssid !== fullSsid5);
      if (hasPrefix2 && hasPrefix5) {
        device.isSsidPrefixEnabled = true;
        device.wifi_ssid = cleanSsid2.ssid;
        device.wifi_ssid_5ghz = cleanSsid5.ssid;
      } else {
        device.isSsidPrefixEnabled = false;
        device.wifi_ssid = fullSsid2;
        device.wifi_ssid_5ghz = fullSsid5;
      }
      await device.save();
    } catch (e) {
      console.log('Error migrating prefixes for device ' + device._id);
    }
  });
  console.log('Finished migrating prefixes for all devices');
};

updateController.setAutoConfig = async function(req, res) {
  try {
    let config = await Config.findOne({is_default: true});
    let validator = new Validator();
    if (!config) throw new {message: t('configNotFound', {errorline: __line})};
    config.autoUpdate = req.body.autoupdate == 'on' ? true : false;
    config.pppoePassLength = parseInt(req.body['minlength-pass-pppoe']);
    let bypassMqttSecretCheck = req.body['bypass-mqtt-secret-check'] === 'true';
    if (typeof bypassMqttSecretCheck === 'boolean') {
      config.mqtt_secret_bypass = bypassMqttSecretCheck;
    }
    let measureServerIP = req.body['measure-server-ip'];
    if (measureServerIP && !measureServerIP.match(util.ipv4Regex)) {
      return res.status(500).json({
        type: 'danger',
        message: t('fieldsInvalid', {errorline: __line}),
      });
    }
    let measureServerPort = parseInt(req.body['measure-server-port']);
    if (isNaN(measureServerPort)) {
      // No change
      measureServerPort = config.measureServerPort;
    }
    if ((measureServerPort) &&
        (measureServerPort < 1 || measureServerPort > 65535)
    ) {
      return res.status(500).json({
        type: 'danger',
        message: t('fieldsInvalid', {errorline: __line}),
      });
    }
    config.measureServerIP = measureServerIP;
    config.measureServerPort = measureServerPort;

    let mustBlockLicense = req.body['must-block-license-at-removal'];
    mustBlockLicense = (
      mustBlockLicense === true || mustBlockLicense === 'true'
    ) ? true : false;
    config.blockLicenseAtDeviceRemoval = mustBlockLicense;

    let ponSignalThreshold = parseInt(req.body['pon-signal-threshold']);
    if (isNaN(ponSignalThreshold)) {
      ponSignalThreshold = config.tr069.pon_signal_threshold;
    }
    if ((ponSignalThreshold) &&
        (ponSignalThreshold < -100 || ponSignalThreshold > 100)
    ) {
      return res.status(500).json({
        type: 'danger',
        message: t('fieldsInvalid', {errorline: __line}),
      });
    }
    config.tr069.pon_signal_threshold = ponSignalThreshold;

    let ponSignalThresholdCritical = parseInt(
      req.body['pon-signal-threshold-critical']);
    if (isNaN(ponSignalThresholdCritical)) {
      ponSignalThresholdCritical = config.tr069.pon_signal_threshold_critical;
    }
    if ((ponSignalThresholdCritical) &&
        (ponSignalThresholdCritical < -100 || ponSignalThresholdCritical > 100)
    ) {
      return res.status(500).json({
        type: 'danger',
        message: t('fieldsInvalid', {errorline: __line}),
      });
    }
    config.tr069.pon_signal_threshold_critical = ponSignalThresholdCritical;

    let willMigrateDevicePrefixes = {migrate: false};
    if (config.personalizationHash !== '') {
      const isSsidPrefixEnabled =
        (req.body['is-ssid-prefix-enabled'] == 'on') ? true : false;
      const validField = validator.validateSSIDPrefix(req.body['ssid-prefix'],
        isSsidPrefixEnabled);
      if (!validField.valid) {
        return res.status(500).json({
          type: 'danger',
          message: t('fieldsInvalid', {errorline: __line}),
        });
      }
      /* check if ssid prefix was not empty and for some reason is coming
        from UI a empty ssid prefix */
      if (config.ssidPrefix !== '' && req.body['ssid-prefix'] === '') {
        return res.status(500).json({
          type: 'danger',
          message: t('ssidPrefixEmptyError'),
        });
      // If prefix is disabled, do not allow changes in current prefix
      } else if (!isSsidPrefixEnabled &&
                 config.ssidPrefix !== '' &&
                 config.ssidPrefix !== req.body['ssid-prefix']) {
        return res.status(500).json({
          type: 'danger',
          message: t('ssidPrefixDisabledAlterationError'),
        });
      }
      // If prefix is enabled and has changed, we need to migrate devices in
      // database to properly set local flags -> avoids cases where prefix will
      // be inserted / removed out of nowhere
      if (
        isSsidPrefixEnabled && config.ssidPrefix !== req.body['ssid-prefix']
      ) {
        willMigrateDevicePrefixes = {
          migrate: true, oldPrefix: config.ssidPrefix,
        };
      }
      config.ssidPrefix = req.body['ssid-prefix'];
      config.isSsidPrefixEnabled = isSsidPrefixEnabled;
    }

    let ponSignalThresholdCriticalHigh = parseInt(
      req.body['pon-signal-threshold-critical-high']);

    if (isNaN(ponSignalThresholdCriticalHigh)) {
      ponSignalThresholdCriticalHigh = config.tr069.pon_signal_threshold;
    }
    if ((ponSignalThresholdCriticalHigh) &&
        (ponSignalThresholdCriticalHigh < -100 ||
         ponSignalThresholdCriticalHigh > 100)
    ) {
      return res.status(500).json({
        type: 'danger',
        message: t('fieldsInvalid', {errorline: __line}),
      });
    }
    config.tr069.pon_signal_threshold_critical_high =
      ponSignalThresholdCriticalHigh;
    let message = t('operationSuccessful');

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
    // validate that it is a strong password, but only if value changes
    // first character cannot be special character
    if (onuWebPassword !== config.tr069.web_password) {
      let passRegex = new RegExp(''
        + /(?=.{8,16}$)/.source
        + /(?=.*[A-Z])/.source
        + /(?=.*[a-z])/.source
        + /(?=.*[0-9])/.source
        + /(?=.*[-!@#$%^&*+_.]).*/.source);
      if (
        !passRegex.test(onuWebPassword) ||
        '-!@#$%^&*+_.'.includes(onuWebPassword[0])
      ) {
        return res.status(500).json({
          type: 'danger',
          message: t('tr069WebPasswordValidationError'),
        });
      }
    }
    let onuRemote = (req.body.onu_web_remote === 'on') ? true : false;
    // parsing fields to number.
    let tr069InformInterval = Number(req.body['inform-interval']);
    let tr069SyncInterval = Number(req.body['sync-interval']);
    let tr069RecoveryThreshold =
      Number(req.body['lost-informs-recovery-threshold']);
    let tr069OfflineThreshold =
      Number(req.body['lost-informs-offline-threshold']);
    let STUNEnable = (req.body.stun_enable === 'on') ? true : false;
    let insecureEnable = (req.body.insecure_enable === 'on') ? true : false;
    let changedInsecure = (insecureEnable !== config.tr069.insecure_enable);
    // if all fields are numeric,
    if (!isNaN(tr069InformInterval) && !isNaN(tr069RecoveryThreshold)
     && !isNaN(tr069OfflineThreshold)
     // and inform interval, recovery and offline values are within boundaries,
     && tr069InformInterval >= 60 && tr069InformInterval <= 86400
     && tr069SyncInterval >= 60 && tr069SyncInterval <= 86400
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
      config.tr069.server_url = tr069ServerURL;
      config.tr069.web_login = onuWebLogin;
      config.tr069.web_password = onuWebPassword;
      config.tr069.remote_access = onuRemote;
      // transforming from seconds to milliseconds.
      config.tr069.inform_interval = tr069InformInterval*1000;
      config.tr069.sync_interval = tr069SyncInterval*1000;
      config.tr069.recovery_threshold = tr069RecoveryThreshold;
      config.tr069.offline_threshold = tr069OfflineThreshold;
      config.tr069.pon_signal_threshold = ponSignalThreshold;
      config.tr069.pon_signal_threshold_critical = ponSignalThresholdCritical;
      config.tr069.pon_signal_threshold_critical_high =
        ponSignalThresholdCriticalHigh;
      config.tr069.stun_enable = STUNEnable;
      config.tr069.insecure_enable = insecureEnable;
      config.tr069.has_never_enabled_insecure =
        (config.tr069.has_never_enabled_insecure && !insecureEnable);
    } else { // if one single rule doesn't pass the test.
      // respond error without much explanation.
      return res.status(500).json({
        type: 'danger',
        message: t('fieldsInvalid', {errorline: __line}),
      });
    }

    let wanStepRequired = req.body['wan-step-required'] === 'true';
    let ipv4StepRequired = req.body['ipv4-step-required'] === 'true';
    let speedTestStepRequired = req.body['speedtest-step-required'] === 'true';
    let ipv6StepRequired = req.body['ipv6-step-required'] === 'true';
    let dnsStepRequired = req.body['dns-step-required'] === 'true';
    let flashmanStepRequired = req.body['flashman-step-required'] === 'true';
    if (typeof wanStepRequired === 'boolean') {
      config.certification.wan_step_required = wanStepRequired;
    }
    if (typeof ipv4StepRequired === 'boolean') {
      config.certification.ipv4_step_required = ipv4StepRequired;
    }
    if (typeof speedTestStepRequired === 'boolean') {
      config.certification.speedtest_step_required = speedTestStepRequired;
    }
    if (typeof ipv6StepRequired === 'boolean') {
      config.certification.ipv6_step_required = ipv6StepRequired;
    }
    if (typeof dnsStepRequired === 'boolean') {
      config.certification.dns_step_required = dnsStepRequired;
    }
    if (typeof flashmanStepRequired === 'boolean') {
      config.certification.flashman_step_required = flashmanStepRequired;
    }

    // language config change.
    let lng = req.body['selected-language'];
    // if received language is different from current language.
    if (lng !== language.i18next.resolvedLanguage) {
      // try to change the language in i18next.
      let {status, message} = await language.updateLanguage(lng).then((x) => x);
      if (status !== 200) { // if attempt, of changing language, didn't work.
        // send the returned status and message in response.
        return res.status(status).json({type: 'danger', message: message});
      }
      // if it worked. it's been already saved in the database.
    }

    await config.save();

    if (willMigrateDevicePrefixes.migrate) {
      migrateDevicePrefixes(config, willMigrateDevicePrefixes.oldPrefix);
    }

    // Start / stop insecure GenieACS instance if parameter changed
    if (changedInsecure && config.tr069.insecure_enable) {
      startInsecureGenieACS();
    } else if (changedInsecure) {
      stopInsecureGenieACS();
    }

    return res.status(200).json({
      type: 'success',
      message: message,
    });
  } catch (err) {
    console.log(err.message ? err.message : err);
    return res.status(500).json({
      type: 'danger',
      message: (err.message) ? err.message :
                               t('configSaveError', {errorline: __line}),
    });
  }
};

updateController.updateAppPersonalization = async function(app) {
  let controlReq = await controlApi.getPersonalizationHash(app);
  if (controlReq.success == true) {
    let hash = controlReq.personalizationHash;
    let android = controlReq.androidLink;
    let ios = controlReq.iosLink;

    Config.findOne({is_default: true}, function(err, config) {
      if (err || !config) {
        console.error('Error when fetching Config document');
        return;
      }
      config.personalizationHash = hash;
      config.androidLink = android;
      config.iosLink = ios;
      config.save(function(err) {
        if (err) {
          console.error('Config save returned error: ' + err);
          return;
        }
      });
    });
  } else {
    console.error('App personalization hash update error');
  }
};

updateController.updateLicenseApiSecret = async function(app) {
  let controlReq = await controlApi.getLicenseApiSecret(app);
  if (controlReq.success == true) {
    const licenseApiSecret = controlReq.apiSecret;
    const company = controlReq.company;

    Config.findOne({is_default: true}, function(err, config) {
      if (err || !config) {
        console.error('Error when fetching Config document');
        return;
      }
      config.licenseApiSecret = licenseApiSecret;
      config.company = company;
      config.save(function(err) {
        if (err) {
          console.error('Config save returned error: ' + err);
          return;
        }
      });
    });
  } else {
    console.error('License API secret update error');
  }
};

module.exports = updateController;
