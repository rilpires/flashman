const t = i18next.t;

import {displayAlertMsg} from './common_actions.js';

let updateDevice = function(event) {
  let selRelease = $(this).text();
  let selBtnGroup = $(event.target).closest('.btn-group');
  let row = $(event.target).closest('tr');
  let slaveCount = row.data('slave-count');

  let warningText = t('updateSingleDeviceTimeWarning');
  if (slaveCount > 0) {
    warningText = t('updateSlaveDeviceTimeWarning', {slaveCount: slaveCount+1,
      slaveCount3: (slaveCount+1)*3});
  }

  swal.fire({
    icon: 'warning',
    title: t('Attention!'),
    text: warningText,
    confirmButtonText: t('Proceed'),
    confirmButtonColor: '#4db6ac',
    cancelButtonText: t('Cancel'),
    cancelButtonColor: '#f2ab63',
    showCancelButton: true,
  }).then(function(result) {
    if (result.value) {
      // Change current selected release
      selBtnGroup.find('span.selected').text(selRelease);
      // Disable selection
      let dropdownBtn = selBtnGroup.find('.dropdown-toggle');
      dropdownBtn.attr('disabled', true);
      // Disable all disassoc buttons
      let slaveList = JSON.parse(row.next()
        .data('slaves').replaceAll('$', '"'));
      slaveList.forEach((s) => {
        $('tr[id="'+s+'"]').find('.btn-disassoc')
          .attr('disabled', true);
      });
      // Submit update
      let id = row.prop('id');
      $.ajax({
        url: '/devicelist/update/' + id + '/' + selRelease,
        type: 'post',
        traditional: true,
        data: {do_update: true},
        success: function(res) {
          if (res.success) {
            // Activate waiting status
            let upgradeStatus = selBtnGroup.siblings('span.upgrade-status');
            upgradeStatus.find('.status-none').addClass('d-none');
            upgradeStatus.find('.status-waiting').removeClass('d-none');
            if (slaveCount > 0) {
              upgradeStatus.find('.status-waiting').attr('title',
                t('updatingCpes'));
            } else {
              upgradeStatus.find('.status-waiting').attr('title',
                t('updatingCpe'));
            }
            // Activate cancel button
            selBtnGroup.siblings('.btn-cancel-update').attr('disabled', false);
          }
        },
        error: function(xhr, status, error) {
          dropdownBtn.attr('disabled', false);
          if (xhr.responseJSON) {
            xhr.responseJSON.type = 'danger';
            displayAlertMsg(xhr.responseJSON);
          }
        },
      });
    }
  });
};

let cancelDeviceUpdate = function(event) {
  // Deactivate cancel button
  $(this).attr('disabled', true);

  let selBtnGroup = $(event.target).closest('.btn-group');
  let selRelease = selBtnGroup.find('.dropdown-toggle .selected').text();
  // Submit update
  let row = $(event.target).closest('tr');
  let id = row.prop('id');
  let slaveCount = row.data('slave-count');
  // Enable all disassoc buttons
  let slaveList = JSON.parse(row.next()
    .data('slaves').replaceAll('$', '"'));
  slaveList.forEach((s) => {
    $('tr[id="'+s+'"]').find('.btn-disassoc')
      .attr('disabled', false);
  });
  $.ajax({
    url: '/devicelist/update/' + id + '/' + selRelease,
    type: 'post',
    traditional: true,
    data: {do_update: false},
    success: function(res) {
      if (res.success) {
        // Activate dropdown
        selBtnGroup.find('.dropdown-toggle .selected').text(t('Choose'));
        selBtnGroup.find('.dropdown-toggle').attr('disabled', false);
        // Deactivate waiting status
        let upgradeStatus = selBtnGroup.find('span.upgrade-status');
        upgradeStatus.find('.status-none').removeClass('d-none');
        upgradeStatus.find('.status-waiting').addClass('d-none');
        upgradeStatus.find('.status-ok').addClass('d-none');
        upgradeStatus.find('.status-error').addClass('d-none');
        if (slaveCount > 0) {
          swal.fire({
            icon: 'warning',
            title: t('Attention!'),
            text: t('updateDeviceMeshError'),
            confirmButtonText: t('OK'),
            confirmButtonColor: '#4db6ac',
          });
        }
      }
    },
    error: function(xhr, status, error) {
      selBtnGroup.find('.dropdown-toggle .selected').text(t('Choose'));
      selBtnGroup.find('.dropdown-toggle').attr('disabled', false);
      // Deactivate waiting status
      let upgradeStatus = selBtnGroup.find('span.upgrade-status');
      upgradeStatus.find('.status-none').removeClass('d-none');
      upgradeStatus.find('.status-waiting').addClass('d-none');
      upgradeStatus.find('.status-ok').addClass('d-none');
      upgradeStatus.find('.status-error').addClass('d-none');
    },
  });
};

$(function() {
  $(document).on('click', '.dropdown-menu.refresh-selected a', updateDevice);
  $(document).on('click', '.btn-cancel-update', cancelDeviceUpdate);
  // Disable dropdowns without a release to select
  $('.dropdown-menu.refresh-selected').each(function(idx) {
    if ($(this).children().length == 0) {
      $(this).siblings('.dropdown-toggle').attr('disabled', true);
    }
  });
  // Display message on update error
  $(document).on('click', '.status-error', function() {
    let row = $(event.target).closest('tr');
    let slaveCount = row.data('slave-count');
    if (slaveCount > 0) {
      let errorAnchor = $(event.target).closest('.status-error');
      let errorStatus = errorAnchor.data('status');
      if (errorStatus == 6 || errorStatus == 7) {
        // Topology errors
        let msg;
        if (errorStatus == 6) {
          msg = t('errorDuringTopologyCollect');
        } else {
          msg = t('errorDuringTopologyValidation');
        }
        swal.fire({
          icon: 'error',
          title: t('Error'),
          text: msg + t('errorOccurredTryAgain'),
          confirmButtonText: t('Cancel'),
          confirmButtonColor: '#4db6ac',
        }).then((result)=>{
          if (result.value) {
            // Trigger cancel button
            row.find('.btn-cancel-update').trigger('click');
          }
        });
      } else {
        let errorMac = errorAnchor.data('mac');
        swal.fire({
          icon: 'error',
          title: t('Error'),
          text: t('updateDeviceFirmwareErrorWithMAC', {errorMac: errorMac}),
          confirmButtonText: t('tryAgain'),
          confirmButtonColor: '#4db6ac',
          cancelButtonText: t('Cancel'),
          cancelButtonColor: '#f2ab63',
          showCancelButton: true,
        }).then((result)=>{
          if (result.value) {
            // Send update message to backend and refresh row
            let selBtnGroup =
              row.find('.dropdown-menu.refresh-selected').parent();
            let release = selBtnGroup.find('.dropdown-toggle .selected').text();
            $.ajax({
              url: '/devicelist/retryupdate/' + errorMac + '/' + release,
              type: 'post',
              traditional: true,
              complete: function() {
                row.find('.device-row-refresher').trigger('click');
              },
            });
          } else if (result.dismiss === 'cancel') {
            // Trigger cancel button
            row.find('.btn-cancel-update').trigger('click');
          }
        });
      }
    } else {
      swal.fire({
        icon: 'error',
        title: t('Error'),
        text: t('firmwareDownloadError') + t('errorOccurredTryAgain'),
        confirmButtonText: t('Ok'),
        confirmButtonColor: '#4db6ac',
      });
    }
  });
});
