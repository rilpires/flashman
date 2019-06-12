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
//   $('#edit_ext_ref_type_selected-' + index.toString())
//     .closest('.input-group-btn').find('#ext_ref_type a:contains("' +
//       row.data('external-ref-type') + '")').click();
//   $('#edit_external_reference-' + index.toString())
//     .val(row.data('external-ref')).change();

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

//   // Device info
//   $('#info_device_model-' + index.toString()).val(
//     row.data('device-model').toUpperCase()
//   ).change();
//   $('#info_device_version-' + index.toString()).val(
//     row.data('device-version')
//   ).change();
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
  let ignoreFieldsList = ['passShow'];

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
  selectedItem.removeClass('active teal lighten-2');
  $(event.target).addClass('active teal lighten-2');

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

  // $('.fa-chevron-down').parents('td').click(function(event) {
  //   let row = $(event.target).parents('tr');
  //   let index = row.data('index');
  //   let formId = '#form-' + index.toString();
  //   if ($(this).children().hasClass('fa-chevron-down')) {
  //     loadDeviceInfoOnForm(row);
  //     $(formId).show('fast');
  //     $(this).find('.fa-chevron-down')
  //       .removeClass('fa-chevron-down')
  //       .addClass('fa-chevron-up text-primary');
  //   } else if ($(this).children().hasClass('fa-chevron-up')) {
  //     $(formId).hide('fast');
  //     $(this).find('.fa-chevron-up')
  //       .removeClass('fa-chevron-up text-primary')
  //       .addClass('fa-chevron-down');
  //   }
  // });

  let role = $('#devices-table-content').data('role');
  let grantFirmwareUpgrade = false;
  let grantNotificationPopups = false;
  if ($('#devices-table-content').data('role')) {
    grantFirmwareUpgrade = role.grantFirmwareUpgrade;
    grantNotificationPopups = role.grantNotificationPopups;
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
            $('<td>'),
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
            (
              $('#devices-table-content').data('superuser') ||
              grantFirmwareUpgrade ?
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
                      .data('toggle', 'dropdown')
                      .data('singlereleases', res.single_releases)
                    .append(
                      $('<span>').addClass('selected').html('Escolher')
                    ),
                    $('<div>').addClass('dropdown-menu').append(
                      res.single_releases.forEach((release) => {
                        $('<a>').addClass('dropdown-item text-center')
                                .html(release.id);
                      })
                    )
                  )
                )
              ) :
              ''
            )
          )
        );
        // Fill remaining rows with devices
        res.devices.forEach((device) => {
          $('#devices-table-content').append(
            $('<tr>').addClass('csv-export').attr('id', device._id)
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
              $('<td>'),
              $('<td>').append(
                $('<div>').addClass('fas fa-circle fa-lg device-status')
                          .addClass(device.status_color)
                          .attr('data-toggle', 'tooltip')
                          .attr('title', device.last_contact.toString()),
                $('<span>').html('&nbsp'),
                $('<span>').html('&nbsp'),
                (
                  $('#devices-table-content').data('superuser') ||
                  grantNotificationPopups ?
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
              (
                $('#devices-table-content').data('superuser') ||
                grantFirmwareUpgrade ?
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
                                      $('<div>').addClass('selected')
                                                .html(device.do_update ?
                                                      device.release :
                                                      'Escolher')
                                    ),
                      $('<div>').addClass('dropdown-menu refresh-selected')
                      .append(
                        device.releases.forEach((release) => {
                          $('<a>').addClass('dropdown-item text-center')
                                  .html(release.id);
                        })
                      ),
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
            )
          );
        });
      } else {
        displayAlertMsg(res);
      }
    },
  });
  
  //   tr(
  //     id="form-" + (index + 1),
  //     data-index=(index + 1),
  //     data-deviceid=device._id,
  //     data-validate-wifi=(
  //       (superuser || role.grantWifiInfo >= 1) ? "true" : "false"),
  //     data-validate-pppoe=(
  //       (superuser || role.grantPPPoEInfo >= 1) ? "true" : "false"),
  //     data-validate-wifi-band=(
  //       (devicesPermissions[index].grantWifiBand &&
  //       (superuser || role.grantWifiInfo >= 1)) ? "true" : "false"),
  //     data-validate-wifi-5ghz=(
  //       (devicesPermissions[index].grantWifi5ghz &&
  //       (superuser || role.grantWifiInfo >= 1)) ? "true" : "false"),
  //     data-validate-lan=(
  //       devicesPermissions[index].grantLanEdit ? "true" : "false"),
  //     data-validate-port-forward-asym=(
  //       devicesPermissions[index].grantPortForwardAsym ? "true" : "false"),
  //     data-validate-port-open-ipv6=(
  //       devicesPermissions[index].grantPortOpenIpv6 ? "true" : "false"),
  //     data-minlength-pass-pppoe=minlengthpasspppoe,
  //     style="display: none;"
  //   )
  //     td(colspan=9).grey.lighten-5
  //       include includes/editdeviceform

  $('#ext_ref_type a').on('click', refreshExtRefType);
  $('.ext-ref-input').mask('000.000.000-009').keyup();

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

  $('.tab-switch-btn').click(function(event) {
    let tabId = $(this).data('tab-id');
    $(tabId).siblings().addClass('d-none');
    $(tabId).removeClass('d-none');
  });
});
