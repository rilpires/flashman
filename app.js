
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
let session = require('express-session');

let measurer = require('./controllers/measure');
let updater = require('./controllers/update_flashman');
let Config = require('./models/config');
let User = require('./models/user');
let Role = require('./models/role');
let Device = require('./models/device');
let index = require('./routes/index');

let app = express();

mongoose.connect(
  'mongodb://' + process.env.FLM_MONGODB_HOST + ':27017/flashman',
  {useNewUrlParser: true,
   reconnectTries: Number.MAX_VALUE,
   reconnectInterval: 1000}
);
mongoose.set('useCreateIndex', true);

// check config existence
Config.findOne({is_default: true}, function(err, matchedConfig) {
  if (err || !matchedConfig) {
    let newConfig = new Config({
      is_default: true,
      autoUpdate: true,
      pppoePassLength: 8,
    });
    newConfig.save();
  }
});

// check administration user existence
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

// check default role existence
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
    });
    managerRole.save();
  }
});

// check migration for devices checked for upgrade
Device.find({}, function(err, devices) {
  if (!err && devices) {
    for (let idx = 0; idx < devices.length; idx++) {
      if (!devices[idx].installed_release) {
        if (devices[idx].do_update == true) {
          devices[idx].do_update_status = 0; // waiting
        } else {
          devices[idx].installed_release = devices[idx].release;
        }
        devices[idx].save();
      }
    }
  }
});

// release dir must exists
if (!fs.existsSync(process.env.FLM_IMG_RELEASE_DIR)) {
  fs.mkdirSync(process.env.FLM_IMG_RELEASE_DIR);
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

// get message configs from control
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

// Check md5 file hashes on firmware directory
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

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(bodyParser.raw({type: 'application/octet-stream'}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));
app.use(logger(':req[x-forwarded-for] - :method :url HTTP/:http-version ' +
               ':status :res[content-length] - :response-time ms'));
app.use(cookieParser());
app.use('/stylesheets',
  serveStatic(path.join(__dirname, 'public/stylesheets'), {
    dotfiles: 'ignore',
    maxAge: false,
  })
);
app.use('/javascripts',
  serveStatic(path.join(__dirname, 'public/javascripts'), {
    dotfiles: 'ignore',
    maxAge: false,
  })
);
app.use('/images',
  serveStatic(path.join(__dirname, 'public/images'), {
    dotfiles: 'ignore',
    maxAge: '1d',
  })
);
app.use('/firmwares',
  serveStatic(path.join(__dirname, 'public/firmwares'), {
    dotfiles: 'ignore',
    cacheControl: false,
    setHeaders: setMd5Sum,
  })
);

/**
 * Generate MD5 hash for firmware files
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
app.use('/scripts/bootstrap',
  express.static(path.join(__dirname, 'node_modules/bootstrap/dist'))
);
app.use('/scripts/mdbootstrap',
  express.static(path.join(__dirname, 'node_modules/mdbootstrap'))
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

app.listen(3000, function() {
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

module.exports = app;
