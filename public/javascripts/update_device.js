
let updateAllDevices = function(event) {
  let row = $(event.target).closest('tr');
  let rows = row.siblings();
  let idsObj = {};
  let singleReleases = $('#all-devices .dropdown-toggle').data('singlereleases');
  let selectedRelease = $(this).text();
  let selectedModels = [];

  swal({
    type: 'warning',
    title: 'Atenção!',
    text: 'Todos os roteadores desta página com a release ' +
    'selecionada serão marcados para atualização. Lembre-se de notificar ' +
    'seus usuários antes de prosseguir.',
    confirmButtonText: 'Prosseguir',
    confirmButtonColor: '#4db6ac',
    cancelButtonText: 'Cancelar',
    cancelButtonColor: '#f2ab63',
    showCancelButton: true,
  }).then(function(result) {
    if (result.value) {
      // Change current selected release
      $('#all-devices').find('span.selected').text(selectedRelease);

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
          if ($(this).prop('id') !== undefined &&
              $(this).prop('id').length > 0 &&
              selectedModels.includes(deviceModel)) {
            let id = $(this).prop('id');
            let rel = selectedRelease;
            idsObj[id] = rel;
          }
        }
      });

      $.post('/devicelist/updateall',
             {content: JSON.stringify({ids: idsObj, do_update: true})})
      .done(function(res) {
        if (res.success) {
          res.devices.forEach(function(deviceId) {
            let selBtnGroup = $('#' + $.escapeSelector(deviceId))
              .find('.btn-group .btn-group');
            selBtnGroup.find('span.selected').text(selectedRelease);
            // Deactivate dropdown button
            selBtnGroup.find('.dropdown-toggle').attr('disabled', true);
            // Activate waiting status
            let upgradeStatus = selBtnGroup.find('span.upgrade-status');
            upgradeStatus.find('.status-none').addClass('d-none');
            upgradeStatus.find('.status-waiting').removeClass('d-none');
            // Activate cancel button
            selBtnGroup.siblings('.btn-cancel-update')
              .addClass('btn-danger').attr('disabled', false);
          });
        }
      });
    }
  });
};

let cancelAllDeviceUpdates = function(event) {
  let row = $(event.target).closest('tr');
  let rows = row.siblings();
  let idsObj = {};

  swal({
    type: 'warning',
    title: 'Atenção!',
    text: 'Isso cancelará todas as atualizações de firmware em ' +
    'progresso nesta página.',
    confirmButtonText: 'Prosseguir',
    confirmButtonColor: '#4db6ac',
    cancelButtonText: 'Cancelar',
    cancelButtonColor: '#f2ab63',
    showCancelButton: true,
  }).then(function(result) {
    if (result.value) {
      // Make sure to fallback to default text
      $('#all-devices').find('span.selected').text('Escolher');

      rows.each(function(idx) {
        let deviceModel = $(this).data('deviceModel');
        if (deviceModel) {
          if ($(this).prop('id') !== undefined &&
              $(this).prop('id').length > 0) {
            let id = $(this).prop('id');
            let rel = $(this).data('device-release');
            idsObj[id] = rel;
          }
        }
      });

      $.post('/devicelist/updateall',
             {content: JSON.stringify({ids: idsObj, do_update: false})})
      .done(function(res) {
        if (res.success) {
          res.devices.forEach(function(deviceId) {
            let selBtnGroup = $('#' + $.escapeSelector(deviceId))
              .find('.btn-group .btn-group');
            let selBtnCancel = $('#' + $.escapeSelector(deviceId))
              .find('.btn-group .btn-cancel-update');
            selBtnGroup.find('span.selected').text('Escolher');
            // Activate dropdown button
            selBtnGroup.find('.dropdown-toggle').attr('disabled', false);
            // Deactivate waiting status
            let upgradeStatus = selBtnGroup.find('span.upgrade-status');
            upgradeStatus.find('.status-none').removeClass('d-none');
            upgradeStatus.find('.status-waiting').addClass('d-none');
            // Deactivate cancel button
            selBtnCancel.removeClass('btn-danger').attr('disabled', true);
          });
        }
      });
    }
  });
};

let updateDevice = function(event) {
  let selRelease = $(this).text();
  let selBtnGroup = $(event.target).closest('.btn-group');

  swal({
    type: 'warning',
    title: 'Atenção!',
    text: 'A atualização de firmware dura aproximadamente 3 minutos. ' +
    'O roteador não deverá ser desligado durante esse procedimento. ' +
    'Comunique seu usuário antes de prosseguir.',
    confirmButtonText: 'Prosseguir',
    confirmButtonColor: '#4db6ac',
    cancelButtonText: 'Cancelar',
    cancelButtonColor: '#f2ab63',
    showCancelButton: true,
  }).then(function(result) {
    if (result.value) {
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
    }
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
  $('#all-devices .dropdown-menu a').on('click', updateAllDevices);
  $('#cancel-all-devices').on('click', cancelAllDeviceUpdates);
  // Disable dropdowns without a release to select
  $('.dropdown-menu.refresh-selected').each(function(idx) {
    if ($(this).children().length == 0) {
      $(this).siblings('.dropdown-toggle').attr('disabled', true);
    }
  });
});
