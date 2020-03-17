
$(document).ready(function() {
  const refreshLanDevices = function(deviceId, upnpSupport) {
    $('#lan-devices-hlabel').text(deviceId);
    $('#lan-devices').modal();
    $('#lan-devices').attr('data-validate-upnp', upnpSupport);
    $.ajax({
      url: '/devicelist/command/' + deviceId + '/onlinedevs',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('.btn-sync-lan-devs > i').addClass('animated rotateOut infinite');
        } else {
          $('#lan-devices-body').empty(); // Clear old data
          $('#lan-devices-placeholder').show();
          fetchLanDevices(deviceId, upnpSupport);
          $('.btn-sync-lan-devs').prop('disabled', true);
        }
      },
      error: function(xhr, status, error) {
        $('#lan-devices-body').empty(); // Clear old data
        $('#lan-devices-placeholder').show();
        fetchLanDevices(deviceId, upnpSupport);
        $('.btn-sync-lan-devs').prop('disabled', true);
      },
    });
  };

  const setUpnp = function(deviceId, lanDeviceId, upnpPermission, btnStatus) {
    $('.btn-upnp').prop('disabled', true);

    if (upnpPermission == 'accept') {
      upnpPermission = 'reject';
    } else {
      upnpPermission = 'accept';
    }

    $.ajax({
      url: '/devicelist/command/' + deviceId + '/updateupnp',
      type: 'post',
      dataType: 'json',
      traditional: true,
      data: {lanid: lanDeviceId, permission: upnpPermission},
      success: function(res) {
        if (res.success) {
          btnStatus.removeClass('indigo-text red-text')
                   .addClass(upnpPermission == 'accept' ?
                             'indigo-text' : 'red-text')
                   .html(upnpPermission == 'accept' ?
                         'Liberado' : 'Bloqueado');
          btnStatus.parent().data('permission', upnpPermission);
          setTimeout(function() {
            $('.btn-upnp').prop('disabled', false);
          }, 1000);
        } else {
          $('.btn-upnp').prop('disabled', false);
        }
      },
      error: function(xhr, status, error) {
        $('.btn-upnp').prop('disabled', false);
      },
    });
  };

  const setLanDevBlock = function(deviceId, lanDeviceId, isBlocked, btnStatus) {
    $('.btn-lan-dev-block').prop('disabled', true);

    isBlocked = !isBlocked;

    $.ajax({
      url: '/devicelist/landevice/block',
      type: 'post',
      dataType: 'json',
      traditional: true,
      data: {id: deviceId, lanid: lanDeviceId, isblocked: isBlocked},
      success: function(res) {
        if (res.success) {
          btnStatus.removeClass('indigo-text red-text')
                   .addClass(isBlocked ? 'red-text' : 'indigo-text')
                   .html(isBlocked ? 'bloqueada' : 'liberada');
          btnStatus.parent().data('blocked', isBlocked);
          setTimeout(function() {
            $('.btn-lan-dev-block').prop('disabled', false);
          }, 3000);
        } else {
          $('.btn-lan-dev-block').prop('disabled', false);
        }
      },
      error: function(xhr, status, error) {
        $('.btn-lan-dev-block').prop('disabled', false);
      },
    });
  };

  const fetchLanDevices = function(deviceId, upnpSupport) {
    let isSuperuser = false;
    let grantLanDevices = 0;
    let grantLanDevicesBlock = false;

    if ($('#devices-table-content').data('superuser')) {
      isSuperuser = $('#devices-table-content').data('superuser');
    }
    if ($('#devices-table-content').data('role')) {
      let role = $('#devices-table-content').data('role');
      grantLanDevices = role.grantLanDevices;
    }
    if ($('#devices-table-content').data('role')) {
      let role = $('#devices-table-content').data('role');
      grantLanDevicesBlock = role.grantLanDevicesBlock;
    }
    $.ajax({
      type: 'GET',
      url: '/devicelist/landevices/' + deviceId,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#lan-devices-placeholder').hide();
          let lanDevsRow = $('#lan-devices-body');
          let countAddedDevs = 0;
          $.each(res.lan_devices, function(idx, device) {
            // Skip if offline for too long
            if (device.is_old) {
              return true;
            }
            lanDevsRow.append(
              $('<div></div>')
              .addClass('col-lg m-1 grey lighten-4').append(
                $('<div></div>').addClass('row pt-2').append(
                  ((device.conn_type != undefined) ?
                    $('<div></div>').addClass('col').append(
                      (device.conn_type == 0) ?
                        $('<i></i>').addClass('fas fa-ethernet fa-lg') :
                        $('<i></i>').addClass('fas fa-wifi fa-lg'),
                      (device.conn_type == 0) ?
                        $('<span></span>').html('&nbsp Cabo') :
                        $('<span></span>').html('&nbsp Wi-Fi')
                    ) :
                    $('<div></div>').addClass('col')
                  ),
                  $('<button>').addClass('btn btn-primary btn-sm my-0 col')
                               .addClass('btn-lan-dev-block')
                               .attr('data-mac', device.mac)
                               .attr('data-blocked', device.is_blocked)
                               .attr('type', 'button')
                               .prop('disabled',
                                     !(isSuperuser || grantLanDevicesBlock))
                  .append(
                    (device.is_blocked) ?
                      $('<i>').addClass('fas fa-lock fa-lg') :
                      $('<i>').addClass('fas fa-lock-open fa-lg'),
                    $('<span>').html('&nbsp Internet &nbsp'),
                    (device.is_blocked) ?
                      $('<span>')
                        .addClass('dev-block-status-text red-text')
                        .html('bloqueada') :
                      $('<span>')
                        .addClass('dev-block-status-text indigo-text')
                        .html('liberada')
                  )
                ),
                $('<div></div>').addClass('row pt-3').append(
                  $('<div></div>').addClass('col-4').append(
                    (device.is_online ?
                      $('<i></i>').addClass('fas fa-circle green-text') :
                      $('<i></i>').addClass('fas fa-circle red-text')),
                    (device.is_online ?
                      $('<span></span>').html('&nbsp Online') :
                      $('<span></span>').html('&nbsp Offline'))
                  ),
                  (device.conn_speed && device.is_online ?
                    $('<div></div>').addClass('col-8 text-right').append(
                      $('<h6></h6>').text('Velocidade Máx. ' +
                                          device.conn_speed + ' Mbps')
                    ) : ''
                  )
                ),
                $('<div>').addClass('row pt-2').append(
                  $('<div>').addClass('col').append(
                    $('<button>').addClass('btn btn-primary btn-sm mx-0')
                                 .attr('type', 'button')
                                 .attr('data-toggle', 'collapse')
                                 .attr('data-target', '#ipv4-collapse-' + idx)
                                 .prop('disabled', !device.ip)
                    .append(
                      $('<i>').addClass('fas fa-search'),
                      $('<span>').html('&nbsp IPv4')
                    ),
                    $('<button>').addClass('btn btn-primary btn-sm')
                                 .attr('type', 'button')
                                 .attr('data-toggle', 'collapse')
                                 .attr('data-target', '#ipv6-collapse-' + idx)
                                 .prop('disabled', device.ipv6.length == 0)
                    .append(
                      $('<i>').addClass('fas fa-search'),
                      $('<span>').html('&nbsp IPv6')
                    ),
                    ((isSuperuser || grantLanDevices > 1) && upnpSupport ?
                      $('<button>').addClass('btn btn-primary btn-sm ' +
                                             'ml-0 btn-upnp')
                                   .attr('type', 'button')
                                   .attr('data-mac', device.mac)
                                   .attr('data-permission',
                                         device.upnp_permission)
                                   .prop('disabled', false)
                      .append(
                        $('<span>').html('UPnP &nbsp'),
                        $('<span>')
                          .addClass('upnp-status-text')
                          .addClass(device.upnp_permission == 'accept' ?
                                    'indigo-text' : 'red-text')
                          .html(device.upnp_permission == 'accept' ?
                                'Liberado' : 'Bloqueado')
                      ) :
                      ''
                    ),
                    // IPv4 section
                    $('<div>').addClass('collapse')
                              .attr('id', 'ipv4-collapse-' + idx)
                    .append(
                      $('<div>').addClass('mt-2').append(
                        $('<h6>').text(device.ip)
                      )
                    ),
                    // IPv6 section
                    $('<div>').addClass('collapse')
                              .attr('id', 'ipv6-collapse-' + idx)
                    .append(
                      $('<div>').addClass('mt-2').append(() => {
                        let opts = $('<div>');
                        device.ipv6.forEach((ipv6) => {
                          opts.append($('<h6>').text(ipv6));
                        });
                        return opts.html();
                      })
                    )
                  )
                ),
                $('<div></div>').addClass('row pt-3 mb-2').append(
                  $('<div></div>').addClass('col').append(
                    $('<h6></h6>').text(device.name),
                    $('<h6></h6>').text(device.dhcp_name),
                    $('<h6></h6>').text(device.mac)
                  ),
                  (device.conn_type == 1 && device.wifi_signal &&
                   device.is_online) ?
                  $('<div></div>').addClass('col').append(
                    $('<h6></h6>').text(device.wifi_freq + ' GHz'),
                    $('<h6></h6>').text('Modo: ' + device.wifi_mode),
                    $('<h6></h6>').text('Sinal: ' + device.wifi_signal +' dBm'),
                    $('<h6></h6>').text('SNR: ' + device.wifi_snr + ' dB')
                    .append(
                      $('<span></span>').html('&nbsp'),
                      ((device.wifi_snr >= 25) ?
                       $('<i></i>').addClass('fas fa-circle green-text') :
                       (device.wifi_snr >= 15) ?
                       $('<i></i>').addClass('fas fa-circle yellow-text') :
                       $('<i></i>').addClass('fas fa-circle red-text')
                      )
                    )
                  ) :
                  ''
                )
              )
            );
            countAddedDevs += 1;
            // Line break every 2 columns
            if (countAddedDevs % 2 == 0) {
              lanDevsRow.append($('<div></div>').addClass('w-100'));
            }
          });
        } else {
          displayAlertMsg(res);
        }
      },
      error: function(xhr, status, error) {
        displayAlertMsg(JSON.parse(xhr.responseText));
      },
    });
  };

  $(document).on('click', '.btn-lan-devices-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let upnpSupport = row.data('validate-upnp');
    refreshLanDevices(id, upnpSupport); // Refresh devices status
  });

  $(document).on('click', '.btn-sync-lan-devs', function(event) {
    let id = $('#lan-devices-hlabel').text();
    let upnpSupport = $('#lan-devices').data('validate-upnp');
    refreshLanDevices(id, upnpSupport);
  });

  $(document).on('click', '.btn-upnp', function(event) {
    let id = $('#lan-devices-hlabel').text();
    let currBtnStatus = $(this).children('.upnp-status-text');
    let devId = $(this).data('mac');
    let upnpPermission = $(this).data('permission');
    setUpnp(id, devId, upnpPermission, currBtnStatus);
  });

  $(document).on('click', '.btn-lan-dev-block', function(event) {
    let id = $('#lan-devices-hlabel').text();
    let currBtnStatus = $(this).children('.dev-block-status-text');
    let devId = $(this).data('mac');
    let isDevBlocked = $(this).data('blocked');
    setLanDevBlock(id, devId, isDevBlocked, currBtnStatus);
  });

  // Important: include and initialize socket.io first using socket var
  socket.on('ONLINEDEVS', function(macaddr, data) {
    if (($('#lan-devices').data('bs.modal') || {})._isShown) {
      let id = $('#lan-devices-hlabel').text();
      let upnpSupport = $('#lan-devices').data('validate-upnp');
      if (id == macaddr) {
        $('.btn-sync-lan-devs > i').removeClass('animated rotateOut infinite');
        // Clear old data
        $('#lan-devices-body').empty();
        $('#lan-devices-placeholder').show();
        fetchLanDevices(id, upnpSupport);
      }
    }
  });

  // Restore default modal state
  $('#lan-devices').on('hidden.bs.modal', function() {
    $('#lan-devices-body').empty();
    $('#lan-devices-placeholder').show();
    $('.btn-sync-lan-devs > i').removeClass('animated rotateOut infinite');
    $('.btn-sync-lan-devs').prop('disabled', false);
  });
});
