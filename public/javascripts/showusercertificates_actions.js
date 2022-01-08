import {displayAlertMsg} from './common_actions.js';
import 'datatables.net-bs4';

const fetchUsers = function(usersTable, hasTrash, getAll, csv = false) {
  const searchType = getSearchType();
  const name = getSearchField();
  const mac = getSearchField();
  const firstDate = getFirstDate();
  const secondDate = getSecondDate();

  if (getAll) {
    $.get('/user/get/all', function(res) {
      usersTable.clear().draw();
      if (res.type == 'success') {
        $('#loading-users').hide();
        $('#users-table-wrapper').show();

        res.users.forEach(function(userObj) {
          if (!userObj.deviceCertifications) return;
          userObj.deviceCertifications.forEach(function(cert) {
            let certRow = $('<tr>');
            if (hasTrash) {
              certRow.append($('<td>').addClass('col-xs-1').append(
                $('<input>').addClass('checkbox item-checkbox')
                .attr('type', 'checkbox')
                .attr('data-userid', userObj._id)
                .attr('data-timestamp', cert.localEpochTimestamp),
              ));
            }
            certRow.append(
              $('<td>').html(
                (cert.finished) ?
                '<div class="fas fa-check-circle fa-2x green-text"></div>' :
                '<div class="fas fa-times-circle fa-2x red-text"></div>',
              ),
              $('<td>').html(cert.mac),
              $('<td>').html(
                new Date(cert.localEpochTimestamp).toLocaleString('pt-BR'),
              ),
              $('<td>').html(userObj.name),
              $('<td class="btn-detail">').append(
                $('<button>').append(
                  $('<div>').addClass('fas fa-info-circle'),
                  $('<span>').html('&nbsp Detalhes'),
                ).addClass('btn btn-sm btn-primary my-0')
                .attr('type', 'button'),
              ).attr('data-userid', userObj._id)
              .attr('data-username', userObj.name)
              .attr('data-timestamp', cert.localEpochTimestamp),
            );
            usersTable.row.add(certRow);
          });
        });
        usersTable.draw();
      } else {
        displayAlertMsg(res);
      }
    }, 'json');
  } else {
    $.post(
      '/user/certificates/search',
      {
        first_date: firstDate,
        second_date: secondDate,
        name: (searchType === 'no') ?
          '' : (searchType === 'name') ? name : '',
        device_id: (searchType === 'no') ?
          '' : (searchType === 'mac') ? mac : '',
        csv: csv,
      },
      (res) => {
        if (csv) {
          const csvFile = new Blob([res]);
          let downloadElement = document.createElement('a');
          downloadElement.href = URL.createObjectURL(
            csvFile,
            {type: 'text/plain'},
          );
          downloadElement.download = `csvfile.csv`;
          downloadElement.style.display = 'none';
          downloadElement.click();
        }
        if (res.success === true) {
          usersTable.clear().draw();
          $('#loading-users').hide();
          $('#users-table-wrapper').show();
          res.deviceCertifications.map((unwrappedCert) => {
            const certification = unwrappedCert.certifications;
            let certRow = $('<tr>');
            if (hasTrash) {
              certRow.append($('<td>').addClass('col-xs-1').append(
                $('<input>').addClass('checkbox item-checkbox')
                .attr('type', 'checkbox')
                .attr('data-userid', unwrappedCert._id)
                .attr('data-timestamp', certification.localEpochTimestamp),
              ));
            }
            certRow.append(
              $('<td>').html(
                (certification.finished) ?
                '<div class="fas fa-check-circle fa-2x green-text"></div>' :
                '<div class="fas fa-times-circle fa-2x red-text"></div>',
              ),
              $('<td>').html(certification.mac),
              $('<td>').html(
                new Date(certification.localEpochTimestamp)
                  .toLocaleString('pt-BR'),
              ),
              $('<td>').html(unwrappedCert.name),
              $('<td class="btn-detail">').append(
                $('<button>').append(
                  $('<div>').addClass('fas fa-info-circle'),
                  $('<span>').html('&nbsp Detalhes'),
                ).addClass('btn btn-sm btn-primary my-0')
                .attr('type', 'button'),
              ).attr('data-userid', unwrappedCert._id)
              .attr('data-username', unwrappedCert.name)
              .attr('data-timestamp', certification.localEpochTimestamp),
            );
            usersTable.row.add(certRow);
          });
          usersTable.draw();
        } else if (!csv) {
          displayAlertMsg(res);
        }
      },
    ).fail((jqXHR, textStatus, errorThrown) => {
      if (jqXHR.status === 404) {
        displayAlertMsg({
          type: 'danger',
          message: 'Nenhuma certificação foi encontrada com esses parâmetros!',
        });
        return;
      }
    });
  }
};

