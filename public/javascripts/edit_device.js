import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';
import Validator from './device_validator.js';
import {getConfigStorage} from './session_storage.js';

const t = i18next.t;

let renderEditErrors = function(errors) {
  let allMessages = '';
  for (let key in errors) {
    if (errors[key].messages.length > 0) {
      let message = '';
      errors[key].messages.forEach(function(msg) {
        message += msg + ' ';
      });
      $(errors[key].field).closest('.input-entry')
                          .find('.invalid-feedback').html(message);
      $(errors[key].field)[0].setCustomValidity(message);
      allMessages += message;
    }
  }
  return allMessages;
};

const validateEditDeviceMesh = function(event) {
  let row = $(event.target).parents('tr');
  let slaveCount = parseInt(row.data('slave-count'));
  for (let i = 0; i < (slaveCount*2)+1; i++) {
    row = row.prev();
  }
  row.find('form').submit();
};

const openErrorSwal = function(message) {
  swal({
    type: 'error',
    title: t('Error'),
    text: message,
    confirmButtonColor: '#4db6ac',
    confirmButtonText: 'OK',
  });
};

// disable an make loading icon appear on submit button
const switchSubmitButton = function(i) {
  let row = $('.edit-button-'+i);
  let iconButtonSubmit;
  if (row.find('.btn-primary').prop('disabled')) {
    row.find('.btn-primary').prop('disabled', false);
    iconButtonSubmit = row.find('.fa-spinner');
    iconButtonSubmit.addClass('fa-check');
    iconButtonSubmit.removeClass('fa-spinner');
    iconButtonSubmit.removeClass('fa-pulse');
  } else {
    row.find('.btn-primary').prop('disabled', true);
    iconButtonSubmit = row.find('.fa-check');
    iconButtonSubmit.removeClass('fa-check');
    iconButtonSubmit.addClass('fa-spinner');
    iconButtonSubmit.addClass('fa-pulse');
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
  let slaveCount = row.prev().data('slave-count');
  switchSubmitButton(index);

  // Get form values
  let mac = row.data('deviceid');
  let isTR069 = row.data('is-tr069');
  let validateWifi = row.data('validateWifi');
  let validateWifiBand = row.data('validate-wifi-band');
  let validateWifi5ghz = row.data('validate-wifi-5ghz');
  let validateWifiPower = row.data('validate-wifi-power');
  let validatePppoe = row.data('validatePppoe');
  let validateIpv6Enabled = row.data('validate-ipv6-enabled');
  let validateLan = row.data('validate-lan');
  let ipv6Enabled = (
    $('#edit_ipv6_enabled-' + index.toString()).is(':checked') ? 1 : 0);
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
  let power = $('#edit_wifi_power-' + index.toString()).val();
  let wifiState = (
    $('#edit_wifi_state-' + index.toString()).is(':checked') ? 1 : 0);
  let wifiHidden = (
    $('#edit_wifi_hidden-' + index.toString()).is(':checked') ? 1 : 0);
  let ssid5ghz = $('#edit_wifi5_ssid-' + index.toString()).val();
  let password5ghz = $('#edit_wifi5_pass-' + index.toString()).val();
  let channel5ghz = $('#edit_wifi5_channel-' + index.toString()).val();
  let band5ghz = $('#edit_wifi5_band-' + index.toString()).val();
  let mode5ghz = $('#edit_wifi5_mode-' + index.toString()).val();
  let power5ghz = $('#edit_wifi5_power-' + index.toString()).val();
  let wifiState5ghz = (
    $('#edit_wifi5_state-' + index.toString()).is(':checked') ? 1 : 0);
  let wifiHidden5ghz = (
    $('#edit_wifi5_hidden-' + index.toString()).is(':checked') ? 1 : 0);
  let isDeviceSsidPrefixEnabled = ($('#edit_is_ssid_prefix_enabled-' +
    index.toString()).is(':checked') ? 1 : 0);
  let ssidPrefix = '';
  if (isDeviceSsidPrefixEnabled == 1) {
    ssidPrefix = getConfigStorage('ssidPrefix');
  }
  let externalReferenceType = $('#edit_ext_ref_type_selected-' +
                                index.toString()).html();
  let externalReferenceData = $('#edit_external_reference-' +
                                index.toString()).val();
  let externalReference = {kind: externalReferenceType,
                           data: externalReferenceData};
  let validateBridge =
    $('#edit_opmode-' + index.toString()).val() === 'bridge_mode';
  let bridgeEnabled = validateBridge;
  let useBridgeFixIP = $('input[name="edit_opmode_fixip_en-'+
                      index.toString()+'"]:checked').length > 0;
  let bridgeFixIP = (useBridgeFixIP) ?
    $('#edit_opmode_fixip-' + index.toString()).val() : '';
  let bridgeFixGateway = (useBridgeFixIP) ?
    $('#edit_opmode_fixip_gateway-' + index.toString()).val() : '';
  let bridgeFixDNS = (useBridgeFixIP) ?
    $('#edit_opmode_fixip_dns-' + index.toString()).val() : '';
  // Case not marked assign True, pointing that is disabled
  let bridgeDisableSwitch = $('input[name="edit_opmode_switch_en-'+
                              index.toString()+'"]:checked').length == 0;
  let meshMode = $('#edit_meshMode-' + index.toString()).val();

  let slaveCustomConfigs = [];
  if (slaveCount > 0) {
    for (let i = 0; i < slaveCount; i++) {
      let slaveRefType = $('#edit_ext_ref_type_selected-'+index+'_'+i).html();
      let slaveRefData = $('#edit_external_reference-'+index+'_'+i).val();
      let slaveChannel = $('#edit_wifi_channel-'+index+'_'+i).val();
      let slaveChannel5ghz = $('#edit_wifi5_channel-'+index+'_'+i).val();
      let slavePower = $('#edit_wifi_power-'+index+'_'+i).val();
      let slavePower5ghz = $('#edit_wifi5_power-'+index+'_'+i).val();
      slaveCustomConfigs.push({kind: slaveRefType,
                               data: slaveRefData,
                               channel: slaveChannel,
                               channel5ghz: slaveChannel5ghz,
                               power: slavePower,
                               power5ghz: slavePower5ghz});
    }
  }

  // Initialize error structure
  let errors = {
    pppoe_user: {field: '#edit_pppoe_user-' + index.toString()},
    pppoe_password: {field: '#edit_pppoe_pass-' + index.toString()},
    ssid: {field: '#edit_wifi_ssid-' + index.toString()},
    password: {field: '#edit_wifi_pass-' + index.toString()},
    channel: {field: '#edit_wifi_channel-' + index.toString()},
    band: {field: '#edit_wifi_band-' + index.toString()},
    mode: {field: '#edit_wifi_mode-' + index.toString()},
    power: {field: '#edit_wifi_power-' + index.toString()},
    ssid5ghz: {field: '#edit_wifi5_ssid-' + index.toString()},
    password5ghz: {field: '#edit_wifi5_pass-' + index.toString()},
    channel5ghz: {field: '#edit_wifi5_channel-' + index.toString()},
    band5ghz: {field: '#edit_wifi5_band-' + index.toString()},
    mode5ghz: {field: '#edit_wifi5_mode-' + index.toString()},
    power5ghz: {field: '#edit_wifi5_power-' + index.toString()},
    lan_subnet: {field: '#edit_lan_subnet-' + index.toString()},
    lan_netmask: {field: '#edit_lan_netmask-' + index.toString()},
    bridge_fixed_ip: {field: '#edit_opmode_fixip-' + index.toString()},
    bridge_fixed_gateway: {
      field: '#edit_opmode_fixip_gateway-' + index.toString()},
    bridge_fixed_dns: {field: '#edit_opmode_fixip_dns-' + index.toString()},
    mesh_mode: {field: '#edit_meshMode-' + index.toString()},
    external_reference: {field: '#edit_external_reference-' + index.toString()},
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
    if (!isTR069 || pppoePassword) {
      // Do not validate this field if a TR069 device left it blank
      genericValidate(pppoePassword, validator.validatePassword,
                      errors.pppoe_password, pppoePassLength);
    }
  }
  if (validateWifi) {
    if (!isTR069 || password) {
      // Do not validate this field if a TR069 device left it blank
      genericValidate(password,
                      validator.validateWifiPassword, errors.password);
    }
    genericValidate(ssidPrefix+ssid,
      validator.validateSSID, errors.ssid);
    genericValidate(channel, validator.validateChannel, errors.channel);
  }
  if (validateWifiBand) {
    genericValidate(band, validator.validateBand, errors.band);
    genericValidate(mode, validator.validateMode, errors.mode);
  }
  if (validateWifiPower) {
    genericValidate(power, validator.validatePower, errors.power);
  }
  if (validateWifi5ghz) {
    if (!isTR069 || password5ghz) {
      // Do not validate this field if a TR069 device left it blank
      genericValidate(password5ghz,
                      validator.validateWifiPassword, errors.password5ghz);
    }
    genericValidate(ssidPrefix+ssid5ghz,
                    validator.validateSSID, errors.ssid5ghz);
    genericValidate(channel5ghz,
                    validator.validateChannel, errors.channel5ghz);
    genericValidate(band5ghz,
                    validator.validateBand, errors.band5ghz);
    genericValidate(mode5ghz,
                    validator.validateMode, errors.mode5ghz);
    if (validateWifiPower) {
      genericValidate(power5ghz, validator.validatePower, errors.power5ghz);
    }
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
  if (validateBridge && useBridgeFixIP) {
    genericValidate(bridgeFixIP, validator.validateIP,
                    errors.bridge_fixed_ip);
    genericValidate(bridgeFixGateway, validator.validateIP,
                    errors.bridge_fixed_gateway);
    genericValidate(bridgeFixDNS, validator.validateIP,
                    errors.bridge_fixed_dns);
  }

  let hasNoErrors = function(key) {
    return errors[key].messages.length < 1;
  };
  let editFormObj = $(this);
  if (Object.keys(errors).every(hasNoErrors)) {
    // If no errors present, send to backend
    let data = {'content': {
      'connection_type': (pppoe) ? 'pppoe' : 'dhcp',
      'external_reference': externalReference,
      'slave_custom_configs': JSON.stringify(slaveCustomConfigs),
    }};
    if (validatePppoe) {
      data.content.pppoe_user = (pppoe) ? pppoeUser : '';
      data.content.pppoe_password = (pppoe) ? pppoePassword : '';
    }
    if (validateIpv6Enabled) {
      data.content.ipv6_enabled = ipv6Enabled;
    }
    if (validateWifi) {
      data.content.wifi_ssid = ssid;
      data.content.wifi_password = (password) ? password : '';
      data.content.wifi_channel = channel;
    }
    if (validateWifiBand) {
      data.content.wifi_band = band;
      data.content.wifi_mode = mode;
    }
    if (validateWifiPower) {
      data.content.wifi_power = power;
    }
    if (validateWifi5ghz) {
      data.content.wifi_ssid_5ghz = ssid5ghz;
      data.content.wifi_password_5ghz = (password5ghz) ? password5ghz : '';
      data.content.wifi_channel_5ghz = channel5ghz;
      data.content.wifi_band_5ghz = band5ghz;
      data.content.wifi_mode_5ghz = mode5ghz;
      if (validateWifiPower) {
        data.content.wifi_power_5ghz = power5ghz;
      }
    }
    if (validateLan) {
      data.content.lan_subnet = lanSubnet;
      data.content.lan_netmask = lanNetmask;
    }
    if (validateBridge) {
      // Keep this logic, because in the fronted was
      // inverted from disable to enable
      data.content.bridgeDisableSwitch = bridgeDisableSwitch ? 1 : 0;
      data.content.bridgeFixIP = bridgeFixIP;
      data.content.bridgeFixGateway = bridgeFixGateway;
      data.content.bridgeFixDNS = bridgeFixDNS;
    }
    data.content.bridgeEnabled = bridgeEnabled ? 1 : 0;
    data.content.mesh_mode = meshMode;
    data.content.wifi_state = wifiState;
    data.content.wifi_state_5ghz = wifiState5ghz;
    data.content.wifi_hidden = wifiHidden;
    data.content.wifi_hidden_5ghz = wifiHidden5ghz;
    data.content.isSsidPrefixEnabled = isDeviceSsidPrefixEnabled;

    $.ajax({
      type: 'POST',
      url: '/devicelist/update/' + mac,
      dataType: 'json',
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: function(resp) {
        editFormObj.removeClass('was-validated');
        displayAlertMsg({type: 'success', message: t('editSuccess')});
        // remove checkbox on request success
        // if is to disable ssid prefix on device
        // (case is not enable anymore in all flashman)
        if (isDeviceSsidPrefixEnabled == 0 &&
            !getConfigStorage('isSsidPrefixEnabled')) {
          $('#ssid_prefix_checkbox-' + index.toString())
            .removeClass('d-block');
          $('#ssid_prefix_checkbox-' + index.toString())
            .addClass('d-none');
        }
        switchSubmitButton(index);
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
            power: errors.power,
            ssid5ghz: errors.ssid5ghz,
            password5ghz: errors.password5ghz,
            channel5ghz: errors.channel5ghz,
            band5ghz: errors.band5ghz,
            mode5ghz: errors.mode5ghz,
            power5ghz: errors.power5ghz,
            mesh_mode: errors.mesh_mode,
            external_reference: errors.external_reference,
          };
          let errorMsgs = '';
          resp.errors.forEach(function(pair) {
            let key = Object.keys(pair)[0];
            keyToError[key].messages.push(pair[key]);
            errorMsgs += pair[key];
          });
          renderEditErrors(errors);
          openErrorSwal(errorMsgs);
          switchSubmitButton(index);
        } else if ('success' in resp && !resp.success) {
          openErrorSwal(resp.message);
          switchSubmitButton(index);
        }
      },
    });
  } else {
    // Else, render errors on form
    renderEditErrors(errors);
    openErrorSwal(t('someCpeFormFieldAreInvalid'));
    switchSubmitButton(index);
  }
  editFormObj.addClass('was-validated');
  return false;
};

