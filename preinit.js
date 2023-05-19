/**
 *  This module exports a list of promises, supposed to be executed
 * sequentially, right before express server going up.
 * It >> SHOULD NOT << require app.js to make sure we don't have any
 * cyclic dependencies
 */

const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const mongoose = require('mongoose');
const md5File = require('md5-file');
const utilHandlers = require('./controllers/handlers/util');
const TasksAPI = require('./controllers/external-genieacs/tasks-api');

let updater = require('./controllers/update_flashman');
let acsDeviceController = require('./controllers/acs_device_info');
let userController = require('./controllers/user');
let Config = require('./models/config');
const runMigrations = require('./migrations');
const audit = require('./controllers/audit');

let instanceNumber = parseInt(process.env.NODE_APP_INSTANCE ||
  process.env.FLM_DOCKER_INSTANCE || 0);
if (process.env.FLM_DOCKER_INSTANCE && instanceNumber > 0) {
instanceNumber = instanceNumber - 1; // Docker swarm starts counting at 1
}

const useScheduler = (instanceNumber === 0 && (
  typeof process.env.FLM_SCHEDULER_ACTIVE === 'undefined' ||
  (process.env.FLM_SCHEDULER_ACTIVE === 'true' ||
   process.env.FLM_SCHEDULER_ACTIVE === true)));

const startMongoose = function() {
  return new Promise((resolve, reject)=> {
    const databaseName = process.env.FLM_DATABASE_NAME === undefined ?
      'flashman' :
      process.env.FLM_DATABASE_NAME;
    const MONGOHOST = (process.env.FLM_MONGODB_HOST || 'localhost');
    const MONGOPORT = (process.env.FLM_MONGODB_PORT || 27017);
    let mongoURI = 'mongodb://' + MONGOHOST + ':' + MONGOPORT + '/' + databaseName;
    if (process.env.MONGODB_USE_HA === true ||
        process.env.MONGODB_USE_HA === 'true'
    ) {
      // FLM_MONGODB_HA_LIST format 'mongodb,mongoha_mongodb2,mongoha_mongodb3'
      mongoURI = 'mongodb://' + process.env.FLM_MONGODB_HA_LIST +
                '/' + databaseName + '?replicaSet=rs0';
    }
    mongoose.connect(
      mongoURI,
      {
        useNewUrlParser: true,
        serverSelectionTimeoutMS: 2**31-1, // biggest positive signed 32bits int
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
        maxPoolSize: 200,
      },
    )
    .then((_)=>{
      console.log(`Connected to Mongo database "${databaseName}"`
      + ` on "${MONGOHOST}:${MONGOPORT}"`);
      resolve();
    })
    .catch((_)=>{
      console.error(`Couldnt connect to Mongo database "${databaseName}"`
      + `on "${MONGOHOST}:${MONGOPORT}`);
      reject();
    });
    mongoose.set('useCreateIndex', true);
  });
};

const assuringDirectories = function() {
  return new Promise((resolve, reject)=>{
    try {
      if (!fs.existsSync(process.env.FLM_IMG_RELEASE_DIR) &&
        process.env.FLM_IMG_RELEASE_DIR !== undefined
      ) {
        fs.mkdirSync(process.env.FLM_IMG_RELEASE_DIR);
        if (!fs.existsSync('./tmp')) {
          fs.mkdirSync('./tmp');
        }
      }
      resolve();
    } catch (err) {
      console.error('Error creating neccessary filesystem folders');
      reject(err);
    }
  });
};

const assuringFirmwareMD5 = function() {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise( async (resolve, reject)=>{
    // Check md5 file hashes on firmware directory
    let filenames = fs.readdirSync(process.env.FLM_IMG_RELEASE_DIR);
    let promises = filenames
      .map((filename)=> new Promise((subresolve, subreject)=>{
        // File name pattern is VENDOR_MODEL_MODELVERSION_RELEASE.md5
        let fnameSubStrings = filename.split('_');
        let releaseSubStringRaw = fnameSubStrings[fnameSubStrings.length - 1];
        let releaseSubStringsRaw = releaseSubStringRaw.split('.');
        if (releaseSubStringsRaw[1] == 'md5') {
          // Skip MD5 hash files
          return subresolve();
        } else if (releaseSubStringsRaw[1] == 'bin') {
          const md5fname = '.' + filename.replace('.bin', '.md5');
          const md5fpath = path.join(process.env.FLM_IMG_RELEASE_DIR, md5fname);
          const filePath = path.join(process.env.FLM_IMG_RELEASE_DIR, filename);
          if (!fs.existsSync(md5fpath)) {
            // Generate MD5 file
            const md5Checksum = md5File.sync(filePath);
            fs.writeFile(md5fpath, md5Checksum, function(err) {
              if (err) {
                console.error('Error generating MD5 hash file: ' + md5fpath);
                return subreject(err);
              } else {
                return subresolve();
              }
            });
          }
        } else {
          return subresolve();
        }
      }));
    for (let i = 0; i < promises.length; i++) {
      await (promises[i]).catch(reject);
    }
    return resolve();
  });
};