const configSearchType = () => {
  $('#certificates-search-type' + ' a').click((event) => {
    const searchType = event.originalEvent.target.text;
    $('#certificates-search-type-button').html(searchType);
  });
};

const getSearchType = () => {
  const type = $('#certificates-search-type-button').text();
  if (type === 'Técnico') {
    return 'name';
  } else if (type === 'MAC/Serial') {
    return 'mac';
  } else {
    return 'no';
  }
};

const getSearchField = () => {
  return $('#certificates-search-input').val();
};

const getFirstDate = () => {
  const date = new Date($('#certificates-firstdatepicker-input')
    .val())
    .valueOf();
  if (isNaN(date)) {
    return '';
  }
  return date;
};

const getSecondDate = () => {
  const date = new Date($('#certificates-seconddatepicker-input')
    .val())
    .valueOf();
  if (isNaN(date)) {
    return '';
  }
  return date;
};

const fetchCertification = function(id, name, timestamp) {
  $.get('/user/get/one/'+id, function(res) {
    if (res.type == 'success') {
      let cert = res.user.deviceCertifications.find(
        (c)=>c.localEpochTimestamp === parseInt(timestamp),
      );
      // Change header icon and text
      $('#done-icon').removeClass('fa-check-circle');
      $('#done-icon').removeClass('fa-times-circle');
      if (cert.finished) {
        $('#done-icon').addClass('fa-check-circle');
        $('#details-cancel').hide();
        $('#done-text').html('&nbsp;&nbsp;Certificação Concluída');
        $('#details-cancel').hide();
      } else {
        $('#done-icon').addClass('fa-times-circle');
        $('#done-text').html('&nbsp;&nbsp;Certificação Não Concluída');
        let reason = cert.cancelReason.replace(/\n/g, '<br />');
        $('#details-cancel-text').html('&nbsp;'+reason);
        $('#details-cancel').show();
      }
      // Change basic info
      $('#user-name').html('&nbsp;'+name);
      let certDate = new Date(cert.localEpochTimestamp).toLocaleString('pt-BR');
      $('#user-date').html('&nbsp;'+certDate);
      if (cert.contract) {
        $('#user-contract').html('&nbsp;'+cert.contract);
      } else {
        $('#user-contract').html('&nbsp;Não especificado');
      }
      // Change router info
      if (cert.isOnu) {
        $('#router-data').hide();
        $('#onu-data').show();
        $('#diagnostic-header-onu').show();
        $('#onu-serial').html('&nbsp;'+cert.mac);
        $('#onu-model').html('&nbsp;'+cert.routerModel);
        $('#onu-hardware').html('&nbsp;'+cert.routerVersion);
        $('#onu-firmware').html('&nbsp;'+cert.routerRelease);
        $('#diagnostic-none-router').hide();
        $('#diagnostic-header-router').hide();
      } else {
        $('#onu-data').hide();
        $('#router-data').show();
        $('#diagnostic-header-router').show();
        $('#router-mac').html('&nbsp;'+cert.mac);
        $('#router-model').html('&nbsp;'+cert.routerModel);
        $('#router-version').html('&nbsp;'+cert.routerVersion);
        $('#router-release').html('&nbsp;'+cert.routerRelease);
        $('#diagnostic-none-onu').hide();
        $('#diagnostic-header-onu').hide();
      }
      // Change wan info
      if (cert.didConfigureWan && cert.routerConnType) {
        $('#wan-config-list').html('');
        let wanList = $('<ul class="list-inline"></ul>').append(
          $('<li></li>').append(
            $('<strong></strong>').html('Tipo de Conexão:'),
            $('<span></span>').html('&nbsp;'+cert.routerConnType),
          ),
        );
        if (cert.routerConnType === 'PPPoE') {
          if (cert.isOnu && cert.wanConfigOnu) {
            let params = JSON.parse(cert.wanConfigOnu);
            if (params.user) {
              wanList.append($('<li></li>').append(
                $('<strong></strong>').html('Usuário PPPoE:'),
                $('<span></span>').html('&nbsp;'+params.user),
              ));
            }
            if (params.vlan) {
              wanList.append($('<li></li>').append(
                $('<strong></strong>').html('VLAN ID:'),
                $('<span></span>').html('&nbsp;'+params.vlan),
              ));
            }
            if (params.mtu) {
              wanList.append($('<li></li>').append(
                $('<strong></strong>').html('MTU:'),
                $('<span></span>').html('&nbsp;'+params.mtu),
              ));
            }
          } else {
            wanList.append($('<li></li>').append(
              $('<strong></strong>').html('Usuário PPPoE:'),
              $('<span></span>').html('&nbsp;'+cert.pppoeUser),
            ));
          }
        } else if (cert.routerConnType === 'Bridge (IP Fixo)') {
          wanList.append($('<li></li>').append(
            $('<strong></strong>').html('IP Fixo do CPE:'),
            $('<span></span>').html('&nbsp;'+cert.bridgeIP),
          ));
          wanList.append($('<li></li>').append(
            $('<strong></strong>').html('IP do Gateway:'),
            $('<span></span>').html('&nbsp;'+cert.bridgeGateway),
          ));
          wanList.append($('<li></li>').append(
            $('<strong></strong>').html('IP do DNS:'),
            $('<span></span>').html('&nbsp;'+cert.bridgeDNS),
          ));
        }
        if (cert.routerConnType.includes('Bridge')) {
          let paramSwitch = (cert.bridgeSwitch) ? 'Desabilitado' : 'Habilitado';
          wanList.append($('<li></li>').append(
            $('<strong></strong>').html('Switch da LAN:'),
            $('<span></span>').html('&nbsp;'+paramSwitch),
          ));
        }
        $('#wan-config-list').append(wanList);
        $('#wan-config-none').hide();
        $('#wan-config-done').show();
      } else {
        $('#wan-config-done').hide();
        $('#wan-config-none').show();
      }
      // Change diagnostics info
      if (cert.didDiagnose && cert.diagnostic) {
        let diagWan = (cert.diagnostic.wan) ? 'OK' : 'Erro';
        let diagAnlix = (cert.diagnostic.anlix) ? 'OK' : 'Erro';
        let diagFlashman = (cert.diagnostic.flashman) ? 'OK' : 'Erro';
        if (cert.isOnu) {
          let diagTR069 = (cert.diagnostic.tr069) ? 'OK' : 'Erro';
          let diagPon = cert.diagnostic.pon;
          let diagRxPower = cert.diagnostic.rxpower;
          $('#diagnostic-onu-wan').html('&nbsp;'+diagWan);
          $('#diagnostic-onu-tr069').html('&nbsp;'+diagTR069);
          $('#diagnostic-onu-anlix').html('&nbsp;'+diagAnlix);
          $('#diagnostic-onu-flashman').html('&nbsp;'+diagFlashman);
          if (diagPon >= 0) {
            diagPon = (diagPon > 0) ? 'Erro': 'OK';
            if (diagPon == 4) {
              // Could not measure RX power
              diagRxPower = 'Não medido';
            } else {
              diagRxPower = diagRxPower.toString() + ' dBm';
            }
            $('#diagnostic-onu-pon').html('&nbsp;'+diagPon);
            $('#diagnostic-onu-rx').html('&nbsp;'+diagRxPower);
            $('#diagnostic-pon-element').show();
            $('#diagnostic-rx-element').show();
          } else {
            $('#diagnostic-pon-element').hide();
            $('#diagnostic-rx-element').hide();
          }
          $('#diagnostic-router').hide();
          $('#diagnostic-onu').show();
          $('#diagnostic-none-onu').hide();
          $('#diagnostic-done-onu').show();
        } else {
          let diagIp4 = (cert.diagnostic.ipv4) ? 'OK' : 'Erro';
          let diagIp6 = (cert.diagnostic.ipv6) ? 'OK' : 'Erro';
          let diagDns = (cert.diagnostic.dns) ? 'OK' : 'Erro';
          if (cert.didSpeedTest) {
            let diagSpeedtest = (cert.diagnostic.speedtest) ? 'OK' : 'Erro';
            let diagSpeedValue;
            $('#diagnostic-router-speedtest').html('&nbsp;'+diagSpeedtest);
            $('#diagnostic-speedtest').show();
            if (cert.diagnostic.speedValue != null) {
              if (cert.diagnostic.speedValue > cert.diagnostic.speedTestLimit) {
                diagSpeedValue = cert.diagnostic.speedTestLimit + '+ Mpbs';
              } else {
                diagSpeedValue = cert.diagnostic.speedValue + ' Mpbs';
              }
              $('#diagnostic-router-speedValue').html('&nbsp;'+diagSpeedValue);
              $('#diagnostic-speedValue').show();
            } else {
              $('#diagnostic-router-speedtest').html('&nbsp;'+'Erro');
              $('#diagnostic-speedValue').hide();
            }
          } else {
            $('#diagnostic-speedtest').hide();
            $('#diagnostic-speedValue').hide();
          }
          $('#diagnostic-router-wan').html('&nbsp;'+diagWan);
          $('#diagnostic-router-ip4').html('&nbsp;'+diagIp4);
          $('#diagnostic-router-ip6').html('&nbsp;'+diagIp6);
          $('#diagnostic-router-dns').html('&nbsp;'+diagDns);
          $('#diagnostic-router-anlix').html('&nbsp;'+diagAnlix);
          $('#diagnostic-router-flashman').html('&nbsp;'+diagFlashman);
          $('#diagnostic-onu').hide();
          $('#diagnostic-router').show();
          $('#diagnostic-none-router').hide();
          $('#diagnostic-done-router').show();
        }
      } else {
        if (cert.isOnu) {
          $('#diagnostic-done-onu').hide();
          $('#diagnostic-none-onu').show();
        } else {
          $('#diagnostic-done-router').hide();
          $('#diagnostic-none-router').show();
        }
      }
      // Change mesh info
      if (cert.didConfigureMesh && cert.mesh && cert.mesh.mode) {
        let modeStr = '';
        switch (cert.mesh.mode) {
          case 0:
            modeStr = 'Desativado';
            break;
          case 1:
            modeStr = 'Cabo';
            break;
          case 2:
            modeStr = 'Cabo e Wi-Fi 2.4 GHz';
            break;
          case 3:
            modeStr = 'Cabo e Wi-Fi 5.0 GHz';
            break;
          case 4:
            modeStr = 'Cabo e ambos Wi-Fi';
            break;
          default:
            modeStr = 'Desconhecido';
        }
        $('#mesh-mode').html('&nbsp;'+modeStr);
        $('#mesh-slave-list').html('');
        $('#mesh-remove-list').html('');
        if (cert.mesh.updatedSlaves && cert.mesh.updatedSlaves.length > 0) {
          $('#mesh-slave-head').html('CPEs secundários:');
          cert.mesh.updatedSlaves.forEach((slave)=>{
            $('#mesh-slave-list').append('<li>'+slave+'</li>');
          });
        } else {
          $('#mesh-slave-head').html('A rede Mesh não possui CPEs secundários');
        }
        if (cert.mesh.originalSlaves && cert.mesh.originalSlaves.length > 0) {
          let removedRouters = cert.mesh.originalSlaves;
          if (cert.mesh.updatedSlaves && cert.mesh.updatedSlaves.length > 0) {
            removedRouters = removedRouters.filter((slave)=>{
              return (!cert.mesh.updatedSlaves.includes(slave));
            });
          }
          if (removedRouters.length > 0) {
            $('#mesh-remove-head').html('CPEs secundários removidos:');
            removedRouters.forEach((slave)=>{
              $('#mesh-remove-list').append('<li>'+slave+'</li>');
            });
          } else {
            $('#mesh-remove-head').html('Nenhum CPE secundário foi removido');
          }
        } else {
          $('#mesh-remove-head').html('Nenhum CPE secundário foi removido');
        }
        $('#mesh-config-none').hide();
        $('#mesh-config-done').show();
      } else {
        $('#mesh-config-done').hide();
        $('#mesh-config-none').show();
      }
      // Change wifi info
      if (cert.didConfigureWifi && cert.wifiConfig && cert.wifiConfig.two) {
        $('#wifi-2ghz').removeClass('offset-md-3');
        $('#wifi-2-ssid').html('&nbsp;'+cert.wifiConfig.two.ssid);
        $('#wifi-2-channel').html('&nbsp;'+cert.wifiConfig.two.channel);
        $('#wifi-2-band').html('&nbsp;'+cert.wifiConfig.two.band);
        $('#wifi-2-mode').html('&nbsp;'+cert.wifiConfig.two.mode);
        if (cert.wifiConfig.hasFive && cert.wifiConfig.five) {
          $('#wifi-5-ssid').html('&nbsp;'+cert.wifiConfig.five.ssid);
          $('#wifi-5-channel').html('&nbsp;'+cert.wifiConfig.five.channel);
          $('#wifi-5-band').html('&nbsp;'+cert.wifiConfig.five.band);
          $('#wifi-5-mode').html('&nbsp;'+cert.wifiConfig.five.mode);
          $('#wifi-5ghz').show();
        } else {
          $('#wifi-2ghz').addClass('offset-md-3');
          $('#wifi-5ghz').hide();
        }
        $('#wifi-config-none').hide();
        $('#wifi-config-done').show();
      } else {
        $('#wifi-config-done').hide();
        $('#wifi-config-none').show();
      }
      // Change observation info
      if (cert.observations) {
        let observations = cert.observations.replace(/\n/g, '<br />');
        $('#observations-field').html(observations);
        $('#observations-none').hide();
        $('#observations-done').show();
      } else {
        $('#observations-done').hide();
        $('#observations-none').show();
      }
      // Show changes
      $('#details-placeholder').hide();
      $('#details-info').show();
    } else {
      $('#details-placeholder').hide();
      $('#details-error').show();
    }
  }, 'json');
};

