const i18next = require('i18next');
const i18nextFsBackend = require('i18next-fs-backend');
// const i18nextMiddleware = require('i18next-http-middleware');
const ConfigModel = require('../models/config');
const fsPromises = require('fs').promises;
const path = require('path');

// some default values.
const defaultLanguage = process.env.FLM_LANGUAGE || 'pt-BR';
const fallbackLanguage = 'en';
const localesdDir = path.join(__dirname, '../public/locales');

// // custom language detector to be added to 'i18next-http-middleware'.
// const anlixLanguageDetector = {
//   // this name is used to identify the detector in the detection order.
//   name: 'anlixLanguageDetector',
//   lookup: function(req, res, options) {
//     // options -> are passed in options
//     return req.user && req.user.language
//   },
//   cacheUserLanguage: function(req, res, lng, options) {
//     // options -> are passed in options
//     // lng -> current language, will be called after
//     //        init and on changeLanguage

//     // store it
//     console.log("-- cacheUserLanguage. options:", options)
//   },
// };
// let lngDetector = new i18nextMiddleware.LanguageDetector();
// lngDetector.addDetector(anlixLanguageDetector);

// variables to be assigned resolve and reject callbacks of the Promise that
// will be used as synchronization step between i18next finishing 
// initialization and retrieving saved language.
let i18nextResolved;
let i18nextInitialization = new Promise((resolve, reject) => {
  i18nextResolved = resolve;
});

i18next
  // backend options: https://github.com/i18next/i18next-http-backend#backend-options
  .use(i18nextFsBackend)
  // detection options: https://github.com/i18next/i18next-http-middleware#detector-options
  // .use(i18nextMiddleware.LanguageDetector)
  // .use(lngDetector)
  .init({
    // detection: {
    //   lookupCookie: 'ui-anlix-i18n',
    //   order: ['anlixLanguageDetector', 'cookie', 'header'],
    // },
    initImmediate: false,
    backend: {
      loadPath: './public/locales/{{lng}}/{{ns}}.json',
      addPath: './public/locales/{{lng}}/{{ns}}.json',
    },
    // preload: ['en', 'en-US', 'es', 'pt-BR', 'lsls'],
    // resource: {},
    ns: ['translation'],
    defaultNS: 'translation',
    lng: defaultLanguage, // will be loaded and set as current language.
    fallbackLng: fallbackLanguage, // will be loaded.
    // debug: true,
  }, (err, t) => {
    if (err) {
      // minimizing known errors to smaller messages.
      err = err.map((e) => e.code === 'ENOENT' ? e.message : e);
      console.error('Errors during i18next initialization:', err);
    }
    // to be used by other events so they know this has finished.
    i18nextResolved();
  });
const t = i18next.t;
// const middleware = i18nextMiddleware.handle(i18next);

// saving given language in database.
const setConfigLanguage = function(language) {
  return ConfigModel.updateOne({is_default: true}, {$set: {language}}).exec();
};

// function to set a given language, checking available translation files and
// if given language is already set. Returns http error codes and error
// message already translated.
const updateLanguage = async function(language) {
  if (!language) { // if language is empty or undefined.
    return {status: 400, message: t('fieldMissing', {errorline: __line})};
  }

  // reading available files/directories in locales directory.
  let locales = await fsPromises.readdir(localesdDir).catch((e) => {
    console.error(`Error finding '${localesdDir}' directory:`, locales);
    return {status: 500, message: t('serverError', {errorline: __line})};
  });

  // checking if given language exists in locales directory.
  if (!locales.includes(language)) {
    console.error(`Language '${language}' doesn't exist.`);
    return {status: 404,message: t('languageNotFound', {language: language,
      errorline: __line})};
  }

  // checking if language is the same being currently used in i18next.
  if (language === i18next.language) {
    return {status: 400, message: t('receivedNoAlterations',
      {errorline: __line}), what: 'alreadySet'};
  }

  i18next.changeLanguage(language); // setting language in i18next.

  // saving new language in database.
  await setConfigLanguage(language).catch((e) => {
    console.error(`Error saving language '${language}' in config.`, e);
    return {status: 500, message: t('configUpdateError', {errorline: __line})};
  });

  return {status: 200, message: t('operationSuccessful')};
};

// This runs the first time this controller is required (imported). It sets
// language to 'defaultLanguage' if 'config.language' is not set.
ConfigModel.findOne({is_default: true}, 'language').lean().exec()
.then(async (config) => {
  // waiting i18next initialization to be resolved.
  await i18nextInitialization;

  // if language is already set in database, set it in i18next.
   if (config && config.language) {
    return i18next.changeLanguage(config.language);
  }

  // console.log('--- defaultLanguage:', defaultLanguage)
  // console.log('--- i18next.language:', i18next.language)
  // console.log('--- i18next.resolvedLanguage:', i18next.resolvedLanguage)

  // if language isn't set in database but the 'defaultLanguage' could be
  // loaded by i18next. We simply add that language to config.
  if (defaultLanguage === i18next.resolvedLanguage) {
    setConfigLanguage(defaultLanguage).catch((e) => console.error(
      `Error saving language '${defaultLanguage}' in config.`, e));
  }
  // if 'defaultLanguage' could not be loaded by i18next. It will automatically
  // use the 'fallbackLanguage' translations. In this case, we don' save
  // the 'fallbackLanguage' as config language. The user should chose an
  // available language (or fix the environment variable value).
});

let handlers = {};

// sends 'translation.json' file in response according to configured language.
handlers.getTranslation = function(req, res) {
  res.sendFile(`${localesdDir}/${i18next.resolvedLanguage}/translation.json`);
};

// sends the configured language in response body '{language: <value>}'.
handlers.getLanguage = function(req, res) {
  res.json({language: i18next.resolvedLanguage});
};

// updates Config language to received parameter 'language' in request body.
// Will only update if that language exists in '../public/locales'
handlers.updateLanguage = function(req, res) {
  updateLanguage(req.body.language)
  .then(({status, msg}) => res.status(status).json({msg}));
};

module.exports = {
  i18next,
  handlers,
};
