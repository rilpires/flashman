import {anlixDocumentReady} from '../src/common.index.js';
import {socket} from './common_actions.js';
import 'selectize';

const t = i18next.t;
let initialized = false;


// Modals
const MAIN_MODAL = '#traceroute-test-modal';
const DEVICE_ID_MODAL = '#traceroute-test-device-id';


// Sections
const INFO_SECTION = '#traceroute-test-section';
const RESULTS_SECTION = '#traceroute-test-results-section';
const UPDATE_SECTION = '#traceroute-loading-section';
const ERROR_SECTION = '#traceroute-error-section';


// Elements on the page
const TRACEROUTE_RESULTS_TABLE = '#traceroute-test-results-table';
const TRACEROUTE_START_TEST_BUTTON = '.btn-start-traceroute-test';
const TRACEROUTE_ADDRESS_SELECTOR = '#traceroute-host-selector';
const TRACEROUTE_ROUTE_ERROR_INFO = '#traceroute-route-invalid-feedback';
const TRACEROUTE_VALID_CLASS = 'is-valid';
const TRACEROUTE_INVALID_CLASS = 'is-invalid';


// Socket
const SIO_NOTIFICATION_TRACEROUTE = 'TRACEROUTE';


// HTMLs
const RESULT_TABLE_ITEM_HTML = $('<li>')
  .addClass('list-group-item')
  .addClass('d-flex')
  .addClass('justify-content-between')
  .addClass('align-items-center');

const RESULT_TABLE_ITEM_VALUE_HTML = $('<span>')
  .addClass('badge')
  .addClass('badge-primary')
  .addClass('badge-pill');

const SELECTIZE_ADDRESS_HTML = function(data, escape) {
  return $('<div>')
    .addClass('create')
    .append(
      t('Add') + ':',
      $('<strong>').html(escape(data.input)),
    );
};


// Saves the route for traceroute to database
const saveTracerouteAddress = function() {
  // Get which device to show the info
  let deviceId = $(DEVICE_ID_MODAL).text();

  // Get the route
  let address = $(TRACEROUTE_ADDRESS_SELECTOR)[0].selectize.getValue();

  // Check if address is valid
  if (address === '' || address === null) {
    return;
  }

  // Send the command to send the traceroute request
  sendRequest(
    '/devicelist/traceroute/' + deviceId,
    'POST',
    deviceId,

    function(id, data) {
      // Check if it is the first time
      if (!initialized) {
        initialized = true;
        return;
      }

      // If could save successfully
      if (data.success) {
        $(TRACEROUTE_ADDRESS_SELECTOR)
          .removeClass(TRACEROUTE_INVALID_CLASS)
          .addClass(TRACEROUTE_VALID_CLASS);

        // Wait, than remove the classes
        setTimeout(function() {
          $(TRACEROUTE_ADDRESS_SELECTOR)
            .removeClass(TRACEROUTE_VALID_CLASS)
            .removeClass(TRACEROUTE_INVALID_CLASS);
        }, 1500);

      // Error while saving
      } else {
        $(TRACEROUTE_ROUTE_ERROR_INFO)
          .html(data.message);

        $(TRACEROUTE_ADDRESS_SELECTOR)
          .removeClass(TRACEROUTE_VALID_CLASS)
          .addClass(TRACEROUTE_INVALID_CLASS);
      }
    },

    function(deviceId, xhr, status, error) {
      $(TRACEROUTE_ROUTE_ERROR_INFO)
        .html(error);

      $(TRACEROUTE_ADDRESS_SELECTOR)
        .removeClass(TRACEROUTE_VALID_CLASS)
        .addClass(TRACEROUTE_INVALID_CLASS);
    },

    JSON.stringify({
      'content': JSON.stringify({'traceroute_route': address}),
    }),
  );
};


// Reset the modal to show the Info Section
const resetTracerouteDisplay = function() {
  $(INFO_SECTION).show();
  $(RESULTS_SECTION).hide();
  $(UPDATE_SECTION).hide();
  $(ERROR_SECTION).hide();
};


// Constants
const MEAN_TRUNCATE_NUMBER = 3;
const DEFAULT_TRACEROUTE_SERVER = 'www.google.com';
const SELECTIZE_OPTIONS_ADDRESS = {
  create: true,
  maxItems: 1,
  onItemAdd: saveTracerouteAddress,
  onChange: resetTracerouteDisplay,
  render: {
    option_create: SELECTIZE_ADDRESS_HTML,
  },
};


// Send requests
//  endpoint - Endpoint to send request to

//  type - GET or POST
//    - The default is to call GET if the parameter is invalid

//  deviceId - The deviceId to get the info from

//  successFunc(deviceId, response)
//    - Callback function to be called when success
//    - deviceId - The deviceId to get the info from
//    - response - The response of the endpoint

//  errorFunc(devicedId, xhr, status, error)
//    - Callback function to be called when error
//    - deviceId - The deviceId to get the info from
//    - xhr, status, error - https://api.jquery.com/jquery.ajax/
const sendRequest = function(
  endpoint,
  type,
  deviceId,
  successFunc=null,
  errorFunc=null,
  data=null,
) {
  $.ajax({
    url: endpoint,

    method: (type === 'GET' || type === 'POST' ? type : 'GET'),

    dataType: 'json',

    data: (data !== null ? data : ''),

    contentType: (data !== null ? 'application/json' : ''),

    success: function(response) {
      if (successFunc !== null) {
        successFunc(deviceId, response);
      }
    },

    error: function(xhr, status, error) {
      if (errorFunc !== null) {
        errorFunc(deviceId, xhr, status, error);
      }
    },

  });
};


