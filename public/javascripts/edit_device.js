
let renderEditErrors = function(errors) {
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

let validateEditDevice = function(event) {
  $('.form-control').blur(); // Remove focus from form
  $('.edit-form input').each(function() {
    // Reset validation messages
    this.setCustomValidity('');
  });
  let validator = new Validator();

  let row = $(event.target).parents('tr');
  let index = row.data('index');

  // Get form values
  let mac = row.data('deviceid');
  let validateWifi = row.data('validateWifi');
  let validateWifiBand = row.data('validate-wifi-band');
  let validateWifi5ghz = row.data('validate-wifi-5ghz');
  let validatePppoe = row.data('validatePppoe');
  let validateLan = row.data('validate-lan');
  let pppoe = $('#edit_connect_type-' + index.toString()).val() === 'PPPoE';
  let pppoeUser = $('#edit_pppoe_user-' + index.toString()).val();
  let pppoePassword = $('#edit_pppoe_pass-' + index.toString()).val();
  let pppoePassLength = row.data('minlengthPassPppoe');
  let lanSubnet = $('#edit_lan_subnet-' + index.toString()).val();
  let lanNetmask = $('#edit_lan_netmask-' + index.toString()).val();
  let ssid = $('#edit_wifi_ssid-' + index.toString()).val();
  let password = $('#edit_wifi_pass-' + index.toString()).val();
  let channel = $('#edit_wifi_channel-' + index.toString()).val();
  let band = $('#edit_wifi_band-' + index.toString()).val();
  let mode = $('#edit_wifi_mode-' + index.toString()).val();
  let ssid5ghz = $('#edit_wifi5_ssid-' + index.toString()).val();
  let password5ghz = $('#edit_wifi5_pass-' + index.toString()).val();
  let channel5ghz = $('#edit_wifi5_channel-' + index.toString()).val();
  let band5ghz = $('#edit_wifi5_band-' + index.toString()).val();
  let mode5ghz = $('#edit_wifi5_mode-' + index.toString()).val();
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
    band: {field: '#edit_wifi_band-' + index.toString()},
    mode: {field: '#edit_wifi_mode-' + index.toString()},
    ssid5ghz: {field: '#edit_wifi5_ssid-' + index.toString()},
    password5ghz: {field: '#edit_wifi5_pass-' + index.toString()},
    channel5ghz: {field: '#edit_wifi5_channel-' + index.toString()},
    band5ghz: {field: '#edit_wifi5_band-' + index.toString()},
    mode5ghz: {field: '#edit_wifi5_mode-' + index.toString()},
    lan_subnet: {field: '#edit_lan_subnet-' + index.toString()},
    lan_netmask: {field: '#edit_lan_netmask-' + index.toString()},
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
  if (pppoe && validatePppoe) {
    genericValidate(pppoeUser, validator.validateUser, errors.pppoe_user);
    genericValidate(pppoePassword, validator.validatePassword,
                    errors.pppoe_password, pppoePassLength);
  }
  if (validateWifi) {
    genericValidate(ssid, validator.validateSSID, errors.ssid);
    genericValidate(password, validator.validateWifiPassword, errors.password);
    genericValidate(channel, validator.validateChannel, errors.channel);
  }
  if (validateWifiBand) {
    genericValidate(band, validator.validateBand, errors.band);
    genericValidate(mode, validator.validateMode, errors.mode);
  }
  if (validateWifi5ghz) {
    genericValidate(ssid5ghz,
                    validator.validateSSID, errors.ssid5ghz);
    genericValidate(password5ghz,
                    validator.validateWifiPassword, errors.password5ghz);
    genericValidate(channel5ghz,
                    validator.validateChannel, errors.channel5ghz);
    genericValidate(band5ghz,
                    validator.validateBand, errors.band5ghz);
    genericValidate(mode5ghz,
                    validator.validateMode, errors.mode5ghz);
  }
  if (validateLan) {
    genericValidate(lanSubnet,
                    validator.validateIP, errors.lan_subnet);
    genericValidate(lanSubnet,
                    validator.validateIPAgainst, errors.lan_subnet,
                    '192.168.43');
    genericValidate(lanNetmask,
                    validator.validateNetmask, errors.lan_netmask);
  }

  let hasNoErrors = function(key) {
    return errors[key].messages.length < 1;
  };
  let editFormObj = $(this);
  if (Object.keys(errors).every(hasNoErrors)) {
    // If no errors present, send to backend
    let data = {'content': {
      'connection_type': (pppoe) ? 'pppoe' : 'dhcp',
      'external_reference': {
        kind: externalReferenceType,
        data: externalReferenceData,
      },
    }};
    if (validatePppoe) {
      data.content.pppoe_user = (pppoe) ? pppoeUser : '';
      data.content.pppoe_password = (pppoe) ? pppoePassword : '';
    }
    if (validateWifi) {
      data.content.wifi_ssid = ssid;
      data.content.wifi_password = password;
      data.content.wifi_channel = channel;
    }
    if (validateWifiBand) {
      data.content.wifi_band = band;
      data.content.wifi_mode = mode;
    }
    if (validateWifi5ghz) {
      data.content.wifi_ssid_5ghz = ssid5ghz;
      data.content.wifi_password_5ghz = password5ghz;
      data.content.wifi_channel_5ghz = channel5ghz;
      data.content.wifi_band_5ghz = band5ghz;
      data.content.wifi_mode_5ghz = mode5ghz;
    }
    if (validateLan) {
      data.content.lan_subnet = lanSubnet;
      data.content.lan_netmask = lanNetmask;
    }

    $.ajax({
      type: 'POST',
      url: '/devicelist/update/' + mac,
      dataType: 'json',
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: function(resp) {
        editFormObj.removeClass('was-validated');
        displayAlertMsg({type: 'success', message: 'Editado com sucesso'});
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
            band: errors.band,
            mode: errors.mode,
            ssid5ghz: errors.ssid5ghz,
            password5ghz: errors.password5ghz,
            channel5ghz: errors.channel5ghz,
            band5ghz: errors.band5ghz,
            mode5ghz: errors.mode5ghz,
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
  editFormObj.addClass('was-validated');
  return false;
};

$(document).ready(function() {
  $(document).on('submit', '.edit-form', validateEditDevice);

  $(document).on('click', '.btn-reboot', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    $.ajax({
      url: '/devicelist/command/' + id + '/boot',
      type: 'post',
      success: function(res) {
        let badge;
        if (res.success) {
          badge = $(event.target).closest('.actions-opts')
                                     .find('.badge-success');
        } else {
          badge = $(event.target).closest('.actions-opts')
                                     .find('.badge-warning');
          if (res.message) {
            badge.text(res.message);
          }
        }

        badge.removeClass('d-none');
        setTimeout(function() {
          badge.addClass('d-none');
        }, 1500);
      },
      error: function(xhr, status, error) {
        let badge = $(event.target).closest('.actions-opts')
                                   .find('.badge-warning');
        badge.text(status);
        badge.removeClass('d-none');
        setTimeout(function() {
          badge.addClass('d-none');
        }, 1500);
      },
    });
  });

  $(document).on('click', '.btn-reset-app', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    $.ajax({
      url: '/devicelist/command/' + id + '/rstapp',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        let badge;
        if (res.success) {
          badge = $(event.target).closest('.actions-opts')
                                     .find('.badge-success');
        } else {
          badge = $(event.target).closest('.actions-opts')
                                     .find('.badge-warning');
          if (res.message) {
            badge.text(res.message);
          }
        }

        badge.removeClass('d-none');
        setTimeout(function() {
          badge.addClass('d-none');
        }, 1500);
      },
      error: function(xhr, status, error) {
        let badge = $(event.target).closest('.actions-opts')
                                   .find('.badge-warning');
        badge.text(status);
        badge.removeClass('d-none');
        setTimeout(function() {
          badge.addClass('d-none');
        }, 1500);
      },
    });
  });

  $(document).on('click', '.btn-trash', function(event) {
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

  $(document).on('click', '.toggle-pass', function(event) {
    let inputField = $(event.target).closest('.input-group').find('input');
    if (inputField.attr('type') == 'text') {
      inputField.attr('type', 'password');
      $(this).children().removeClass('fa-eye').addClass('fa-eye-slash');
    } else {
      inputField.attr('type', 'text');
      $(this).children().removeClass('fa-eye-slash').addClass('fa-eye');
    }
  });

  $(document).on('click', '.btn-reset-blocked', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    $.ajax({
      url: '/devicelist/command/' + id + '/rstdevices',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        let badge;
        if (res.success) {
          badge = $(event.target).closest('.actions-opts')
                                     .find('.badge-success');
        } else {
          badge = $(event.target).closest('.actions-opts')
                                     .find('.badge-warning');
          if (res.message) {
            badge.text(res.message);
          }
        }

        badge.removeClass('d-none');
        setTimeout(function() {
          badge.addClass('d-none');
        }, 1500);
      },
      error: function(xhr, status, error) {
        let badge = $(event.target).closest('.actions-opts')
                                   .find('.badge-warning');
        badge.text(status);
        badge.removeClass('d-none');
        setTimeout(function() {
          badge.addClass('d-none');
        }, 1500);
      },
    });
  });
});
