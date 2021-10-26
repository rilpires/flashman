
const fs = require('fs');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const schedule = require('node-schedule');
const mongoose = require('mongoose');
const passport = require('passport');
const fileUpload = require('express-fileupload');
const expressOasGenerator = require('express-oas-generator');
const sio = require('./sio');
const serveStatic = require('serve-static');
const md5File = require('md5-file');
const meshHandlers = require('./controllers/handlers/mesh');
const utilHandlers = require('./controllers/handlers/util');
let session = require('express-session');

let updater = require('./controllers/update_flashman');
let acsDeviceController = require('./controllers/acs_device_info');
let userController = require('./controllers/user');
let deviceUpdater = require('./controllers/update_scheduler');
let controlApi = require('./controllers/external-api/control');
let Config = require('./models/config');
let User = require('./models/user');
let Role = require('./models/role');
let Device = require('./models/device');
let index = require('./routes/index');
let packageJson = require('./package.json');

let app = express();

// Express OpenAPI docs generator handling responses first
const { SPEC_OUTPUT_FILE_BEHAVIOR } = expressOasGenerator;
if (!process.env.production) {
  expressOasGenerator.handleResponses(
    app, 
    {
      mongooseModels: mongoose.modelNames(),
      swaggerDocumentOptions: {
        customCss: `
          .swagger-ui .topbar {
            background-color: #4db6ac;
          }
        `
      },
      specOutputFileBehaviour: SPEC_OUTPUT_FILE_BEHAVIOR.PRESERVE,
      alwaysServeDocs: false,
    }
  );
};

// Specify some variables available to all views
app.locals.appVersion = packageJson.version;

const databaseName = process.env.FLM_DATABASE_NAME === undefined ?
  'flashman' :
  process.env.FLM_DATABASE_NAME;

mongoose.connect(
  'mongodb://' + process.env.FLM_MONGODB_HOST + ':27017/' + databaseName,
  {useNewUrlParser: true,
   serverSelectionTimeoutMS: 2**31-1, // biggest positive signed integer with 32 bits.
   useUnifiedTopology: true,
   useFindAndModify: false,
   useCreateIndex: true,
});
mongoose.set('useCreateIndex', true);

// Release dir must exists
if (!fs.existsSync(process.env.FLM_IMG_RELEASE_DIR) && process.env.FLM_IMG_RELEASE_DIR !== undefined) {
  fs.mkdirSync(process.env.FLM_IMG_RELEASE_DIR);
}

// Temporary dir must exist
if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp');
}

// configurations related to deployment are in an untracked file.
let deploymentConfigurations = './config/configs.js'
fs.access(deploymentConfigurations, fs.constants.F_OK, function (err) { // check file accessibility.
  let default_license_control_fqdn = "controle.anlix.io"

  if (err) { // if file doesn't exist or isn't accessible. use default values.
    process.env.LC_FQDN = default_license_control_fqdn
    return
  }

  // if file exist, get configurations from it. 
  // if a configuration doesn't exist in file, use default value.
  let configs = require(deploymentConfigurations); 
  process.env.LC_FQDN = configs.license_control_fqdn || default_license_control_fqdn 
});


if (process.env.FLM_COMPANY_SECRET) {
  app.locals.secret = process.env.FLM_COMPANY_SECRET;
} else {
  // check secret file and load if available
  let companySecret = {};
  try {
    let fileContents = fs.readFileSync('./secret.json', 'utf8');
    companySecret = JSON.parse(fileContents);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('Shared secret file not found!');
      companySecret['secret'] = '';
    } else if (err.code === 'EACCES') {
      console.log('Cannot open shared secret file!');
      companySecret['secret'] = '';
    } else {
      throw err;
    }
  }
  app.locals.secret = companySecret.secret;
}

