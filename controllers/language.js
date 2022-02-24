const i18next = require('i18next');
const i18nextFsBackend = require('i18next-fs-backend');
// const i18nextMiddleware = require('i18next-http-middleware');
const ConfigModel = require('../models/config');
const fsPromises = require('fs').promises;
const path = require('path');

// some default values
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
let i18nextRejected;
let i18nextInitialization = new Promise((resolve, reject) => {
  i18nextResolved = resolve;
  i18nextRejected = reject;
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
    lng: defaultLanguage,
    fallbackLng: fallbackLanguage,
    // debug: true,
  }, (err, t) => {
    if (err) {
      console.error('Errors during i18next initialization:', err);
      i18nextRejected();
    } else {
      i18nextResolved();
    }
  });
const t = i18next.t;
// const middleware = i18nextMiddleware.handle(i18next);

// saving given language in database.
const setConfigLanguage = function(language) {
  return ConfigModel.updateOne({is_default: true}, {$set: {language}}).exec();
}

// function to set a given language, checking available translation files and
// if given language is already set. Returns http error codes and error
// message keys, in case one wants to translate the messages. Messages for
// codes different than 200, should include '{errorline: __line}' as second
// argument for i18next translation 't()' function.
const updateLanguage = async function(language) {
  if (!language) { // if language is empty or undefined.
    throw {status: 400, msg: t('fieldMissing', {errorline: __line})};
  }

  // reading available files/directories in locales directory.
  let locales = await fsPromises.readdir(localesdDir).catch((e) => {
    console.error(`Error finding '${localesdDir}' directory:`, locales);
    throw {status: 500, msg: t('serverError', {errorline: __line})};
  });

  // checking if given language exists in locales directory.
  if (!locales.includes(language)) {
    console.error(`Language '${language}' doesn't exist.`);
    throw {status: 404,msg: t('languageNotFound', {language: language,
      errorline: __line})};
  }

  // checking if language is the same being currently used in i18next.
  if (language === i18next.language) {
    throw {status: 400, msg: t('receivedNoAlterations', {errorline: __line}),
      what: 'alreadySet'};
  }

  i18next.changeLanguage(language); // setting language in i18next.

  // saving new language in database.
  await setConfigLanguage(language).catch((e) => {
    console.error(`Error saving language '${language}' in config.`, e);
    throw {status: 500, msg: t('configUpdateError', {errorline: __line})};
  });
};

// This runs the first time this controller is required (imported). It sets
// language to 'defaultLanguage' if 'config.language' is not set.
ConfigModel.findOne({is_default: true}, 'language').lean().exec()
.then(async (config) => {
  // waiting i18next initialization to be resolved.
  await i18nextInitialization;

  // if language is already set in database, set it in i18next.
  if (config.language) return i18next.changeLanguage(config.language);

  // if language is not set in database, set it using 'defaultLanguage'.
  updateLanguage(defaultLanguage).catch((e) => {
    // if 'defaultLanguage' value could not be used.
    // if the reason for it is the default language is already set.
    // we'll try to set it to 'fallbackLanguage'.
    if (e.what !== 'alreadySet') return updateLanguage(fallbackLanguage);

    setConfigLanguage(defaultLanguage).catch((e) => console.error(
      `Error saving language '${defaultLanguage}' in config.`, e));
  });
})

let handlers = {};

// receives a response object and a function 'f' to execute after getting the
// configured language and passes that language as the only argument to 'f'.
// It catches any errors and will send a response with the error caught.
const getLanguageAndExecute = function(res, func) {
  ConfigModel.findOne({is_default: true}, 'language').lean().exec()
  .then(
    (config) => config.language || defaultLanguage || fallbackLanguage,
    (e) => {
      throw 'configNotFound';
    },
  )
  .then(func)
  .catch((e) => e.constructor === String ?
    res.status(500).json({message: t(e, {errorline: __line})}) :
    res.status(500).json({message: t('serverError', {errorline: __line})}));
};

// sends 'translation.json' file in response according to configured language.
handlers.getTranslation = function(req, res) {
  getLanguageAndExecute(res, (lng) => res.sendFile(
    `${localesdDir}/${lng}/translation.json`));
};

// sends the configured language in response body '{language: <value>}'.
handlers.getLanguage = function(req, res) {
  getLanguageAndExecute(res, (language) => res.json({language}));
};

// updates Config language to received parameter 'language' in request body.
// Will only update if that language exists in '../public/locales'
handlers.updateLanguage = function(req, res) {
  updateLanguage(req.body.language)
  .then(() => res.json({message: t('operationSuccessful')}),
        (e) => res.status(e.status).json({message: e.msg}));
};

module.exports = {
  i18next,
  handlers,
};
