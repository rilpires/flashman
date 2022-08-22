import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';
import Validator from './device_validator.js';
import {setConfigStorage, getConfigStorage} from './session_storage.js';

const t = i18next.t;

// assigning tr069 elements.
let recoveryInput =
  document.getElementById('lost-informs-recovery-threshold');
let recoveryErrorElement =
  document.getElementById('error-lost-informs-recovery-threshold');
let offlineInput =
  document.getElementById('lost-informs-offline-threshold');
let offlineErrorElement =
  document.getElementById('error-lost-informs-offline-threshold');
let recoveryOfflineErrorElement =
  document.getElementById('error-recovery-offline-thresholds');
let ssidPrefixInput = document.getElementById('ssid-prefix');
let ssidPrefixErrorElement = document.getElementById('error-ssid-prefix');

// resets errors and message styles for tr069 recovery and offline iputs.
const resetRecoveryOfflineInputDependencyError = function() {
  recoveryInput.setCustomValidity('');
  offlineInput.setCustomValidity('');
  recoveryOfflineErrorElement.style.display = 'none';
  recoveryErrorElement.style.display = '';
  offlineErrorElement.style.display = '';
};

// sets custom validity message, hides error element of both recovery and
// offline inputs and shows an error message that belongs to both input fields.
const setRecoveryOfflineInputDependencyError = function() {
  // setting custom validity, which means inpute becomes invalid.
  recoveryInput.setCustomValidity(t('unstableShouldBeLessThanOffline'));
  offlineInput.setCustomValidity(t('OfflineShouldBeBiggerThanUnstable'));
  // we report validity by showing a text right below the inputs and hide
  // each input's individual error text message.
  recoveryErrorElement.style.display = 'none'; // hiding recovery's error.
  offlineErrorElement.style.display = 'none'; // hidding offline's error.
  recoveryOfflineErrorElement.style.display = 'block'; // showing error for both
};

// will be called in every input after the first time save button is pressed.
window.checkrecoveryOfflineInputDependency = function() {
  // if inputs are valid, as defined by html input, check if recovery value is
  // bigger, or equal, to offline value.
  if (Number(recoveryInput.value) >= Number(offlineInput.value)) {
    setRecoveryOfflineInputDependencyError(); // set error message.
  } else { // if fields have valid values. we reset errors and message styles.
    resetRecoveryOfflineInputDependencyError(); // reset error message.
  }
};

window.checkSsidPrefixValidity = function() {
  // check ssid prefix value
  let validator = new Validator();

  let validField = validator
    .validateSSIDPrefix(ssidPrefixInput.value,
      $('#is-ssid-prefix-enabled').is(':checked'));

  if (!validField.valid) {
    setSsidPrefixError();
  } else {
    resetSsidPrefixError();
  }
};

window.changeSsidPrefixInputDisableness = function(value) {
  let ssidPrefixBox = document.getElementById('ssid-prefix-box');
  if (value.checked) {
    ssidPrefixBox.style.display = 'block';
  } else {
    ssidPrefixBox.style.display = 'none';
  }
};


const setSsidPrefixError = function() {
  ssidPrefixInput.setCustomValidity(t('ssidPrefixInvalidFeedback'));
  ssidPrefixErrorElement.style.display = 'block';
};

const resetSsidPrefixError = function() {
  ssidPrefixInput.setCustomValidity('');
  ssidPrefixErrorElement.style.display = 'none';
};

const forceOfflineCPEReconnect = function() {
  $.post('/acs/forceOfflineReconnect', '{}', 'json')
    .done(function(res) {
      displayAlertMsg(res);
      setTimeout(function() {
        window.location.reload();
      }, 1750);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      displayAlertMsg(JSON.parse(jqXHR.responseText));
    });
};

