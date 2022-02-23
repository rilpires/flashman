const i18next = require('i18next');
const i18nextFsBackend = require('i18next-fs-backend');
// const i18nextMiddleware = require('i18next-http-middleware');
const ConfigModel = require('../models/config');
const fsPromises = require('fs').promises;
const path = require('path');

const defaultLanguage = 'pt-BR';

// function to set a given language, checking available translation files and
// if given language is already set. Returns http error codes and error
// message keys, in case one wants to translate the messages. Messages for
// codes different than 200, should include '{errorline: __line}' as second
// argument for i18next translation 't()' function.
const updateLanguage = async function(language) {
  let files = await fsPromises.readdir(__dirname+'/../public/locales').catch((e) => e);
  if (files instanceof Error) {
    console.log('Error finding locales directory:', files);
    return [500, 'serverError'];
  }
  if (!(language in files)) return [404, 'languageNotFound'];
  if (language === i18next.language) return [400, 'receivedNoAlterations'];

  i18next.changeLanguage(language); // set language.
  // saving new language in database.
  let update = await ConfigModel.updateOne({is_default: true},
    {$set: {language: language}}).exec().catch((e) => e);
  if (update instanceof Error) return [500, 'configWriteError'];

  return [200, 'operationSuccessful'];
};

// This runs the first time this controller is required (imported).
// It sets config language to environment variable LANGUAGE if config.language
// is not set.
ConfigModel.findOne({is_default: true}, 'language').lean().exec()
.then((config) => {
  // if language is already set in database, set it in i18next.
  if (config.language) return i18next.changeLanguage(config.language);
  // if language is not set in database, set it using environment variable.
  updateLanguage(process.env.FLM_LANGUAGE)
  // if environment variable value could not be used, set it to Portuguese.
  .then((code, msgKey) => code !== 200 && updateLanguage(defaultLanguage));
});


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
    ns: ['translation'],
    defaultNS: 'translation',
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    // debug: true,
  }, (err, t) => {
    if (err) {
      console.log('Errors during i18next initialization:', err);
    } else {
      console.log('i18next initialized.');
    }
    // console.log('i18next:', i18next)
    // console.log('======== i18next', i18next)
  });
const t = i18next.t;
// const middleware = i18nextMiddleware.handle(i18next);

let handlers = {};

const getLanguageAndExecute = function(res, promise) {
  ConfigModel.findOne({is_default: true}, 'language').lean().exec()
  .then(
    (config) => config.language || process.env.FLM_LANGUAGE || defaultLanguage,
    (e) => {
      throw Error('configNotFound');
    },
  )
  .then(promise)
  .catch((e) => e.constructor === String ?
    res.status(500).json({message: t(e, {errorline: __line})}) :
    res.status(500).json({message: t('serverError', {errorline: __line})}));
};

// sends translation.json in response according to config language.
handlers.getTranslation = function(req, res) {
  return getLanguageAndExecute(res, (lng) => {
    res.sendFile(
      path.join(__dirname, `../public/locales/${lng}/translation.json`),
    );
  });
};

handlers.getLanguage = function(req, res) {
  return getLanguageAndExecute(res, (language) => res.json({language}));
};

handlers.updateLanguage = function(req, res) {
  updateLanguage(req.body.language)
  .then((code, msgKey) => code === 200 ?
    res.json({message: t(msgKey)}) :
    res.status(code).json({message: t(msgKey, {errorline: __line})}),
  );
};

module.exports = {
  i18next,
  handlers,
};
