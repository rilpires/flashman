import {anlixDocumentReady, displayAlertMsg} from '../src/common.index.js';
import 'jquery-mask-plugin';
import Validator from './device_validator.js';
import {getConfigStorage} from './session_storage.js';

const t = i18next.t;

let renderDeviceErrors = function(errors) {
  for (let key in errors) {
    if (errors[key].messages.length > 0) {
      let message = '';
      errors[key].messages.forEach(function(msg) {
        message += msg + ' ';
      });
      $(errors[key].field).closest('.input-entry')
                          .find('.invalid-feedback').html(message);
      $(errors[key].field)[0].setCustomValidity(message);
    }
  }
};

let validateNewDevice = function() {
  $('.form-control').blur(); // Remove focus from form
  $('#deviceForm input').each(function() {
    // Reset validation messages
    this.setCustomValidity('');
  });
  let validator = new Validator();

  // Get form values
  let pppoe = $('#new_connect_type').val() === 'PPPoE';
  let mac = $('#new_mac').val();
  let pppoeUser = $('#new_pppoe_user').val();
  let pppoePassword = $('#new_pppoe_pass').val();
  let pppoePassLength = $('#new_pppoe_pass').data('minlengthPassPppoe');
  let ssid = $('#new_wifi_ssid').val();
  let password = $('#new_wifi_pass').val();
  let channel = $('#new_wifi_channel').val();
  let band = $('#new_wifi_band').val();
  let mode = $('#new_wifi_mode').val();
  let externalReferenceType = $('#new_ext_ref_type_selected').html();
  let externalReferenceData = $('#new_external_reference').val();
  let ssidPrefix = '';
  let isSsidPrefixEnabled = getConfigStorage('isSsidPrefixEnabled');
  if (isSsidPrefixEnabled) {
    ssidPrefix = getConfigStorage('ssidPrefix');
  }

  // Initialize error structure
  let errors = {
    mac: {field: '#new_mac'},
    pppoe_user: {field: '#new_pppoe_user'},
    pppoe_password: {field: '#new_pppoe_pass'},
    ssid: {field: '#new_wifi_ssid'},
    password: {field: '#new_wifi_pass'},
    channel: {field: '#new_wifi_channel'},
    band: {field: '#new_wifi_band'},
    mode: {field: '#new_wifi_mode'},
    ext_reference: {field: '#new_external_reference'},
  };
  for (let key in errors) {
    if (Object.prototype.hasOwnProperty.call(errors, key)) {
      errors[key]['messages'] = [];
    }
  }

  let genericValidate = function(value, func, errors, minlength) {
    let validField = func(value, minlength);
    if (!validField.valid) {
      errors.messages = validField.err;
    }
  };

  // Validate fields
  genericValidate(mac, validator.validateMac, errors.mac);
  if (pppoe) {
    genericValidate(pppoeUser, validator.validateUser, errors.pppoe_user);
    genericValidate(pppoePassword, validator.validatePassword,
                    errors.pppoe_password, pppoePassLength);
  }
  genericValidate(ssidPrefix+ssid, validator.validateSSID, errors.ssid);
  genericValidate(password, validator.validateWifiPassword, errors.password);
  genericValidate(channel, validator.validateChannel, errors.channel);
  genericValidate(band, validator.validateBand, errors.band);
  genericValidate(mode, validator.validateMode, errors.mode);
  genericValidate({kind: externalReferenceType, data: externalReferenceData},
    validator.validateExtReference, errors.ext_reference);

  let hasNoErrors = function(key) {
    return errors[key].messages.length < 1;
  };
  let newFormObj = $(this);
  if (Object.keys(errors).every(hasNoErrors)) {
    // If no errors present, send to backend
    let data = {'content': {
      'mac_address': mac,
      'connection_type': (pppoe) ? 'pppoe' : 'dhcp',
      'pppoe_user': (pppoe) ? pppoeUser : '',
      'pppoe_password': (pppoe) ? pppoePassword : '',
      'wifi_ssid': ssid,
      'wifi_password': password,
      'wifi_channel': channel,
      'wifi_band': band,
      'wifi_mode': mode,
      'external_reference': {
        kind: externalReferenceType,
        data: externalReferenceData,
      },
    }};

    $.ajax({
      type: 'POST',
      url: '/devicelist/create',
      dataType: 'json',
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: function(resp) {
        newFormObj.removeClass('was-validated');
        location.reload();
      },
      error: function(xhr, status, error) {
        let resp = JSON.parse(xhr.responseText);
        if ('errors' in resp) {
          let keyToError = {
            mac: errors.mac,
            pppoe_user: errors.pppoe_user,
            pppoe_password: errors.pppoe_password,
            ssid: errors.ssid,
            password: errors.password,
            channel: errors.channel,
            band: errors.band,
            mode: errors.mode,
          };
          resp.errors.forEach(function(pair) {
            let key = Object.keys(pair)[0];
            keyToError[key].messages.push(pair[key]);
          });
          renderDeviceErrors(errors);
        } else if ('success' in resp && !resp.success) {
          displayAlertMsg({type: 'danger', message: resp.message});
        }
      },
    });
  } else {
    // Else, render errors on form
    renderDeviceErrors(errors);
  }
  newFormObj.addClass('was-validated');
  return false;
};

anlixDocumentReady.add(function() {
  $('#deviceForm').submit(validateNewDevice);
  $('#new_external_reference').mask(t('personIdentificationMask')).keyup();
  $('#new_mac').mask('HH:HH:HH:HH:HH:HH', {
    translation: {
      H: {pattern: /[A-Fa-f0-9]/},
    },
    onChange: function(mac) {
      $('#new_mac').val(mac.toUpperCase());
    },
  });
  $('#new_connect_type').change(function() {
    if ($('#new_connect_type').val() === 'PPPoE') {
      $('#new_pppoe_user').parent().show();
      $('#new_pppoe_pass').parent().show();
    } else {
      $('#new_pppoe_user').parent().hide();
      $('#new_pppoe_pass').parent().hide();
    }
  });
  $('#new_pppoe_user').parent().hide();
  $('#new_pppoe_pass').parent().hide();
});
