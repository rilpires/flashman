import {anlixDocumentReady} from '../src/common.index.js';
import {socket} from './common_actions.js';

// Sections
const UPDATING_INFO_SECTION = '#laninfo-loading-section';
const NO_EXTRA_INFO_SECTION = '#laninfo-no-information-section';
const PREFIX_DELEGATION_SECTION = '#prefix-delegation-information';


// Inputs
// Prefix Delegation
const PREFIX_DELEGATION_ADDRESS_INPUT = '#prefix-delegation-input';
const PREFIX_DELEGATION_MASK_INPUT = '#prefix-delegation-mask-input';
const PREFIX_DELEGATION_LOCAL_ADDRESS_INPUT =
  '#prefix-delegation-local-address-input';


// Modals
const MAIN_MODAL = '#laninfo-modal';
const DEVICE_ID_MODAL = '#laninfo-visual';


// Button
const UPDATE_BUTTON = '#btn-laninfo-update';
const UPDATE_BUTTON_ICON = '#btn-laninfo-ipdate-icon';


// Socket
const SIO_NOTIFICATION_LAN_INFO = 'LANINFO';


/*

  How does it work:

  When the modal is opened, the values are requested from the database.
  If there is any field empty, it automatically updates making a request to
  the backend to get it from the router. It can be called when the update
  button is pressed too.

*/


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
) {
  $.ajax({
    url: endpoint,

    method: (type === 'GET' || type === 'POST' ? type : 'GET'),

    dataType: 'json',

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
    $(PREFIX_DELEGATION_SECTION).hide();
    $(NO_EXTRA_INFO_SECTION).hide();

    // Show Update
    $(UPDATING_INFO_SECTION).show();

    // Disable update button and rotate the icon
    $(UPDATE_BUTTON).prop('disabled', true);
    $(UPDATE_BUTTON_ICON).addClass('animated rotateOut infinite');

  // Disable update animation
  } else {
    // Show sections
    $(PREFIX_DELEGATION_SECTION).show();

    // Hide Update and No-info
    $(UPDATING_INFO_SECTION).hide();
    $(NO_EXTRA_INFO_SECTION).hide();

    // Enable update button and cancel rotation
    $(UPDATE_BUTTON).prop('disabled', false);
    $(UPDATE_BUTTON_ICON).removeClass('animated rotateOut infinite');
  }
};


// Configure the modal to show or hide No-info
//  hasInfo - If it has or not an info to show
const setNoInfoModal = function(hasInfo) {
  // Remove animation
  setUpdatingAnimation(false);

  // If there is some info to show
  if (hasInfo) {
    // Hide Update and No-info sections
    $(UPDATING_INFO_SECTION).hide();
    $(NO_EXTRA_INFO_SECTION).hide();

    // Show the rest
    $(PREFIX_DELEGATION_SECTION).show();

  // No information available
  } else {
    // Show No-info section
    $(NO_EXTRA_INFO_SECTION).show();

    // Hide the rest
    $(UPDATING_INFO_SECTION).hide();
    $(PREFIX_DELEGATION_SECTION).hide();
  }
};


const onRequisitionError = function(deviceId, xhr, status, error) {
  setNoInfoModal(false);
};


// Validates all incoming values to check if there is any empty
//  message - Response message to be validated
const validateValues = function(deviceId, message) {
  // Update the values with the fields that is present in database already
  updateValues(message);

  // Check if message is valid
  if (message && message.success) {
    // Check if any is empty, if so, ask for update
    if (
      message.prefix_delegation_addr === '' ||
      message.prefix_delegation_mask === '' ||
      message.prefix_delegation_local === ''
    ) {
      // If empty, set the update animation
      setUpdatingAnimation(true);

      // Call update
      sendRequest(
        '/devicelist/command/' + deviceId + '/laninfo/',
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

      return;
    }

  // Invalid message
  } else {
    setNoInfoModal(false);
  }
};


// Update all values
//  message - Response message to change values
const updateValues = function(message) {
  // When update, cancel the animation
  setUpdatingAnimation(false);

  // Change  values
  $(PREFIX_DELEGATION_ADDRESS_INPUT).text((
    message.prefix_delegation_addr === '' ?
      'N/D' : message.prefix_delegation_addr
  ));
  $(PREFIX_DELEGATION_MASK_INPUT).text((
    message.prefix_delegation_mask === '' ?
      'N/D' : message.prefix_delegation_mask
  ));
  $(PREFIX_DELEGATION_LOCAL_ADDRESS_INPUT).text((
    message.prefix_delegation_local === '' ?
      'N/D' : message.prefix_delegation_local
  ));
};


// Shows the showlaninfo.pug modal
const showModal = async function(event) {
  // Reset fields
  $(PREFIX_DELEGATION_ADDRESS_INPUT).text('N/D');
  $(PREFIX_DELEGATION_MASK_INPUT).text('N/D');
  $(PREFIX_DELEGATION_LOCAL_ADDRESS_INPUT).text('N/D');


  // Set updating animations
  setUpdatingAnimation(true);


  // Get which device to show the info
  let row = $(event.target).parents('tr');
  let deviceId = row.data('deviceid');


  // Send the command to get all infos from database
  sendRequest(
    '/devicelist/laninfo/' + deviceId,
    'GET',
    deviceId,
    validateValues,
    onRequisitionError,
  );


  // Include the id in the Modal
  $(DEVICE_ID_MODAL).text(deviceId);

  // Show the Modal
  $(MAIN_MODAL).modal('show');
};


// Entry point
anlixDocumentReady.add(function() {
  // Assign LAN information Button
  $(document).on('click', '.more-info-lan-button', async function(event) {
    showModal(event);
  });


  // Assign a socket IO
  socket.on(SIO_NOTIFICATION_LAN_INFO, function(macaddr, data) {
    // Check if it is the current device
    if ($(DEVICE_ID_MODAL).text() === macaddr) {
      // Stop the animation
      setUpdatingAnimation(false);

      // Update values
      updateValues(data);
    }
  });


  // Assign update button
  $(document).on('click', '#btn-laninfo-update', async function(event) {
    // Get which device to show the info
    let deviceId = $(DEVICE_ID_MODAL).text();

    // Set the update animation
    setUpdatingAnimation(true);

    // Send the request
    sendRequest(
      '/devicelist/command/' + deviceId + '/laninfo/',
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
});