// called after save button is pressed.
let configFlashman = function(event) {
  let validator = new Validator();

  resetRecoveryOfflineInputDependencyError(); // reseting errors and message
  // styles for recovery and offline inputs to default values.
  resetSsidPrefixError();

  // executing browser validation on all fields.
  let allValid = $(this)[0].checkValidity();

  // if browser validation is okay for recovery and offline threshold inputs,
  // check for their values. if one value is not compatible with the other, set
  // error message that belongs to both input fields.
  if (recoveryInput.validity.valid && offlineInput.validity.valid
   && Number(recoveryInput.value) >= Number(offlineInput.value)) {
    setRecoveryOfflineInputDependencyError(); // set error message.
    allValid = false; // we won't send the configurations.
  }
  if (getConfigStorage('isClientPayingPersonalizationApp')) {
    let validField = validator.validateSSIDPrefix(ssidPrefixInput.value,
      $('#is-ssid-prefix-enabled').is(':checked'));
    // check ssid prefix value
    if (ssidPrefixInput.validity.valid && !validField.valid) {
      setSsidPrefixError();
      allValid = false;
    }
  }
  // take action after validation is ready.
  if (allValid) {
    $.post($(this).attr('action'), $(this).serialize(), 'json')
      .done(function(res) {
        $('#config-flashman-form',
          function() {
            displayAlertMsg(res);
            $('#config-flashman-form');
            setTimeout(function() {
              window.location.reload();
            }, 1000);
          },
        );
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        $('#config-flashman-form',
          function() {
            displayAlertMsg(JSON.parse(jqXHR.responseText));
            $('#config-flashman-form');
          },
        );
      });
  } else {
    displayAlertMsg({
      type: 'danger',
      message: t('errorsInOneOrMoreConfigurationsFields'),
    });
    event.preventDefault();
    event.stopPropagation();
  }
  $(this).addClass('was-validated');
  return false;
};

