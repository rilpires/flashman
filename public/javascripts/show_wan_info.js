import {anlixDocumentReady} from '../src/common.index.js';
import {socket} from './common_actions.js';

const t = i18next.t;

// Sections
const UPDATING_INFO_SECTION = '#waninfo-loading-section';
const NO_EXTRA_INFO_SECTION = '#waninfo-no-information-section';
const IP_NETWORK_SECTION = '#ip-network-information';
const PPPOE_SECTION = '#pppoe-information';
const DEFAULT_GATEWAY_SECTION = '#default-gateway-information';
const DNS_SERVER_SECTION = '#dns-server-information';


// Inputs
// IP Network
const IPV4_ADDRESS_AND_MASK_INPUT = '#ipv4-address-mask-input';
const IPV6_ADDRESS_AND_MASK_INPUT = '#ipv6-address-mask-input';
const IPV4_MASKED_ADDRESS_INPUT = '#ipv4-masked-address-input';
const IPV6_MASKED_ADDRESS_INPUT = '#ipv6-masked-address-input';

// PPPoE
const PPPOE_MAC_INPUT = '#pppoe-mac-input';
const PPPOE_IP_INPUT = '#pppoe-ip-input';

// Default Gateway
const DEFAULT_GATEWAY_IPV4_INPUT = '#ipv4-default-gateway-input';
const DEFAULT_GATEWAY_IPV6_INPUT = '#ipv6-default-gateway-input';

// DNS Server
const DNS_SERVER_ADDRESS_INPUT = '#dns-server-address-input';


// Modals
const MAIN_MODAL = '#waninfo-modal';
const DEVICE_ID_MODAL = '#waninfo-visual';


// Button
const UPDATE_BUTTON = '#btn-waninfo-update';
const UPDATE_BUTTON_ICON = '#btn-waninfo-ipdate-icon';