// Only master instance should do DB checks
if (parseInt(process.env.NODE_APP_INSTANCE) === 0) {
  // Check default config
  controlApi.checkPubKey(app).then(() => {
    // Get message configs from control
    controlApi.getMessageConfig(app);
  });

  // Check administration user existence
  User.find({is_superuser: true}, function(err, matchedUsers) {
    if (err || !matchedUsers || 0 === matchedUsers.length) {
      let newSuperUser = new User({
        name: process.env.FLM_ADM_USER,
        password: process.env.FLM_ADM_PASS,
        is_superuser: true,
      });
      newSuperUser.save();
    }
  });
  // Check default role existence
  Role.find({}, function(err, roles) {
    if (err || !roles || 0 === roles.length) {
      let managerRole = new Role({
        name: 'Gerente',
        grantWifiInfo: 2,
        grantPPPoEInfo: 2,
        grantPassShow: true,
        grantFirmwareUpgrade: true,
        grantWanType: true,
        grantDeviceId: true,
        grantDeviceActions: true,
        grantDeviceRemoval: true,
        grantDeviceAdd: true,
        grantFirmwareManage: true,
        grantAPIAccess: false,
        grantNotificationPopups: true,
        grantLanEdit: true,
        grantLanDevices: 2,
        grantLanDevicesBlock: true,
        grantSiteSurvey: true,
        grantMeasureDevices: 2,
        grantOpmodeEdit: true,
        grantVlan: 2,
        grantVlanProfileEdit: true,
        grantWanBytesView: true,
        grantCsvExport: true,
        grantFirmwareBetaUpgrade: true,
        grantFirmwareRestrictedUpgrade: true,
      });
      managerRole.save();
    }
  });
  // Check migration for devices checked for upgrade
  // Check mesh key existence or generate it
  Device.find({$or: [{installed_release: {$exists: false}},
                     {mesh_key: {$exists: false}},
                     {bridge_mode_enabled: true, connection_type: 'pppoe'},
                     {isSsidPrefixEnabled: {$exists: false}},
                     {connection_type: 'dhcp', pppoe_user: {$ne: ''}},
  ]},
  {installed_release: true, do_update: true,
   do_update_status: true, release: true,
   mesh_key: true, mesh_id: true,
   bridge_mode_enabled: true, connection_type: true,
   pppoe_user: true, pppoe_password: true, isSsidPrefixEnabled: true},
  function(err, devices) {
    if (!err && devices) {
      for (let idx = 0; idx < devices.length; idx++) {
        let saveDevice = false;
        if (!devices[idx].installed_release) {
          if (devices[idx].do_update == true) {
            devices[idx].do_update_status = 0; // waiting
          } else {
            devices[idx].installed_release = devices[idx].release;
          }
          saveDevice = true;
        }
        // Check mesh key existence or generate it
        if (!devices[idx].mesh_key || !devices[idx].mesh_id) {
          devices[idx].mesh_id = meshHandlers.genMeshID();
          devices[idx].mesh_key = meshHandlers.genMeshKey();
          saveDevice = true;
        }
        // Fix bugs of bridge mode present in version 0.26.0
        // of Flashbox firmware
        if (devices[idx].bridge_mode_enabled === true &&
            devices[idx].connection_type === 'pppoe'
        ) {
          devices[idx].connection_type = 'dhcp';
          saveDevice = true;
        }
        // Remove pppoe credentials from dhcp devices
        if (devices[idx].connection_type === 'dhcp' &&
            (devices[idx].pppoe_user !== '' ||
             devices[idx].pppoe_password !== '')
        ) {
          devices[idx].pppoe_user = '';
          devices[idx].pppoe_password = '';
          saveDevice = true;
        }
        /*
          Check isSsidPrefixEnabled existence and
          set it to default (false for old devices regs)
        */
        if (typeof devices[idx].isSsidPrefixEnabled === 'undefined') {
          devices[idx].isSsidPrefixEnabled = false;
          saveDevice = true;
        }
        if (saveDevice) {
          devices[idx].save();
        }
      }
    }
  });
  /* Check if not exists indexes and sync them */
  Device.collection.getIndexes({full: true}).then(async (idxs) => {
     if (idxs.length < 4) {
       console.log('Creating devices indexes');
       await Device.syncIndexes();
     }
  }).catch(console.error);

  // put default values in old config
  Config.findOne({is_default: true}, function(err, config) {
    let saveConfig = false;
    if (!err && config) {
      if (typeof config.isSsidPrefixEnabled === 'undefined') {
        config.isSsidPrefixEnabled = false;
        saveConfig = true;
      }
      if (typeof config.ssidPrefix === 'undefined') {
        config.ssidPrefix = '';
        saveConfig = true;
      }
      let vlans = [];
      for (let i = 0; i < config.vlans_profiles.length; i++) {
        vlans.push(config.vlans_profiles[i].vlan_id);
      }
      // 1 is the mandatory lan vlan id
      if (! vlans.includes(1)) {
        config.vlans_profiles.push({vlan_id: 1, profile_name: 'LAN'});
        saveConfig = true;
      }
    }
    if (saveConfig) {
      config.save();
    }
  });
}

