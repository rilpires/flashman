
$(document).ready(function() {
  let siteSurveyGlobalTimer;

  const refreshSiteSurvey = function(deviceId, isBridge) {
    $('#site-survey-hlabel').text(deviceId);
    $('#site-survey').modal();
    $('.btn-sync-ssurvey').prop('disabled', true);
    $.ajax({
      url: '/devicelist/command/' + deviceId + '/sitesurvey',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#site-survey').attr('data-cleanup', true);
          // If exists
          $('#site-survey').data('cleanup', true);
          $('.btn-sync-ssurvey > i').addClass('animated rotateOut infinite');
        } else {
          $('#site-survey').removeAttr('data-ap-devices-list');
          $('#site-survey').removeData('ap-devices-list');
          $('#site-survey-body').empty(); // Clear old data
          $('#site-survey-placeholder').show();
          $('#site-survey-placeholder-none').hide();
          fetchSiteSurvey(deviceId, isBridge);
        }
      },
      error: function(xhr, status, error) {
        $('#site-survey').removeAttr('data-ap-devices-list');
        $('#site-survey').removeData('ap-devices-list');
        $('#site-survey-body').empty(); // Clear old data
        $('#site-survey-placeholder').show();
        $('#site-survey-placeholder-none').hide();
        fetchSiteSurvey(deviceId, isBridge);
      },
    });
  };

  const fetchSiteSurvey = function(deviceId, isBridge) {
    $.ajax({
      type: 'GET',
      url: '/devicelist/sitesurvey/' + deviceId,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          let apDevices = $('#site-survey').data('ap-devices-list');
          if (apDevices) {
            for (let newDevice of res.ap_devices) {
              let matchedDev = apDevices.find(function(device) {
                if (device.mac === newDevice.mac) {
                  // Always replace as the signal is different
                  let idx = apDevices.indexOf(device);
                  apDevices.splice(idx, 1);
                  apDevices.push(newDevice);
                  return true;
                } else {
                  return false;
                }
              });
              if (!matchedDev) {
                apDevices.push(newDevice);
              }
            }
            $('#site-survey').data('ap-devices-list', apDevices);
          } else {
            apDevices = res.ap_devices;
            $('#site-survey').attr('data-ap-devices-list',
                                   JSON.stringify(apDevices));
          }

          renderSiteSurvey(apDevices, isBridge);
        } else {
          displayAlertMsg(res);
        }
      },
      error: function(xhr, status, error) {
        displayAlertMsg(JSON.parse(xhr.responseText));
      },
    });
  };

  const sortBySignal = function(a, b) {
    if ( a.signal > b.signal ) {
      return -1;
    }
    if ( a.last_nom < b.last_nom ) {
      return 1;
    }
    return 0;
  };

  const calculateChannel = function(rawFreq) {
    const startFreq2Ghz = 2412;
    const startFreq5GHz = 5180;
    let intRawFreq = parseInt(rawFreq);
    let finalChannel = 1;
    if (Math.floor(intRawFreq / startFreq5GHz) == 0) { // 2.4 GHz
      // 5 MHz between channels center
      finalChannel += (intRawFreq % startFreq2Ghz) / 5;
    } else { // 5.0 GHz
      finalChannel = 36;
      // 10 MHz between channels center
      // Each channel moves two units
      finalChannel += ((intRawFreq % startFreq5GHz) / 10) * 2;
    }
    return finalChannel;
  };

  const renderSiteSurvey = function(apDevices, isBridge) {
    $('#site-survey-placeholder').hide();
    let apDevsRow = $('#site-survey-body');
    let countAddedDevs = 0;

    apDevices.sort(sortBySignal);
    $.each(apDevices, function(idx, device) {
      // Skip if not seen for too long
      if (device.is_old) {
        return true;
      }
      apDevsRow.append(
        $('<div>')
        .addClass('col-lg m-1 grey lighten-4').append(
          $('<div>').addClass('row pt-3 mb-2').append(
            $('<div>').addClass('col').append(
              $('<div>').addClass('row p-0 m-0').append(
                $('<div>').addClass('col p-0').append(
                  $('<h6>').text(device.ssid),
                  $('<h6>').text(device.mac),
                ),
                $('<div>').addClass('col p-0 pl-2').append(
                  $('<h6>').text('Canal: ' + calculateChannel(device.freq)),
                  $('<h6>').text('Sinal: ' + device.signal +' dBm'),
                  $('<h6>').text('Banda: ' + device.width +' MHz'),
                ),
              ),
            ),
          ),
        ),
      );
      countAddedDevs += 1;
      // Line break every 2 columns
      if (countAddedDevs % 2 == 0) {
        apDevsRow.append($('<div></div>').addClass('w-100'));
      }
    });

    // Placeholder if empty
    if ( apDevsRow.is(':empty') ) {
      $('#site-survey-placeholder-none').show();
    }
  };

  $(document).on('click', '.btn-site-survey-modal', function(event) {
    let slaves = [];
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let isBridge = row.data('bridge-enabled') === 'Sim';
    let slaveCount = parseInt(row.data('slave-count'));
    let totalRouters = slaveCount + 1;
    if (slaveCount > 0) {
      slaves = JSON.parse(row.data('slaves').replace(/\$/g, '"'));
    }

    $('#isBridgeDiv').html(row.data('bridge-enabled'));
    $('#site-survey-placeholder-none').hide();

    // Trigger ap device view
    $('#site-survey-body').show();

    // Refresh devices status
    refreshSiteSurvey(id, isBridge);
  });

  $(document).on('click', '.btn-sync-ssurvey', function(event) {
    let id = $('#site-survey-hlabel').text();
    let isBridge = $('#isBridgeDiv').html() === 'Sim';

    clearTimeout(siteSurveyGlobalTimer);
    refreshSiteSurvey(id, isBridge);
  });

  // Important: include and initialize socket.io first using socket var
  socket.on('SITESURVEY', function(macaddr, data) {
    if (($('#site-survey').data('bs.modal') || {})._isShown) {
      if ($('#site-survey').data('cleanup') == true) {
        // Clear old data
        $('#site-survey').data('cleanup', false);
        $('.btn-sync-ssurvey').prop('disabled', false);
        $('.btn-sync-ssurvey > i').removeClass('animated rotateOut infinite');
        $('#site-survey').removeAttr('data-ap-devices-list');
        $('#site-survey').removeData('ap-devices-list');
        $('#site-survey-body').empty();
        $('#site-survey-placeholder').show();
        $('#site-survey-placeholder-none').hide();
      } else {
        $('#site-survey-body').empty();
      }
      let id = $('#site-survey-hlabel').text();
      let isBridge = $('#isBridgeDiv').html() === 'Sim';
      if (id == macaddr) {
        clearTimeout(siteSurveyGlobalTimer);
        fetchSiteSurvey(macaddr, isBridge);
      }
    }
  });

  // Restore default modal state
  $('#site-survey').on('hidden.bs.modal', function() {
    $('#site-survey').removeAttr('data-ap-devices-list');
    $('#site-survey').removeData('ap-devices-list');
    $('#site-survey-body').empty();
    $('#site-survey-placeholder').show();
    $('#site-survey-placeholder-none').hide();
    $('.btn-sync-ssurvey > i').removeClass('animated rotateOut infinite');
    $('.btn-sync-ssurvey').prop('disabled', false);
    clearTimeout(siteSurveyGlobalTimer);
  });
});
