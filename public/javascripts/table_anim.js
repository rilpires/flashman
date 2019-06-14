// let loadDeviceInfoOnForm = function(row) {
//   let index = row.data('index');
//   $('#edit_pppoe_user-' + index.toString()).val(row.data('user')).change();
//   $('#edit_pppoe_pass-' + index.toString()).val(row.data('pass')).change();
//   $('#edit_lan_subnet-' + index.toString()).val(row.data('lan-subnet')).change();
//   $('#edit_lan_netmask-' + index.toString()).val(row.data('lan-netmask')).change();
//   $('#edit_wifi_ssid-' + index.toString()).val(row.data('ssid')).change();
//   $('#edit_wifi_pass-' + index.toString()).val(row.data('wifi-pass')).change();
//   $('#edit_wifi_channel-' + index.toString()).val(row.data('channel')).change();
//   $('#edit_wifi_band-' + index.toString()).val(row.data('band')).change();
//   $('#edit_wifi_mode-' + index.toString()).val(row.data('mode')).change();
//   $('#edit_wifi5_ssid-' + index.toString()).val(row.data('ssid-5ghz')).change();
//   $('#edit_wifi5_pass-' + index.toString()).val(row.data('wifi-pass-5ghz')).change();
//   $('#edit_wifi5_channel-' + index.toString()).val(row.data('channel-5ghz')).change();
//   $('#edit_wifi5_band-' + index.toString()).val(row.data('band-5ghz')).change();
//   $('#edit_wifi5_mode-' + index.toString()).val(row.data('mode-5ghz')).change();

//   let connectionType = row.data('connection-type').toUpperCase();
//   if (connectionType === 'DHCP') {
//     $('#edit_connect_type-' + index.toString()).val('DHCP');
//     $('#edit_pppoe_user-' + index.toString()).parent().hide();
//     $('#edit_pppoe_pass-' + index.toString()).closest('.input-entry').hide();
//   } else {
//     $('#edit_connect_type-' + index.toString()).val('PPPoE');
//     $('#edit_pppoe_user-' + index.toString()).parent().show();
//     $('#edit_pppoe_pass-' + index.toString()).closest('.input-entry').show();
//   }

//   $('#edit_connect_type-' + index.toString()).change(function() {
//     $('#edit_connect_type_warning-' + index.toString()).show();
//     if ($('#edit_connect_type-' + index.toString()).val() === 'PPPoE') {
//       $('#edit_pppoe_user-' + index.toString()).parent().show();
//       $('#edit_pppoe_pass-' + index.toString()).closest('.input-entry').show();
//     } else {
//       $('#edit_pppoe_user-' + index.toString()).parent().hide();
//       $('#edit_pppoe_pass-' + index.toString()).closest('.input-entry').hide();
//     }
//   });

//   $('#edit_connect_speed-' + index.toString()).val(
//     row.data('wan-speed')
//   ).change();
//   $('#edit_connect_duplex-' + index.toString()).val(
//     row.data('wan-duplex')
//   ).change();
// };

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
  let selectedSpan = $(event.target).closest('.input-group-btn').find('span.selected');
  let selectedItem = $(event.target).closest('#ext_ref_type').find('.active');
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

