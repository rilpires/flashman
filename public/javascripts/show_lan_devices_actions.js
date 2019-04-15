
$(document).ready(function() {
  $('.btn-lan-devices-modal').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');

    $.ajax({
      type: 'GET',
      url: '/devicelist/landevices/' + id,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#lan-devices-hlabel').text(id);
          let lanDevsRow = $('<div></div>').addClass('row');
          $.each(res.lan_devices, function(idx, device) {
            lanDevsRow.append(
              $('<div></div>')
              .addClass('col m-1 grey lighten-4').append(
                $('<div></div>').addClass('row pt-2').append(
                  $('<div></div>').addClass('col').append(
                    (device.conn_type == 0) ?
                      $('<i></i>').addClass('fas fa-ethernet fa-lg') :
                      $('<i></i>').addClass('fas fa-wifi fa-lg'),
                    (device.conn_type == 0) ?
                      $('<span></span>').html('&nbsp Cabo') :
                      $('<span></span>').html('&nbsp Wi-Fi')
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
                  $('<div></div>').addClass('col').append(
                    $('<h6></h6>').text('Velocidade Máx. ' +
                                        (device.conn_speed / 1000000) + ' Mbps')
                  )
                ),
                $('<div></div>').addClass('row pt-3 mb-2').append(
                  $('<div></div>').addClass('col').append(
                    $('<h6></h6>').text(device.name),
                    $('<h6></h6>').text(device.dhcp_name),
                    $('<h6></h6>').text(device.mac)
                  ),
                  (device.conn_type == 1 && device.wifi_rssi) ?
                  $('<div></div>').addClass('col').append(
                    $('<h6></h6>').text('Conectado em ' + device.wifi_freq + ' GHz'),
                    $('<h6></h6>').text('Conectado em modo ' + device.wifi_mode),
                    $('<h6></h6>').text('RSSI: ' + device.wifi_rssi + ' dBm'),
                    $('<h6></h6>').text('SNR: ' + device.wifi_snr + ' dBm')
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
          $('#lan-devices-body').append(
            lanDevsRow
          );
          $('#lan-devices').modal('show');
        } else {
          displayAlertMsg(res);
        }
      },
      error: function(xhr, status, error) {
        displayAlertMsg(JSON.parse(xhr.responseText));
      },
    });
  });
});
