
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
const promBundle = require('express-prom-bundle');
const sio = require('./sio');
const serveStatic = require('serve-static');
const md5File = require('md5-file');
const utilHandlers = require('./controllers/handlers/util');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const TasksAPI = require('./controllers/external-genieacs/tasks-api');

let updater = require('./controllers/update_flashman');
let acsDeviceController = require('./controllers/acs_device_info');
let userController = require('./controllers/user');
let deviceUpdater = require('./controllers/update_scheduler');
let Config = require('./models/config');
let index = require('./routes/index');
let packageJson = require('./package.json');
const runMigrations = require('./migrations');

let app = express();

// Specify some variables available to all views
app.locals.appVersion = packageJson.version;

const MONGOHOST = (process.env.FLM_MONGODB_HOST || 'localhost');
const MONGOPORT = (process.env.FLM_MONGODB_PORT || 27017);

const instanceNumber = parseInt(process.env.NODE_APP_INSTANCE ||
                              process.env.FLM_DOCKER_INSTANCE || 0);

const databaseName = process.env.FLM_DATABASE_NAME === undefined ?
  'flashman' :
  process.env.FLM_DATABASE_NAME;

mongoose.connect(
  'mongodb://' + MONGOHOST + ':' + MONGOPORT + '/' + databaseName,
  {useNewUrlParser: true,
   serverSelectionTimeoutMS: 2**31-1, // biggest positive signed int w/ 32 bits.
   useUnifiedTopology: true,
   useFindAndModify: false,
   useCreateIndex: true,
   maxPoolSize: 200,
});
mongoose.set('useCreateIndex', true);

// Release dir must exists
if (!fs.existsSync(process.env.FLM_IMG_RELEASE_DIR) &&
    process.env.FLM_IMG_RELEASE_DIR !== undefined
) {
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

// run db migrations
runMigrations(app);

// Check md5 file hashes on firmware directory
if (instanceNumber === 0) {
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

// adding translation function to app scope in express.
// this allows the Pug engine to have access to it.
app.locals.t = require('./controllers/language.js').i18next.t;

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
  cookie: {
    maxAge: 28800000,
  },
  store: new MongoStore({mongooseConnection: mongoose.connection}),
});

