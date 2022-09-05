import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg, socket} from './common_actions.js';

const t = i18next.t;

anlixDocumentReady.add(function() {
  let siteSurveyGlobalTimer;

  const refreshSiteSurvey = function(deviceId, isBridge, hasExtendedChannels) {
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
          $('#2-ghz-aps').hide();
          $('#5-ghz-aps').hide();
          $('.btn-show-5-ghz-aps').addClass('disabled');
          $('.btn-show-2-ghz-aps').addClass('disabled');
          $('#site-survey-placeholder').hide();
          $('#site-survey-placeholder-none').show();
          fetchSiteSurvey(deviceId, isBridge, hasExtendedChannels);
        }
      },
      error: function(xhr, status, error) {
        $('#site-survey').removeAttr('data-ap-devices-list');
        $('#site-survey').removeData('ap-devices-list');
        $('#2-ghz-aps').hide();
        $('#5-ghz-aps').hide();
        $('.btn-show-5-ghz-aps').addClass('disabled');
        $('.btn-show-2-ghz-aps').addClass('disabled');
        $('#site-survey-placeholder').hide();
        $('#site-survey-placeholder-none').show();
        fetchSiteSurvey(deviceId, isBridge, hasExtendedChannels);
      },
    });
  };

  const fetchSiteSurvey = function(deviceId, isBridge, hasExtendedChannels) {
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

          renderSiteSurvey(apDevices, isBridge, res.wifi_last_channel,
                           res.wifi_last_channel_5ghz, hasExtendedChannels);
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

  const renderSiteSurvey = function(apDevices, isBridge, wifi2GhzChannel,
                                    wifi5GhzChannel, hasExtendedChannels,
  ) {
    $('#site-survey-placeholder').hide();
    let apDevs2GhzRow = $('#2-ghz-aps');
    let apDevs5GhzRow = $('#5-ghz-aps');
    let countAdded2GhzDevs = 0;
    let countAdded5GhzDevs = 0;
    let apSelectedDevsRow = apDevs2GhzRow;
    let minScore2Ghz = 1000;
    let maxScore2Ghz = -1000;
    let minScore5Ghz = 1000;
    let maxScore5Ghz = -1000;
    let minSignal2Ghz = 1000;
    let maxSignal2Ghz = -1000;
    let minSignal5Ghz = 1000;
    let maxSignal5Ghz = -1000;
    let worst2GhzChannel = 0;
    let best2GhzChannel = 0;
    let worst5GhzChannel = 0;
    let best5GhzChannel = 0;
    let ap2GhzCountDict = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0,
                           9: 0, 10: 0, 11: 0};
    let ap5GhzCountDict = {36: 0, 40: 0, 44: 0, 48: 0, 149: 0, 153: 0,
                           157: 0, 161: 0, 165: 0};
    let ap2GhzScoreDict = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0,
                           9: 0, 10: 0, 11: 0};
    let ap5GhzScoreDict = {36: 0, 40: 0, 44: 0, 48: 0, 149: 0, 153: 0,
                           157: 0, 161: 0, 165: 0};
    if (hasExtendedChannels) {
      ap2GhzCountDict[12] = 0;
      ap2GhzCountDict[13] = 0;
      ap2GhzScoreDict[12] = 0;
      ap2GhzScoreDict[13] = 0;
    }
    let channels2Ghz = Object.keys(ap2GhzCountDict).map(Number);
    let channels5Ghz = Object.keys(ap5GhzCountDict).map(Number);
    let channels5GhzLower = [];
    let channels5GhzUpper = [];
    let dividingChannel = 64;
    for (let i=0; i< channels5Ghz.length; i++) {
      if (channels5Ghz[i] <= dividingChannel) {
        channels5GhzLower.push(channels5Ghz[i]);
      } else {
        channels5GhzUpper.push(channels5Ghz[i]);
      }
    }
    apDevices.sort(sortBySignal);
    $.each(apDevices, function(idx, device) {
      // Skip if not seen for too long
      if (device.is_old) {
        return true;
      }
      let apChannel = calculateChannel(device.freq);
      if (apChannel <= channels2Ghz[channels2Ghz.length - 1]) { // 2.4 GHz
        apSelectedDevsRow = apDevs2GhzRow;
        // Count APs
        if (apChannel in ap2GhzCountDict) {
          ap2GhzCountDict[apChannel] += 1;
        }
        if (parseInt(device.signal) >= maxSignal2Ghz) {
          maxSignal2Ghz = parseInt(device.signal);
        }
        if (parseInt(device.signal) <= minSignal2Ghz) {
          minSignal2Ghz = parseInt(device.signal);
        }
      } else { // 5.0 GHz
        apSelectedDevsRow = apDevs5GhzRow;
        // Count APs
        if (apChannel in ap5GhzCountDict) {
          ap5GhzCountDict[apChannel] += 1;
        }
        if (parseInt(device.signal) >= maxSignal5Ghz) {
          maxSignal5Ghz = parseInt(device.signal);
        }
        if (parseInt(device.signal) <= minSignal5Ghz) {
          minSignal5Ghz = parseInt(device.signal);
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
                  $('<h6>').text(t('Channel=X', {x: apChannel})),
                  $('<h6>').text(t('Signal=X', {x: device.signal})),
                  $('<h6>').text(t('Bandwidth=X', {x: device.width})),
                ),
              ),
            ),
          ),
        ),
      );
      if (apChannel <= channels2Ghz[channels2Ghz.length - 1]) { // 2.4 GHz
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
    $.each(apDevices, function(idx, device) {
      // Skip if not seen for too long
      if (device.is_old) {
        return true;
      }
      let apChannel = calculateChannel(device.freq);
      let apWidth = device.width;
      let range = 2;
      let signalValue = 0;
      if (apChannel <= channels2Ghz[channels2Ghz.length - 1]) { // 2.4 GHz
        signalValue = 1 - (device.signal - maxSignal2Ghz) /
                      (minSignal2Ghz - maxSignal2Ghz);
        if (apWidth == 40) range = 4;
        let index = channels2Ghz.indexOf(apChannel);
        for (let i=index-range; i<=index+range; i++) {
          if (i >= 0 && index < channels2Ghz.length) {
            ap2GhzScoreDict[channels2Ghz[i]] +=
            (1/Math.sqrt(1 + (range/2)*Math.abs(index - i)))*signalValue;
          }
        }
      } else { // 5.0 GHz
        signalValue = 1 - (device.signal - maxSignal5Ghz) /
                      (minSignal5Ghz - maxSignal5Ghz);
        if (apWidth == 40) {
          range = 4;
        } else if (apWidth == 80) {
          range = 8;
        }
        if (apChannel <= dividingChannel) {
          let index = channels5GhzLower.indexOf(apChannel);
          for (let i=index-range; i<=index+range; i++) {
            if (i >= 0 && index < channels5GhzLower.length) {
              ap5GhzScoreDict[channels5GhzLower[i]] +=
              (1/Math.sqrt(1 + (range/2)*Math.abs(index - i)))*signalValue;
            }
          }
        } else {
          let index = channels5GhzUpper.indexOf(apChannel);
          for (let i=index-range; i<=index+range; i++) {
            if (i >= 0 && index < channels5GhzUpper.length) {
              ap5GhzScoreDict[channels5GhzUpper[i]] +=
              (1/Math.sqrt(1 + (range/2)*Math.abs(index - i)))*signalValue;
            }
          }
        }
      }
    });
    for (let channel of channels2Ghz) {
      if (ap2GhzScoreDict[channel] >= maxScore2Ghz) {
        maxScore2Ghz = ap2GhzScoreDict[channel];
        worst2GhzChannel = channel;
      }
      if (ap2GhzScoreDict[channel] <= minScore2Ghz) {
        minScore2Ghz = ap2GhzScoreDict[channel];
        best2GhzChannel = channel;
      }
    }
    // Prepend summary of APs in each channel
    let summary2Ghz = $();
    summary2Ghz = summary2Ghz.add(
      $('<div>').addClass('col m-1 p-0').append(
        $('<h5>').addClass('m-0').append( $('<strong>')
                                 .text(t('channelsOccupation(current=X)',
                                         {x: wifi2GhzChannel}))),
        $('<hr>').addClass('mt-1'),
    ));
    summary2Ghz = summary2Ghz.add($('<div>').addClass('w-100'));
    for (let channel of channels2Ghz) {
      if (channel == best2GhzChannel) {
        summary2Ghz = summary2Ghz.add($('<div>')
        .addClass('col-auto m-1 green lighten-3').append(
          $('<div>').addClass('row pt-3 mb-2').append(
            $('<div>').addClass('col').append(
              $('<h5>').append(
                $('<strong>').text(t('ChannelX= ', {x: channel})),
                `${ap2GhzCountDict[channel]} (${t('best')})`,
              ),
            ),
          ),
        ));
      } else if (channel == worst2GhzChannel) {
        summary2Ghz = summary2Ghz.add($('<div>')
        .addClass('col-auto m-1 red lighten-3').append(
          $('<div>').addClass('row pt-3 mb-2').append(
            $('<div>').addClass('col').append(
              $('<h5>').append(
                $('<strong>').text(t('ChannelX= ', {x: channel})),
                `${ap2GhzCountDict[channel]} (${t('worst')})`,
              ),
            ),
          ),
        ));
      } else {
        summary2Ghz = summary2Ghz.add($('<div>')
        .addClass('col-auto m-1 grey lighten-3').append(
          $('<div>').addClass('row pt-3 mb-2').append(
            $('<div>').addClass('col').append(
              $('<h5>').append(
                $('<strong>').text(t('ChannelX= ', {x: channel})),
                ap2GhzCountDict[channel],
              ),
            ),
          ),
        ));
      }
    }
    // Division between each AP found
    summary2Ghz = summary2Ghz.add($('<div>').addClass('w-100'));
    summary2Ghz = summary2Ghz.add(
      $('<div>').addClass('col m-1 p-0 pt-3').append(
        $('<h5>').addClass('m-0').append( $('<strong>')
                                 .text(t('listingOfFoundNetworks'))),
        $('<hr>').addClass('mt-1'),
    ));
    summary2Ghz = summary2Ghz.add($('<div>').addClass('w-100'));
    apDevs2GhzRow.prepend(summary2Ghz);
    // 5GHz
    for (let channel of channels5Ghz) {
      if (ap5GhzScoreDict[channel] >= maxScore5Ghz) {
        maxScore5Ghz = ap5GhzScoreDict[channel];
        worst5GhzChannel = channel;
      }
      if (ap5GhzScoreDict[channel] <= minScore5Ghz) {
        minScore5Ghz = ap5GhzScoreDict[channel];
        best5GhzChannel = channel;
      }
    }
    let summary5Ghz = $();
    summary5Ghz = summary5Ghz.add(
      $('<div>').addClass('col m-1 p-0').append(
        $('<h5>').addClass('m-0').append( $('<strong>')
                                 .text(t('channelsOccupation(current=X)',
                                         {x: wifi5GhzChannel}))),
        $('<hr>').addClass('mt-1'),
    ));
    summary5Ghz = summary5Ghz.add($('<div>').addClass('w-100'));
    for (let channel of channels5Ghz) {
      if (channel == best5GhzChannel) {
        summary5Ghz = summary5Ghz.add($('<div>')
        .addClass('col-auto m-1 green lighten-3').append(
          $('<div>').addClass('row pt-3 mb-2').append(
            $('<div>').addClass('col').append(
              $('<h5>').append(
                $('<strong>').text(t('ChannelX= ', {x: channel})),
                `${ap5GhzCountDict[channel]} (${t('best')})`,
              ),
            ),
          ),
        ));
      } else if (channel == worst5GhzChannel) {
        summary5Ghz = summary5Ghz.add($('<div>')
        .addClass('col-auto m-1 red lighten-3').append(
          $('<div>').addClass('row pt-3 mb-2').append(
            $('<div>').addClass('col').append(
              $('<h5>').append(
                $('<strong>').text(t('ChannelX= ', {x: channel})),
                `${ap5GhzCountDict[channel]} (${t('worst')})`,
              ),
            ),
          ),
        ));
      } else {
        summary5Ghz = summary5Ghz.add($('<div>')
        .addClass('col-auto m-1 grey lighten-3').append(
          $('<div>').addClass('row pt-3 mb-2').append(
            $('<div>').addClass('col').append(
              $('<h5>').append(
                $('<strong>').text(t('ChannelX= ', {x: channel})),
                ap5GhzCountDict[channel],
              ),
            ),
          ),
        ));
      }
      if (['48', '64', '161'].includes(channel)) {
        summary5Ghz = summary5Ghz.add($('<div>').addClass('w-100'));
      }
    }
    // Division between each AP found
    summary5Ghz = summary5Ghz.add($('<div>').addClass('w-100'));
    summary5Ghz = summary5Ghz.add(
      $('<div>').addClass('col m-1 p-0 pt-3').append(
        $('<h5>').addClass('m-0').append( $('<strong>')
                                 .text(t('listingOfFoundNetworks'))),
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
    let isTR069 = row.data('is-tr069') === true;
    let isBridge = row.data('bridge-enabled') === t('Yes');
    let has5ghz = row.data('has-5ghz');
    let hasExtendedChannels = row.data('has-extended-channels');
    if (!has5ghz) {
      $('.btn-show-5-ghz-aps').addClass('disabled').prop('disabled', true);
    }
    $('#site-survey').attr('data-has-extended-channels', hasExtendedChannels);

    $('#isBridgeDiv').html(row.data('bridge-enabled'));
    $('#site-survey-placeholder-none').hide();

    // Trigger ap device view
    $('#2-ghz-aps').show();
    $('#5-ghz-aps').hide();

    // Show warning
    if (!isTR069) $('#tr09-warning').hide();

    let idx = row.data('index');
    if (!row.find('#edit_wifi_state-'+idx)[0].checked ||
        !row.find('#edit_wifi5_state-'+idx)[0].checked) {
      swal.fire({
        icon: 'warning',
        title: t('Attention!'),
        text: t('showsitesurveyTR069WarningInfo'),
        confirmButtonText: t('Proceed'),
        confirmButtonColor: '#4db6ac',
        cancelButtonText: t('Cancel'),
        cancelButtonColor: '#f2ab63',
        showCancelButton: true,
      }).then((result)=>{
        if (result.value) {
          refreshSiteSurvey(id, isBridge, hasExtendedChannels);
        } else {
          $('#site-survey').modal('hide');
          return;
        }
      });
    } else {
      // Refresh devices status
      refreshSiteSurvey(id, isBridge, hasExtendedChannels);
    }
  });

  $(document).on('click', '.btn-sync-ssurvey', function(event) {
    let id = $('#site-survey-hlabel').text();
    let isBridge = $('#isBridgeDiv').html() === t('Yes');
    let hasExtendedChannels = $('#site-survey').data('has-extended-channels');

    clearTimeout(siteSurveyGlobalTimer);
    refreshSiteSurvey(id, isBridge, hasExtendedChannels);
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
      let id = $('#site-survey-hlabel').text();
      if (id == macaddr) {
        if ($('#site-survey').data('cleanup') == true) {
          // Clear old data
          $('#site-survey').data('cleanup', false);
          $('.btn-sync-ssurvey').prop('disabled', false);
          $('.btn-sync-ssurvey > i').removeClass('animated rotateOut infinite');
          $('#site-survey').removeAttr('data-ap-devices-list');
          $('#site-survey').removeData('ap-devices-list');
          $('#2-ghz-aps').empty();
          $('#5-ghz-aps').empty();
          if (data.length == 0) {
            $('#site-survey-placeholder-none').show();
            $('.btn-show-5-ghz-aps').addClass('disabled');
            $('.btn-show-2-ghz-aps').addClass('disabled');
            $('#2-ghz-aps').hide();
            $('#5-ghz-aps').hide();
          } else {
            $('#site-survey-placeholder').show();
            $('#site-survey-placeholder-none').hide();
          }
        } else {
          $('#2-ghz-aps').empty();
          $('#5-ghz-aps').empty();
        }
        let isBridge = $('#isBridgeDiv').html() === t('Yes');
        let hasExtendedChannels =
          $('#site-survey').data('has-extended-channels');
        clearTimeout(siteSurveyGlobalTimer);
        fetchSiteSurvey(macaddr, isBridge, hasExtendedChannels);
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
    $('.btn-show-5-ghz-aps').prop('disabled', false);
    $('.btn-show-2-ghz-aps').removeClass('disabled');
    $('.btn-show-2-ghz-aps').addClass('active');
    clearTimeout(siteSurveyGlobalTimer);
  });
});
