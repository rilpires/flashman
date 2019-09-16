
let downloadCSV = function(csv, filename) {
  let csvFile;
  let downloadLink;
  // CSV file
  csvFile = new Blob([csv], {type: 'text/csv'});
  // Download link
  downloadLink = document.createElement('a');
  // File name
  downloadLink.download = filename;
  // Create a link to the file
  downloadLink.href = window.URL.createObjectURL(csvFile);
  // Hide download link
  downloadLink.style.display = 'none';
  // Add the link to DOM
  document.body.appendChild(downloadLink);
  // Click download link
  downloadLink.click();
};

let exportTableToCSV = function(filename) {
  let csv = [];
  let rows = $('table tr.csv-export');
  let ignoreFieldsList = ['index', 'passShow'];

  for (let i = 0; i < rows.length; i++) {
    let row = [];
    for (let data in rows[i].dataset) {
      if (Object.prototype.hasOwnProperty.call(rows[i].dataset, data)) {
        if (data == 'passShow' && rows[i].dataset[data] == 'false') {
          ignoreFieldsList.push('pass', 'wifiPass');
        }
        if (!ignoreFieldsList.includes(data)) {
          if (rows[i].dataset[data]) {
            row.push(rows[i].dataset[data]);
          } else {
            row.push('-');
          }
        }
      }
    }
    csv.push(row.join(','));
  }
  // Download CSV file
  downloadCSV(csv.join('\n'), filename);
};

let refreshExtRefType = function(event) {
  let selectedSpan = $(event.target).closest('.input-group-btn')
                                    .find('span.selected');
  let selectedItem = $(event.target).closest('.ext-ref-type').find('.active');
  let inputField = $(event.target).closest('.input-group').find('input');
  selectedSpan.text($(this).text());
  selectedItem.removeClass('active primary-color');
  $(event.target).addClass('active primary-color');

  if ($(this).text() == 'CPF') {
    inputField.mask('000.000.000-009').keyup();
  } else if ($(this).text() == 'CNPJ') {
    inputField.mask('00.000.000/0000-00').keyup();
  } else {
    inputField.unmask();
  }
};

let changeDeviceStatusOnTable = function(table, macaddr, data) {
  let deviceOnTable = table.find('#' + $.escapeSelector(macaddr));
  let statusOnlineSum = table.find('#online-status-sum');
  let statusRecoverSum = table.find('#recovery-status-sum');
  let statusOffSum = table.find('#offline-status-sum');
  if (deviceOnTable.length) {
    if (data == 'online' || data == 'recovery') {
      let status = deviceOnTable.find('.device-status');
      let currentGreen = status.hasClass('green-text');
      let currentRed = status.hasClass('red-text');
      let currentOnlineCount = parseInt(statusOnlineSum.text());
      let currentRecoveryCount = parseInt(statusRecoverSum.text());
      let currentOfflineCount = parseInt(statusOffSum.text());
      let canIncreaseCounter = false;
      if (currentGreen && (currentOnlineCount > 0)) {
        statusOnlineSum.text(currentOnlineCount - 1);
        canIncreaseCounter = true;
      } else if (currentRed && (currentRecoveryCount > 0)) {
        statusRecoverSum.text(currentRecoveryCount - 1);
        canIncreaseCounter = true;
      } else if (currentOfflineCount > 0) {
        statusOffSum.text(currentOfflineCount - 1);
        canIncreaseCounter = true;
      }
      if (data == 'online' && canIncreaseCounter) {
        statusOnlineSum.text(
          parseInt(statusOnlineSum.text()) + 1);
        let newStatus = 'green-text';
        status.removeClass('green-text red-text grey-text').addClass(newStatus);
      } else if (data == 'recovery' && canIncreaseCounter) {
        statusRecoverSum.text(
          parseInt(statusRecoverSum.text()) + 1);
        let newStatus = 'red-text';
        status.removeClass('green-text red-text grey-text').addClass(newStatus);
      }
    } else {
      let alert = deviceOnTable.find('.device-alert');
      let alertLink = alert.parent();
      alertLink.removeClass('d-none');
      alertLink.off('click').click(function(event) {
        swal({
          type: 'warning',
          text: data.message,
          confirmButtonText: data.action_title,
          confirmButtonColor: '#4db6ac',
          cancelButtonText: 'Cancelar',
          cancelButtonColor: '#f2ab63',
          showCancelButton: true,
        }).then(function(result) {
          alertLink.addClass('d-none');
          if (result.value) {
            $.ajax({
              type: 'POST',
              url: data.action_url,
              traditional: true,
            });
          }
          $.ajax({
            type: 'POST',
            url: '/notification/del',
            traditional: true,
            data: {id: data._id},
          });
        });
      });
    }
  }
};