$(document).ready(function() {
  // Enable tags on search input
  [].forEach.call(document.querySelectorAll('input[type="tags"]'), tagsInput);
  // The code below related to tags is because the tags-input plugin resets
  // all classes after loading
  $('.tags-input').addClass('form-control');
  $('.tags-input input').css('cssText', 'margin-top: 10px !important;');

  $('#card-header').click(function() {
    let plus = $(this).find('.fa-plus');
    let cross = $(this).find('.fa-times');
    plus.removeClass('fa-plus').addClass('fa-times');
    cross.removeClass('fa-times').addClass('fa-plus');
  });

  $(document).on('click', '.fa-chevron-down', function(event) {
    let row = $(event.target).parents('tr');
    let index = row.data('index');
    let formId = '#form-' + index.toString();
    // loadDeviceInfoOnForm(row);
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
  }

  $.ajax({
    url: '/api/v2/search',
    type: 'PUT',
    data: {filter_list: ''},
    success: function(res) {
      if (res.type == 'success') {
        // Fill status row
        $('#devices-table-content').append(
          $('<tr>').append(
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
                  $('<button>').addClass('btn btn-sm btn-danger px-2')
                    .attr('id', 'cancel-all-devices')
                  .append(
                    $('<div>').addClass('fas fa-times')
                  ),
                  $('<div>').addClass('btn-group').attr('id', 'all-devices')
                  .append(
                    $('<button>')
                      .addClass('btn btn-sm btn-primary dropdown-toggle')
                      .attr('type', 'button')
                      .attr('data-toggle', 'dropdown')
                      .data('singlereleases', res.single_releases)
                    .append(
                      $('<span>').addClass('selected').html('Escolher')
                    ),
                    $('<div>').addClass('dropdown-menu').append(() => {
                      let opts = $('<div>');
                      res.single_releases.forEach((release) => {
                        opts.append(
                          $('<a>').addClass('dropdown-item text-center')
                                  .html(release.id)
                        );
                      });
                      return opts.html();
                    })
                  )
                )
              ) :
              ''
            )
          )
        );
        // Fill remaining rows with devices
        let index = 0;
        res.devices.forEach((device) => {
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

          $('#devices-table-content').append(
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
              $('<td>').addClass('text-center').html(device.pppoe_user),
              $('<td>').addClass('text-center').html(device._id),
              $('<td>').addClass('text-center').html(device.wan_ip),
              $('<td>').addClass('text-center').html(device.ip),
              $('<td>').addClass('text-center').html(device.installed_release),
              (isSuperuser || grantFirmwareUpgrade ?
                $('<td>').append(
                  $('<div>').addClass('btn-group').append(
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
                        device.releases.forEach((release) => {
                          opts.append(
                            $('<a>').addClass('dropdown-item text-center')
                                    .html(release.id)
                          );
                        });
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
                     .attr('data-minlength-pass-pppoe', res.min_length_pass_pppoe)

            .append(
              $('<td>').attr('colspan', '8').addClass('grey lighten-5')
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
                                $('<div>').addClass('dropdown-menu')
                                          .attr('id', 'ext_ref_type')
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
                              $('<input>').addClass('form-control py-0 added-margin ext-ref-input')
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
                              $('<label>').html('Modelo'),
                              $('<input>').addClass('form-control')
                                          .attr('type', 'text')
                                          .attr('maxlength', '32')
                                          .attr('disabled', true)
                              .val(device.model),
                              $('<div>').addClass('invalid-feedback')
                            ),
                            $('<div>').addClass('md-form input-entry')
                            .append(
                              $('<label>').html('Versão do Flashbox'),
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
                      ),
                      // LAN
                      $('<div>').addClass('edit-tab d-none').attr('id', 'tab_lan-' + index)
                      .append(
                      ),
                      // Wi-Fi 2.4Ghz
                      $('<div>').addClass('edit-tab d-none').attr('id', 'tab_wifi-' + index)
                      .append(
                      ),
                      // Wi-Fi 5Ghz
                      $('<div>').addClass('edit-tab d-none').attr('id', 'tab_wifi5-' + index)
                      .append(
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
          index += 1;
        });
        $('.ext-ref-input').mask('000.000.000-009').keyup();
        $('.form-control').change();
      } else {
        displayAlertMsg(res);
      }
    },
  });

  //       //- WAN
  //       .edit-tab.d-none(id="tab_wan-" + (index + 1))
  //         .row
  //           .col-4
  //             .md-form
  //               .input-group.has-warning
  //                 .md-selectfield.form-control.my-0
  //                   label(for="edit_connect_type-" + (index + 1)) Tipo de Conexão
  //                   select.browser-default.md-select(
  //                     id="edit_connect_type-" + (index + 1),
  //                     disabled=((superuser || role.grantWanType) ? false : true)
  //                   )
  //                     option(value="DHCP") DHCP
  //                     option(value="PPPoE") PPPoE
  //                 h7.orange-text(id="edit_connect_type_warning-" + (index + 1),
  //                                style="display: none;")
  //                   | Cuidado! Isso pode deixar o roteador inacessível
  //                   | dependendo das configurações de rede do seu provedor
  //           .col-4
  //             .md-form.input-entry
  //               label(for="edit_connect_speed-" + (index + 1)) Velocidade Negociada (Mbps)
  //               input.form-control(type="text",
  //                                  id="edit_connect_speed-" + (index + 1),
  //                                  maxlength="32", disabled)
  //               .invalid-feedback
  //             .md-form.input-entry
  //               label(for="edit_connect_duplex-" + (index + 1)) Modo de Transmissão (Duplex)
  //               input.form-control(type="text",
  //                                  id="edit_connect_duplex-" + (index + 1),
  //                                  maxlength="32", disabled)
  //               .invalid-feedback
  //           if (superuser || role.grantPPPoEInfo >= 1)
  //             .col-4
  //               .md-form.input-entry
  //                 label(for="edit_pppoe_user-" + (index + 1)) Usuário PPPoE
  //                 input.form-control(
  //                   type="text",
  //                   id="edit_pppoe_user-" + (index + 1),
  //                   maxlength="64",
  //                   disabled=((superuser || role.grantPPPoEInfo > 1) ? false : true)
  //                 )
  //                 .invalid-feedback
  //               .md-form.input-entry
  //                 .input-group
  //                   label(for="edit_pppoe_pass-" + (index + 1)) Senha PPPoE
  //                   input.form-control.my-0(
  //                     type="password",
  //                     id="edit_pppoe_pass-" + (index + 1),
  //                     maxlength="64",
  //                     disabled=((superuser || role.grantPPPoEInfo > 1) ? false : true)
  //                   )
  //                   if (superuser || role.grantPassShow)
  //                     .input-group-append
  //                       .input-group-text.teal.lighten-2
  //                         a.toggle-pass
  //                           .fas.fa-eye-slash.white-text
  //                   .invalid-feedback
  //       //- LAN
  //       .edit-tab.d-none(id="tab_lan-" + (index + 1))
  //         .row
  //           .col-6
  //             .md-form.input-entry
  //               label(for="edit_lan_subnet-" + (index + 1)) IP da Rede
  //               input.form-control.ip-mask-field(
  //                 type="text",
  //                 id="edit_lan_subnet-" + (index + 1),
  //                 maxlength="15",
  //                 disabled=((superuser || role.grantLanEdit) ? false : true)
  //               )
  //               .invalid-feedback
  //           .col-6
  //             .md-form
  //               .input-group
  //                 .md-selectfield.form-control.my-0
  //                   label(for="edit_lan_netmask-" + (index + 1)) Máscara
  //                   select.browser-default.md-select(
  //                     id="edit_lan_netmask-" + (index + 1),
  //                     disabled=((superuser || role.grantLanEdit) ? false : true)
  //                   )
  //                     option(value="24") 24
  //                     option(value="25") 25
  //                     option(value="26") 26
  //       //- Wi-Fi 2.4GHz
  //       if (superuser || role.grantWifiInfo >= 1)
  //         .edit-tab.d-none(id="tab_wifi-" + (index + 1))
  //           .row
  //             .col-6
  //               .md-form
  //                 .input-group
  //                   .md-selectfield.form-control.my-0
  //                     label(for="edit_wifi_channel-" + (index + 1)) Canal do WiFi
  //                     select.browser-default.md-select(
  //                       id="edit_wifi_channel-" + (index + 1),
  //                       disabled=((superuser || role.grantWifiInfo > 1) ? false : true)
  //                     )
  //                       option(value="auto") auto
  //                       option(value="1") 1
  //                       option(value="2") 2
  //                       option(value="3") 3
  //                       option(value="4") 4
  //                       option(value="5") 5
  //                       option(value="6") 6
  //                       option(value="7") 7
  //                       option(value="8") 8
  //                       option(value="9") 9
  //                       option(value="10") 10
  //                       option(value="11") 11
  //               .md-form.input-entry
  //                 label(for="edit_wifi_ssid-" + (index + 1)) SSID do WiFi
  //                 input.form-control(
  //                   type="text",
  //                   id="edit_wifi_ssid-" + (index + 1),
  //                   maxlength="32",
  //                   disabled=((superuser || role.grantWifiInfo > 1) ? false : true)
  //                 )
  //                 .invalid-feedback
  //               .md-form.input-entry
  //                 .input-group
  //                   label(for="edit_wifi_pass-" + (index + 1)) Senha do WiFi
  //                   input.form-control.my-0(
  //                     type="password",
  //                     id="edit_wifi_pass-" + (index + 1),
  //                     maxlength="64",
  //                     disabled=((superuser || role.grantWifiInfo > 1) ? false : true)
  //                   )
  //                   if (superuser || role.grantPassShow)
  //                     .input-group-append
  //                       .input-group-text.teal.lighten-2
  //                         a.toggle-pass
  //                           .fas.fa-eye-slash.white-text
  //                   .invalid-feedback
  //             .col-6
  //               .md-form
  //                 .input-group
  //                   .md-selectfield.form-control.my-0
  //                     label(for="edit_wifi_band-" + (index + 1)) Largura de banda
  //                     select.browser-default.md-select(
  //                       id="edit_wifi_band-" + (index + 1),
  //                       disabled=((devicesPermissions[index].grantWifiBand &&
  //                         (superuser || role.grantWifiInfo > 1)) ? false : true)
  //                     )
  //                       option(value="HT40") 40 MHz
  //                       option(value="HT20") 20 MHz
  //               .md-form
  //                 .input-group
  //                   .md-selectfield.form-control.my-0
  //                     label(for="edit_wifi_mode-" + (index + 1)) Modo de operação
  //                     select.browser-default.md-select(
  //                       id="edit_wifi_mode-" + (index + 1),
  //                       disabled=((devicesPermissions[index].grantWifiBand &&
  //                         (superuser || role.grantWifiInfo > 1)) ? false : true)
  //                     )
  //                       option(value="11n") BGN
  //                       option(value="11g") G
  //       //- Wi-Fi 5GHz
  //       if (devicesPermissions[index].grantWifi5ghz && (superuser || role.grantWifiInfo >= 1))
  //         .edit-tab.d-none(id="tab_wifi5-" + (index + 1))
  //           .row
  //             .col-6
  //               .md-form
  //                 .input-group
  //                   .md-selectfield.form-control.my-0
  //                     label(for="edit_wifi5_channel-" + (index + 1)) Canal do WiFi
  //                     select.browser-default.md-select(
  //                       id="edit_wifi5_channel-" + (index + 1),
  //                       disabled=((superuser || role.grantWifiInfo > 1) ? false : true)
  //                     )
  //                       option(value="auto") auto
  //                       option(value="36") 36
  //                       option(value="40") 40
  //                       option(value="44") 44
  //                       option(value="48") 48
  //                       option(value="52") 52
  //                       option(value="56") 56
  //                       option(value="60") 60
  //                       option(value="64") 64
  //                       option(value="149") 149
  //                       option(value="153") 153
  //                       option(value="157") 157
  //                       option(value="161") 161
  //                       option(value="165") 165
  //               .md-form.input-entry
  //                 label(for="edit_wifi5_ssid-" + (index + 1)) SSID do WiFi
  //                 input.form-control(
  //                   type="text",
  //                   id="edit_wifi5_ssid-" + (index + 1),
  //                   maxlength="32",
  //                   disabled=((superuser || role.grantWifiInfo > 1) ? false : true)
  //                 )
  //                 .invalid-feedback
  //               .md-form.input-entry
  //                 .input-group
  //                   label(for="edit_wifi5_pass-" + (index + 1)) Senha do WiFi
  //                   input.form-control.my-0(
  //                     type="password",
  //                     id="edit_wifi5_pass-" + (index + 1),
  //                     maxlength="64",
  //                     disabled=((superuser || role.grantWifiInfo > 1) ? false : true)
  //                   )
  //                   if (superuser || role.grantPassShow)
  //                     .input-group-append
  //                       .input-group-text.teal.lighten-2
  //                         a.toggle-pass
  //                           .fas.fa-eye-slash.white-text
  //                   .invalid-feedback
  //             .col-6
  //               .md-form
  //                 .input-group
  //                   .md-selectfield.form-control.my-0
  //                     label(for="edit_wifi5_band-" + (index + 1)) Largura de banda
  //                     select.browser-default.md-select(
  //                       id="edit_wifi5_band-" + (index + 1),
  //                       disabled=((superuser || role.grantWifiInfo > 1) ? false : true)
  //                     )
  //                       option(value="VHT80") 80 MHz
  //                       option(value="VHT40") 40 MHz
  //                       option(value="VHT20") 20 MHz
  //               .md-form
  //                 .input-group
  //                   .md-selectfield.form-control.my-0
  //                     label(for="edit_wifi5_mode-" + (index + 1)) Modo de operação
  //                     select.browser-default.md-select(
  //                       id="edit_wifi5_mode-" + (index + 1),
  //                       disabled=((superuser || role.grantWifiInfo > 1) ? false : true)
  //                     )
  //                       option(value="11ac") AC
  //                       option(value="11na") N

  $(document).on('click', '#ext_ref_type a', refreshExtRefType);

  $('#btn-elements-per-page').click(function(event) {
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
});
