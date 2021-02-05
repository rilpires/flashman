import {displayAlertMsg} from './common_actions.js';

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
          $('#2-ghz-aps').empty();
          $('#5-ghz-aps').empty();
          $('#site-survey-placeholder').show();
          $('#site-survey-placeholder-none').hide();
          fetchSiteSurvey(deviceId, isBridge);
        }
      },
      error: function(xhr, status, error) {
        $('#site-survey').removeAttr('data-ap-devices-list');
        $('#site-survey').removeData('ap-devices-list');
        $('#2-ghz-aps').empty();
        $('#5-ghz-aps').empty();
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
    let apDevs2GhzRow = $('#2-ghz-aps');
    let apDevs5GhzRow = $('#5-ghz-aps');
    let countAdded2GhzDevs = 0;
    let countAdded5GhzDevs = 0;
    let apSelectedDevsRow = apDevs2GhzRow;
    let ap2GhzCountDict = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0,
                           9: 0, 10: 0, 11: 0, 12: 0, 13: 0};
    let ap5GhzCountDict = {36: 0, 40: 0, 44: 0, 48: 0, 52: 0, 56: 0, 60: 0,
                           64: 0, 149: 0, 153: 0, 157: 0, 161: 0, 165: 0};

    apDevices.sort(sortBySignal);
    $.each(apDevices, function(idx, device) {
      // Skip if not seen for too long
      if (device.is_old) {
        return true;
      }
      let apChannel = calculateChannel(device.freq);
      if (apChannel <= 14) { // 2.4 GHz
        apSelectedDevsRow = apDevs2GhzRow;
        // Count APs
        if (apChannel in ap2GhzCountDict) {
          ap2GhzCountDict[apChannel] += 1;
        }
      } else { // 5.0 GHz
        apSelectedDevsRow = apDevs5GhzRow;
        // Count APs
        if (apChannel in ap5GhzCountDict) {
          ap5GhzCountDict[apChannel] += 1;
        }
      }
      apSelectedDevsRow.append(
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
                  $('<h6>').text('Canal: ' + apChannel),
                  $('<h6>').text('Sinal: ' + device.signal +' dBm'),
                  $('<h6>').text('Banda: ' + device.width +' MHz'),
                ),
              ),
            ),
          ),
        ),
      );
      if (apChannel <= 14) { // 2.4 GHz
        countAdded2GhzDevs += 1;
        // Line break every 2 columns
        if (countAdded2GhzDevs % 2 == 0) {
          apDevs2GhzRow.append($('<div>').addClass('w-100'));
        }
      } else { // 5.0 GHz
        countAdded5GhzDevs += 1;
        // Line break every 2 columns
        if (countAdded5GhzDevs % 2 == 0) {
          apDevs5GhzRow.append($('<div>').addClass('w-100'));
        }
      }
    });
    // Prepend summary of APs in each channel
    let summary2Ghz = $();
    summary2Ghz = summary2Ghz.add(
      $('<div>').addClass('col m-1 p-0').append(
        $('<h5>').addClass('m-0').append( $('<strong>')
                                 .text('Ocupação dos canais')),
        $('<hr>').addClass('mt-1'),
    ));
    summary2Ghz = summary2Ghz.add($('<div>').addClass('w-100'));
    // eslint-disable-next-line guard-for-in
    for (let channel in ap2GhzCountDict) {
      summary2Ghz = summary2Ghz.add($('<div>')
      .addClass('col-lg m-1 grey lighten-3').append(
        $('<div>').addClass('row pt-3 mb-2').append(
          $('<div>').addClass('col').append(
            $('<h5>').append(
              $('<strong>').text('Canal ' + channel + ': '),
              ap2GhzCountDict[channel],
            ),
          ),
        ),
      ));
      if (channel % 4 == 0) {
        summary2Ghz = summary2Ghz.add($('<div>').addClass('w-100'));
      }
    }
    // Division between each AP found
    summary2Ghz = summary2Ghz.add($('<div>').addClass('col m-1'));
    summary2Ghz = summary2Ghz.add($('<div>').addClass('col m-1'));
    summary2Ghz = summary2Ghz.add($('<div>').addClass('col m-1'));
    summary2Ghz = summary2Ghz.add($('<div>').addClass('w-100'));
    summary2Ghz = summary2Ghz.add(
      $('<div>').addClass('col m-1 p-0 pt-3').append(
        $('<h5>').addClass('m-0').append( $('<strong>')
                                 .text('Listagem de redes encontradas')),
        $('<hr>').addClass('mt-1'),
    ));
    summary2Ghz = summary2Ghz.add($('<div>').addClass('w-100'));
    apDevs2GhzRow.prepend(summary2Ghz);
    // 5GHz
    let summary5Ghz = $();
    summary5Ghz = summary5Ghz.add(
      $('<div>').addClass('col m-1 p-0').append(
        $('<h5>').addClass('m-0').append( $('<strong>')
                                 .text('Ocupação dos canais')),
        $('<hr>').addClass('mt-1'),
    ));
    summary5Ghz = summary5Ghz.add($('<div>').addClass('w-100'));
    // eslint-disable-next-line guard-for-in
    for (let channel in ap5GhzCountDict) {
      summary5Ghz = summary5Ghz.add($('<div>')
      .addClass('col-lg m-1 grey lighten-3').append(
        $('<div>').addClass('row pt-3 mb-2').append(
          $('<div>').addClass('col').append(
            $('<h5>').append(
              $('<strong>').text('Canal ' + channel + ': '),
              ap5GhzCountDict[channel],
            ),
          ),
        ),
      ));
      if (['48', '64', '161'].includes(channel)) {
        summary5Ghz = summary5Ghz.add($('<div>').addClass('w-100'));
      }
    }
    // Division between each AP found
    summary5Ghz = summary5Ghz.add($('<div>').addClass('col m-1'));
    summary5Ghz = summary5Ghz.add($('<div>').addClass('col m-1'));
    summary5Ghz = summary5Ghz.add($('<div>').addClass('col m-1'));
    summary5Ghz = summary5Ghz.add($('<div>').addClass('w-100'));
    summary5Ghz = summary5Ghz.add(
      $('<div>').addClass('col m-1 p-0 pt-3').append(
        $('<h5>').addClass('m-0').append( $('<strong>')
                                 .text('Listagem de redes encontradas')),
        $('<hr>').addClass('mt-1'),
    ));
    summary5Ghz = summary5Ghz.add($('<div>').addClass('w-100'));
    apDevs5GhzRow.prepend(summary5Ghz);

    // Placeholder if empty
    if ( apSelectedDevsRow.is(':empty') ) {
      $('#site-survey-placeholder-none').show();
      $('.btn-show-5-ghz-aps').addClass('disabled');
      $('.btn-show-2-ghz-aps').addClass('disabled');
    }
  };

  $(document).on('click', '.btn-site-survey-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let isBridge = row.data('bridge-enabled') === 'Sim';

    $('#isBridgeDiv').html(row.data('bridge-enabled'));
    $('#site-survey-placeholder-none').hide();

    // Trigger ap device view
    $('#2-ghz-aps').show();
    $('#5-ghz-aps').hide();

    // Refresh devices status
    refreshSiteSurvey(id, isBridge);
  });

  $(document).on('click', '.btn-sync-ssurvey', function(event) {
    let id = $('#site-survey-hlabel').text();
    let isBridge = $('#isBridgeDiv').html() === 'Sim';

    clearTimeout(siteSurveyGlobalTimer);
    refreshSiteSurvey(id, isBridge);
  });

  $(document).on('click', '.btn-show-2-ghz-aps', function(event) {
    $('#5-ghz-aps').hide();
    $('#2-ghz-aps').show();
    $('.btn-show-5-ghz-aps').removeClass('active');
    $('.btn-show-2-ghz-aps').addClass('active');
  });

  $(document).on('click', '.btn-show-5-ghz-aps', function(event) {
    $('#2-ghz-aps').hide();
    $('#5-ghz-aps').show();
    $('.btn-show-2-ghz-aps').removeClass('active');
    $('.btn-show-5-ghz-aps').addClass('active');
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
        $('#2-ghz-aps').empty();
        $('#5-ghz-aps').empty();
        $('#site-survey-placeholder').show();
        $('#site-survey-placeholder-none').hide();
      } else {
        $('#2-ghz-aps').empty();
        $('#5-ghz-aps').empty();
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
    $('#2-ghz-aps').empty();
    $('#5-ghz-aps').empty();
    $('#site-survey-placeholder').show();
    $('#site-survey-placeholder-none').hide();
    $('.btn-sync-ssurvey > i').removeClass('animated rotateOut infinite');
    $('.btn-sync-ssurvey').prop('disabled', false);
    $('.btn-show-5-ghz-aps').removeClass('active disabled');
    $('.btn-show-2-ghz-aps').removeClass('disabled');
    $('.btn-show-2-ghz-aps').addClass('active');
    clearTimeout(siteSurveyGlobalTimer);
  });
});
