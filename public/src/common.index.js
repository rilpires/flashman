import 'bootstrap/js/src/index'; // Bootstrap animations
import 'mdbootstrap/js/mdb'; // MDB animations

// Import styles
import '../scss/flashman-bundle.scss';

// variables to be assigned resolve and reject callbacks of the Promise that
// will be used as synchronization step between i18next configuration and all
// DOMContentLoaded callbacks.
let i18nextResolved;
let i18nextInitialization = new Promise((resolve, reject) => {
  i18nextResolved = resolve;
});

// configuring our internationalization package. The initialization happens in
// this file because it's present in all webpack bundles of our project. This 
// made us substitute all $(document).ready() calls by our own function to 
// manage DOMContentLoaded event callbacks
i18next
  // this middleware requests translations in background.
  .use(require('i18next-http-backend'))
  .init({
    lng: document.documentElement.lang,
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    initImmediate: false, // waits translations to load before initialing.
    backend: {
      loadPath: '/dist/locales/{{lng}}/{{ns}}.json',
    },
    // debug: true,
  }, (err, t) => { // finished initializing.
    if (err) {
      console.log('Error when loading i18next', err);
    }
    // to be used by other events so they know this has finished.
    i18nextResolved();
    // console.log('--- i18next.default.languages:', i18next.default.languages)
    // console.log('--- i18next.default.resolvedLanguage:', i18next.default.resolvedLanguage)
  });

// Object that holds all DOMContentLoaded callbacks. Even though they are
// defined in other files, webpack will put them together in the same bundle,
// so they are in the same context.
const anlixDocumentReady = new function() {
  // array that will hold all callbacks to run after DOMContentLoaded event.
  this.readyCallbacks = [];
  this.add = (f) => this.readyCallbacks.push(f); // adds callbacks to array.
  this.start = () => this.readyCallbacks.forEach((f) => f()); // executes callbacks.
};

export {anlixDocumentReady};

// Preloader
$(window).on('load', function() { // makes sure the whole site is loaded
  $('#status').fadeOut(); // will first fade out the loading animation
  $('#preloader').delay(350).fadeOut('slow');
  $('body').delay(350).css({'overflow': 'visible'});
});

$(document).ready(function() {
  if ($('#frame-modal-alert-message').text() !== '') {
    $('#frame-modal-alert').modal('show');
  }

  // we wait for i18next initialization before executing all DOMContentLoaded
  // event callbacks.
  i18nextInitialization.then(anlixDocumentReady.start);
});

$(function() {
  $('[data-toggle="tooltip"]').tooltip({html: true});
});
