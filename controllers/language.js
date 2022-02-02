const i18next = require('i18next')
const i18nextFsBackend = require('i18next-fs-backend')
const i18nextMiddleware = require('i18next-http-middleware')


const anlixLanguageDetector = {
  name: 'anlixLanguageDetector',

  lookup: function(req, res, options) {
    // options -> are passed in options
    return req.user && req.user.laguage
  },

  cacheUserLanguage: function(req, res, lng, options) {
    // options -> are passed in options
    // lng -> current language, will be called after init and on changeLanguage

    // store it
    console.log("-- cacheUserLanguage. options:", options)
  }
}


let lngDetector = new i18nextMiddleware.LanguageDetector()
lngDetector.addDetector(anlixLanguageDetector)

i18next
  // backend options: https://github.com/i18next/i18next-http-backend#backend-options
  .use(i18nextFsBackend)
  // detection options: https://github.com/i18next/i18next-http-middleware#detector-options
  // .use(i18nextMiddleware.LanguageDetector)
  .use(lngDetector)
  .init({
    detection: {
      lookupCookie: 'ui-anlix-i18n',
      order: ['anlixLanguageDetector', 'cookie', 'header'],
    },
    initImmediate: false,
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
      addPath: './locales/{{lng}}/{{ns}}.json',
    },
    // preload: ['en', 'en-US', 'es', 'pt-BR', 'lsls'],
    ns: ['translation'],
    defaultNS: 'translation',
    lng: 'en',
    fallbackLng: 'en',
    // debug: true,
  }, (err, t) => {
    if (err) {
      console.log('Errors during i18next initialization:', err);
    } else {
      console.log('i18next initialized.');
    }
    // console.log('i18next:', i18next)
    // console.log('======== i18next', i18next)
  })

const middleware = i18nextMiddleware.handle(i18next)

module.exports = { middleware, i18next }
