
let renderEditErrors = function(errors) {
  for (let key in errors) {
    if (errors[key].messages.length > 0) {
      let message = '';
      errors[key].messages.forEach(function(msg) {
        message += msg + ' ';
      });
      $(errors[key].field).closest('.input-entry').find('.invalid-feedback').html(message);
      $(errors[key].field)[0].setCustomValidity(message);
    }
  }
};

let validateEditDevice = function(event) {
  $('.form-control').blur(); // Remove focus from form
  $('.edit-form input').each(function(){ // Reset validation messages
    this.setCustomValidity('');
  });
  let validator = new Validator();

  let row = $(event.target).parents('tr');
  let index = row.data('index');

  // Get form values
  let mac = row.data('deviceid');
  let pppoe = $('#edit_connect_type-' + index.toString()).val() === 'PPPoE';
  let pppoeUser = $('#edit_pppoe_user-' + index.toString()).val();
  let pppoePassword = $('#edit_pppoe_pass-' + index.toString()).val();
  let ssid = $('#edit_wifi_ssid-' + index.toString()).val();
  let password = $('#edit_wifi_pass-' + index.toString()).val();
  let channel = $('#edit_wifi_channel-' + index.toString()).val();
  let externalReferenceType = $('#edit_ext_ref_type_selected-' +
                                index.toString()).html();
  let externalReferenceData = $('#edit_external_reference-' +
                                index.toString()).val();

  // Initialize error structure
  let errors = {
    pppoe_user: {field: '#edit_pppoe_user-' + index.toString()},
    pppoe_password: {field: '#edit_pppoe_pass-' + index.toString()},
    ssid: {field: '#edit_wifi_ssid-' + index.toString()},
    password: {field: '#edit_wifi_pass-' + index.toString()},
    channel: {field: '#edit_wifi_channel-' + index.toString()},
  };
  for (let key in errors) {
    if (Object.prototype.hasOwnProperty.call(errors, key)) {
      errors[key]['messages'] = [];
    }
  }

  let genericValidate = function(value, func, errors) {
    let validField = func(value);
    if (!validField.valid) {
      errors.messages = validField.err;
    }
  };

  // Validate fields
  if (pppoe) {
    genericValidate(pppoeUser, validator.validateUser, errors.pppoe_user);
    genericValidate(pppoePassword, validator.validatePassword,
                    errors.pppoe_password);
  }
  genericValidate(ssid, validator.validateSSID, errors.ssid);
  genericValidate(password, validator.validateWifiPassword, errors.password);
  genericValidate(channel, validator.validateChannel, errors.channel);

  let hasNoErrors = function(key) {
    return errors[key].messages.length < 1;
  };

  if (Object.keys(errors).every(hasNoErrors)) {
    // If no errors present, send to backend
    let data = {'content': {
      'connection_type': (pppoe) ? 'pppoe' : 'dhcp',
      'pppoe_user': (pppoe) ? pppoeUser : '',
      'pppoe_password': (pppoe) ? pppoePassword : '',
      'wifi_ssid': ssid,
      'wifi_password': password,
      'wifi_channel': channel,
      'external_reference': {
        kind: externalReferenceType,
        data: externalReferenceData,
      },
    }};

    $.ajax({
      type: 'POST',
      url: '/devicelist/update/' + mac,
      dataType: 'json',
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: function(resp) {
        location.reload();
      },
      error: function(xhr, status, error) {
        let resp = JSON.parse(xhr.responseText);
        if ('errors' in resp) {
          let keyToError = {
            pppoe_user: errors.pppoe_user,
            pppoe_password: errors.pppoe_password,
            ssid: errors.ssid,
            password: errors.password,
            channel: errors.channel,
          };
          resp.errors.forEach(function(pair) {
            let key = Object.keys(pair)[0];
            keyToError[key].messages.push(pair[key]);
          });
          renderEditErrors(errors);
        }
      },
    });
  } else {
    // Else, render errors on form
    renderEditErrors(errors);
  }
  return false;
};

$(document).ready(function() {
  $('.edit-form').submit(validateEditDevice);

  $('.btn-reboot').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    $.ajax({
      url: '/devicelist/command/' + id + '/boot',
      type: 'post',
      success: function(res) {
        let badge = $(event.target).closest('.actions-opts')
                                   .find('.badge-success');
        badge.show();
        setTimeout(function() {
          badge.hide();
        }, 1500);
      },
    });
  });

  $('.btn-reset-app').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    $.ajax({
      url: '/devicelist/command/' + id + '/rstapp',
      type: 'post',
      success: function(res) {
        let badge = $(event.target).closest('.actions-opts')
                                   .find('.badge-success');
        badge.show();
        setTimeout(function() {
          badge.hide();
        }, 1500);
      },
    });
  });

  $('.btn-trash').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    $.ajax({
      url: '/devicelist/delete/' + id,
      type: 'post',
      success: function(res) {
        setTimeout(function() {
          window.location.reload();
        }, 100);
      },
    });
  });
});
