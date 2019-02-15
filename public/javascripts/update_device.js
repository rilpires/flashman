
let updateAllDevices = function(event) {
  let row = $(event.target).parents('tr');
  let isChecked = $(event.target).is(':checked');
  let rows = row.siblings();
  let idsObj = {};
  let singleReleases = $(event.target).data('singlereleases');
  let selectedRelease = $('#all-devices').text();
  let selectedModels = [];

  // Get models of selected release
  for (let i=0; i < singleReleases.length; i++) {
    if (singleReleases[i].id == selectedRelease) {
      selectedModels = singleReleases[i].model;
      break;
    }
  }

  rows.each(function(idx) {
    let deviceModel = $(this).data('deviceModel');
    if (deviceModel) {
      if (deviceModel.includes('N/')) {
        deviceModel = deviceModel.replace('N/', '');
      }
      if ($(this).prop('id') !== undefined && $(this).prop('id').length > 0 &&
          selectedModels.includes(deviceModel)) {
        let id = $(this).prop('id');
        let rel = selectedRelease;
        idsObj[id] = rel;
      }
    }
  });
  $(event.target).prop('disabled', true);
  $.post('/devicelist/updateall',
         {content: JSON.stringify({ids: idsObj, do_update: isChecked})})
  .done(function(res) {
    if (res.success) {
      res.devices.forEach(function(deviceId) {
        $('#' + $.escapeSelector(deviceId))
          .find('.checkbox').prop('checked', isChecked);
        $('#' + $.escapeSelector(deviceId))
          .find('.btn-group span.selected').text(selectedRelease);
        $('#' + $.escapeSelector(deviceId))
          .find('.btn-group .dropdown-item')
          .removeClass('active teal lighten-2');
        $('#' + $.escapeSelector(deviceId))
          .find('.btn-group .dropdown-item:contains(' + selectedRelease + ')')
          .addClass('active teal lighten-2');
      });
      $(event.target).prop('disabled', false);
    }
  });
};

let updateDevice = function(event) {
  let selRelease = $(this).text();
  let selBtnGroup = $(event.target).closest('.btn-group');
  // Change current selected release
  selBtnGroup.find('span.selected').text(selRelease);
  // Disable selection
  let dropdownBtn = selBtnGroup.find('.dropdown-toggle');
  dropdownBtn.attr('disabled', true);
  // Submit update
  let row = $(event.target).closest('tr');
  let id = row.prop('id');
  $.ajax({
    url: '/devicelist/update/' + id + '/' + selRelease,
    type: 'post',
    traditional: true,
    data: {do_update: true},
    success: function(res) {
      if (res.success) {
        // Activate waiting status
        let upgradeStatus = selBtnGroup.find('span.upgrade-status');
        upgradeStatus.find('.status-none').addClass('d-none');
        upgradeStatus.find('.status-waiting').removeClass('d-none');
        // Activate cancel button
        selBtnGroup.siblings('.btn-cancel-update')
          .addClass('btn-danger').attr('disabled', false);
      }
    },
    error: function(xhr, status, error) {
      dropdownBtn.attr('disabled', false);
    },
  });
};

let cancelDeviceUpdate = function(event) {
  // Deactivate cancel button
  $(this).removeClass('btn-danger').attr('disabled', true);

  let selBtnGroup = $(event.target).closest('.btn-group');
  let selRelease = selBtnGroup.find('.dropdown-toggle .selected').text();
  // Submit update
  let row = $(event.target).closest('tr');
  let id = row.prop('id');
  $.ajax({
    url: '/devicelist/update/' + id + '/' + selRelease,
    type: 'post',
    traditional: true,
    data: {do_update: false},
    success: function(res) {
      if (res.success) {
        // Activate dropdown
        selBtnGroup.find('.dropdown-toggle .selected').text('Escolher');
        selBtnGroup.find('.dropdown-toggle').attr('disabled', false);
        // Deactivate waiting status
        let upgradeStatus = selBtnGroup.find('span.upgrade-status');
        upgradeStatus.find('.status-none').removeClass('d-none');
        upgradeStatus.find('.status-waiting').addClass('d-none');
      }
    },
    error: function(xhr, status, error) {
      selBtnGroup.find('.dropdown-toggle .selected').text('Escolher');
      selBtnGroup.find('.dropdown-toggle').attr('disabled', false);
      // Deactivate waiting status
      let upgradeStatus = selBtnGroup.find('span.upgrade-status');
      upgradeStatus.find('.status-none').removeClass('d-none');
      upgradeStatus.find('.status-waiting').addClass('d-none');
    },
  });
};

$(function() {
  $('.dropdown-menu.refresh-selected a').on('click', updateDevice);
  $('.btn-cancel-update').on('click', cancelDeviceUpdate);
  $('#all-devices').on('click', updateAllDevices);
  $('#cancel-all-devices').on('click', cancelAllDeviceUpdates);
});