const rebootNetwork = function(id, success, error) {
  $.ajax({
    url: '/devicelist/command/' + id + '/boot',
    type: 'post',
    success: success,
    error: error,
  });
};

const rebootNetworkMesh = function(ids, index, results=[]) {
  if (index < 0) {
    if (results.every((r)=>r.success)) {
      $('#reboot-loading').hide('fast', ()=>{
        $('#reboot-done').show('fast');
        $('#reboot-mesh-button').hide();
        $('#reboot-done-button').show();
      });
    } else {
      $('#reboot-error-div').html('');
      for (let i = 0; i < ids.length; i++) {
        if (results[i].success) {
          $('#reboot-error-div').append(
            $('<h5>').html(ids[i] + ` - ${t('Success')}!`));
        } else {
          $('#reboot-error-div').append(
            $('<h5>').html(ids[i] + ' - ' + results[i].message));
        }
      }
      $('#reboot-loading').hide('fast', ()=>{
        $('#reboot-error').show('fast');
        $('#reboot-mesh-button').hide();
        $('#reboot-error-button').show();
      });
    }
    return;
  }
  rebootNetwork(ids[index], (res)=>{
    results.unshift(res);
    rebootNetworkMesh(ids, index-1, results);
  }, (xhr, status, error)=>{
    results.unshift({success: false, message: status});
    rebootNetworkMesh(ids, index-1, results);
  });
};

