import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';
import 'datatables.net-bs4';

const t = i18next.t;

const isActiveSearchBtnState = function(active = true) {
  if (active) {
    $('#certificates-search-button').prop('disabled', false);
    $('#certificates-search-btn-icon').removeClass('fa-spinner fa-pulse');
    $('#certificates-search-btn-icon').addClass('fa-search');
  } else {
    $('#certificates-search-button').prop('disabled', true);
    $('#certificates-search-btn-icon').removeClass('fa-search');
    $('#certificates-search-btn-icon').addClass('fa-spinner fa-pulse');
  }
};

const fetchUsers = function(usersTable, hasTrash, getAll, csv = false) {
  const searchType = getSearchType();
  const name = getSearchField();
  const mac = getSearchField();
  const firstDate = getFirstDate();
  const secondDate = getSecondDate();

  if (getAll) {
    $.get('/user/get/certifications', function(res) {
      isActiveSearchBtnState(true);
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
              $('<td>').html(cert.localEpochTimestamp),
              $('<td>').html(userObj.name),
              $('<td class="btn-detail">').append(
                $('<button>').append(
                  $('<div>').addClass('fas fa-info-circle'),
                  $('<span>').html('&nbsp ' + t('Details')),
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
              $('<td>').html(certification.localEpochTimestamp),
              $('<td>').html(unwrappedCert.name),
              $('<td class="btn-detail">').append(
                $('<button>').append(
                  $('<div>').addClass('fas fa-info-circle'),
                  $('<span>').html('&nbsp ' + t('Details')),
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
    )
    .fail((jqXHR, textStatus, errorThrown) => {
      if (jqXHR.status === 404) {
        displayAlertMsg({
          type: 'danger',
          message: t('noCertificatesFoundWithTheseParameters'),
        });
        return;
      }
    })
    .always((jqXHR, textStatus, errorThrown) => {
      isActiveSearchBtnState(true);
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
  if (type === t('Technician')) {
    return 'name';
  } else if (type === t('MAC/Serial')) {
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
        $('#done-text').html(`&nbsp;&nbsp;${t('certificationCompleted')}`);
        $('#details-cancel').hide();
      } else {
        $('#done-icon').addClass('fa-times-circle');
        $('#done-text').html(`&nbsp;&nbsp;${t('certificationNotCompleted')}`);
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
        $('#user-contract').html(`&nbsp;${t('notSpecified')}`);
      }
      if (cert.specificUsername) {
        $('#specific-user-container').show();
        $('#specific-user').html('&nbsp;' + cert.specificUsername);
      } else {
        $('#specific-user-container').hide();
      }
      if (cert.specificPassword) {
        $('#specific-passwd-container').show();
        $('#specific-passwd').html('&nbsp;' + cert.specificPassword);
      } else {
        $('#specific-passwd-container').hide();
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

      // fixing certificate router connection type written already translated
      // in database. Checking values in all languages the app could have sent.
      const routerConnTypeIsBridgeFixedIp = (routerConnType) =>
        routerConnType === 'Bridge (IP Fixo)' ||
        routerConnType === 'Bridge (Fixed IP)';

      // Change wan info
      if (cert.didConfigureWan && cert.routerConnType) {
        $('#wan-config-list').html('');
        let wanList = $('<ul>').addClass('list-inline').append(
          $('<li>').append(
            $('<strong>').html(`${t('connectionType')}:`),
            $('<span>').html('&nbsp;'+t(
              routerConnTypeIsBridgeFixedIp(cert.routerConnType) ?
                'Bridge (Fixed IP)' : cert.routerConnType,
            )),
          ),
        );
        if (cert.routerConnType === 'PPPoE') {
          if (cert.isOnu && cert.wanConfigOnu) {
            let params = JSON.parse(cert.wanConfigOnu);
            if (params.user) {
              wanList.append($('<li>').append(
                $('<strong>').html(`${t('pppoeUser')}:`),
                $('<span>').html('&nbsp;'+params.user),
              ));
            }
            if (params.vlan) {
              wanList.append($('<li>').append(
                $('<strong>').html(`${t('vlanId')}:`),
                $('<span>').html('&nbsp;'+params.vlan),
              ));
            }
            if (params.mtu) {
              wanList.append($('<li>').append(
                $('<strong>').html('MTU:'),
                $('<span>').html('&nbsp;'+params.mtu),
              ));
            }
          } else {
            wanList.append($('<li>').append(
              $('<strong>').html(`${t('pppoeUser')}:`),
              $('<span>').html('&nbsp;'+cert.pppoeUser),
            ));
          }
        } else if (routerConnTypeIsBridgeFixedIp(cert.routerConnType)) {
          wanList.append($('<li>').append(
            $('<strong>').html(`${t('cpeFixedIp')}:`),
            $('<span>').html('&nbsp;'+cert.bridgeIP),
          ));
          wanList.append($('<li>').append(
            $('<strong>').html(`${t('gatewayIp')}:`),
            $('<span>').html('&nbsp;'+cert.bridgeGateway),
          ));
          wanList.append($('<li>').append(
            $('<strong>').html(`${t('dnsIp')}:`),
            $('<span>').html('&nbsp;'+cert.bridgeDNS),
          ));
        }
        if (cert.routerConnType.includes('Bridge')) {
          let paramSwitch = (cert.bridgeSwitch) ? t('Disabled') : t('Enabled');
          wanList.append($('<li>').append(
            $('<strong>').html(`${t('lanSwitch')}:`),
            $('<span>').html('&nbsp;'+paramSwitch),
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
        let diagWan = (cert.diagnostic.wan) ? t('Ok') : t('Error');
        let diagAnlix = (cert.diagnostic.anlix) ? t('Ok') : t('Error');
        let diagFlashman = (cert.diagnostic.flashman) ? t('Ok') : t('Error');
        if (cert.isOnu) {
          let diagTR069 = (cert.diagnostic.tr069) ? t('Ok') : t('Error');
          let diagPon = cert.diagnostic.pon;
          let diagRxPower = cert.diagnostic.rxpower;

          $('#diagnostic-onu-speedtest-status-element').hide();
          $('#diagnostic-onu-speedtest-value-element').hide();
          if (cert.didSpeedTest === true &&
              cert.diagnostic.speedtest === true) {
            let spdTstStts = (cert.diagnostic.speedtest) ? t('Ok') : t('Error');
            $('#diagnostic-onu-speedtest-status').html('&nbsp;'+spdTstStts);
            $('#diagnostic-onu-speedtest-status-element').show();

            if (cert.diagnostic.speedValue !== null) {
              let spdTstVal;
              if (cert.diagnostic.speedValue > cert.diagnostic.speedTestLimit) {
                spdTstVal = cert.diagnostic.speedTestLimit+' '+t('Mbps');
              } else {
                spdTstVal = cert.diagnostic.speedValue+' '+t('Mbps');
              }
              $('#diagnostic-onu-speedtest-value').html('&nbsp;'+spdTstVal);
              $('#diagnostic-onu-speedtest-value-element').show();
            }
          }

          $('#diagnostic-onu-wan').html('&nbsp;'+diagWan);
          $('#diagnostic-onu-tr069').html('&nbsp;'+diagTR069);
          $('#diagnostic-onu-anlix').html('&nbsp;'+diagAnlix);
          $('#diagnostic-onu-flashman').html('&nbsp;'+diagFlashman);
          if (diagPon >= 0) {
            diagPon = (diagPon > 0) ? t('Error'): t('Ok');
            if (diagPon == 4) {
              // Could not measure RX power
              diagRxPower = t('noMeasured');
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
          let diagIp4 = (cert.diagnostic.ipv4) ? t('Ok') : t('Error');
          let diagIp6 = (cert.diagnostic.ipv6) ? t('Ok') : t('Error');
          let diagDns = (cert.diagnostic.dns) ? t('Ok') : t('Error');

          $('#diagnostic-router-speedtest-status-element').hide();
          $('#diagnostic-router-speedtest-value-element').hide();
          if (cert.didSpeedTest === true &&
              cert.diagnostic.speedtest === true) {
            let spdTstStts = (cert.diagnostic.speedtest) ? t('Ok') : t('Error');
            $('#diagnostic-router-speedtest-status').html('&nbsp;'+spdTstStts);
            $('#diagnostic-router-speedtest-status-element').show();

            if (cert.diagnostic.speedValue !== null) {
              let spdTstVal;
              if (cert.diagnostic.speedValue > cert.diagnostic.speedTestLimit) {
                spdTstVal = cert.diagnostic.speedTestLimit+' '+t('Mbps');
              } else {
                spdTstVal = cert.diagnostic.speedValue+' '+t('Mbps');
              }
              $('#diagnostic-router-speedtest-value').html('&nbsp;'+spdTstVal);
              $('#diagnostic-router-speedtest-value-element').show();
            }
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
            modeStr = t('Deactivated');
            break;
          case 1:
            modeStr = t('Cable');
            break;
          case 2:
            modeStr = t('cableAndWifiXGhz', {x: '2.4'});
            break;
          case 3:
            modeStr = t('cableAndWifiXGhz', {x: '5.0'});
            break;
          case 4:
            modeStr = t('cableAndBothWifi');
            break;
          default:
            modeStr = t('Unknown');
        }
        $('#mesh-mode').html('&nbsp;'+modeStr);
        $('#mesh-slave-list').html('');
        $('#mesh-remove-list').html('');
        if (cert.mesh.updatedSlaves && cert.mesh.updatedSlaves.length > 0) {
          $('#mesh-slave-head').html(`${t('secondaryCpes')}:`);
          cert.mesh.updatedSlaves.forEach((slave)=>{
            $('#mesh-slave-list').append('<li>'+slave+'</li>');
          });
        } else {
          $('#mesh-slave-head').html(t('meshNetworkHasNoSecondaryCpes'));
        }
        if (cert.mesh.originalSlaves && cert.mesh.originalSlaves.length > 0) {
          let removedRouters = cert.mesh.originalSlaves;
          if (cert.mesh.updatedSlaves && cert.mesh.updatedSlaves.length > 0) {
            removedRouters = removedRouters.filter((slave)=>{
              return (!cert.mesh.updatedSlaves.includes(slave));
            });
          }
          if (removedRouters.length > 0) {
            $('#mesh-remove-head').html(`${t('removedSecondaryCpes')}:`);
            removedRouters.forEach((slave)=>{
              $('#mesh-remove-list').append('<li>'+slave+'</li>');
            });
          } else {
            $('#mesh-remove-head').html(t('noSecondaryCpesRemoved'));
          }
        } else {
          $('#mesh-remove-head').html(t('noSecondaryCpesRemoved'));
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

anlixDocumentReady.add(function() {
  let selectedItens = [];

  let hasTrashButton = $('#checkboxHeader').length > 0;

  configSearchType();

  // eslint-disable-next-line new-cap
  let usersTable = $('#users-table').DataTable({
    'destroy': true,
    'paging': true,
    'info': false,
    'searching': false,
    'pagingType': 'numbers',
    'language': {
      'zeroRecords': t('noCertificatesFound'),
      'infoEmpty': t('noCertificatesFound'),
      'lengthMenu': `${t('Show')} _MENU_`,
    },
    'order': [[1+hasTrashButton, 'asc'], [2+hasTrashButton, 'desc']],
    'columnDefs': [
      {className: 'text-center', targets: ['_all']},
      {orderable: false, targets: [0, hasTrashButton, 4+hasTrashButton]},
      {
        targets: [2+hasTrashButton],
        render: function(data, type, row) {
          // If display or filter data is requested, format the date
          if (type === 'display' || type === 'filter') {
            let date = new Date(Number(data));
            let value = date.toLocaleString(t('lang'));
            // if filtering, append month name to returned value.
            if (type === 'filter') {
              value += ' '+date.toLocaleString(t('lang'), {month: 'long'});
            }
            return value;
          }
          // Otherwise the data type requested (`type`) is type detection or
          // sorting data, for which we want to use the integer, so just return
          // that, unaltered
          return data;
        },
      },
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
        $('<span>').html(`&nbsp; ${t('exportCsv')}`),
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
    isActiveSearchBtnState(false);
    fetchUsers(usersTable, hasTrashButton, false);
  });
});
