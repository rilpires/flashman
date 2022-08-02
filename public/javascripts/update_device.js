import {displayAlertMsg} from './common_actions.js';

let updateDevice = function(event) {
  let selRelease = $(this).text();
  let selBtnGroup = $(event.target).closest('.btn-group');
  let row = $(event.target).closest('tr');
  let slaveCount = row.data('slave-count');

  let warningText = 'A atualização de firmware dura aproximadamente 3 ' +
      'minutos. O CPE não deverá ser desligado durante esse procedimento. ' +
      'Comunique seu usuário antes de prosseguir.';
  if (slaveCount > 0) {
    warningText = 'A atualização de firmware dura aproximadamente 3 minutos ' +
    'para cada CPE. Esta atualização afetará todos os '+(slaveCount+1)+
    ' roteadores da rede mesh, e durará cerca de '+(slaveCount+1)*3+
    ' minutos no total. Nenhum CPE deverá ser desligado durante esse '+
    'procedimento. Comunique seu usuário antes de prosseguir.';
  }

  swal.fire({
    icon: 'warning',
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
                `Atualizando CPEs...`);
            } else {
              upgradeStatus.find('.status-waiting').attr('title',
                'Atualizando CPE...');
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
          swal.fire({
            icon: 'warning',
            title: 'Atenção!',
            text: 'O processo de atualização da rede mesh foi interrompido. '+
              'Não recomendamos deixar os CPEs mesh da mesma rede em '+
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
          msg = 'Houve um erro ao coletar a topologia dos dispositivos. ';
        } else {
          msg = 'Houve um erro ao validar a topologia dos dispositivos. ';
        }
        swal.fire({
          icon: 'error',
          title: 'Erro',
          text: msg + 'Cancele o procedimento e tente novamente.',
          confirmButtonText: 'Cancelar',
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
          title: 'Erro',
          text: 'Houve um erro ao realizar a transferência do firmware do ' +
            'CPE com o MAC ' + errorMac + '. Por favor tente ' +
            'novamente ou cancele o procedimento.',
          confirmButtonText: 'Tentar novamente',
          confirmButtonColor: '#4db6ac',
          cancelButtonText: 'Cancelar',
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
        title: 'Erro',
        text: 'Houve um erro ao realizar a transferência do firmware. ' +
        'Cancele o procedimento e tente novamente.',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#4db6ac',
      });
    }
  });
});