$(document).ready(function() {
  let selectedItens = [];

  let hasTrashButton = $('#checkboxHeader').length > 0;

  configSearchType();

  let usersTable = $('#users-table').DataTable({
    'destroy': true,
    'paging': true,
    'info': false,
    'searching': false,
    'pagingType': 'numbers',
    'language': {
      'zeroRecords': 'Nenhuma certificação encontrada',
      'infoEmpty': 'Nenhuma certificação encontrada',
      'lengthMenu': 'Exibir _MENU_',
    },
    'order': [[1+hasTrashButton, 'asc'], [2+hasTrashButton, 'desc']],
    'columnDefs': [
      {className: 'text-center', targets: ['_all']},
      {orderable: false, targets: [0, hasTrashButton, 4+hasTrashButton]},
    ],
    'dom': '<"row" <"col-sm-12 col-md dt-certs-table-btns">> ' +
           '<"row" t>                                          ' +
           '<"row" <"col-6"l>                                  ' +
           '       <"col-6"p>                                 >',
  });
  // Load table content
  $('.dt-certs-table-btns').append(
    $('<button>').attr('id', 'certificates-csv-export')
                   .addClass('btn btn-primary mr-4')
      .append(
        $('<i>').addClass('fas fa-file-excel fa-lg'),
        $('<span>').html('&nbsp; Exportar CSV'),
      ),
  );
  if (hasTrashButton) {
    $('.dt-certs-table-btns').append(
      $('<button>').addClass('btn btn-danger btn-trash').append(
        $('<div>').addClass('fas fa-trash fa-lg')),
    );
  }

  fetchUsers(usersTable, hasTrashButton, true);

  $(document).on('change', '.checkbox', function(event) {
    let itemId = $(this).prop('id');
    if (itemId == 'checkall') {
      $('.checkbox').not(this).prop('checked', this.checked).change();
    } else {
      let userId = $(this).attr('data-userid');
      let timestamp = $(this).attr('data-timestamp');
      let data = {user: userId, timestamp: timestamp};
      let itemIdx = selectedItens.findIndex(
        (s)=>(s.user===userId && s.timestamp===timestamp),
      );
      if ($(this).is(':checked')) {
        if (itemIdx == -1) {
          selectedItens.push(data);
        }
      } else {
        if (itemIdx != -1) {
          selectedItens.splice(itemIdx, 1);
        }
      }
    }
  });

  $(document).on('click', '.btn-trash', function(event) {
    $.ajax({
      type: 'POST',
      url: '/user/certificates/del',
      traditional: true,
      data: {items: JSON.stringify(selectedItens)},
      success: function(res) {
        displayAlertMsg(res);
        if (res.type == 'success') {
          fetchUsers(usersTable, hasTrashButton, true);
        }
      },
    });
  });

  $(document).on('click', '.btn-detail', function(event) {
    let target = $(event.target).parents('td')[0];
    let id = target.getAttribute('data-userid');
    let name = target.getAttribute('data-username');
    let timestamp = target.getAttribute('data-timestamp');
    $('#details-info').hide();
    $('#details-error').hide();
    $('#details-placeholder').show();
    $('#show-certificate').modal();
    fetchCertification(id, name, timestamp);
  });

  $(document).on('click', '#certificates-csv-export', (event) => {
    fetchUsers(usersTable, hasTrashButton, false, true);
  });

  $(document).on('click', '#certificates-search-button', (event) => {
    fetchUsers(usersTable, hasTrashButton, false);
  });
});