// Socket
const SIO_NOTIFICATION_WAN_INFO = 'WANINFO';


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
    $(IP_NETWORK_SECTION).hide();
    $(PPPOE_SECTION).hide();
    $(DEFAULT_GATEWAY_SECTION).hide();
    $(DNS_SERVER_SECTION).hide();
    $(NO_EXTRA_INFO_SECTION).hide();

    // Show Update
    $(UPDATING_INFO_SECTION).show();

    // Disable update button and rotate the icon
    $(UPDATE_BUTTON).prop('disabled', true);
    $(UPDATE_BUTTON_ICON).addClass('animated rotateOut infinite');

  // Disable update animation
  } else {
    // Show sections
    $(IP_NETWORK_SECTION).show();
    $(PPPOE_SECTION).show();
    $(DEFAULT_GATEWAY_SECTION).show();
    $(DNS_SERVER_SECTION).show();

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
    $(IP_NETWORK_SECTION).show();
    $(PPPOE_SECTION).show();
    $(DEFAULT_GATEWAY_SECTION).show();

  // No information available
  } else {
    // Show No-info section
    $(NO_EXTRA_INFO_SECTION).show();

    // Hide the rest
    $(UPDATING_INFO_SECTION).hide();
    $(IP_NETWORK_SECTION).hide();
    $(PPPOE_SECTION).hide();
    $(DEFAULT_GATEWAY_SECTION).hide();
    $(DNS_SERVER_SECTION).hide();
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

  // Check if PPPoE and has empty fields
  if (message && message.success) {
    // Check PPPoE
    if (message.wan_conn_type === 'pppoe') {
      // If empty
      if (message.pppoe_mac === '' || message.pppoe_ip === '' ) {
        // Set the update animation
        setUpdatingAnimation(true);

        // Call update
        sendRequest(
          '/devicelist/command/' + deviceId + '/waninfo/',
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
    }

    // Check if any is empty, if so, ask for update
    if (
      message.ipv4_address === '' ||
      message.ipv4_mask === '' ||
      message.ipv6_address === '' ||
      message.ipv6_mask === '' ||
      message.default_gateway_v4 === '' ||
      message.default_gateway_v6 === '' ||
      message.dns_server === ''
    ) {
      // If empty, set the update animation
      setUpdatingAnimation(true);

      // Call update
      sendRequest(
        '/devicelist/command/' + deviceId + '/waninfo/',
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


// Calculates the ipv4 with the mask
const calculateMaskIpv4 = function(ip, mask) {
  let bytes = ip.split('.', 4);
  let ipMasked = '';

  for (let index = 0; index < 4; index++) {
    bytes[index] = parseFloat(bytes[index]);

    // If the byte is not valid, return empty string
    if (isNaN(bytes[index])) {
      return '';
    }

    // Apply the mask by putting at the right bits
    // and zeroing least signficant bits, then undo
    bytes[index] = (bytes[index] << ((3 - index)*8)) >>> (32 - mask);
    bytes[index] = (bytes[index] << (32 - mask)) >>> ((3 - index)*8);

    // Concatenate
    if (!index) {
      ipMasked += bytes[index];
    } else {
      ipMasked += '.' + bytes[index];
    }
  }

  // Return the masked ip
  return ipMasked;
};


// Calculates the ipv6 with the mask
const calculateMaskIpv6 = function(ip, mask) {
  let ipMasked = '';
  let bytes = new Array(8).fill(0);


  // Create the array
  let separated = ip.split('::', 2);
  let octets = separated[0].split(':', 8);

  // If missing values, fill with the rest or 0
  if (octets.length < 8) {
    let octets2 = separated[1].split(':');
    octets = octets.concat(Array(8 - (octets.length + octets2.length)).fill(0));

    if (octets2[0] === '') {
      octets = octets.concat([0]);
    } else {
      octets = octets.concat(octets2);
    }
  }


  // Apply mask
  for (let index = 0; index < 8; index++) {
    bytes[index] = Number('0x' + octets[index]);

    if (mask > 0) {
    mask = 16 - mask;
      bytes[index] = bytes[index] & (0xffff << (mask > 0 ? mask : 0));
      mask = -mask;
    } else {
      bytes[index] = 0;
    }
  }


  // Concatenate
  for (let index = 0; index < 8; index++) {
    if (!index) {
      ipMasked += bytes[index].toString(16);

    // If there is no value in the array
    } else if (
      !bytes
      .slice(index, bytes.length)
      .some((item) => item !==0) &&
      index <= 6
    ) {
      ipMasked += '::';
      return ipMasked;
    } else {
      ipMasked += ':' + bytes[index].toString(16);
    }
  }


  // Return the masked ip
  return ipMasked;
};


// Update all values
//  message - Response message to change values
const updateValues = function(message) {
  // When update, cancel the animation
  setUpdatingAnimation(false);
  // Check PPPoE
  if (message.wan_conn_type === 'pppoe') {
    // Enable the PPPoE field
    $(PPPOE_SECTION).show();


    // Change values
    $(PPPOE_MAC_INPUT).text((
      message.pppoe_mac === '' ? t('N/A') : message.pppoe_mac.toUpperCase()
    ));
    $(PPPOE_IP_INPUT).text((
      message.pppoe_ip === '' ? t('N/A') : message.pppoe_ip
    ));


  // Hide PPPoE fied
  } else {
    $(PPPOE_SECTION).hide();
  }

  // Change other values
  $(IPV4_ADDRESS_AND_MASK_INPUT).text((
    (message.ipv4_address === '' ||
    message.ipv4_mask <= 0 ||
    message.ipv4_mask > 32) ?

    t('N/A') : message.ipv4_address + '/' + message.ipv4_mask
  ));
  $(IPV6_ADDRESS_AND_MASK_INPUT).text((
    (message.ipv6_address === '' ||
    message.ipv6_mask <= 0 ||
    message.ipv6_mask > 128) ?

    t('N/A') : message.ipv6_address + '/' + message.ipv6_mask
  ));
  $(IPV4_MASKED_ADDRESS_INPUT).text((
    (message.ipv4_address === '' ||
    message.ipv4_mask <= 0 ||
    message.ipv4_mask > 32) ?

    t('N/A') : calculateMaskIpv4(message.ipv4_address, message.ipv4_mask)
  ));
  $(IPV6_MASKED_ADDRESS_INPUT).text((
    (message.ipv6_address === '' ||
    message.ipv6_mask <= 0 ||
    message.ipv6_mask > 128) ?

    t('N/A') : calculateMaskIpv6(message.ipv6_address, message.ipv6_mask)
  ));
  $(DEFAULT_GATEWAY_IPV4_INPUT).text((
    message.default_gateway_v4 === '' ? t('N/A') : message.default_gateway_v4
  ));
  $(DEFAULT_GATEWAY_IPV6_INPUT).text((
    message.default_gateway_v6 === '' ? t('N/A') : message.default_gateway_v6
  ));
  $(DNS_SERVER_ADDRESS_INPUT).text((
    message.dns_server === '' ? t('N/A') : message.dns_server
  ));
};


// Shows the showwaninfo.pug modal
const showModal = async function(event) {
  // Reset fields
  $(IPV4_ADDRESS_AND_MASK_INPUT).text('');
  $(IPV6_ADDRESS_AND_MASK_INPUT).text('');
  $(IPV4_MASKED_ADDRESS_INPUT).text('');
  $(IPV6_MASKED_ADDRESS_INPUT).text('');

  $(PPPOE_MAC_INPUT).text('');
  $(PPPOE_IP_INPUT).text('');

  $(DEFAULT_GATEWAY_IPV4_INPUT).text('');
  $(DEFAULT_GATEWAY_IPV6_INPUT).text('');


  // Set updating animations
  setUpdatingAnimation(true);


  // Get which device to show the info
  let row = $(event.target).parents('tr');
  let deviceId = row.data('deviceid');


  // Send the command to get all infos from database
  sendRequest(
    '/devicelist/waninfo/' + deviceId,
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
  // Assign WAN information Button
  $(document).on('click', '.more-info-wan-button', async function(event) {
    showModal(event);
  });


  // Assign a socket IO
  socket.on(SIO_NOTIFICATION_WAN_INFO, function(macaddr, data) {
    // Check if it is the current device
    if ($(DEVICE_ID_MODAL).text() === macaddr) {
      // Stop the animation
      setUpdatingAnimation(false);

      // Update values
      updateValues(data);
    }
  });


  // Assign update button
  $(document).on('click', '#btn-waninfo-update', async function(event) {
    // Get which device to show the info
    let deviceId = $(DEVICE_ID_MODAL).text();

    // Set the update animation
    setUpdatingAnimation(true);

    // Send the request
    sendRequest(
      '/devicelist/command/' + deviceId + '/waninfo/',
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
