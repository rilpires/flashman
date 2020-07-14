
let updateAllDevices = function(event) {
  let row = $(event.target).closest('tr');
  let rows = row.siblings();
  let idsObj = {};
  let singleReleases = $('#all-devices .dropdown-toggle')
                       .data('singlereleases');
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
            selBtnGroup.siblings('.btn-cancel-update').attr('disabled', false);
            // Update device row data
            $('#' + $.escapeSelector(deviceId)).data('do-update', 'Sim');
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
            upgradeStatus.find('.status-ok').addClass('d-none');
            upgradeStatus.find('.status-error').addClass('d-none');
            // Deactivate cancel button
            selBtnCancel.attr('disabled', true);
            // Update device row data
            $('#' + $.escapeSelector(deviceId)).data('do-update', 'Não');
          });
        }
      });
    }
  });
};

let updateDevice = function(event) {
  let selRelease = $(this).text();
  let selBtnGroup = $(event.target).closest('.btn-group');
  let row = $(event.target).closest('tr');
  let slaveCount = row.data('slave-count');

  let warningText = 'A atualização de firmware dura aproximadamente 3 ' +
      'minutos. O roteador não deverá ser desligado durante esse procedimento. ' +
      'Comunique seu usuário antes de prosseguir.';
  if (slaveCount > 0) {
    warningText = 'A atualização de firmware dura aproximadamente 3 minutos ' +
    'para cada roteador. Esta atualização afetará todos os '+(slaveCount+1)+
    ' roteadores da rede mesh, e durará cerca de '+(slaveCount+1)*3+
    ' minutos no total. Nenhum roteador deverá ser desligado durante esse '+
    'procedimento. Comunique seu usuário antes de prosseguir.';
  }

  swal({
    type: 'warning',
    title: 'Atenção!',
    text: warningText,
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
      let slaveCount = row.data('slave-count');
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
                'Atualizando roteador mestre...'
              );
            } else {
              upgradeStatus.find('.status-waiting').attr('title',
                'Atualizando roteador...'
              );
            }
            // Activate cancel button
            selBtnGroup.siblings('.btn-cancel-update').attr('disabled', false);
            // Update device row data
            row.data('do-update', 'Sim');
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
  $(this).attr('disabled', true);

  let selBtnGroup = $(event.target).closest('.btn-group');
  let selRelease = selBtnGroup.find('.dropdown-toggle .selected').text();
  // Submit update
  let row = $(event.target).closest('tr');
  let id = row.prop('id');
  let slaveCount = row.data('slave-count');
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
        upgradeStatus.find('.status-ok').addClass('d-none');
        upgradeStatus.find('.status-error').addClass('d-none');
        if (slaveCount > 0) {
          swal({
            type: 'warning',
            title: 'Atenção!',
            text: 'O processo de atualização da rede mesh foi interrompido. '+
              'Não recomendamos deixar os roteadores mesh da mesma rede em '+
              'versões diferentes, portanto certifique-se que esta '+
              'atualização seja retomada em breve.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#4db6ac',
          });
        }
      }
    },
    error: function(xhr, status, error) {
      selBtnGroup.find('.dropdown-toggle .selected').text('Escolher');
      selBtnGroup.find('.dropdown-toggle').attr('disabled', false);
      // Deactivate waiting status
      let upgradeStatus = selBtnGroup.find('span.upgrade-status');
      upgradeStatus.find('.status-none').removeClass('d-none');
      upgradeStatus.find('.status-waiting').addClass('d-none');
      upgradeStatus.find('.status-ok').addClass('d-none');
      upgradeStatus.find('.status-error').addClass('d-none');
    },
    complete: function() {
      // Update device row data
      row.data('do-update', 'Não');
    },
  });
};

$(function() {
  $(document).on('click', '.dropdown-menu.refresh-selected a', updateDevice);
  $(document).on('click', '.btn-cancel-update', cancelDeviceUpdate);
  $(document).on('click', '#all-devices .dropdown-menu a', updateAllDevices);
  $(document).on('click', '#cancel-all-devices', cancelAllDeviceUpdates);
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
      let progress = errorAnchor.data('progress');
      let errorMac = errorAnchor.data('mac');
      let routerType = (progress > 0) ? 'slave' : 'mestre';
      swal({
        type: 'error',
        title: 'Erro',
        text: 'Houve um erro ao realizar a transferência do firmware do '+
          'roteador '+routerType+' com o MAC '+errorMac+'. Por favor tente '+
          'novamente ou cancele o procedimento.',
        confirmButtonText: 'Tentar novamente',
        confirmButtonColor: '#4db6ac',
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#f2ab63',
        showCancelButton: true,
      }).then((result)=>{
        if (result.value) {
          // Send update message to backend and refresh row
          let selBtnGroup = row.find('.dropdown-menu.refresh-selected').parent();
          let release = selBtnGroup.find('.dropdown-toggle .selected').text();
          $.ajax({
            url: '/devicelist/updatemesh/' + errorMac + '/' + release,
            type: 'post',
            traditional: true,
            data: {do_update: true},
            complete: function() {
              row.find('.device-row-refresher').trigger('click');
            }
          });
        } else if (result.dismiss === 'cancel') {
          // Trigger cancel button
          row.find('.btn-cancel-update').trigger('click');
        }
      });
    } else {
      swal({
        type: 'error',
        title: 'Erro',
        text: 'Houve um erro ao realizar a transferência do firmware. ' +
        'Cancele o procedimento e tente novamente.',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#4db6ac',
      });
    }
  });
});
