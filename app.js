
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
const utilHandlers = require('./controllers/handlers/util');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

let updater = require('./controllers/update_flashman');
let acsDeviceController = require('./controllers/acs_device_info');
let userController = require('./controllers/user');
let deviceUpdater = require('./controllers/update_scheduler');
let Config = require('./models/config');
let index = require('./routes/index');
let packageJson = require('./package.json');
const runMigrations = require('./migrations');

let app = express();

// Express OpenAPI docs generator handling responses first
const {SPEC_OUTPUT_FILE_BEHAVIOR} = expressOasGenerator;
const isOnProduction = (process.env.production === 'true');

let MONGOHOST = (process.env.FLM_MONGODB_HOST || 'localhost');
let MONGOPORT = (process.env.FLM_MONGODB_PORT || 27017);

let instanceNumber = parseInt(process.env.NODE_APP_INSTANCE ||
                              process.env.FLM_DOCKER_INSTANCE || 0);

if (!isOnProduction) {
  expressOasGenerator.handleResponses(
    app,
    {
      mongooseModels: mongoose.modelNames(),
      swaggerDocumentOptions: {
        customCss: `
          .swagger-ui .topbar {
            background-color: #4db6ac;
          }
        `},
      specOutputFileBehaviour: SPEC_OUTPUT_FILE_BEHAVIOR.PRESERVE,
      alwaysServeDocs: false,
    },
  );
}

// Specify some variables available to all views
app.locals.appVersion = packageJson.version;

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

app.use('/', index);

// NEVER PUT THIS FUNCTION BELOW 404 HANDLER!
if (!isOnProduction) {
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
      updater.updateLicenseApiSecret(app);
    });

    acsDeviceController.reportOnuDevices(app);
    userController.checkAccountIsBlocked(app);
    updater.updateAppPersonalization(app);
    updater.updateLicenseApiSecret(app);

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
      // Force an update check to alert user on app startup
      updater.checkUpdate();
    }

    let early4amRule = new schedule.RecurrenceRule();
    early4amRule.hour = 4;
    early4amRule.minute = 0;
    schedule.scheduleJob(early4amRule, function() {
      // Issue a command to offline ONUs to try and fix exp. backoff bug
      // This is only relevant for a few ONU models, and currently this is
      // out best fix available...
      acsDeviceController.pingOfflineDevices();
    });
  });
}

module.exports = app;
