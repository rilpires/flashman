import {displayAlertMsg} from './common_actions.js';

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
  recoveryInput.setCustomValidity('recovery precisa ser menor que offline');
  offlineInput.setCustomValidity('offline precisa ser maior que recovery');
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
  if (recoveryInput.validity.valid && offlineInput.validity.valid
   && Number(recoveryInput.value) >= Number(offlineInput.value)) {
    setRecoveryOfflineInputDependencyError(); // set error message.
  } else { // if fields have valid values. we reset errors and message styles.
    resetRecoveryOfflineInputDependencyError(); // reset error message.
  }
};

// called after save button is pressed.
let configFlashman = function(event) {
  resetRecoveryOfflineInputDependencyError(); // reseting errors and message
  // styles for recovery and offline inputs to default values.

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
          }
        );
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        $('#config-flashman-form',
          function() {
            displayAlertMsg(JSON.parse(jqXHR.responseText));
            $('#config-flashman-form');
          }
        );
      });
  } else {
    event.preventDefault();
    event.stopPropagation();
  }
  $(this).addClass('was-validated');
  return false;
};

$(document).ready(function() {
  $('#config-flashman-form').submit(configFlashman);

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
    },
  });
});
