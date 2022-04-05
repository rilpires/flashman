import {anlixDocumentReady} from '../src/common.index.js';
import 'jquery-mask-plugin';

const t = i18next.t;

let forceUpdateFlashman = function() {
  swal({
    title: t('updatingFlashman...'),
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
          title: t('updateSuccess'),
          text: t('youNeedToLogInAgain'),
          confirmButtonColor: '#4db6ac',
        }).then(function() {
          window.location.href = '/logout';
        });
      } else {
        swal({
          type: 'error',
          title: t('updateError'),
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

let alertMajorUpdateFlashman = function() {
  swal({
    type: 'warning',
    title: t('importUpdateAvailable'),
    text: t('newFlashmanVersionNeedsManualInstallPleaseReadDocumentation'),
    confirmButtonText: t('seeInstructions'),
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
    title: t('updateAvailable'),
    text: t('wouldYouLikeToInstallNewVersionNow?'),
    confirmButtonText: t('Update'),
    confirmButtonColor: '#4db6ac',
    cancelButtonText: t('notNow'),
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
    title: t('searchingForUpdates...'),
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
          title: t('noUpdateFound'),
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

anlixDocumentReady.add(function() {
  $(document).on('click', '.update', checkUpdateFlashman);
  $('.ip-mask-field').mask('099.099.099.099');

  $.ajax({
    type: 'GET',
    url: '/data_collecting/config',
    success: function(resp) {
      let isActive = document.getElementById('data_collecting_service_is_active');
      if (isActive) isActive.checked = resp.data_collecting_is_active || false;
      let alarmFqdn = document.getElementById('data_collecting_service_alarm_fqdn');
      if (alarmFqdn) alarmFqdn.value = resp.data_collecting_alarm_fqdn || '';
      let pingFqdn = document.getElementById('data_collecting_service_ping_fqdn');
      if (pingFqdn) pingFqdn.value = resp.data_collecting_ping_fqdn || '';
      let pingPackets = document.getElementById('data_collecting_service_ping_packets');
      if (pingPackets) pingPackets.value = resp.data_collecting_ping_packets;
      [alarmFqdn, pingFqdn].forEach((input) => {
        if (input && input.value !== '') input.previousElementSibling.classList.add('active');
      });
    },
  });
  let isSuperuser = $('.container').data('superuser');
  let hasUpgrade = $('.container').data('upgrade');
  let hasMajorUpgrade = $('.container').data('major-upgrade');
  if (isSuperuser && hasMajorUpgrade) {
    alertMajorUpdateFlashman();
  } else if (isSuperuser && hasUpgrade && Math.random() < 0.3) {
    alertUpdateFlashman();
  }
});