anlixDocumentReady.add(function() {
  setConfigStorage('isClientPayingPersonalizationApp', false);
  $('#config-flashman-form').submit(configFlashman);
  $('#offline-cpe-force-reconnect').click(forceOfflineCPEReconnect);

  // Load configuration options
  $.ajax({
    type: 'GET',
    url: '/upgrade/config',
    success: function(resp) {
      $('#autoupdate').prop('checked', resp.auto).change();
      if (resp.minlengthpasspppoe) {
        $('#minlength-pass-pppoe').val(resp.minlengthpasspppoe)
                                  .siblings('label').addClass('active');
      }
      if (typeof resp.bypassMqttSecretCheck !== 'undefined') {
        $('select[name=bypass-mqtt-secret-check] option[value=' +
          resp.bypassMqttSecretCheck + ']')
        .attr('selected', 'selected');
      }
      if (resp.measureServerIP) {
        $('#measure-server-ip').val(resp.measureServerIP)
                               .siblings('label').addClass('active');
      }
      if (resp.measureServerPort) {
        $('#measure-server-port').val(resp.measureServerPort)
                                 .siblings('label').addClass('active');
      }
      if (resp.pon_signal_threshold) {
        $('#pon-signal-threshold')
          .val(resp.pon_signal_threshold)
          .siblings('label').addClass('active');
      }
      if (resp.pon_signal_threshold_critical) {
        $('#pon-signal-threshold-critical')
          .val(resp.pon_signal_threshold_critical)
          .siblings('label').addClass('active');
      }
      if (resp.pon_signal_threshold_critical_high) {
        $('#pon-signal-threshold-critical-high')
          .val(resp.pon_signal_threshold_critical_high)
          .siblings('label').addClass('active');
      }
      if (resp.isClientPayingPersonalizationApp) {
        setConfigStorage('isClientPayingPersonalizationApp',
                         resp.isClientPayingPersonalizationApp);

        $('#is-ssid-prefix-enabled-col').removeClass('d-none');
        $('#is-ssid-prefix-enabled')
          .prop('checked', resp.isSsidPrefixEnabled).change();
        $('#ssid-prefix').val(resp.ssidPrefix)
          .siblings('label').addClass('active');
      }
      if (typeof resp.wanStepRequired !== 'undefined') {
        $('select[name=wan-step-required] option[value=' +
          resp.wanStepRequired + ']')
        .attr('selected', 'selected');
      }
      if (typeof resp.speedTestStepRequired !== 'undefined') {
        $('select[name=speedtest-step-required] option[value=' +
          resp.speedTestStepRequired + ']')
        .attr('selected', 'selected');
      }
      if (typeof resp.ipv4StepRequired !== 'undefined') {
        $('select[name=ipv4-step-required] option[value=' +
          resp.ipv4StepRequired + ']')
        .attr('selected', 'selected');
      }
      if (typeof resp.ipv6StepRequired !== 'undefined') {
        $('select[name=ipv6-step-required] option[value=' +
          resp.ipv6StepRequired + ']')
        .attr('selected', 'selected');
      }
      if (typeof resp.dnsStepRequired !== 'undefined') {
        $('select[name=dns-step-required] option[value=' +
          resp.dnsStepRequired + ']')
        .attr('selected', 'selected');
      }
      if (typeof resp.flashStepRequired !== 'undefined') {
        $('select[name=flashman-step-required] option[value=' +
          resp.flashStepRequired + ']')
        .attr('selected', 'selected');
      }
      if (resp.tr069ServerURL) {
        $('#tr069-server-url').val(resp.tr069ServerURL)
                              .siblings('label').addClass('active');
      }
      if (resp.tr069WebLogin) {
        $('#onu-web-login').val(resp.tr069WebLogin)
                           .siblings('label').addClass('active');
      }
      if (resp.tr069WebPassword) {
        $('#onu-web-password').val(resp.tr069WebPassword)
                              .siblings('label').addClass('active');
      }
      if (resp.tr069WebRemote) {
        $('#onu_web_remote').prop('checked', true).change();
      }
      if (resp.tr069InformInterval) {
        $('#inform-interval').val(resp.tr069InformInterval)
                             .siblings('label').addClass('active');
      }
      if (resp.tr069SyncInterval) {
        $('#sync-interval').val(resp.tr069SyncInterval)
                           .siblings('label').addClass('active');
      }
      if (resp.tr069RecoveryThreshold) {
        $('#lost-informs-recovery-threshold')
          .val(resp.tr069RecoveryThreshold)
          .siblings('label').addClass('active');
      }
      if (resp.tr069OfflineThreshold) {
        $('#lost-informs-offline-threshold')
          .val(resp.tr069OfflineThreshold)
          .siblings('label').addClass('active');
      }
      if (resp.tr069STUNEnable) {
        $('#stun_enable').prop('checked', true).change();
      }
      if ('hasNeverEnabledInsecureTR069' in resp) {
        setConfigStorage(
          'hasNeverEnabledInsecureTR069', resp.hasNeverEnabledInsecureTR069,
        );
      }
      if (resp.tr069InsecureEnable) {
        $('#insecure_enable').prop('checked', true).change();
      }
      $(`select[name=selected-language] option[value=${resp.language}]`)
        .attr('selected', '');
      if (resp.blockLicenseAtDeviceRemoval) {
        let blockLicenseAtRemoval = (
          resp.blockLicenseAtDeviceRemoval === true ||
          resp.blockLicenseAtDeviceRemoval === 'true'
        ) ? true : false;
        $(`select[name=must-block-license-at-removal] `+
          `option[value=${blockLicenseAtRemoval}]`)
        .attr('selected', 'selected');
        setConfigStorage('blockLicenseAtDeviceRemoval', blockLicenseAtRemoval);
      }
    },
  });

  // popup warning if first time enabling insecure tr069
  $('#insecure_enable').on('change', (input)=> {
    if (
      input.target.checked && getConfigStorage('hasNeverEnabledInsecureTR069')
    ) {
      swal.fire({
        icon: 'warning',
        title: t('Attention!'),
        html: t('enablingTr069HttpCommunicationMustReadAndAgreeConditions'),
        confirmButtonText: t('Enable'),
        confirmButtonColor: '#4db6ac',
        cancelButtonText: t('Cancel'),
        cancelButtonColor: '#f2ab63',
        showCancelButton: true,
      }).then((result)=>{
        if (!result.value) {
          $('#insecure_enable').prop('checked', false).change();
        }
      });
    }
  });

  // change prefix ssid input visibility
  $('#is-ssid-prefix-enabled').on('change', (input) => {
    if (input.target.checked) {
      $('#ssid-prefix-div').removeClass('d-none').addClass('d-block');
    } else {
      $('#ssid-prefix-div').removeClass('d-block').addClass('d-none');
    }
  });

  $('#factory-credentials-button').on('click', function(event) {
    $('#factory-credentials-modal').modal('show');
  });

  $('#default-hosts-config-button').on('click', function(event) {
    $('#default-hosts-config-modal').modal('show');
  });
});
