import {anlixDocumentReady} from '../src/common.index.js';
import 'jquery-mask-plugin';

const t = i18next.t;

let forceUpdateFlashman = function() {
  swal.fire({
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
        swal.fire({
          icon: 'success',
          title: t('updateSuccess'),
          text: t('youNeedToLogInAgain'),
          confirmButtonColor: '#4db6ac',
        }).then(function() {
          window.location.href = '/logout';
        });
      } else {
        swal.fire({
          icon: 'error',
          title: t('updateError'),
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

let alertMajorUpdateFlashman = function() {
  swal.fire({
    icon: 'warning',
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
  swal.fire({
    icon: 'warning',
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
  swal.fire({
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
        swal.fire({
          icon: 'error',
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
    url: '/data_collecting/service/parameters',
    success: function(resp) {
      // eslint-disable-next-line guard-for-in
      for (let parameter in resp) {
        // Element id is derived from the data_collecting
        // original parameter name.
        let element =
          document.getElementById('data_collecting_service_'+parameter);
        if (!element) continue; // if element doesn't exist, skip it.

        let value = resp[parameter];
        // value assignment to the html element differs by data type.
        switch (value.constructor) {
          case Boolean: // a checkbox implements boolean values.
            element.checked = value;
            break;
          case String: // an input field of type text implements strings.
            element.value = value;
            if (element.value !== '') {
              element.previousElementSibling.classList.add('active');
            }
            break;
          case Number: // an input field of type numeric implements numbers.
            element.value = value;
            break;
        }
      }
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