anlixDocumentReady.add(function() {
  $(document).on('submit', '.edit-form', validateEditDevice);
  $(document).on('click', '.edit-form-mesh', validateEditDeviceMesh);

  $(document).on('click', '.btn-reboot', function(event) {
    let target = $(event.target);
    let row = target.parents('tr');
    let id = row.data('deviceid');
    let slaveCount = parseInt(row.data('slave-count'));
    if (slaveCount > 0 ) {
      $('#reboot-master-label').html(id);
      $('#reboot-options').html('');
      let slaves = JSON.parse(row.data('slaves').replace(/\$/g, '"'));
      let s = 0;
      slaves.forEach((slave)=>{
        $('#reboot-options').append(
          $('<div>').addClass('custom-control custom-checkbox').append(
            $('<input>')
            .addClass('mesh-router custom-control-input')
            .attr('id', 'select-reboot-slave-'+s)
            .attr('type', 'checkbox'),
            $('<label>')
            .addClass('custom-control-label')
            .attr('for', 'select-reboot-slave-'+s)
            .html(slave),
          ),
        );
        s++;
      });
      $('.mesh-router').off('change');
      $('.mesh-router').on('change', (event)=>{
        let ok = $('.mesh-router').toArray().some((r)=>r.checked);
        $('.btn-reboot-mesh').prop('disabled', !ok);
      });
      $('.btn-reboot-mesh').off('click');
      $('.btn-reboot-mesh').on('click', (event)=>{
        $('.btn-reboot-mesh').prop('disabled', true);
        $('#reboot-select').hide('fast', ()=>{
          $('#reboot-loading').show('fast');
          let ids = [];
          if ($('#select-reboot-master').prop('checked')) {
            ids.push(id);
          }
          for (let i = 0; i < slaveCount; i++) {
            if ($('#select-reboot-slave-'+i).prop('checked')) {
              ids.push(slaves[i]);
            }
          }
          rebootNetworkMesh(ids, ids.length-1);
        });
      });
      $('.mesh-router').prop('checked', false);
      $('#select-reboot-all').prop('checked', false);
      $('.btn-reboot-mesh').prop('disabled', true);
      $('#reboot-select').show();
      $('#reboot-mesh-button').show();
      $('#reboot-loading').hide();
      $('#reboot-error').hide();
      $('#reboot-error-button').hide();
      $('#reboot-done').hide();
      $('#reboot-done-button').hide();
      $('#reboot-mesh.modal').modal('show');
    } else {
      rebootNetwork(id, (res)=>{
        let badge = target.closest('.actions-opts').find('.badge-success');
        if (!res.success) {
          badge = target.closest('.actions-opts').find('.badge-warning');
          if (res.message) {
            badge.text(res.message);
          }
        }
        badge.removeClass('d-none');
        setTimeout(function() {
          badge.addClass('d-none');
        }, 1500);
      }, (xhr, status, error)=>{
        let badge = target.closest('.actions-opts').find('.badge-warning');
        badge.text(status);
        badge.removeClass('d-none');
        setTimeout(function() {
          badge.addClass('d-none');
        }, 1500);
      });
    }
  });

  $('.btn-reboot-mesh-retry').on('click', (event)=>{
    $('#reboot-error').hide('fast', ()=>{
      $('#reboot-select').show('fast');
      $('.btn-reboot-mesh').prop('disabled', false);
    });
    $('#reboot-error-button').hide();
    $('#reboot-mesh-button').show();
  });

  $('.btn-reboot-mesh-close').on('click', (event)=>{
    $('.mesh-router').prop('checked', false);
    $('#select-reboot-all').prop('checked', false);
    $('#reboot-mesh.modal').modal('hide');
  });

  $('#select-reboot-all').on('change', (event)=>{
    $('.mesh-router').prop('checked', event.target.checked);
    $('.btn-reboot-mesh').prop('disabled', !event.target.checked);
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

  // Block or unblock 5ghz wi-fi power setup
  $(document).on('change', '[id^=edit_wifi5_channel-]', (event)=> {
    let row = $(event.target).closest('tr');
    if (row.data('index') === undefined) {
      row = $(event.target).closest('tr').prev();
    }
    let idxMaster = row.data('index');
    // Works also with mesh slave rows
    let validateWifiPower = $('#form-' + idxMaster).data('validate-wifi-power');
    if (validateWifiPower) {
      // Do this horrible parse to work with mesh slave rows also
      let idx = $(event.target).attr('id').split('-')[1];
      let selChannel = $(event.target).val();
      $('#edit_wifi5_power-' + idx).prop('disabled', (selChannel == 'auto'));
      if (selChannel == 'auto') {
        $('#edit_wifi5_power-' + idx).val(100);
      }
    }
  });

  $(document).on('change', '[id^=edit_meshMode-]', (event)=> {
    let selMeshMode = parseInt($(event.target).val());
    let row = $(event.target).closest('tr');
    let idxMaster = row.data('index');
    let slaveCount = row.data('slave-count');
    let idxSlave;
    for (idxSlave = 0; idxSlave < slaveCount; idxSlave++) {
      // Unblock mesh slave wi-fi channel selection if cable mode
      $('#edit_wifi_channel-' + idxMaster + '_' + idxSlave)
        .prop('disabled', (selMeshMode !== 1));
      $('#edit_wifi5_channel-' + idxMaster + '_' + idxSlave)
        .prop('disabled', (selMeshMode !== 1));
      if (selMeshMode !== 1) {
        $('#edit_wifi_channel-' + idxMaster + '_' + idxSlave)
          .val($('#edit_wifi_channel-' + idxMaster).val());
        $('#edit_wifi5_channel-' + idxMaster + '_' + idxSlave)
          .val($('#edit_wifi5_channel-' + idxMaster).val());
        $('#edit_wifi5_power-' + idxMaster + '_' + idxSlave).val(100);
        $('#edit_wifi5_power-' + idxMaster + '_' + idxSlave)
          .prop('disabled', true);
      }
    }
  });
});