app.use(sessParam);
sio.anlixBindSession(sessParam);
app.use(passport.initialize());
app.use(passport.session());
app.use(fileUpload());
if (process.env.FLM_PROM_METRICS=='true') {
  const metricsPath = '/metrics';
  const basicAuthEncoded = process.env.FLM_PROM_METRICS_BASIC_AUTH;
  if (basicAuthEncoded) {
    app.use(metricsPath, function(req, res, next) {
      if (req.headers.authorization == `Basic ${basicAuthEncoded}`) {
        next();
      } else {
        res.sendStatus(401);
      }
    });
  }
  app.use(
    promBundle({
      includeMethod: true,
      includePath: true,
      includeStatusCode: true,
      metricsPath: metricsPath,

      // This is a very important config. We want to unify metrics on a given
      // route if they are different just on device id, in example. So here
      // we include rules for every route which uses id or undesirable
      // values on path.
      normalizePath: [
        // data_collecting.js
        ['^/.*/parameters', '/<CPE_ID>/parameters'],

        // device_list.js
        [
          '^/device_list/retryupdate/.*/.*',
          '/device_list/retryupdate/<CPE_ID>/<RELEASE>',
        ],
        [
          '^/device_list/command/.*/.*',
          '/device_list/command/<CPE_ID>/<COMMAND>',
        ],
        ['^/device_list/update/.*/.*', '/device_list/update/<CPE_ID>/<RELEASE>'],
        ['^/device_list/factoryreset/.*', '/device_list/factoryreset/<CPE_ID>'],
        ['^/device_list/update/.*', '/device_list/update/<CPE_ID>'],
        ['^/device_list/uifirstlog/.*', '/device_list/uifirstlog/<CPE_ID>'],
        ['^/device_list/uilastlog/.*', '/device_list/uilastlog/<CPE_ID>'],
        ['^/device_list/uiportforward/.*', '/device_list/uiportforward/<CPE_ID>'],
        ['^/device_list/speedtest/.*', '/device_list/speedtest/<CPE_ID>'],
        ['^/device_list/pinghostslist/.*', '/device_list/pinghostslist/<CPE_ID>'],
        ['^/device_list/landevices/.*', '/device_list/landevices/<CPE_ID>'],
        ['^/device_list/sitesurvey/.*', '/device_list/sitesurvey/<CPE_ID>'],
        ['^/device_list/uiupdate/.*', '/device_list/uiupdate/<CPE_ID>'],
        ['^/device_list/waninfo/.*', '/device_list/waninfo/<CPE_ID>'],
        ['^/device_list/laninfo/.*', '/device_list/laninfo/<CPE_ID>'],

        // user.js
        ['^/user/profile/.*', '/user/profile/<USER_ID>'],
        ['^/user/edit/.*', '/user/edit/<USER_ID>'],
        ['^/user/get/one/.*', '/user/get/one/<USER_ID>'],
        ['^/user/role/edit/.*', '/user/role/edit/<USER_ID>'],

        // v2
        [
          '^/api/v2/device/update/.*/.*',
          '/api/v2/device/update/<CPE_ID>/<RELEASE>',
        ],
        [
          '^/api/v2/device/command/.*/.*',
          '/api/v2/device/command/<CPE_ID>/<COMMAND>',
        ],
        ['^/api/v2/device/delete/.*', '/api/v2/device/delete/<CPE_ID>'],
        ['^/api/v2/device/update/.*', '/api/v2/device/update/<CPE_ID>'],
        ['^/api/v2/device/firstlog/.*', '/api/v2/device/firstlog/<CPE_ID>'],
        ['^/api/v2/device/lastlog/.*', '/api/v2/device/lastlog/<CPE_ID>'],
        ['^/api/v2/device/sync/.*', '/api/v2/device/sync/<CPE_ID>'],

        // vlan.js
        ['^/vlan/profile/.*', '/vlan/profile/<VLAN_ID>'],
        ['^/vlan/profile/edit/.*', '/vlan/profile/edit/<VLAN_ID>'],
        ['^/vlan/profile/check/.*', '/vlan/profile/check/<PROFILE_ID>'],
        ['^/vlan/fetch/.*', '/vlan/fetch/<DEVICE_ID>'],
        ['^/vlan/update/.*', '/vlan/update/<DEVICE_ID>'],
      ],
    }),
  );
}


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
if (instanceNumber === 0) {
  Config.findOne({is_default: true}, function(err, matchedConfig) {
    if (err || !matchedConfig || !matchedConfig.device_update_schedule) return;
    // Do nothing if no active schedule
    if (!matchedConfig.device_update_schedule.is_active) return;
    deviceUpdater.recoverFromOffline(matchedConfig);
  }).lean();
}

if (instanceNumber === 0 && (
    typeof process.env.FLM_SCHEDULER_ACTIVE === 'undefined' ||
    (process.env.FLM_SCHEDULER_ACTIVE === 'true' ||
     process.env.FLM_SCHEDULER_ACTIVE === true))
) {
  let schedulePort = 3000;
  if (typeof process.env.FLM_SCHEDULE_PORT !== 'undefined') {
    schedulePort = process.env.FLM_SCHEDULE_PORT;
  }
  app.listen(parseInt(schedulePort), function() {
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
      acsDeviceController.reportOnuDevices(app);
      userController.checkAccountIsBlocked(app);
      updater.updateAppPersonalization(app);
      updater.updateLicenseApiSecret(app);
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
      // After issuing a command to offline ONUs to try and fix exp. backoff bug
      // its necessary to clean tasks that will not be effective. Lots of
      // tasks generated a great mongoDB CPU overhead
      TasksAPI.deleteGetParamTasks();
    });

    /* Routines to execute on each startup/reload of main flashman proccess */
    acsDeviceController.reportOnuDevices(app);
    userController.checkAccountIsBlocked(app);
    updater.updateAppPersonalization(app);
    updater.updateLicenseApiSecret(app);
    updater.updateApiUserLogin(app);
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
    }
    // Force an update check to alert user on app startup
    updater.checkUpdate();
  });
}

module.exports = app;
