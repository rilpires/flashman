let forceUpdateFlashman = function() {
  swal({
    title: 'Atualizando Flashman...',
    onOpen: () => {
      swal.showLoading();
    },
  });

  $.ajax({
    type: 'POST',
    url: '/upgrade/force',
    dataType: 'json',
    data: JSON.stringify({}),
    contentType: 'application/json',
    success: function(resp) {
      swal.close();
      if (resp.updated) {
        swal({
          type: 'success',
          title: 'Atualização feita com sucesso!',
          text: 'Você precisará fazer login novamente',
          confirmButtonColor: '#4db6ac',
        }).then(function() {
          window.location.href = '/logout';
        });
      } else {
        swal({
          type: 'error',
          title: 'Erro ao atualizar',
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

let alertMajorUpdateFlashman = function() {
  swal({
    type: 'warning',
    title: 'Atualização importante disponível!',
    text: 'A nova versão do Flashman requer uma instalação manual. Por favor, '+
          'entre na nossa página de documentação e siga os passos para '+
          'atualizar o seu Flashman para a nova versão. Se precisar, entre em '+
          'contato com a equipe Anlix.',
    confirmButtonText: 'Ver instruções',
    confirmButtonColor: '#4db6ac',
  }).then(function(result) {
    if (result.value) {
      window.open('https://documentacao.anlix.io/doku.php');
    }
  });
};

let alertUpdateFlashman = function() {
  swal({
    type: 'warning',
    title: 'Atualização disponível!',
    text: 'Deseja instalar a nova versão agora?',
    confirmButtonText: 'Atualizar',
    confirmButtonColor: '#4db6ac',
    cancelButtonText: 'Agora não',
    cancelButtonColor: '#f2ab63',
    showCancelButton: true,
  }).then(function(result) {
    if (result.value) {
      forceUpdateFlashman();
    }
  });
};

let checkUpdateFlashman = function() {
  swal({
    title: 'Buscando atualizações...',
    onOpen: () => {
      swal.showLoading();
    },
  });

  $.ajax({
    type: 'POST',
    url: '/upgrade',
    dataType: 'json',
    data: JSON.stringify({}),
    contentType: 'application/json',
    success: function(resp) {
      swal.close();
      if (resp.hasUpdate) {
        alertUpdateFlashman();
      } else {
        swal({
          type: 'error',
          title: 'Nenhuma atualização encontrada',
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

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
const checkrecoveryOfflineInputDependency = function() {
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
        $('#config-flashman-menu').modal('hide').on('hidden.bs.modal',
          function() {
            displayAlertMsg(res);
            $('#config-flashman-menu').off('hidden.bs.modal');
            setTimeout(function() {
              window.location.reload();
            }, 1000);
          }
        );
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        $('#config-flashman-menu').modal('hide').on('hidden.bs.modal',
          function() {
            displayAlertMsg(JSON.parse(jqXHR.responseText));
            $('#config-flashman-menu').off('hidden.bs.modal');
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
  $(document).on('click', '.update', checkUpdateFlashman);
  $('#config-flashman-form').submit(configFlashman);
  $('.ip-mask-field').mask('099.099.099.099');

  // Load configuration options
  $.ajax({
    type: 'GET',
    url: '/upgrade/config',
    success: function(resp) {
      $('#autoupdate').prop('checked', resp.auto).change();
      $('#minlength-pass-pppoe').val(resp.minlengthpasspppoe);
      $('#measure-server-ip').val(resp.measureServerIP);
      $('#measure-server-port').val(resp.measureServerPort);
      if (resp.tr069ServerURL) {
        $('#tr069-server-url').val(resp.tr069ServerURL);
      }
      if (resp.tr069WebLogin) {
        $('#onu-web-login').val(resp.tr069WebLogin);
      }
      if (resp.tr069WebPassword) {
        $('#onu-web-password').val(resp.tr069WebPassword);
      }
      if (resp.tr069WebRemote) {
        $('#onu_web_remote').prop('checked', true).change();
      }
      $('#inform-interval').val(resp.tr069InformInterval);
      $('#lost-informs-recovery-threshold').val(resp.tr069RecoveryThreshold);
      $('#lost-informs-offline-threshold').val(resp.tr069OfflineThreshold);
      let is_active = document.getElementById('data_collecting_is_active');
      is_active.checked = resp.data_collecting_is_active || false;
      let alarm_fqdn = document.getElementById('data_collecting_alarm_fqdn');
      alarm_fqdn.value = resp.data_collecting_alarm_fqdn || '';
      let ping_fqdn = document.getElementById('data_collecting_ping_fqdn');
      ping_fqdn.value = resp.data_collecting_ping_fqdn || '';
      let ping_packets = document.getElementById('data_collecting_ping_packets');
      ping_packets.value = resp.data_collecting_ping_packets;
      [alarm_fqdn, ping_fqdn].forEach((input) => {
        if (input.value !== '') input.previousElementSibling.classList.add('active');
      })
    },
  });
});
