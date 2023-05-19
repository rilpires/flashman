const express = require('express');
const fs = require('fs');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const fileUpload = require('express-fileupload');
const sio = require('./sio');
const serveStatic = require('serve-static');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

let index = require('./routes/index');
let packageJson = require('./package.json');

let app = express();

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
    }
  }
  app.locals.secret = companySecret.secret;
}
// Specify some variables available to all views
app.locals.appVersion = packageJson.version;

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
    setHeaders: function setMd5Sum(res, filePath) {
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
    },
}));

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


const metricsAuth = require('./controllers/handlers/metrics/metrics_auth');
const metricsMiddleware
  = require('./controllers/handlers/metrics/express_metrics');
const metricsPath = process.env.FLM_PROM_METRICS_PATH || '/metrics';
if (metricsPath && process.env.FLM_PROM_METRICS=='true') {
  if (process.env.FLM_PROM_METRICS_BASIC_AUTH) {
    app.use(metricsPath, metricsAuth);
  }
  app.use(metricsMiddleware);
} else {
  app.get(metricsPath, function(req, res) {
    res.send('# Metrics not enabled\nup 1');
  });
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

module.exports.app = app;