// Configure the updating animation
//   updating - If should activate or disable the animations
const setUpdatingAnimation = function(updating) {
  // Enable update animation
  if (updating) {
    // Hide sections
    $(INFO_SECTION).hide();
    $(RESULTS_SECTION).hide();
    $(ERROR_SECTION).hide();

    // Show Update
    $(UPDATE_SECTION).show();

    // Disable update button and rotate the icon
    $(TRACEROUTE_START_TEST_BUTTON).prop('disabled', true);

  // Disable update animation
  } else {
    // Show sections
    $(RESULTS_SECTION).show();

    // Hide Update and No-info
    $(INFO_SECTION).hide();
    $(ERROR_SECTION).hide();
    $(UPDATE_SECTION).hide();

    // Enable update button and cancel rotation
    $(TRACEROUTE_START_TEST_BUTTON).prop('disabled', false);
  }
};


// Update all values
//  message - Response message to change values
const updateValues = function(message) {
  // Check if the message did not come empty
  if (isNaN(message.tries_per_hop)) {
    // Set the error and return
    setErrorModal(true);
    return;
  }

  // Clear previous results
  $(TRACEROUTE_RESULTS_TABLE).text('');

  // Loop through all hops
  for (let hopIndex = 0; hopIndex < message.hops.length; hopIndex++) {
    let hop = message.hops[hopIndex];
    let mean = 0;

    // Loop through all tests
    for (let testIndex = 0; testIndex < hop.ms_values.length; testIndex++) {
      mean += hop.ms_values[testIndex] / hop.ms_values.length;
    }

    // Assign parameters to html
    $(TRACEROUTE_RESULTS_TABLE).append(
      RESULT_TABLE_ITEM_HTML
        .text(escape(hop.ip))
        .append(
          RESULT_TABLE_ITEM_VALUE_HTML
          .text(t('Latency=X', {x: mean.toFixed(MEAN_TRUNCATE_NUMBER)}))
          .clone(),
        )
        .clone(),
    );
  }

  // When update, cancel the animation
  setUpdatingAnimation(false);
};


// Configure the modal to show or hide Error
//  errored - If an error happened with traceroute
const setErrorModal = function(errored) {
  // Start the animation
  setUpdatingAnimation(false);

  // If had an error with traceroute
  if (errored) {
    // Hide Update, Results, and Info sections
    $(UPDATE_SECTION).hide();
    $(RESULTS_SECTION).hide();
    $(INFO_SECTION).hide();

    // Show the error
    $(ERROR_SECTION).show();

  // No error happened
  } else {
    // Hide almost everything
    $(ERROR_SECTION).show();
    $(UPDATE_SECTION).show();
    $(RESULTS_SECTION).show();

    // Show Info section
    $(INFO_SECTION).hide();
  }
};


const onRequisitionError = function(deviceId, xhr, status, error) {
  setErrorModal(true);
};


// Shows the show_traceroute_test_action.pug modal
const showModal = async function(event) {
  // Get which device to show the info
  let row = $(event.target).parents('tr');
  let deviceId = row.data('deviceid');

  // Show and hide sections
  $(INFO_SECTION).show();
  $(RESULTS_SECTION).hide();
  $(UPDATE_SECTION).hide();
  $(ERROR_SECTION).hide();

  // Include the id in the Modal
  $(DEVICE_ID_MODAL).text(deviceId);

  // Show the Modal
  $(MAIN_MODAL).modal('show');

  // Send the command to get the route from database
  sendRequest(
    '/devicelist/traceroute/' + deviceId,
    'GET',
    deviceId,
    function(id, data) {
      let tracerouteRoute = DEFAULT_TRACEROUTE_SERVER;

      // If happened an error
      if (!data.success) {
        onRequisitionError();
        return;
      }

      // Check if empty or null
      if (data.traceroute_route !== '' ||
          data.traceroute_route !== null) {
        tracerouteRoute = data.traceroute_route;
      }

      initialized = false;

      // Assign the route
      $(TRACEROUTE_ADDRESS_SELECTOR)[0].selectize
        .addOption({
          value: tracerouteRoute,
          text: tracerouteRoute,
        });
        $(TRACEROUTE_ADDRESS_SELECTOR)[0].selectize.addItem(tracerouteRoute);
        $(TRACEROUTE_ADDRESS_SELECTOR)[0].selectize.refreshItems();
    },
    onRequisitionError,
  );
};


// Entry point
anlixDocumentReady.add(function() {
  // Init selectize fields
  $(TRACEROUTE_ADDRESS_SELECTOR).selectize(SELECTIZE_OPTIONS_ADDRESS);


  // Assign Traceroute Show Modal Button
  $(document).on('click', '.btn-traceroute-test-modal', async function(event) {
    showModal(event);
  });


  // Assign Start Test Button
  $(document).on('click', '.btn-start-traceroute-test', async function(event) {
    // Get which device to show the info
    let deviceId = $(DEVICE_ID_MODAL).text();

    // Start the animation
    setUpdatingAnimation(true);

    // Send the command to send the traceroute request
    sendRequest(
      '/devicelist/command/' + deviceId + '/traceroute',
      'POST',
      deviceId,
      function(id, data) {
        // If happened an error
        if (!data.success) {
          onRequisitionError();
        }
      },
      onRequisitionError,
    );


    // Assign a socket IO
    socket.on(SIO_NOTIFICATION_TRACEROUTE, function(macaddr, data) {
      // Check if it is the current device
      if ($(DEVICE_ID_MODAL).text() === macaddr) {
        // Update values
        updateValues(data);
      }
    });
  });
});
