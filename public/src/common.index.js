import 'bootstrap/js/src/index'; // Bootstrap animations
import 'mdbootstrap/js/mdb'; // MDB animations

// Import styles
import '../scss/flashman-bundle.scss';

// variables to be assigned resolve and reject callbacks of the Promise that
// will be used as synchronization step between i18next configuration and all
// DOMContentLoaded callbacks.
let i18nextResolve, i18nextRejected;
let i18nextPromise = new Promise((resolve, reject) => {
  i18nextResolve = resolve;
  i18nextRejected = reject;
});

// configuring our internationalization package. The initialization happens in
// this file because it's present in all webpack bundles of our project. This 
// made us substitute all $(document).ready() calls by our own function to 
// manage DOMContentLoaded event callbacks
i18next
  .use(i18nextHttpBackend) // this middleware requests translations in background.
  .init({
    lng: navigator.language,
    fallbackLng : "en",
    // debug: true,
    initImmediate: false, // wait for the translations before finishing initializing.
    backend: {
      loadPath: '/public/locales/{{lng}}/{{ns}}.json',
    }
  }, (err, t) => { // finished initializing.
    if (err) {
      console.log('Error when loading i18next', err);
      i18nextRejected(); // resolving the Promise.
    } else {
      i18nextResolve(); // resolving the Promise.
    }
  });

// Object that holds all DOMContentLoaded callbacks. Even though they are
// defined in other files, webpack will put them together in the same bundle,
// so they are in the same context.
let anlixDocumentReady = {
  callbakcs: [], // array that will hold all callbacks to run after DOMContentLoaded event.
  add: (f) => callbakcs.push(f), // function to add callback to array.
  start: () => { // function that executes all callbacks.
    callbakcs.forEach((f) => f());
    // unassigning object, so browser user console can't re-execute callbacks.
    anlixDocumentReady = undefined;
  },
};

// Preloader
$(window).on('load', function() { // makes sure the whole site is loaded
  $('#status').fadeOut(); // will first fade out the loading animation
  $('#preloader').delay(350).fadeOut('slow');
  $('body').delay(350).css({'overflow': 'visible'});
});

$(document).ready(async function() {
  if ($('#frame-modal-alert-message').text() !== '') {
    $('#frame-modal-alert').modal('show');
  }

  // we wait for i18next initialization before executing all DOMContentLoaded event callbacks.
  await i18nextPromise; // waiting for i18next to finished its initialization.
  anlixDocumentReady.start(); // executes all DOMContentLoaded event callbacks.
});