// Check md5 file hashes on firmware directory
if (parseInt(process.env.NODE_APP_INSTANCE) === 0) {
  fs.readdirSync(process.env.FLM_IMG_RELEASE_DIR).forEach((filename) => {
    // File name pattern is VENDOR_MODEL_MODELVERSION_RELEASE.md5
    let fnameSubStrings = filename.split('_');
    let releaseSubStringRaw = fnameSubStrings[fnameSubStrings.length - 1];
    let releaseSubStringsRaw = releaseSubStringRaw.split('.');
    if (releaseSubStringsRaw[1] == 'md5') {
      // Skip MD5 hash files
      return;
    } else if (releaseSubStringsRaw[1] == 'bin') {
      const md5fname = '.' + filename.replace('.bin', '.md5');
      const md5fpath = path.join(process.env.FLM_IMG_RELEASE_DIR, md5fname);
      const filePath = path.join(process.env.FLM_IMG_RELEASE_DIR, filename);
      if (!fs.existsSync(md5fpath)) {
        // Generate MD5 file
        const md5Checksum = md5File.sync(filePath);
        fs.writeFile(md5fpath, md5Checksum, function(err) {
          if (err) {
            console.log('Error generating MD5 hash file: ' + md5fpath);
            throw err;
          }
        });
      }
    }
  });
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(bodyParser.raw({type: 'application/octet-stream'}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));
// HTTP requests log only errors
app.use(logger('combined', {
  skip: function(req, res) {
    return res.statusCode < 400;
  },
}));
app.use(cookieParser());
app.use('/dist',
  serveStatic(path.join(__dirname, 'public/dist'), {
    dotfiles: 'ignore',
    maxAge: false,
}));
app.use('/images',
  serveStatic(path.join(__dirname, 'public/images'), {
    dotfiles: 'ignore',
    maxAge: '1d',
}));
app.use('/firmwares',
  serveStatic(path.join(__dirname, 'public/firmwares'), {
    dotfiles: 'ignore',
    cacheControl: false,
    setHeaders: setMd5Sum,
}));

/**
 * Generate MD5 hash for firmware files
 * @param {string} res Response to be modified
 * @param {string} filePath Path to file with MD5 sum pending
 */
function setMd5Sum(res, filePath) {
  let md5Checksum;
  let pathElements = filePath.split('/');
  let fname = pathElements[pathElements.length - 1];

  const md5fname = '.' + fname.replace('.bin', '.md5');
  try {
    md5Checksum = fs.readFileSync(
      path.join(process.env.FLM_IMG_RELEASE_DIR, md5fname), 'utf8');
    res.setHeader('X-Checksum-Md5', md5Checksum);
  } catch (err) {
    md5Checksum = '';
    res.setHeader('X-Checksum-Md5', md5Checksum);
  }
}

let sessParam = session({
  secret: app.locals.secret,
  resave: false,
  saveUninitialized: false,
});

app.use(sessParam);
sio.anlixBindSession(sessParam);
app.use(passport.initialize());
app.use(passport.session());
app.use(fileUpload());

app.use('/', index);

// NEVER PUT THIS FUNCTION BELOW 404 HANDLER!
if (!process.env.production) {
  expressOasGenerator.handleRequests();
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.type = 'danger';
  res.locals.message = err.message;
  res.locals.status = err.status;
  res.locals.stack = process.env.production ? '' : err.stack;

  // render the error page
  res.status(err.status || 500);
  if (req.accepts('text/html') && !req.is('application/json')) {
    res.render('error');
  } else {
    // REST API response
    return res.json({
      type: res.locals.type,
      status: res.locals.status,
      message: res.locals.message,
      stack: res.locals.stack,
    });
  }
});

// Check device update schedule, if active must re-initialize
if (parseInt(process.env.NODE_APP_INSTANCE) === 0) {
  Config.findOne({is_default: true}, function(err, matchedConfig) {
    if (err || !matchedConfig || !matchedConfig.device_update_schedule) return;
    // Do nothing if no active schedule
    if (!matchedConfig.device_update_schedule.is_active) return;
    deviceUpdater.recoverFromOffline(matchedConfig);
  }).lean();
}

if (parseInt(process.env.NODE_APP_INSTANCE) === 0 && (
    typeof process.env.FLM_SCHEDULER_ACTIVE === 'undefined' ||
    (process.env.FLM_SCHEDULER_ACTIVE === 'true' ||
     process.env.FLM_SCHEDULER_ACTIVE === true))
) {
  let schedulePort = 3000;
  if (typeof process.env.FLM_SCHEDULE_PORT !== 'undefined') {
    schedulePort = process.env.FLM_SCHEDULE_PORT;
  }
  app.listen(parseInt(schedulePort), function() {
    let late8pmRule = new schedule.RecurrenceRule();
    late8pmRule.hour = 20;
    late8pmRule.minute = 0;
    // Schedule automatic update
    schedule.scheduleJob(late8pmRule, function() {
      updater.update();
    });
    let midnightRule = new schedule.RecurrenceRule();
    midnightRule.hour = 0;
    midnightRule.minute = utilHandlers.getRandomInt(10, 50);
    schedule.scheduleJob(midnightRule, function() {
      // Schedule license report
      acsDeviceController.reportOnuDevices(app);
      userController.checkAccountIsBlocked(app);
      updater.updateAppPersonalization(app);
    });

    acsDeviceController.reportOnuDevices(app);
    userController.checkAccountIsBlocked(app);
    updater.updateAppPersonalization(app);
    // Restart genieacs service whenever Flashman is restarted
    updater.rebootGenie(process.env.instances);
    // Force an update check to alert user on app startup
    updater.checkUpdate();

    let hourlyRule = new schedule.RecurrenceRule();
    hourlyRule.minute = 10;
    schedule.scheduleJob(hourlyRule, function() {
      // Issue a command to offline ONUs to try and fix exp. backoff bug
      // This is only relevant for a few ONU models, and currently this is
      // out best fix available...
      acsDeviceController.pingOfflineDevices();
    });
  });
}

module.exports = app;
