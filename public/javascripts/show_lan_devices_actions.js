import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg,
        secondsTimeSpanToHMS,
        socket} from './common_actions.js';

const t = i18next.t;

anlixDocumentReady.add(function() {
  let lanDevicesGlobalTimer;
  // TR-069 CPEs that implement device blocking do this only for wireless
  // connected devices for now. So we need to leave the lock/unlock button
  // disabled for wired devices.
  let lanDevicesGrantBlockWiredDevices = false;
  let lanDevicesGrantBlockDevices = false;

  const refreshLanDevices = function(deviceId, upnpSupport, isBridge) {
    $('#lan-devices').modal();
    $('#lan-devices').attr('data-validate-upnp', upnpSupport);
    $('.btn-sync-lan').prop('disabled', true);
    $('#show-spam-error').hide();

    $.ajax({
      url: '/devicelist/command/' + deviceId + '/onlinedevs',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#lan-devices').attr('data-cleanup', true);
          // If exists
          $('#lan-devices').data('cleanup', true);
          $('.btn-sync-lan > i').addClass('animated rotateOut infinite');
        } else {
          $('#lan-devices').removeAttr('data-lan-devices-list');
          $('#lan-devices').removeData('lan-devices-list');
          $('#lan-devices').removeAttr('data-lan-routers-list');
          $('#lan-devices').removeData('lan-routers-list');
          $('#lan-devices-body').empty(); // Clear old data
          $('#lan-routers-body').empty(); // Clear old data
          $('#lan-devices-placeholder').show();
          $('#lan-devices-placeholder-none').hide();
          fetchLanDevices(deviceId, upnpSupport, isBridge);
        }
      },
      error: function(xhr, status, error) {
        $('#lan-devices').removeAttr('data-lan-devices-list');
        $('#lan-devices').removeData('lan-devices-list');
        $('#lan-devices').removeAttr('data-lan-routers-list');
        $('#lan-devices').removeData('lan-routers-list');
        $('#lan-devices-body').empty(); // Clear old data
        $('#lan-routers-body').empty(); // Clear old data
        $('#lan-devices-placeholder').show();
        $('#lan-devices-placeholder-none').hide();
        fetchLanDevices(deviceId, upnpSupport, isBridge);
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
                         t('Granted', {context: 'male'}) :
                         t('Blocked', {context: 'male'}));
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
          $('#show-spam-error').hide();
          btnStatus.removeClass('indigo-text red-text')
                   .addClass(isBlocked ? 'red-text' : 'indigo-text')
                   .html(isBlocked ? t('blocked', {context: 'female'}) :
                                     t('granted', {context: 'female'}));
          btnStatus.parent().data('blocked', isBlocked);
          setTimeout(function() {
            $('.btn-lan-dev-block').prop('disabled', false);
          }, 3000);
        } else {
          $('.btn-lan-dev-block').prop('disabled', false);
        }
      },
      error: function(xhr, status, error) {
        let response = xhr.responseJSON;
        if (!response.success) {
          $('#spam-error-message').text(response.message);
          $('#show-spam-error').show();
        }
        $('.btn-lan-dev-block').prop('disabled', false);
      },
    });
  };

  const fetchLanDevices = function(deviceId, upnpSupport,
                                   isBridge, hasSlaves=false,
  ) {
    let totalRouters = parseInt($('#lan-devices').data('slaves-count')) + 1;
    let syncedRouters = parseInt($('#lan-devices').data('routers-synced'));

    $('#lan-devices-placeholder-counter').text(
      syncedRouters + ' ' + t('Of') + ' ' + totalRouters);

    $.ajax({
      type: 'GET',
      url: '/devicelist/landevices/' + deviceId,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          let lanDevices = $('#lan-devices').data('lan-devices-list');
          let lanRouters = $('#lan-devices').data('lan-routers-list');
          if (lanDevices) {
            for (let newDevice of res.lan_devices) {
              let matchedDev = lanDevices.find(function(device) {
                if (device.mac === newDevice.mac) {
                  const slaves = $('#lan-devices').data('slaves');
                  const gatewayMac = newDevice.gateway_mac;
                  let isGatewayRouterSlave;
                  slaves.includes(gatewayMac) ? isGatewayRouterSlave = true :
                    isGatewayRouterSlave = false;
                  let doReplace = false;
                  if (device.conn_type === undefined &&
                      newDevice.conn_type !== undefined
                  ) {
                    doReplace = true;
                  } else if (isGatewayRouterSlave) {
                    // incoming info from AP device is connected to
                    newDevice.ip = device.ip;
                    newDevice.ipv6 = device.ipv6;
                    newDevice.ping = device.ping;
                    newDevice.dhcp_name = device.dhcp_name;
                    newDevice.dhcp_signature = device.dhcp_signature;
                    newDevice.dhcp_vendor_class = device.dhcp_vendor_class;
                    newDevice.dhcp_fingerprint = device.dhcp_fingerprint;
                    doReplace = true;
                  } else {
                    // incoming info from mesh master
                    newDevice.conn_type = device.conn_type;
                    newDevice.conn_speed = device.conn_speed;
                    newDevice.wifi_signal = device.wifi_signal;
                    newDevice.wifi_snr = device.wifi_snr;
                    newDevice.wifi_freq = device.wifi_freq;
                    newDevice.wifi_mode = device.wifi_mode;
                    newDevice.wifi_fingerprint = device.wifi_fingerprint;
                    newDevice.gateway_mac = device.gateway_mac;
                    newDevice.is_online = device.is_online;
                    newDevice.is_old = device.is_old;
                    doReplace = true;
                  }
                  if (doReplace) {
                    let idx = lanDevices.indexOf(device);
                    lanDevices.splice(idx, 1);
                    lanDevices.push(newDevice);
                  }
                  return true;
                } else {
                  return false;
                }
              });
              if (!matchedDev) {
                lanDevices.push(newDevice);
              }
            }
            $('#lan-devices').data('lan-devices-list', lanDevices);
          } else {
            lanDevices = res.lan_devices;
            $('#lan-devices').attr('data-lan-devices-list',
                                   JSON.stringify(lanDevices));
          }

          if (lanRouters) {
            lanRouters[deviceId] = res.mesh_routers;
            $('#lan-devices').data('lan-routers-list', lanRouters);
          } else {
            lanRouters = {};
            lanRouters[deviceId] = res.mesh_routers;
            $('#lan-devices').attr('data-lan-routers-list',
                                   JSON.stringify(lanRouters));
          }

          // Exhibit devices and routers if all routers have already answered
          if (syncedRouters >= totalRouters) {
            clearTimeout(lanDevicesGlobalTimer);
            // sort so lan devices of same gateway CPE are shown together
            lanDevices.sort((a, b) => (a.gateway_mac > b.gateway_mac) ? 1 :
              ((b.gateway_mac > a.gateway_mac) ? -1 : 0));
            renderDevices(lanDevices, lanRouters, upnpSupport,
                          isBridge, hasSlaves);
          } else {
            $('#lan-devices-placeholder-counter').text(
              syncedRouters + ' de ' + totalRouters);
            // Create a timeout if remaining routers stop responding
            lanDevicesGlobalTimer = setTimeout(function() {
              if (syncedRouters < totalRouters) {
                // sort so lan devices of same gateway CPE are shown together
                lanDevices.sort((a, b) => (a.gateway_mac > b.gateway_mac) ? 1 :
                  ((b.gateway_mac > a.gateway_mac) ? -1 : 0));
                renderDevices(lanDevices, lanRouters, upnpSupport,
                            isBridge, hasSlaves);
              }
            }, 25000);
          }
        } else {
          displayAlertMsg(res);
        }
      },
      error: function(xhr, status, error) {
        displayAlertMsg(JSON.parse(xhr.responseText));
      },
    });
  };

  const renderDevices = function(lanDevices, lanRouters, upnpSupport,
                                 isBridge, hasSlaves=false,
  ) {
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

    $('#lan-devices-placeholder').hide();
    let lanDevsRow = $('#lan-devices-body');
    let countAddedDevs = 0;
    let lanRoutersRow = $('#lan-routers-body');
    let countAddedRouters = 0;

    $.each(lanDevices, function(idx, device) {
      let isWired = (device.conn_type == 0);
      let cantBlockWired = !lanDevicesGrantBlockWiredDevices;
      let deviceDoesNotHavePermission = !grantLanDevicesBlock;
      let userDoesNotHavePermission = !(isSuperuser || grantLanDevicesBlock);
      let cantBlockDevice = (
        isBridge ||
        (isWired && cantBlockWired) ||
        userDoesNotHavePermission ||
        deviceDoesNotHavePermission
      );

      // Skip if offline for too long
      if (device.is_old) {
        return true;
      }
      lanDevsRow.append(
        $('<div>')
        .addClass('col-lg m-1 grey lighten-4').append(
          $('<div>').addClass('row pt-2').append(
            ((device.conn_type != undefined) ?
              $('<div>').addClass('col').append(
                (device.conn_type == 0) ?
                  $('<i>').addClass('fas fa-ethernet fa-lg') :
                  $('<i>').addClass('fas fa-wifi fa-lg'),
                (device.conn_type == 0) ?
                  $('<span>').html(`&nbsp ${t('Cable')}`) :
                  $('<span>').html('&nbsp Wi-Fi'),
              ) :
              $('<div>').addClass('col')
            ),
            $('<button>').addClass('btn btn-primary btn-sm my-0 col')
                         .addClass('btn-lan-dev-block')
                         .attr('data-mac', device.mac)
                         .attr('data-blocked', device.is_blocked)
                         .attr('type', 'button')
                         .prop('disabled', cantBlockDevice).append(
              (device.is_blocked) ?
                $('<i>').addClass('fas fa-lock fa-lg') :
                $('<i>').addClass('fas fa-lock-open fa-lg'),
              $('<span>').html('&nbsp Internet &nbsp'),
              (device.is_blocked) ?
                $('<span>')
                  .addClass('dev-block-status-text red-text')
                  .html(t('blocked', {context: 'female'})) :
                $('<span>')
                  .addClass('dev-block-status-text indigo-text')
                  .html(t('granted', {context: 'female'})),
            ),
          ),
          $('<div>').addClass('row pt-3').append(
            $('<div>').addClass('col-4').append(
              (device.is_online ?
                $('<i>').addClass('fas fa-circle green-text') :
                $('<i>').addClass('fas fa-circle red-text')),
              (device.is_online ?
                $('<span>').html('&nbsp Online') :
                $('<span>').html('&nbsp Offline')),
            ),
            (device.conn_speed && device.is_online ?
              $('<div>').addClass('col-8 text-right').append(
                $('<h6>').text(t('maxSpeedValue', {value: device.conn_speed})),
              ) : ''
            ),
          ),
          (hasSlaves ?
            $('<div>').addClass('row pt-2').append(
              $('<div>').addClass('col').append(
                $('<div>').addClass('badge primary-color')
                  .html(t('connectedToCpeMac', {mac: device.gateway_mac})),
              ),
          ) : ''),
          $('<div>').addClass('row pt-2').append(
            $('<div>').addClass('col').append(
              $('<button>').addClass('btn btn-primary btn-sm mx-0')
                           .attr('type', 'button')
                           .attr('data-toggle', 'collapse')
                           .attr('data-target', '#ipv4-collapse-' + idx)
                           .prop('disabled', !device.ip)
              .append(
                $('<i>').addClass('fas fa-search'),
                $('<span>').html('&nbsp IPv4'),
              ),
              $('<button>').addClass('btn btn-primary btn-sm')
                           .attr('type', 'button')
                           .attr('data-toggle', 'collapse')
                           .attr('data-target', '#ipv6-collapse-' + idx)
                           .prop('disabled', device.ipv6.length == 0)
              .append(
                $('<i>').addClass('fas fa-search'),
                $('<span>').html('&nbsp IPv6'),
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
                          t('Granted', {context: 'male'}) :
                          t('Blocked', {context: 'male'})),
                ) :
                ''
              ),
              // IPv4 section
              $('<div>').addClass('collapse')
                        .attr('id', 'ipv4-collapse-' + idx)
              .append(
                $('<div>').addClass('mt-2').append(
                  $('<h6>').text(device.ip),
                ),
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
                }),
              ),
            ),
          ),
          $('<div>').addClass('row pt-3 mb-2').append(
            $('<div>').addClass('col').append(
              $('<h6>').text(device.name),
              $('<h6>').text(device.dhcp_name),
              $('<h6>').text(device.mac),
            ),
            ((device.conn_type == 1 && device.is_online) ?
            $('<div>').addClass('col').append(
              $('<h6>').text(((device.wifi_freq) ?
                device.wifi_freq : t('notAvailable')) + ' GHz'),
              $('<h6>').text(device.wifi_mode ?
                t('modeValue', {value: device.wifi_mode}) :
                t('notAvailable')
              ),
              $('<h6>').text((device.wifi_signal ?
                t('signalValue', {value: device.wifi_signal}) :
                t('notAvailable')
              ) + ' dBm'),
              $('<h6>').text('SNR: ' + ((device.wifi_snr) ?
                device.wifi_snr : t('notAvailable')) + ' dB')
              .append(
                $('<span>').html('&nbsp'),
                ((device.wifi_snr >= 25) ?
                 $('<i>').addClass('fas fa-circle green-text') :
                 (device.wifi_snr >= 15) ?
                 $('<i>').addClass('fas fa-circle yellow-text') :
                 $('<i>').addClass('fas fa-circle red-text')
                ),
              ),
            ) :
            ''
            ),
          ),
        ),
      );
      countAddedDevs += 1;
      // Line break every 2 columns
      if (countAddedDevs % 2 == 0) {
        lanDevsRow.find('#empty-dev-cell').remove();
        lanDevsRow.append($('<div>').addClass('w-100'));
      } else {
        lanDevsRow.find('#empty-dev-cell').remove();
        lanDevsRow.append($('<div>').attr('id', 'empty-dev-cell')
                                    .addClass('col-lg m-1'));
      }
    });

    // Exhibit mesh routers if a mesh network exists
    // eslint-disable-next-line guard-for-in
    for (let routerMacKey in lanRouters) {
      // Do not show if empty
      if (!lanRouters[routerMacKey] || lanRouters[routerMacKey].length == 0) {
        continue;
      }
      // Skip if information is too old
      if (lanRouters[routerMacKey].is_old) {
        continue;
      }

      let lanRouterCard = $('<div>')
      .addClass('col-lg m-1 pb-2 grey lighten-4').append(
        $('<div>').addClass('row pt-2').append(
          $('<div>').addClass('col text-right').append(
            $('<div>').addClass('badge primary-color')
                      .html(t('connectionsOfMac', {mac: routerMacKey})),
          ),
        ),
      );
      $.each(lanRouters[routerMacKey], function(idx, router) {
        lanRouterCard.append(
          $('<div>').addClass('row m-0 mt-2').append(
            $('<div>').addClass('col p-0').append(
              $('<div>').addClass('badge primary-color-dark z-depth-0')
                        .html(t('connectionWithMac', {mac: router.mac})),
            ),
          ),
          $('<div>').addClass('row pt-2 m-0 mt-1 grey lighten-3').append(
            $('<div>').addClass('col').append(
              $('<h6>').text(router.iface == 1 ?
                t('notAvailable') :
                t('timeConnectedValue', {value:
                  secondsTimeSpanToHMS(router.conn_time),
                }),
              ),
              $('<h6>').text(router.iface == 1 ?
                t('notAvailable') :
                t('rxBytesValue', {value: router.rx_bytes})
              ),
              $('<h6>').text(router.iface == 1 ?
                t('notAvailable') :
                t('txBytesValue', {value: router.tx_bytes})
              ),
              $('<h6>').text(router.iface == 1 ?
                t('notAvailable') :
                t('signalValue', {value: (router.signal + ' dBm')})
              ),
            ),
            $('<div>').addClass('col').append(
              $('<h6>').text(t('downSpeedValue', {value: router.rx_bit})),
              $('<h6>').text(t('upSpeedValue', {value: router.tx_bit})),
              $('<h6>').text(router.latency > 0 ?
                t('latencyValue', {value: router.latency + ' ms'}) :
                t('notAvailable')
              ),
              $('<div>').addClass('mt-2').append(
                (router.iface == 1) ?
                  $('<i>').addClass('fas fa-ethernet fa-lg') :
                  $('<i>').addClass('fas fa-wifi fa-lg'),
                (router.iface == 1) ?
                  $('<span>').html(`&nbsp; ${t('Cable')}`) :
                  $('<span>').html('&nbsp; Wi-Fi ' +
                                   (router.iface == 2 ? '2.4' : '5.0') + 'GHz'),
              ),
            ),
          ),
        );
      });
      lanRoutersRow.append(lanRouterCard);
      countAddedRouters += 1;
      // Line break every 2 columns
      if (countAddedRouters % 2 == 0) {
        lanRoutersRow.append($('<div>').addClass('w-100'));
      }
    }

    // Placeholder if empty
    if ( lanDevsRow.is(':empty') && lanRoutersRow.is(':empty') ) {
      $('#lan-devices-placeholder-none').show();
    }
  };

  $(document).on('click', '.btn-lan-devices-modal', function(event) {
    let slaves = [];
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let serialid = row.data('serialid');
    let altuid = row.data('alt-uid-tr069');
    if (altuid) {
      serialid = altuid;
    }
    let isTR069 = row.data('is-tr069') === true; // cast to bool
    let isBridge = row.data('bridge-enabled') === t('Yes');
    let slaveCount = parseInt(row.data('slave-count'));
    let totalRouters = slaveCount + 1;
    if (slaveCount > 0) {
      slaves = JSON.parse(row.data('slaves').replace(/\$/g, '"'));
    }
    let upnpSupport = row.data('validate-upnp');
    lanDevicesGrantBlockWiredDevices = row.data('grant-block-wired-devices');
    lanDevicesGrantBlockDevices = row.data('grant-block-devices');
    $('#show-spam-error').hide();
    $('#lan-devices').attr('data-slaves', slaves);
    $('#lan-devices').attr('data-slaves-count', slaveCount);
    // Controls device exhibition after all data has arrived in mesh mode
    $('#lan-devices').attr('data-routers-synced', 0);

    $('#isBridgeDiv').html(row.data('bridge-enabled'));
    $('#lan-devices-placeholder-none').hide();
    // Progress info when syncing with multiple routers in mesh
    $('#lan-devices-placeholder-counter').text(
      '0 ' + t('Of') + ' ' + totalRouters);
    // Only display if mesh mode is active with multiple routers
    if (slaveCount == 0) $('.btn-group-lan-opts').hide();
    // Trigger lan device view
    $('.btn-show-lan-devs').trigger('click');
    // Refresh devices status
    if (isTR069) {
      $('#lan-devices-visual').text(serialid);
    } else {
      $('#lan-devices-visual').text(id);
    }
    $('#lan-devices-hlabel').text(id);
    refreshLanDevices(id, upnpSupport, isBridge);
  });

  $(document).on('click', '.btn-sync-lan', function(event) {
    let id = $('#lan-devices-hlabel').text();
    let upnpSupport = $('#lan-devices').data('validate-upnp');
    let isBridge = $('#isBridgeDiv').html() === t('Yes');

    $('#lan-devices').data('routers-synced', 0);
    clearTimeout(lanDevicesGlobalTimer);
    refreshLanDevices(id, upnpSupport, isBridge);
  });

  $(document).on('click', '.btn-show-lan-routers', function(event) {
    $('#lan-devices-body').hide();
    $('#lan-routers-body').show();
    $('.btn-show-lan-devs').removeClass('active');
    $('.btn-show-lan-routers').addClass('active');
  });

  $(document).on('click', '.btn-show-lan-devs', function(event) {
    $('#lan-routers-body').hide();
    $('#lan-devices-body').show();
    $('.btn-show-lan-routers').removeClass('active');
    $('.btn-show-lan-devs').addClass('active');
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
      let slaves = $('#lan-devices').data('slaves');
      if (id == macaddr || slaves.includes(macaddr)) {
        if ($('#lan-devices').data('cleanup') == true) {
          // Clear old data
          $('#lan-devices').data('cleanup', false);
          $('.btn-sync-lan').prop('disabled', false);
          $('.btn-sync-lan > i').removeClass('animated rotateOut infinite');
          $('#lan-devices').removeAttr('data-lan-devices-list');
          $('#lan-devices').removeData('lan-devices-list');
          $('#lan-devices').removeAttr('data-lan-routers-list');
          $('#lan-devices').removeData('lan-routers-list');
          $('#lan-devices-body').empty();
          $('#lan-routers-body').empty();
          $('#lan-devices-placeholder').show();
          $('#lan-devices-placeholder-none').hide();
        } else {
          $('#lan-devices-body').empty();
          $('#lan-routers-body').empty();
        }
        let upnpSupport = $('#lan-devices').data('validate-upnp');
        let hasSlaves = slaves ? true : false;
        let isBridge = $('#isBridgeDiv').html() === t('Yes');
        let totalSynced = $('#lan-devices').data('routers-synced');
        $('#lan-devices').data('routers-synced', totalSynced + 1);
        clearTimeout(lanDevicesGlobalTimer);
        fetchLanDevices(macaddr, upnpSupport, isBridge, hasSlaves);
      }
    }
  });

  // Restore default modal state
  $('#lan-devices').on('hidden.bs.modal', function() {
    $('#lan-devices').removeAttr('data-lan-devices-list');
    $('#lan-devices').removeData('lan-devices-list');
    $('#lan-devices').removeAttr('data-lan-routers-list');
    $('#lan-devices').removeData('lan-routers-list');
    $('#lan-devices').removeData('slaves');
    $('#lan-devices').removeData('slaves-count');
    $('#lan-devices').removeData('routers-synced');
    $('#lan-devices-body').empty();
    $('#lan-routers-body').empty();
    $('#lan-devices-placeholder').show();
    $('#lan-devices-placeholder-none').hide();
    $('.btn-sync-lan > i').removeClass('animated rotateOut infinite');
    $('.btn-sync-lan').prop('disabled', false);
    $('.btn-group-lan-opts').show();
    $('.btn-show-lan-routers').removeClass('active');
    $('.btn-show-lan-devs').addClass('active');
    clearTimeout(lanDevicesGlobalTimer);
  });
});
