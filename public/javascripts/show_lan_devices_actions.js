
$(document).ready(function() {
  const refreshLanDevices = function(deviceId) {
    $('#lan-devices-hlabel').text(deviceId);
    $('#lan-devices').modal();
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
          fetchLanDevices(deviceId);
          $('.btn-sync-lan-devs').prop('disabled', true);
        }
      },
      error: function(xhr, status, error) {
        $('#lan-devices-body').empty(); // Clear old data
        $('#lan-devices-placeholder').show();
        fetchLanDevices(deviceId);
        $('.btn-sync-lan-devs').prop('disabled', true);
      },
    });
  };

  const fetchLanDevices = function(deviceId) {
    $.ajax({
      type: 'GET',
      url: '/devicelist/landevices/' + deviceId,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#lan-devices-placeholder').hide();
          let lanDevsRow = $('#lan-devices-body');
          $.each(res.lan_devices, function(idx, device) {
            const lastSeen = ((device.last_seen) ?
                              Date.parse(device.last_seen) : Date.now());
            const justNow = Date.now();
            const devTimeDiff = Math.abs(justNow - lastSeen);
            const devTimeDiffHours = Math.floor(devTimeDiff / 3.6e6);
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
                  $('<div></div>').addClass('col text-right').append(
                    (device.is_blocked) ?
                      $('<i></i>').addClass('fas fa-lock fa-lg') :
                      $('<i></i>').addClass('fas fa-lock-open fa-lg'),
                    (device.is_blocked) ?
                      $('<span></span>').html('&nbsp Acesso bloqueado') :
                      $('<span></span>').html('&nbsp Acesso liberado')
                  )
                ),
                $('<div></div>').addClass('row pt-3').append(
                  $('<div></div>').addClass('col-4').append(
                    (devTimeDiffHours <= 1 ?
                      $('<i></i>').addClass('fas fa-circle green-text') :
                      $('<i></i>').addClass('fas fa-circle red-text')),
                    (devTimeDiffHours <= 1 ?
                      $('<span></span>').html('&nbsp Online') :
                      $('<span></span>').html('&nbsp Offline'))
                  ),
                  (device.conn_speed ?
                    $('<div></div>').addClass('col-8 text-right').append(
                      $('<h6></h6>').text('Velocidade Máx. ' +
                                          device.conn_speed + ' Mbps')
                    ) : ''
                  )
                ),
                $('<div></div>').addClass('row pt-3 mb-2').append(
                  $('<div></div>').addClass('col').append(
                    $('<h6></h6>').text(device.name),
                    $('<h6></h6>').text(device.dhcp_name),
                    $('<h6></h6>').text(device.mac)
                  ),
                  (device.conn_type == 1 && device.wifi_signal) ?
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
            // Line break every 2 columns
            if (idx % 2 == 1) {
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

  $('.btn-lan-devices-modal').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    refreshLanDevices(id); // Refresh devices status
  });

  $(document).on('click', '.btn-sync-lan-devs', function(event) {
    let id = $('#lan-devices-hlabel').text();
    refreshLanDevices(id);
  });

  // Important: include and initialize socket.io first using socket var
  socket.on('ONLINEDEVS', function(macaddr, data) {
    if (($('#lan-devices').data('bs.modal') || {})._isShown) {
      let id = $('#lan-devices-hlabel').text();
      if (id == macaddr) {
        $('.btn-sync-lan-devs > i').removeClass('animated rotateOut infinite');
        // Clear old data
        $('#lan-devices-body').empty();
        $('#lan-devices-placeholder').show();
        fetchLanDevices(id);
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