const activateSchedulers = function() {
  return new Promise((resolve, reject)=>{
    // Runs every day at 20:00 - automatic update
    let late8pmRule = new schedule.RecurrenceRule();
    late8pmRule.hour = 20;
    late8pmRule.minute = 0;
    schedule.scheduleJob(late8pmRule, function() {
      updater.update();
    });

    // Runs every day at 00:00 - sync data with anlix control
    let midnightRule = new schedule.RecurrenceRule();
    midnightRule.hour = 0;
    midnightRule.minute = utilHandlers.getRandomInt(10, 50);
    schedule.scheduleJob(midnightRule, function() {
      // Schedule license report
      acsDeviceController.reportOnuDevices();
      userController.checkAccountIsBlocked();
      updater.updateAppPersonalization();
      updater.updateLicenseApiSecret();
    });

    // Runs every day at 04:00 - contact offline TR069 devices
    let early4amRule = new schedule.RecurrenceRule();
    early4amRule.hour = 4;
    early4amRule.minute = 0;
    schedule.scheduleJob(early4amRule, function() {
      // Issue a command to offline ONUs to try and fix exp. backoff bug
      // This is only relevant for a few ONU models, and currently this is
      // out best fix available...
      acsDeviceController.pingOfflineDevices();
    });

    // Runs every day at 05:00 - clean up tasks in genieacs database
    let early5amRule = new schedule.RecurrenceRule();
    early5amRule.hour = 5;
    early5amRule.minute = 0;
    schedule.scheduleJob(early5amRule, function() {
      // After issuing a command to offline ONUs to try and fix exp. backoff
      // bug its necessary to clean tasks that will not be effective. Lots of
      // tasks generated a great mongoDB CPU overhead
      TasksAPI.deleteGetParamTasks();
    });

    /* Routines to execute on each startup/reload of main flashman proccess */
    acsDeviceController.reportOnuDevices();
    userController.checkAccountIsBlocked();
    updater.updateAppPersonalization();
    updater.updateLicenseApiSecret();
    updater.updateApiUserLogin();
    // Only used at scenarios where Flashman was installed directly on a host
    // Undefined - Covers legacy host install cases
    if (typeof process.env.FLM_IS_A_DOCKER_RUN === 'undefined' ||
        process.env.FLM_IS_A_DOCKER_RUN.toString() !== 'true') {
      // Restart TR-069 services whenever Flashman is restarted
      if (typeof process.env.FLM_CWMP_CALLBACK_INSTANCES !== 'undefined') {
        updater.rebootGenie(process.env.FLM_CWMP_CALLBACK_INSTANCES);
      } else {
        updater.rebootGenie(process.env.instances);
      }
    } else {
      updater.updateProvisionsPresets();
    }
    // Force an update check to alert user on app startup
    updater.checkUpdate();
    resolve();
  });
};

const recoverySchedule = function() {
  return new Promise((resolve, reject)=>{
    // Check device update schedule, if active must re-initialize
    let deviceUpdater = require('./controllers/update_scheduler');
    Config.findOne({is_default: true}, function(err, matchedConfig) {
      if (err || !matchedConfig || !matchedConfig.device_update_schedule) {
        return resolve();
      }
      // Do nothing if no active schedule
      if (!matchedConfig.device_update_schedule.is_active) return resolve();
      deviceUpdater.recoverFromOffline(matchedConfig);
      return resolve();
    }).lean();
  });
};

// "promiseCreator" field SHOULD be a function that returns a promise,
// not a promise, or else it would start as soon as this synchronous code
// is executed, not preserving the sequential order
let stepObjects = [
  {name: 'Connecting to MongoDB', promiseCreator: startMongoose},
  {name: 'Assuring directories exists', promiseCreator: assuringDirectories},
  (instanceNumber === 0 )
    ? {name: 'Running migrations', promiseCreator: runMigrations}
    : undefined,
  {name: 'Initializing audit', promiseCreator: audit.init},
  (instanceNumber === 0 )
    ? {name: 'Assuring flashbox MD5', promiseCreator: assuringFirmwareMD5}
    : undefined,
  useScheduler
    ? {name: 'Activating schedulers', promiseCreator: activateSchedulers}
    : undefined,
  (instanceNumber === 0)
    ? {name: 'Activating recovery scheduler', promiseCreator: recoverySchedule}
    : undefined,
];

stepObjects = stepObjects.filter((prom)=>prom);
let preinitPromises = stepObjects.map((stepObject, i)=>{
  // eslint-disable-next-line no-async-promise-executor
  return function() {
    return new Promise((resolve, reject)=>{
      let prestring =
        `[${stepObject.name} (Step #${i+1}/${stepObjects.length})]`;
      let timeoutMs = stepObject.timeout_ms || 10000;
      let errorTimeout = setTimeout(()=>{
        console.error(`${prestring} - Timeout`);
        reject();
      }, timeoutMs);
      console.log(`${prestring} - Starting`);
      stepObject.promiseCreator()
        .then(()=>{
          console.log(`${prestring} - Done`);
          clearTimeout(errorTimeout);
          resolve();
        })
        .catch((err)=>{
          console.error(`${prestring} - Failed`);
          console.error(err);
          clearTimeout(errorTimeout);
          reject();
          process.exit(1);
        });
    });
  };
});

module.exports = preinitPromises;

