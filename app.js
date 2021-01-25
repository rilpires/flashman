
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
const sio = require('./sio');
const serveStatic = require('serve-static');
const md5File = require('md5-file');
const request = require('request-promise-native');
const meshHandlers = require('./controllers/handlers/mesh');
let session = require('express-session');

let measurer = require('./controllers/measure');
let updater = require('./controllers/update_flashman');
let deviceUpdater = require('./controllers/update_scheduler');
let keyHandlers = require('./controllers/handlers/keys');
let Config = require('./models/config');
let User = require('./models/user');
let Role = require('./models/role');
let Device = require('./models/device');
let Firmware = require('./models/firmware');
let index = require('./routes/index');
let packageJson = require('./package.json');

let app = express();

// Specify some variables available to all views
app.locals.appVersion = packageJson.version;

mongoose.connect(
  'mongodb://' + process.env.FLM_MONGODB_HOST + ':27017/flashman',
  {useNewUrlParser: true,
   // reconnectTries: Number.MAX_VALUE,
   // reconnectInterval: 1000,
   useUnifiedTopology: true,
   useFindAndModify: false,
   useCreateIndex: true,
});
mongoose.set('useCreateIndex', true);

// Release dir must exists
if (!fs.existsSync(process.env.FLM_IMG_RELEASE_DIR)) {
  fs.mkdirSync(process.env.FLM_IMG_RELEASE_DIR);
}

// Temporary dir must exist
if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp');
}

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
  let pubKeyUrl = 'http://localhost:9000/api/flashman/pubkey/register';
  if (process.env.production) {
    pubKeyUrl = 'https://controle.anlix.io/api/flashman/pubkey/register';
  }
  // Check default config
  Config.findOne({is_default: true}, async function(err, matchedConfig) {
    // Check config existence and create one if not found
    if (err || !matchedConfig) {
      let newConfig = new Config({
        is_default: true,
        autoUpdate: true,
        pppoePassLength: 8,
      });
      await newConfig.save();
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
  Device.find({}, function(err, devices) {
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
        if (saveDevice) {
          devices[idx].save();
        }
      }
    }
  });

  //check that is_beta and is_restricted are correct
  Firmware.find({}, function(err, firmwares) {
    if (!err && firmwares) {
      for (let idx = 0; idx < firmwares.length; idx++) {
        let saveFirmware = false;
        if (firmwares[idx].is_restricted == undefined){
          firmwares[idx].is_restricted = false;
          saveFirmware = true;
        }
        if (firmwares[idx].is_beta == undefined){
          firmwares[idx].is_beta = false;
          saveFirmware = true;
        }
        if (firmwares[idx].is_beta == false && firmwares[idx].release.includes('B')){
          firmwares[idx].is_beta = true;
          saveFirmware = true;
        }
        if (saveFirmware) {
          firmwares[idx].save();
        }
      }
    }
  });
}

// Get message configs from control
if (parseInt(process.env.NODE_APP_INSTANCE) === 0) {
  request({
    url: 'https://controle.anlix.io/api/message/config',
    method: 'POST',
    json: {
      secret: app.locals.secret,
    },
  }).then((resp)=>{
    if (resp && resp.token && resp.fqdn) {
      Config.findOne({is_default: true}, function(err, matchedConfig) {
        if (err || !matchedConfig) {
          console.log('Error obtaining message config!');
          return;
        }
        matchedConfig.messaging_configs.secret_token = resp.token;
        matchedConfig.messaging_configs.functions_fqdn = resp.fqdn;
        console.log('Obtained message config successfully!');
        matchedConfig.save();
      });
    }
  }, (err)=>{
    console.log('Error obtaining message config!');
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
app.use('/stylesheets',
  serveStatic(path.join(__dirname, 'public/stylesheets'), {
    dotfiles: 'ignore',
    maxAge: false,
}));
app.use('/javascripts',
  serveStatic(path.join(__dirname, 'public/javascripts'), {
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

// create static routes for public libraries
app.use('/scripts/jquery',
  express.static(path.join(__dirname, 'node_modules/jquery/dist'))
);
app.use('/scripts/jquery-mask',
  express.static(path.join(__dirname, 'node_modules/jquery-mask-plugin/dist'))
);
app.use('/scripts/jquery-highlight',
  express.static(path.join(__dirname, 'node_modules/jquery-highlight'))
);
app.use('/scripts/pako',
  express.static(path.join(__dirname, 'node_modules/pako/dist'))
);
app.use('/scripts/popper',
  express.static(path.join(__dirname, 'node_modules/popper.js/dist'))
);
app.use('/scripts/moment',
  express.static(path.join(__dirname, 'node_modules/moment/min'))
);
app.use('/scripts/bootstrap',
  express.static(path.join(__dirname, 'node_modules/bootstrap/dist'))
);
app.use('/scripts/mdbootstrap',
  express.static(path.join(__dirname, 'node_modules/mdbootstrap'))
);
app.use('/scripts/bs-stepper',
  express.static(path.join(__dirname, 'node_modules/bs-stepper/dist'))
);
app.use('/scripts/tempusdominus',
  express.static(path.join(__dirname, 'node_modules/tempusdominus-bootstrap-4/build'))
);
app.use('/scripts/selectize',
  express.static(path.join(__dirname, 'node_modules/selectize/dist'))
);
app.use('/scripts/selectize-bootstrap',
  express.static(path.join(__dirname,
                           'node_modules/selectize-bootstrap4-theme/dist'))
);
app.use('/scripts/sweetalert2',
  express.static(path.join(__dirname, 'node_modules/sweetalert2/dist'))
);
app.use('/scripts/tags-input',
  express.static(path.join(__dirname, 'node_modules/tags-input'))
);
app.use('/scripts/datatables.net',
  express.static(path.join(__dirname, 'node_modules/datatables.net'))
);
app.use('/scripts/datatables.net-bs4',
  express.static(path.join(__dirname, 'node_modules/datatables.net-bs4'))
);
app.use('/scripts/apexcharts',
  express.static(path.join(__dirname, 'node_modules/apexcharts/dist'))
);
app.use('/scripts/fontawesome/css',
  express.static(path.join(
    __dirname,
    'node_modules/@fortawesome/fontawesome-free/css'))
);
app.use('/scripts/fontawesome/webfonts',
  express.static(path.join(
    __dirname,
    'node_modules/@fortawesome/fontawesome-free/webfonts'))
);

app.use(passport.initialize());
app.use(passport.session());
app.use(fileUpload());

app.use('/', index);

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
    let rule = new schedule.RecurrenceRule();
    rule.hour = 20;
    rule.minute = 0;
    // Schedule automatic update
    schedule.scheduleJob(rule, function() {
      updater.update();
      measurer.pingLicenseStatus();
    });

    // Force an update check to alert user on app startup
    updater.checkUpdate();
  });
}

module.exports = app;
