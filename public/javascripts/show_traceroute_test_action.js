import {anlixDocumentReady} from '../src/common.index.js';
import {socket} from './common_actions.js';
import 'selectize';

const t = i18next.t;
let initialized = false;
let itemIndex = 0;


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
const TRACEROUTE_HTML_ARROW_NAME = 'traceroute-item-arrow-';
const TRACEROUTE_HTML_RESULT_NAME = 'traceroute-item-result-';

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

// Return the HTML of the collapsible item
const resultTableRouteCollapsibleHtml = function(route, number) {
  return ('<div class="border row pl-2 pr-2 pt-3 pb-3 ml-0 mr-0">' +

            // Arrow portion of the header of the collapsible item
            '<div class="col-1">' +
              // Arrow
              '<div id="' + TRACEROUTE_HTML_ARROW_NAME + number +
              '" class="fas fa-chevron-down fa-lg mt-1"></div>' +
            '</div>' +

            // Text portion of the header
            '<div class="col-11">' +
              '<h5>' + encodeURIComponent(route) + '</h5>' +
            '</div>' +
          '</div>' +

          // Result of the item
          '<div id="' + TRACEROUTE_HTML_RESULT_NAME + number +
          '" class="pl-2 pr-2 grey lighten-5 border" style="display: none;">' +
          '</div>');
};


// Saves the route for traceroute to database
const saveTracerouteAddress = function() {
  // Check if it is the first time adding the routes
  if (!initialized) {
    return;
  }

  // Get which device to show the info
  let deviceId = $(DEVICE_ID_MODAL).text();

  // Get routes
  let addresses = $(TRACEROUTE_ADDRESS_SELECTOR)[0].selectize.getValue();

  // Check if addresses variable is valid
  if (addresses === '' || addresses === null || addresses.length === 0) {
    return;
  }

  // Send the command to send the traceroute request
  sendRequest(
    '/devicelist/pinghostslist/' + deviceId,
    'POST',
    deviceId,

    function(id, data) {
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
      'content': JSON.stringify({'hosts': addresses}),
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
const SELECTIZE_OPTIONS_ADDRESS = {
  create: true,
  onItemAdd: saveTracerouteAddress,
  onItemRemove: saveTracerouteAddress,
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

  // Escape characters
  let route = encodeURIComponent(message.address);

  // Get the number and increment
  let number = itemIndex;
  itemIndex += 1;

  // Create the item separator
  let routeItemHtml = resultTableRouteCollapsibleHtml(route, number);
  $(TRACEROUTE_RESULTS_TABLE).append(routeItemHtml);

  // Assign a function to the arrow
  $(TRACEROUTE_RESULTS_TABLE).on(
    'click',
    '#' + TRACEROUTE_HTML_ARROW_NAME + number,
    async function(event) {
      let arrow = $('#' + TRACEROUTE_HTML_ARROW_NAME + number);
      let result = $('#' + TRACEROUTE_HTML_RESULT_NAME + number);

      if (arrow.hasClass('text-primary')) {
        arrow
          .removeClass('text-primary fa-chevron-up')
          .addClass('fa-chevron-down');
        result.hide();
      } else {
        arrow
          .removeClass('fa-chevron-down')
          .addClass('text-primary fa-chevron-up');
        result.show();
      }
  });

  // Loop through all hops
  for (let hopIndex = 0; hopIndex < message.hops.length; hopIndex++) {
    let hop = message.hops[hopIndex];
    let mean = 0;

    // Loop through all tests
    for (let testIndex = 0; testIndex < hop.ms_values.length; testIndex++) {
      mean += hop.ms_values[testIndex] / hop.ms_values.length;
    }

    // Assign parameters to html
    $('#' + TRACEROUTE_HTML_RESULT_NAME + number).append(
      RESULT_TABLE_ITEM_HTML
        .text(encodeURIComponent(hop.ip))
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
    '/devicelist/pinghostslist/' + deviceId,
    'GET',
    deviceId,
    function(id, data) {
      // If happened an error
      if (!data.success) {
        onRequisitionError();
        return;
      }

      // Get the list from ping
      let hostslist = data.ping_hosts_list;

      // Assign each route
      $.each(hostslist, function(idx, address) {
        $(TRACEROUTE_ADDRESS_SELECTOR)[0].selectize
          .addOption({
            value: address,
            text: address,
          });

        $(TRACEROUTE_ADDRESS_SELECTOR)[0].selectize.addItem(address);
      });

      // Update items
      $(TRACEROUTE_ADDRESS_SELECTOR)[0].selectize.refreshItems();

      // Update completed
      initialized = true;
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
    // Do not save the routes when adding then
    initialized = false;

    showModal(event);
  });


  // Assign Start Test Button
  $(document).on('click', '.btn-start-traceroute-test', async function(event) {
    // Get which device to show the info
    let deviceId = $(DEVICE_ID_MODAL).text();

    // Start the animation
    setUpdatingAnimation(true);

    // Clear the result section and events
    $(TRACEROUTE_RESULTS_TABLE).text('');
    $(TRACEROUTE_RESULTS_TABLE).off();

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
  });

  // Assign a socket IO
  socket.on(SIO_NOTIFICATION_TRACEROUTE, function(macaddr, data) {
    // Check if it is the current device
    if ($(DEVICE_ID_MODAL).text() === macaddr) {
      // Update values
      updateValues(data);
    }
  });
});