$(document).ready(function() {
  // Enable tags on search input
  [].forEach.call(document.querySelectorAll('input[type="tags"]'), tagsInput);
  // The code below related to tags is because the tags-input plugin resets
  // all classes after loading
  $('.tags-input').addClass('form-control');
  $('.tags-input input').css('cssText', 'margin-top: 10px !important;');

  let role = $('#devices-table-content').data('role');
  let isSuperuser = false;
  let grantFirmwareUpgrade = false;
  let grantNotificationPopups = false;
  let grantWifiInfo = false;
  let grantPPPoEInfo = false;
  let grantDeviceActions = false;
  let grantLOGAccess = false;
  let grantLanAccess = false;
  let grantDeviceRemoval = false;
  let grantDeviceId = false;
  let grantPassShow = false;

  if ($('#devices-table-content').data('superuser')) {
    isSuperuser = $('#devices-table-content').data('superuser');
  }
  if ($('#devices-table-content').data('role')) {
    grantFirmwareUpgrade = role.grantFirmwareUpgrade;
    grantNotificationPopups = role.grantNotificationPopups;
    grantWifiInfo = role.grantWifiInfo;
    grantPPPoEInfo = role.grantPPPoEInfo;
    grantDeviceActions = role.grantDeviceActions;
    grantLOGAccess = role.grantLOGAccess;
    grantLanAccess = role.grantLanDevices;
    grantDeviceRemoval = role.grantDeviceRemoval;
    grantDeviceId = role.grantDeviceId;
    grantPassShow = role.grantPassShow;
  }

  $(document).on('click', '#card-header', function(event) {
    let plus = $(this).find('.fa-plus');
    let cross = $(this).find('.fa-times');
    plus.removeClass('fa-plus').addClass('fa-times');
    cross.removeClass('fa-times').addClass('fa-plus');
  });

  $(document).on('click', '.fa-chevron-down', function(event) {
    let row = $(event.target).parents('tr');
    let index = row.data('index');
    let formId = '#form-' + index.toString();
    $(formId).removeClass('d-none');
    $(event.target).removeClass('fa-chevron-down')
                   .addClass('fa-chevron-up text-primary');
  });

  $(document).on('click', '.fa-chevron-up', function(event) {
    let row = $(event.target).parents('tr');
    let index = row.data('index');
    let formId = '#form-' + index.toString();
    $(formId).addClass('d-none');
    $(event.target).removeClass('fa-chevron-up text-primary')
                   .addClass('fa-chevron-down');
  });

  $(document).on('click', '.ext-ref-type a', refreshExtRefType);

  $(document).on('click', '#btn-elements-per-page', function(event) {
    $.ajax({
      type: 'POST',
      url: '/user/elementsperpage',
      traditional: true,
      data: {elementsperpage: $('#input-elements-pp').val()},
      success: function(res) {
        if (res.type == 'success') {
          window.location.reload();
        } else {
          displayAlertMsg(res);
        }
      },
    });
  });

  $(document).on('click', '#export-csv', function(event) {
    exportTableToCSV('lista-de-roteadores-flashbox.csv');
  });

  $(document).on('click', '.tab-switch-btn', function(event) {
    let tabId = $(this).data('tab-id');
    $(tabId).siblings().addClass('d-none');
    $(tabId).removeClass('d-none');
  });

  $(document).on('click', '#btn-upgrade-scheduler', function(event) {
    $('#upgrade-scheduler').modal('show');
  });

  // Refresh table content
  $(document).on('click', '#refresh-table-content', function(event) {
    let pageNum = parseInt($('#curr-page-link').html());
    let filterList = $('#devices-search-form .tags-input').val();
    loadDevicesTable(pageNum, filterList);
  });

  // Refresh single row
  $(document).on('click', '.device-row-refresher', function(event) {
    let row = $(event.target).parents('tr');
    let deviceId = row.data('deviceid');
    let deviceDoUpdate = (row.data('do-update') == 'Sim' ? true : false);
    $.ajax({
      url: '/devicelist/uiupdate/' + deviceId,
      type: 'GET',
      success: function(res) {
        row.find('.device-status').removeClass('green-text red-text grey-text')
                                  .addClass(res.status_color + '-text');
        row.find('.device-wan-ip').html(res.wan_ip);
        row.find('.device-ip').html(res.ip);
        row.find('.device-installed-release').html(res.installed_release);
        row.find('.device-pppoe-user').html(res.pppoe_user);
        if (deviceDoUpdate != res.do_update) {
          if (res.do_update == false) {
            // Activate dropdown
            row.find('.device-update .dropdown-toggle .selected')
               .text('Escolher');
            row.find('.device-update .dropdown-toggle').attr('disabled', false);
            // Deactivate waiting status
            let upgradeStatus = row.find('span.upgrade-status');
            upgradeStatus.find('.status-none').removeClass('d-none');
            upgradeStatus.find('.status-waiting').addClass('d-none');
            upgradeStatus.find('.status-ok').addClass('d-none');
            upgradeStatus.find('.status-error').addClass('d-none');
            // Deactivate cancel button
            row.find('.btn-group .btn-cancel-update')
               .removeClass('btn-danger').attr('disabled', true);
          }
        }
      },
    });
  });

  let loadDevicesTable = function(selelectedPage=1, filterList='') {
    let deviceTableContent = $('#devices-table-content');
    let deviceTablePagination = $('#devices-table-pagination');
    // Clean all elements before loading
    deviceTableContent.empty();
    deviceTablePagination.empty();
    // Start loading animation
    deviceTableContent.append(
      $('<tr>').append(
        $('<td>').attr('colspan', '9')
        .addClass('grey lighten-5 text-center')
        .append(
          $('<h3>').append(
            $('<i>').addClass('fas fa-spinner fa-pulse fa-2x grey-text')
          )
        )
      )
    );
    $.ajax({
      url: '/devicelist/search?page=' + selelectedPage,
      type: 'PUT',
      data: {filter_list: filterList},
      success: function(res) {
        if (res.type == 'success') {
          // Improve performance by working with table content
          // outside DOM since there is o lot of manipulation ahead
          deviceTableContent.detach();
          // Stop loading animation
          deviceTableContent.empty();
          // Just fill not found message if there are no devices found
          if (res.devices.length == 0) {
            deviceTableContent.append(
              $('<tr>').append(
                $('<td>').attr('colspan', '9')
                .addClass('grey lighten-5 text-center')
                .append(
                  $('<h5>').html('Nenhum roteador encontrado')
                )
              )
            );
            // Attach elements back to DOM after manipulation
            $('#devices-table').append(deviceTableContent);
            return false;
          }

          // Fill multiple update form
          updateSearchResultsScheduler(res);
          // Fill status row
          deviceTableContent.append(
            $('<tr>').append(
              $('<td>').addClass('pl-1 pr-0').append(
                $('<a>').attr('id', 'refresh-table-content')
                .append(
                  $('<div>').addClass('fas fa-sync-alt fa-lg mt-2')
                )
              ),
              $('<td>').addClass('text-center')
                       .html(res.status.totalnum + ' total'),
              $('<td>').append(
                $('<div>').addClass('fas fa-circle green-text'),
                $('<span>').html('&nbsp'),
                $('<span>').attr('id', 'online-status-sum')
                           .html(res.status.onlinenum),
                $('<br>'),
                $('<div>').addClass('fas fa-circle red-text'),
                $('<span>').html('&nbsp'),
                $('<span>').attr('id', 'recovery-status-sum')
                           .html(res.status.recoverynum),
                $('<br>'),
                $('<div>').addClass('fas fa-circle grey-text'),
                $('<span>').html('&nbsp'),
                $('<span>').attr('id', 'offline-status-sum')
                           .html(res.status.offlinenum)
              ),
              $('<td>'),
              $('<td>'),
              $('<td>'),
              $('<td>'),
              $('<td>'),
              (isSuperuser || grantFirmwareUpgrade ?
                $('<td>').append(
                  $('<div>').addClass('btn-group').append(
                    $('<div>').addClass('btn-group').attr('id', 'all-devices')
                    .append(
                      $('<button>').addClass('btn btn-sm px-3 py-2 teal darken-5')
                        .attr('id', 'btn-upgrade-scheduler')
                      .append(
                        $('<i>').addClass('fas fa-clock fa-lg')
                      )
                      .append(
                        $('<span>').html('&nbsp &nbsp Atualizar Vários')
                      )
                    )
                  )
                ) :
                ''
              )
            )
          );
          let index = 0;
          // Fill remaining rows with devices
          for (let idx = 0; idx < res.devices.length; idx += 1) {
            let device = res.devices[idx];
            let grantWifiBand = device.permissions.grantWifiBand;
            let grantWifi5ghz = device.permissions.grantWifi5ghz;
            let grantLanEdit = device.permissions.grantLanEdit;
            let grantPortForwardAsym = device.permissions.grantPortForwardAsym;
            let grantPortOpenIpv6 = device.permissions.grantPortOpenIpv6;
            let grantViewLogs = device.permissions.grantViewLogs;
            let grantResetDevices = device.permissions.grantResetDevices;
            let grantPortForward = device.permissions.grantPortForward;
            let grantPingTest = device.permissions.grantPingTest;
            let grantLanDevices = device.permissions.grantLanDevices;
            let grantUpnpSupport = device.permissions.grantUpnp;

            deviceTableContent.append(
              $('<tr>').addClass('csv-export').attr('id', device._id)
                       .attr('data-index', index)
                       .attr('data-deviceid', device._id)
                       .attr('data-connection-type', device.connection_type ? device.connection_type : '')
                       .attr('data-user', device.pppoe_user ? device.pppoe_user : '')
                       .attr('data-pass', device.pppoe_password ? device.pppoe_password : '')
                       .attr('data-lan-subnet', device.lan_subnet ? device.lan_subnet : '')
                       .attr('data-lan-netmask', device.lan_netmask ? device.lan_netmask : '')
                       .attr('data-ssid', device.wifi_ssid ? device.wifi_ssid : '')
                       .attr('data-wifi-pass', device.wifi_password ? device.wifi_password : '')
                       .attr('data-channel', device.wifi_channel ? device.wifi_channel : '')
                       .attr('data-band', device.wifi_band ? device.wifi_band : '')
                       .attr('data-mode', device.wifi_mode ? device.wifi_mode : '')
                       .attr('data-ssid-5ghz', device.wifi_ssid_5ghz ? device.wifi_ssid_5ghz : '')
                       .attr('data-wifi-pass-5ghz', device.wifi_password_5ghz ? device.wifi_password_5ghz : '')
                       .attr('data-channel-5ghz', device.wifi_channel_5ghz ? device.wifi_channel_5ghz : '')
                       .attr('data-band-5ghz', device.wifi_band_5ghz ? device.wifi_band_5ghz : '')
                       .attr('data-mode-5ghz', device.wifi_mode_5ghz ? device.wifi_mode_5ghz : '')
                       .attr('data-ext-wan', device.ip ? device.ip : '')
                       .attr('data-int-wan', device.wan_ip ? device.wan_ip : '')
                       .attr('data-wan-speed', device.wan_negociated_speed ? device.wan_negociated_speed : '')
                       .attr('data-wan-duplex', device.wan_negociated_duplex ? device.wan_negociated_duplex : '')
                       .attr('data-external-ref-type', device.external_reference ? device.external_reference.kind : '')
                       .attr('data-external-ref', device.external_reference ? device.external_reference.data : '')
                       .attr('data-device-model', device.model ? device.model : '')
                       .attr('data-device-version', device.version ? device.version : '')
                       .attr('data-device-release', device.release ? device.release : '')
                       .attr('data-do-update', device.do_update ? 'Sim' : 'Não')
              .append(
                $('<td>').addClass('pl-1 pr-0').append(
                  $('<a>').addClass('device-row-refresher')
                  .append(
                    $('<div>').addClass('fas fa-sync-alt fa-lg')
                  )
                ),
                $('<td>').addClass('text-center')
                .append(
                  $('<div>').addClass('fas fa-chevron-down fa-lg')
                ),
                $('<td>').append(
                  $('<div>').addClass('fas fa-circle fa-lg device-status')
                            .addClass(device.status_color)
                            .attr('data-toggle', 'tooltip')
                            .attr('title', device.last_contact.toString()),
                  $('<span>').html('&nbsp'),
                  $('<span>').html('&nbsp'),
                  (isSuperuser || grantNotificationPopups ?
                    $('<a>').addClass('d-none').append(
                      $('<div>').addClass('fas fa-exclamation-triangle fa-lg')
                                .addClass('orange-text device-alert')
                                .addClass('animated heartBeat infinite')
                    ) :
                    ''
                  )
                ),
                $('<td>').addClass('text-center device-pppoe-user')
                         .html(device.pppoe_user),
                $('<td>').addClass('text-center')
                         .html(device._id),
                $('<td>').addClass('text-center device-wan-ip')
                         .html(device.wan_ip),
                $('<td>').addClass('text-center device-ip')
                         .html(device.ip),
                $('<td>').addClass('text-center device-installed-release')
                         .html(device.installed_release),
                (isSuperuser || grantFirmwareUpgrade ?
                  $('<td>').append(
                    $('<div>').addClass('btn-group device-update').append(
                      $('<button>').addClass('btn btn-sm px-2 btn-cancel-update')
                                   .addClass(!device.do_update ? '':'btn-danger')
                                   .attr('disabled', !device.do_update)
                                   .append($('<div>').addClass('fas fa-times')),
                      $('<div>').addClass('btn-group').append(
                        $('<button>').addClass('btn btn-sm btn-primary')
                                     .addClass('dropdown-toggle')
                                     .attr('type', 'button')
                                     .attr('data-toggle', 'dropdown')
                                     .attr('disabled', device.do_update)
                                     .append(
                                        $('<span>').addClass('selected')
                                                  .html(device.do_update ?
                                                        device.release :
                                                        'Escolher')
                                      ),
                        $('<div>').addClass('dropdown-menu refresh-selected')
                        .append(() => {
                          let opts = $('<div>');
                          for (let idx = 0;
                               idx < device.releases.length; idx += 1) {
                            let release = device.releases[idx];
                            opts.append(
                              $('<a>').addClass('dropdown-item text-center')
                                      .html(release.id)
                            );
                          }
                          return opts.html();
                        }),
                        $('<span>').addClass('ml-3 upgrade-status')
                        .append(
                          $('<div>').addClass('far fa-circle fa-2x white-text')
                                    .addClass('status-none')
                                    .addClass(device.do_update ? 'd-none' : ''),
                          $('<div>').addClass('fas fa-spinner fa-2x fa-pulse')
                                    .addClass('status-waiting')
                                    .addClass(device.do_update && device.do_update_status == 0 ? '' : 'd-none'),
                          $('<div>').addClass('fas fa-check-circle fa-2x green-text')
                                    .addClass('status-ok')
                                    .addClass(device.do_update && device.do_update_status == 1 ? '' : 'd-none'),
                          $('<a>').addClass('status-error')
                                  .addClass(device.do_update && device.do_update_status >= 2 ? '' : 'd-none')
                                  .append(
                                    $('<div>').addClass('fas fa-exclamation-circle fa-2x red-text')
                                  )
                        )
                      )
                    )
                  ) :
                  ''
                )
              ),
              $('<tr>').addClass('d-none')
                       .attr('id', 'form-' + index)
                       .attr('data-index', index)
                       .attr('data-deviceid', device._id)
                       .attr('data-validate-wifi', isSuperuser || grantWifiInfo >= 1)
                       .attr('data-validate-pppoe', isSuperuser || grantPPPoEInfo >= 1)
                       .attr('data-validate-wifi-band', grantWifiBand && (isSuperuser || grantWifiInfo >= 1))
                       .attr('data-validate-wifi-5ghz', grantWifi5ghz && (isSuperuser || grantWifiInfo >= 1))
                       .attr('data-validate-lan', grantLanEdit)
                       .attr('data-validate-port-forward-asym', grantPortForwardAsym)
                       .attr('data-validate-port-open-ipv6', grantPortOpenIpv6)
                       .attr('data-validate-upnp', grantUpnpSupport)
                       .attr('data-minlength-pass-pppoe', res.min_length_pass_pppoe)

              .append(
                $('<td>').attr('colspan', '9').addClass('grey lighten-5')
                .append(
                  $('<form>').addClass('edit-form needs-validation')
                             .attr('novalidate', true)
                  .append(
                    $('<div>').addClass('row').append(
                      $('<div>').addClass('col-10 actions-opts').append(
                        $('<div>').addClass('btn-group btn-group-toggle')
                                  .attr('data-toggle', 'buttons')
                        .append(
                          $('<label>').addClass('btn btn-primary tab-switch-btn active')
                                      .attr('data-tab-id', '#tab_about-' + index)
                                      .html('Sobre')
                                      .append($('<input>').attr('type', 'radio')),
                          $('<label>').addClass('btn btn-primary tab-switch-btn')
                                      .attr('data-tab-id', '#tab_wan-' + index)
                                      .html('WAN')
                                      .append($('<input>').attr('type', 'radio')),
                          (grantLanEdit ?
                            $('<label>').addClass('btn btn-primary tab-switch-btn')
                                        .attr('data-tab-id', '#tab_lan-' + index)
                                        .html('LAN')
                                        .append($('<input>').attr('type', 'radio')) :
                            ''
                          ),
                          (isSuperuser || grantWifiInfo >= 1 ?
                            $('<label>').addClass('btn btn-primary tab-switch-btn')
                                        .attr('data-tab-id', '#tab_wifi-' + index)
                                        .html('Wi-Fi')
                                        .append($('<input>').attr('type', 'radio')) :
                            ''
                          ),
                          (grantWifi5ghz && (isSuperuser || grantWifiInfo >= 1) ?
                            $('<label>').addClass('btn btn-primary tab-switch-btn')
                                        .attr('data-tab-id', '#tab_wifi5-' + index)
                                        .html('Wi-Fi 5.0GHz')
                                        .append($('<input>').attr('type', 'radio')) :
                            ''
                          ),
                          // Actions
                          (isSuperuser || grantDeviceActions ?
                            $('<button>').addClass('btn btn-primary dropdown-toggle')
                                         .attr('type', 'button')
                                         .attr('data-toggle', 'dropdown')
                                         .html('Opções') : ''
                          ),
                          (isSuperuser || grantDeviceActions ?
                            $('<div>').addClass('dropdown-menu dropdown-menu-right')
                                      .attr('data-dropdown-in', 'fadeIn')
                                      .attr('data-dropdown-out', 'fadeOut')
                            .append(
                              $('<a>').addClass('dropdown-item btn-reboot')
                              .append(
                                $('<i>').addClass('fas fa-sync'),
                                $('<span>').html('&nbsp Reiniciar roteador')
                              ),
                              $('<div>').addClass('dropdown-divider'),
                              $('<a>').addClass('dropdown-item btn-reset-app')
                              .append(
                                $('<i>').addClass('fas fa-mobile-alt'),
                                $('<span>').html('&nbsp Resetar senha App')
                              ),
                              ((isSuperuser || grantLOGAccess) && grantViewLogs ?
                                $('<div>').addClass('dropdown-divider') : ''
                              ),
                              ((isSuperuser || grantLOGAccess) && grantViewLogs ?
                                $('<a>').addClass('dropdown-item btn-log-modal')
                                .append(
                                  $('<i>').addClass('fas fa-file-alt'),
                                  $('<span>').html('&nbsp Logs do roteador')
                                ) : ''
                              ),
                              (grantResetDevices ?
                                $('<div>').addClass('dropdown-divider') : ''
                              ),
                              (grantResetDevices ?
                                $('<a>').addClass('dropdown-item btn-reset-blocked')
                                .append(
                                  $('<i>').addClass('fas fa-ban'),
                                  $('<span>').html('&nbsp Desbloquear dispositivos')
                                ) : ''
                              ),
                              (grantPortForward ?
                                $('<div>').addClass('dropdown-divider') : ''
                              ),
                              (grantPortForward ?
                                $('<a>').addClass('dropdown-item btn-open-ports-modal')
                                .append(
                                  $('<i>').addClass('fas fa-lock-open'),
                                  $('<span>').html('&nbsp Abertura de portas')
                                ) : ''
                              ),
                              (grantPingTest ?
                                $('<div>').addClass('dropdown-divider') : ''
                              ),
                              (grantPingTest ?
                                $('<a>').addClass('dropdown-item btn-ping-test-modal')
                                .append(
                                  $('<i>').addClass('fas fa-stethoscope'),
                                  $('<span>').html('&nbsp Teste de latência e perda')
                                ) : ''
                              ),
                              ((isSuperuser || grantLanAccess) && grantLanDevices ?
                                $('<div>').addClass('dropdown-divider') : ''
                              ),
                              ((isSuperuser || grantLanAccess) && grantLanDevices ?
                                $('<a>').addClass('dropdown-item btn-lan-devices-modal')
                                .append(
                                  $('<i>').addClass('fas fa-network-wired'),
                                  $('<span>').html('&nbsp Dispositivos Conectados')
                                ) : ''
                              )
                            ) : ''
                          )
                        ),
                        $('<br>'),
                        $('<span>').addClass('badge badge-success bounceIn d-none')
                                   .html('Sucesso'),
                        $('<span>').addClass('badge badge-warning bounceIn d-none')
                                   .html('Falha'),
                        $('<br>')
                      ),
                      (isSuperuser || grantDeviceRemoval ?
                        $('<div>').addClass('col-2 text-right').append(
                          $('<button>').addClass('btn btn-danger btn-trash m-0')
                                       .attr('type', 'button')
                          .append(
                            $('<i>').addClass('fas fa-trash'),
                            $('<span>').html('&nbsp Remover')
                          )
                        ) : ''
                      )
                    ),
                    // Display forms and info
                    $('<div>').addClass('row').append(
                      $('<div>').addClass('col').append(
                        // About
                        $('<div>').addClass('edit-tab').attr('id', 'tab_about-' + index)
                        .append(
                          $('<div>').addClass('row').append(
                            // Client ID
                            $('<div>').addClass('col-6').append(
                              $('<div>').addClass('md-form input-group input-entry')
                              .append(
                                $('<div>').addClass('input-group-btn').append(
                                  $('<button>').addClass('btn btn-primary dropdown-toggle ml-0 my-0')
                                               .attr('type', 'button')
                                               .attr('data-toggle', 'dropdown')
                                               .attr('disabled', !isSuperuser && !grantDeviceId)
                                  .append(
                                    $('<span>').addClass('selected')
                                    .attr('id', 'edit_ext_ref_type_selected-' + index)
                                    .html(device.external_reference ?
                                      device.external_reference.kind : 'CPF'
                                    )
                                  ),
                                  $('<div>')
                                  .addClass('dropdown-menu ext-ref-type')
                                  .append(
                                    $('<a>').addClass('dropdown-item text-center')
                                            .html('CPF')
                                    .addClass(device.external_reference ?
                                      (device.external_reference.kind === 'CPF' ? 'primary-color active' : '')
                                      :
                                      'primary-color active'
                                    ),
                                    $('<a>').addClass('dropdown-item text-center')
                                            .html('CNPJ')
                                    .addClass(device.external_reference && device.external_reference.kind === 'CNPJ' ?
                                      'primary-color active' : ''
                                    ),
                                    $('<a>').addClass('dropdown-item text-center')
                                            .html('Outro')
                                    .addClass(device.external_reference && device.external_reference.kind === 'Outro' ?
                                      'primary-color active' : ''
                                    )
                                  )
                                ),
                                $('<input>').addClass('form-control py-0 added-margin')
                                            .attr('type', 'text')
                                            .attr('id', 'edit_external_reference-' + index)
                                            .attr('placeholder', 'ID do cliente (opcional)')
                                            .attr('maxlength', '64')
                                            .attr('disabled', !isSuperuser && !grantDeviceId)
                                .val(device.external_reference ?
                                  device.external_reference.data : ''
                                ),
                                $('<div>').addClass('invalid-feedback')
                              )
                            ),
                            // Model
                            $('<div>').addClass('col-6').append(
                              $('<div>').addClass('md-form input-entry pt-1')
                              .append(
                                $('<label>').html('Modelo')
                                            .addClass('active'),
                                $('<input>').addClass('form-control')
                                            .attr('type', 'text')
                                            .attr('maxlength', '32')
                                            .attr('disabled', true)
                                .val(device.model),
                                $('<div>').addClass('invalid-feedback')
                              ),
                              $('<div>').addClass('md-form input-entry')
                              .append(
                                $('<label>').html('Versão do Flashbox')
                                            .addClass('active'),
                                $('<input>').addClass('form-control')
                                            .attr('type', 'text')
                                            .attr('maxlength', '32')
                                            .attr('disabled', true)
                                .val(device.version),
                                $('<div>').addClass('invalid-feedback')
                              )
                            )
                          )
                        ),
                        // WAN
                        $('<div>').addClass('edit-tab d-none').attr('id', 'tab_wan-' + index)
                        .append(
                          $('<div>').addClass('row').append(
                            // Client ID
                            $('<div>').addClass('col-4').append(
                              $('<div>').addClass('md-form').append(
                                $('<div>').addClass('input-group has-warning')
                                .append(
                                  $('<div>').addClass('md-selectfield form-control my-0')
                                  .append(
                                    $('<label>').html('Tipo de Conexão')
                                                .addClass('active'),
                                    $('<select>').addClass('browser-default md-select')
                                                 .attr('id', 'edit_connect_type-' + index)
                                    .append(
                                      $('<option>').val('DHCP').html('DHCP'),
                                      $('<option>').val('PPPoE').html('PPPoE')
                                    )
                                    .val(device.connection_type ?
                                      (device.connection_type.toUpperCase() === 'DHCP' ? 'DHCP' : 'PPPoE')
                                      :
                                      'DHCP'
                                    )
                                  ),
                                  $('<h7>').addClass('orange-text d-none')
                                           .attr('id', 'edit_connect_type_warning-' + index)
                                  .html('Cuidado! Isso pode deixar o roteador inacessível' +
                                        'dependendo das configurações de rede do seu provedor')
                                )
                              )
                            ),
                            $('<div>').addClass('col-4').append(
                              $('<div>').addClass('md-form input-entry').append(
                                $('<label>').html('Velocidade Negociada (Mbps)')
                                            .addClass('active'),
                                $('<input>').addClass('form-control')
                                            .attr('type', 'text')
                                            .attr('maxlength', '32')
                                            .attr('disabled', true)
                                             .val(device.wan_negociated_speed),
                                $('<div>').addClass('invalid-feedback')
                              ),
                              $('<div>').addClass('md-form input-entry').append(
                                $('<label>').html('Modo de Transmissão (Duplex)')
                                            .addClass('active'),
                                $('<input>').addClass('form-control')
                                            .attr('type', 'text')
                                            .attr('maxlength', '32')
                                            .attr('disabled', true)
                                            .val(device.wan_negociated_duplex),
                                $('<div>').addClass('invalid-feedback')
                              )
                            ),
                            (isSuperuser || grantPPPoEInfo >= 1 ?
                              $('<div>')
                              .addClass('col-4')
                              .addClass((device.connection_type && device.connection_type.toUpperCase() !== 'DHCP') ?
                                '' :
                                'd-none')
                              .attr('id', 'edit_pppoe_combo-' + index)
                              .append(
                                $('<div>').addClass('md-form input-entry').append(
                                  $('<label>').html('Usuário PPPoE')
                                              .addClass('active'),
                                  $('<input>').addClass('form-control')
                                              .attr('type', 'text')
                                              .attr('id', 'edit_pppoe_user-' + index)
                                              .attr('maxlength', '64')
                                              .attr('disabled', !isSuperuser && grantPPPoEInfo <= 1)
                                              .val(device.pppoe_user),
                                  $('<div>').addClass('invalid-feedback')
                                ),
                                $('<div>').addClass('md-form input-entry').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<label>').html('Senha PPPoE')
                                                .addClass('active'),
                                    $('<input>').addClass('form-control my-0')
                                                .attr('type', 'password')
                                                .attr('id', 'edit_pppoe_pass-' + index)
                                                .attr('maxlength', '64')
                                                .attr('disabled', !isSuperuser && grantPPPoEInfo <= 1)
                                                .val(device.pppoe_password),
                                    (isSuperuser || grantPassShow ?
                                      $('<div>').addClass('input-group-append')
                                      .append(
                                        $('<div>').addClass('input-group-text primary-color')
                                        .append(
                                          $('<a>').addClass('toggle-pass')
                                          .append(
                                            $('<i>').addClass('fas fa-eye-slash white-text')
                                          )
                                        )
                                      )
                                      :
                                      ''
                                    ),
                                    $('<div>').addClass('invalid-feedback')
                                  )
                                )
                              )
                              :
                              ''
                            )
                          )
                        ),
                        // LAN
                        $('<div>').addClass('edit-tab d-none').attr('id', 'tab_lan-' + index)
                        .append(
                          $('<div>').addClass('row')
                          .append(
                            $('<div>').addClass('col-6').append(
                              $('<div>').addClass('md-form input-entry').append(
                                $('<label>').html('IP da Rede')
                                            .addClass('active'),
                                $('<input>').addClass('form-control ip-mask-field')
                                            .attr('type', 'text')
                                            .attr('id', 'edit_lan_subnet-' + index)
                                            .attr('maxlength', '15')
                                            .attr('disabled', !isSuperuser && !grantLanEdit)
                                            .val(device.lan_subnet),
                                $('<div>').addClass('invalid-feedback')
                              )
                            ),
                            $('<div>').addClass('col-6').append(
                              $('<div>').addClass('md-form').append(
                                $('<div>').addClass('input-group').append(
                                  $('<div>').addClass('md-selectfield form-control my-0')
                                  .append(
                                    $('<label>').html('Máscara')
                                                .addClass('active'),
                                    $('<select>').addClass('browser-default md-select')
                                                .attr('type', 'text')
                                                .attr('id', 'edit_lan_netmask-' + index)
                                                .attr('maxlength', '15')
                                                .attr('disabled', !isSuperuser && !grantLanEdit)
                                    .append(() => {
                                      let opts = $('<div>');
                                      const masks = ['24', '25', '26'];
                                      for (let idx = 0;
                                           idx < masks.length; idx += 1) {
                                        let mask = masks[idx];
                                        opts.append(
                                          $('<option>').val(mask).html(mask)
                                        );
                                      }
                                      return opts.html();
                                    })
                                    .val(device.lan_netmask)
                                  )
                                )
                              )
                            )
                          )
                        ),
                        // Wi-Fi 2.4Ghz
                        (isSuperuser || grantWifiInfo >= 1 ?
                          $('<div>').addClass('edit-tab d-none').attr('id', 'tab_wifi-' + index)
                          .append(
                            $('<div>').addClass('row').append(
                              $('<div>').addClass('col-6').append(
                                $('<div>').addClass('md-form').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<div>').addClass('md-selectfield form-control my-0')
                                    .append(
                                      $('<label>').html('Canal do Wi-Fi')
                                                  .addClass('active'),
                                      $('<select>').addClass('browser-default md-select')
                                                  .attr('id', 'edit_wifi_channel-' + index)
                                                  .attr('disabled', !isSuperuser && grantWifiInfo <= 1)
                                      .append(() => {
                                        let opts = $('<div>');
                                        const channels = ['auto', '1', '2', '3',
                                                        '4', '5', '6', '7', '8',
                                                        '9', '10', '11'];
                                        for (let idx = 0;
                                             idx < channels.length; idx += 1) {
                                          let channel = channels[idx];
                                          opts.append(
                                            $('<option>').val(channel)
                                            .html(channel)
                                          );
                                        }
                                        return opts.html();
                                      })
                                      .val(device.wifi_channel)
                                    )
                                  )
                                ),
                                $('<div>').addClass('md-form input-entry').append(
                                  $('<label>').html('SSID do Wi-Fi')
                                              .addClass('active'),
                                  $('<input>').addClass('form-control')
                                              .attr('type', 'text')
                                              .attr('id', 'edit_wifi_ssid-' + index)
                                              .attr('maxlength', '32')
                                              .attr('disabled', !isSuperuser && grantWifiInfo <= 1)
                                              .val(device.wifi_ssid),
                                  $('<div>').addClass('invalid-feedback')
                                ),
                                $('<div>').addClass('md-form input-entry').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<label>').html('Senha do Wi-Fi')
                                                .addClass('active'),
                                    $('<input>').addClass('form-control my-0')
                                                .attr('type', 'password')
                                                .attr('id', 'edit_wifi_pass-' + index)
                                                .attr('maxlength', '64')
                                                .attr('disabled', !isSuperuser && grantWifiInfo <= 1)
                                                .val(device.wifi_password),
                                    (isSuperuser || grantPassShow ?
                                      $('<div>').addClass('input-group-append')
                                      .append(
                                        $('<div>').addClass('input-group-text primary-color')
                                        .append(
                                          $('<a>').addClass('toggle-pass')
                                          .append(
                                            $('<i>').addClass('fas fa-eye-slash white-text')
                                          )
                                        )
                                      )
                                      :
                                      ''
                                    ),
                                    $('<div>').addClass('invalid-feedback')
                                  )
                                )
                              ),
                              $('<div>').addClass('col-6').append(
                                $('<div>').addClass('md-form').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<div>').addClass('md-selectfield form-control my-0')
                                    .append(
                                      $('<label>').html('Largura de banda')
                                                  .addClass('active'),
                                      $('<select>').addClass('browser-default md-select')
                                                  .attr('id', 'edit_wifi_band-' + index)
                                                  .attr('disabled', !isSuperuser && grantWifiInfo <= 1)
                                      .append(
                                        $('<option>').val('HT40').html('40 MHz'),
                                        $('<option>').val('HT20').html('20 MHz')
                                      )
                                      .val(device.wifi_band)
                                    )
                                  )
                                ),
                                $('<div>').addClass('md-form').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<div>').addClass('md-selectfield form-control my-0')
                                    .append(
                                      $('<label>').html('Modo de operação')
                                                  .addClass('active'),
                                      $('<select>').addClass('browser-default md-select')
                                                  .attr('id', 'edit_wifi_mode-' + index)
                                                  .attr('disabled', !grantWifiBand || (!isSuperuser && grantWifiInfo <= 1))
                                      .append(
                                        $('<option>').val('11n').html('BGN'),
                                        $('<option>').val('11g').html('G')
                                      )
                                      .val(device.wifi_mode)
                                    )
                                  )
                                )
                              )
                            )
                          )
                          :
                          ''
                        ),
                        // Wi-Fi 5Ghz
                        (grantWifi5ghz && (isSuperuser || grantWifiInfo >= 1) ?
                          $('<div>').addClass('edit-tab d-none').attr('id', 'tab_wifi5-' + index)
                          .append(
                            $('<div>').addClass('row').append(
                              $('<div>').addClass('col-6').append(
                                $('<div>').addClass('md-form').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<div>').addClass('md-selectfield form-control my-0')
                                    .append(
                                      $('<label>').html('Canal do Wi-Fi')
                                                  .addClass('active'),
                                      $('<select>').addClass('browser-default md-select')
                                                  .attr('id', 'edit_wifi5_channel-' + index)
                                                  .attr('disabled', !isSuperuser && grantWifiInfo <= 1)
                                      .append(() => {
                                        let opts = $('<div>');
                                        const channels = ['auto', '36', '40',
                                                          '44', '48', '52',
                                                          '56', '60', '64',
                                                          '149', '153', '157',
                                                          '161', '165'];
                                        for (let idx = 0;
                                             idx < channels.length; idx += 1) {
                                          let channel = channels[idx];
                                          opts.append(
                                            $('<option>').val(channel)
                                            .html(channel)
                                          );
                                        }
                                        return opts.html();
                                      })
                                      .val(device.wifi_channel_5ghz)
                                    )
                                  )
                                ),
                                $('<div>').addClass('md-form input-entry').append(
                                  $('<label>').html('SSID do Wi-Fi')
                                              .addClass('active'),
                                  $('<input>').addClass('form-control')
                                              .attr('type', 'text')
                                              .attr('id', 'edit_wifi5_ssid-' + index)
                                              .attr('maxlength', '32')
                                              .attr('disabled', !isSuperuser && grantWifiInfo <= 1)
                                              .val(device.wifi_ssid_5ghz),
                                  $('<div>').addClass('invalid-feedback')
                                ),
                                $('<div>').addClass('md-form input-entry').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<label>').html('Senha do Wi-Fi')
                                                .addClass('active'),
                                    $('<input>').addClass('form-control my-0')
                                                .attr('type', 'password')
                                                .attr('id', 'edit_wifi5_pass-' + index)
                                                .attr('maxlength', '64')
                                                .attr('disabled', !isSuperuser && grantWifiInfo <= 1)
                                                .val(device.wifi_password_5ghz),
                                    (isSuperuser || grantPassShow ?
                                      $('<div>').addClass('input-group-append')
                                      .append(
                                        $('<div>').addClass('input-group-text primary-color')
                                        .append(
                                          $('<a>').addClass('toggle-pass')
                                          .append(
                                            $('<i>').addClass('fas fa-eye-slash white-text')
                                          )
                                        )
                                      )
                                      :
                                      ''
                                    ),
                                    $('<div>').addClass('invalid-feedback')
                                  )
                                )
                              ),
                              $('<div>').addClass('col-6').append(
                                $('<div>').addClass('md-form').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<div>').addClass('md-selectfield form-control my-0')
                                    .append(
                                      $('<label>').html('Largura de banda')
                                                  .addClass('active'),
                                      $('<select>').addClass('browser-default md-select')
                                                  .attr('id', 'edit_wifi5_band-' + index)
                                                  .attr('disabled', !isSuperuser && grantWifiInfo <= 1)
                                      .append(
                                        $('<option>').val('VHT80').html('80 MHz'),
                                        $('<option>').val('VHT40').html('40 MHz'),
                                        $('<option>').val('VHT20').html('20 MHz')
                                      )
                                      .val((device.wifi_band_5ghz === 'HT20' ||
                                            device.wifi_band_5ghz === 'HT40') ?
                                        'V' + device.wifi_band_5ghz
                                        :
                                        device.wifi_band_5ghz
                                      )
                                    )
                                  )
                                ),
                                $('<div>').addClass('md-form').append(
                                  $('<div>').addClass('input-group').append(
                                    $('<div>').addClass('md-selectfield form-control my-0')
                                    .append(
                                      $('<label>').html('Modo de operação')
                                                  .addClass('active'),
                                      $('<select>').addClass('browser-default md-select')
                                                  .attr('id', 'edit_wifi5_mode-' + index)
                                                  .attr('disabled', !grantWifiBand || (!isSuperuser && grantWifiInfo <= 1))
                                      .append(
                                        $('<option>').val('11ac').html('AC'),
                                        $('<option>').val('11na').html('N')
                                      )
                                      .val(device.wifi_mode_5ghz)
                                    )
                                  )
                                )
                              )
                            )
                          )
                          :
                          ''
                        )
                      )
                    ),
                    // Submit changes
                    $('<div>').addClass('row').append(
                      $('<div>').addClass('col text-right').append(
                        $('<button>').addClass('btn btn-primary mx-0')
                                     .attr('type', 'submit')
                        .append(
                          $('<i>').addClass('fas fa-check fa-lg'),
                          $('<span>').html('&nbsp Editar')
                        )
                      )
                    )
                  )
                )
              )
            );

            // Index variable has a global scope related to below function
            let localIdx = index;
            $(document).on('change', '#edit_connect_type-' + localIdx,
            (event) => {
              $('#edit_connect_type_warning-' + localIdx).removeClass('d-none');
              if ($('#edit_connect_type-' + localIdx).val() === 'PPPoE') {
                $('#edit_pppoe_combo-' + localIdx).removeClass('d-none');
              } else {
                $('#edit_pppoe_combo-' + localIdx).addClass('d-none');
              }
            });

            // Apply mask on reference input
            if (device.external_reference &&
                device.external_reference.kind === 'CPF') {
              $('#edit_external_reference-' + index)
              .mask('000.000.000-009').keyup();
            } else if (device.external_reference &&
                       device.external_reference.kind === 'CNPJ') {
              $('#edit_external_reference-' + index)
              .mask('00.000.000/0000-00').keyup();
            }

            index += 1;
          }
          // Fill table pagination
          deviceTablePagination.append(
            $('<ul>').addClass('pagination pagination-lg').append(() => {
              let opts = $('<div>');
              let delta = 2;
              let currPage = res.page;
              for (let idx = 1; idx <= res.pages; idx += 1) {
                if (idx == 1 || idx == res.pages ||
                    ((idx >= currPage - delta) && (idx <= currPage + delta))
                ) {
                  if (idx == currPage) {
                    opts.append(
                      $('<li>').addClass('page-item active').append(
                        $('<a>')
                        .addClass('page-link primary-color')
                        .attr('id', 'curr-page-link')
                        .html(idx)
                      )
                    );
                  } else {
                    if (idx == res.pages &&
                        (currPage + delta <= res.pages - delta)
                    ) {
                      opts.append(
                        $('<li>').addClass('page-item').append(
                          $('<h3>').addClass('page-link disabled').html('...')
                        )
                      );
                    }
                    opts.append(
                      $('<li>').addClass('page-item').append(
                        $('<a>').addClass('page-link change-page-link')
                        .html(idx)
                      )
                    );
                    if (idx == 1 && (currPage - delta > delta)) {
                      opts.append(
                        $('<li>').addClass('page-item').append(
                          $('<h3>').addClass('page-link disabled').html('...')
                        )
                      );
                    }
                  }
                }
              }
              return opts.html();
            })
          );
          // Apply IP mask on LAN subnet field
          deviceTableContent.find('.ip-mask-field').mask('099.099.099.099');
          // Fetch existing notifications
          $.ajax({
            url: '/notification/fetch',
            type: 'POST',
            traditional: true,
            data: {
              devices: res.devices.map((device) => device._id),
            },
            success: function(res) {
              for (let idx = 0; idx < res.notifications.length; idx += 1) {
                let notification = res.notifications[idx];
                changeDeviceStatusOnTable(deviceTableContent,
                                          notification.target, notification);
              }
              // Enable device status notification reception
              $.ajax({
                url: '/notification/register/devicestatus',
                type: 'POST',
                dataType: 'json',
                error: function(xhr, status, error) {
                  displayAlertMsg(JSON.parse(xhr.responseText));
                },
              });
            },
            error: function(xhr, status, error) {
              displayAlertMsg(JSON.parse(xhr.responseText));
            },
            complete: function() {
              // Attach elements back to DOM after manipulation
              $('#devices-table').append(deviceTableContent);
            },
          });
          // Important: include and initialize socket.io first using socket var
          // Actions when a status change is received
          socket.on('DEVICESTATUS', function(macaddr, data) {
            changeDeviceStatusOnTable(deviceTableContent, macaddr, data);
          });
        } else {
          displayAlertMsg(res);
        }
      },
    });
  };
  // Initial table
  loadDevicesTable();

  $(document).on('submit', '#devices-search-form', function(event) {
    let filterList = $('#devices-search-form .tags-input').val();
    loadDevicesTable(1, filterList);
    return false;
  });

  $(document).on('click', '.change-page-link', function(event) {
    let pageNum = parseInt($(event.target).html());
    let filterList = $('#devices-search-form .tags-input').val();
    loadDevicesTable(pageNum, filterList);
  });

  $(document).on('click', '.btn-trash', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    $.ajax({
      url: '/devicelist/delete/' + id,
      type: 'post',
      success: function(res) {
        let pageNum = parseInt($('#curr-page-link').html());
        let filterList = $('#devices-search-form .tags-input').val();
        loadDevicesTable(pageNum, filterList);
      },
    });
  });
});
