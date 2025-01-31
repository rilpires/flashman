import {anlixDocumentReady} from '../src/common.index.js';
import 'jquery-mask-plugin';
import {tagsInput} from 'tags-input';
import {updateSearchResultsScheduler} from './show_upgrade_schedule_actions.js';
import {fillTotalDevicesFromSearch} from './show_data_collecting_actions.js';
import {displayAlertMsg,
        secondsTimeSpanToHMS,
        socket} from './common_actions.js';
import {
  setConfigStorage, getConfigStorage, deleteDNSServersList,
} from './session_storage.js';
import Stepper from 'bs-stepper';

const t = i18next.t;


// This regex is copied from controllers/handlers/util/
// xssValidationRegex.
const XSS_VALIDATION_REGEX = /^[^&\\"'`<>]{1,128}$/;


let downloadCSV = function(url, filename) {
  let downloadLink = document.createElement('a');
  downloadLink.download = filename;
  downloadLink.href = url;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
};

let refreshExtRefType = function(event) {
  let selectedSpan = $(event.target).closest('.input-group-btn')
                                    .find('span.selected');
  let selectedItem = $(event.target).closest('.ext-ref-type').find('.active');
  let inputField = $(event.target).closest('.input-group').find('input');
  selectedSpan.text($(this).text());
  selectedItem.removeClass('active primary-color');
  $(event.target).addClass('active primary-color');

  if ($(this).text() == t('personIdentificationSystem')) {
    $(document).off('keyup.' + inputField.attr('id'));
    inputField.mask(t('personIdentificationMask')).trigger('keyup');
  } else if ($(this).text() == t('enterpriseIdentificationSystem')) {
    $(document).off('keyup.' + inputField.attr('id'));
    inputField.mask(t('enterpriseIdentificationMask')).trigger('keyup');
  } else {
    $(document).off('keyup.' + inputField.attr('id'));
    inputField.unmask();
  }
};

let refreshLicenseStatus = function(event) {
  let row = $(event.target).parents('tr');
  let deviceId = row.data('deviceid');
  // If undefined it is a mesh slave entry
  if (deviceId == undefined) {
    deviceId = row.prev().data('deviceid');
  }
  let inputField = $(event.target).closest('.input-group').find('input');
  let thisBtn = $(this);
  thisBtn.attr('disabled', true);
  $.ajax({
    type: 'POST',
    url: '/devicelist/license',
    traditional: true,
    data: {id: deviceId},
    success: function(res) {
      thisBtn.attr('disabled', false);
      if (res.status === undefined) {
        inputField.val(t('Unknown'));
      } else if (res.status === true) {
        inputField.val(t('Active', {context: 'license'}));
      } else {
        inputField.val(t('Blocked', {context: 'license'}));
      }
    },
  });
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
        let options = {
          icon: 'warning',
          confirmButtonText: data.action_title,
          confirmButtonColor: '#4db6ac',
          cancelButtonText: t('Cancel'),
          cancelButtonColor: '#f2ab63',
          showCancelButton: true,
        };
        if (data.type === 'genieacs') {
          options.title = data.message;
          let error = data.message_error;
          if (error) error = error.replace(/\n/g, '<br>');
          options.html = error;
        } else {
          options.text = data.message;
        }
        swal.fire(options).then(function(result) {
          if (result.value) {
            let deleteNotification = function() {
              $.ajax({type: 'POST', url: '/notification/del',
                traditional: true, data: {id: data._id}})
              .done(() => {
                alertLink.addClass('d-none');
                fetchNotificationsForDevice(data.target);
              });
            };
            if (data.action_url && data.action_url != '/notification/del') {
              $.ajax({type: 'POST', url: data.action_url, traditional: true})
              .done(deleteNotification);
            } else {
              deleteNotification();
            }
          } else if (result.dismiss !== undefined && !data.seen) {
            $.ajax({type: 'POST', url: '/notification/seen',
              traditional: true, data: {id: data._id}})
            .done(() => {
              data.seen = true;
            });
          }
        });
      });
    }
  }
};

/* fetch notifications for a single device and sets triangle with exclamation
 mark. */
let fetchNotificationsForDevice = function(deviceId) {
  $.ajax({type: 'POST', url: '/notification/fetch', traditional: true,
    data: {targets: [deviceId]}})
  .done((response) => {
    let deviceTableContent = $('#devices-table-content');
    for (let notification of response.notifications) {
      changeDeviceStatusOnTable(deviceTableContent, deviceId, notification);
    }
  });
};

anlixDocumentReady.add(function() {
  // Enable tags on search input
  [].forEach.call(document.querySelectorAll('input[type="tags"]'), tagsInput);
  // The code below related to tags is because the tags-input plugin resets
  // all classes after loading
  $('.tags-input').addClass('form-control').css('padding', '0');
  $('.tags-input input').css('cssText', 'margin-top: 10px !important;');

  let role = $('#devices-table-content').data('role');
  let visibleColumnsOnPage = $('#devices-table-content')
    .data('visiblecolumnsonpage');
  let urlQueryFilterList = $('#devices-table-content')
    .data('urlqueryfilterlist');
  let isSuperuser = false;
  let enableDataCollecting = false;
  let grantFirmwareUpgrade = false;
  let grantMassFirmwareUpgrade = false;
  let grantNotificationPopups = false;
  let grantWifiInfo = false;
  let grantPPPoEInfo = false;
  let grantDeviceActions = false;
  let grantLOGAccess = false;
  let grantLanEditAccess = false;
  let grantLanDevsAccess = false;
  let grantSiteSurveyAccess = false;
  let grantSpeedMeasure = false;
  let grantDeviceRemoval = false;
  let grantDeviceMassRemoval = false;
  let grantDeviceLicenseBlock = false;
  let grantFactoryReset = false;
  let grantDeviceId = false;
  let grantPassShow = false;
  let grantOpmodeEdit = false;
  let grantVlan = 0;
  let grantStatistics = false;
  let grantShowSearchSummary = false;
  let grantWanType = false;
  let grantSlaveDisassociate = false;
  let mustBlockLicenseAtRemoval = false;
  let grantWanAdvancedInfo = 0;

  // For actions applied to multiple routers
  let selectedDevices = [];

  if ($('#devices-table-content').data('superuser')) {
    isSuperuser = $('#devices-table-content').data('superuser');
  }
  if ($('#devices-table-content').data('enabledatacollecting')) {
    enableDataCollecting = $('#devices-table-content')
      .data('enabledatacollecting');
  }
  if ($('#devices-table-content').data('role')) {
    grantFirmwareUpgrade = role.grantFirmwareUpgrade;
    grantMassFirmwareUpgrade = role.grantMassFirmwareUpgrade;
    grantNotificationPopups = role.grantNotificationPopups;
    grantWifiInfo = role.grantWifiInfo;
    grantPPPoEInfo = role.grantPPPoEInfo;
    grantDeviceActions = role.grantDeviceActions;
    grantLOGAccess = role.grantLOGAccess;
    grantLanEditAccess = role.grantLanEdit;
    grantLanDevsAccess = role.grantLanDevices;
    grantSiteSurveyAccess = role.grantSiteSurvey;
    grantDeviceRemoval = role.grantDeviceRemoval;
    grantDeviceMassRemoval = role.grantDeviceMassRemoval;
    grantDeviceLicenseBlock = role.grantDeviceLicenseBlock;
    grantFactoryReset = role.grantFactoryReset;
    grantDeviceId = role.grantDeviceId;
    grantPassShow = role.grantPassShow;
    grantSpeedMeasure = role.grantMeasureDevices;
    grantOpmodeEdit = role.grantOpmodeEdit;
    grantVlan = role.grantVlan;
    grantStatistics = role.grantStatisticsView;
    grantShowSearchSummary = role.grantShowSearchSummary;
    grantWanType = role.grantWanType;
    grantSlaveDisassociate = role.grantSlaveDisassociate;
    grantWanAdvancedInfo = role.grantWanAdvancedInfo;
  }

  // Default column to sort rows
  let columnToSort = '/sort-mac-addr';
  let columnSortType = '/sort-type-asc';
  $('#sort-mac-addr').append('\u2191').css('font-weight', 'Bold');

  $(document).on('click', '#card-header', function(event) {
    let plus = $(this).find('.fa-plus');
    let cross = $(this).find('.fa-times');
    plus.removeClass('fa-plus').addClass('fa-times');
    cross.removeClass('fa-times').addClass('fa-plus');
  });

  $(document).on('click', '.fa-chevron-down.device-table-row', function(event) {
    let slave = $(event.target).hasClass('slave-row');
    if (slave) {
      let target = $(event.target).parents('tr').next();
      target.removeClass('d-none');
    } else {
      let row = $(event.target).parents('tr');
      let index = row.data('index');
      let formId = '#form-' + index.toString();
      $(formId).removeClass('d-none');
      $('.slave-'+index).removeClass('d-none');
      // Clears the storage to prevent the case that the user refreshes the page
      // without closing the modal and opens the modal again
      deleteDNSServersList();
    }
    $(event.target).removeClass('fa-chevron-down')
                   .addClass('fa-chevron-up text-primary');
    // Stop event from reaching tr element
    event.stopPropagation();
  });

  $(document).on('click', '.fa-chevron-up.device-table-row', function(event) {
    let slave = $(event.target).hasClass('slave-row');
    if (slave) {
      let target = $(event.target).parents('tr').next();
      target.addClass('d-none');
    } else {
      let row = $(event.target).parents('tr');
      let index = row.data('index');
      let formId = '#form-' + index.toString();
      $(formId).addClass('d-none');
      $('.slave-'+index).addClass('d-none');
      let slaveCount = row.data('slave-count');
      for (let i = 0; i < slaveCount; i++) {
        row = row.next().next();
        row.find('.fa-chevron-up').trigger('click');
      }
    }
    $(event.target).removeClass('fa-chevron-up text-primary')
                   .addClass('fa-chevron-down');
    // Stop event from reaching tr element
    event.stopPropagation();
  });

  $(document).on('click', '.selectable-device-row', function(event) {
    let row = $(event.target).parents('tr');
    let deviceId = row.data('deviceid');
    if (row.hasClass('device-row-selected')) {
      row.removeClass('device-row-selected');
      row.css('background-color', '');
      // Remove device from action list
      let deviceIdx = selectedDevices.indexOf(deviceId);
      if (deviceIdx != -1) {
        selectedDevices.splice(deviceIdx, 1);
        if (selectedDevices.length == 0) {
          $('#btn-trash-multiple').addClass('disabled');
        }
      }
    } else {
      row.addClass('device-row-selected');
      row.css('background-color', 'gainsboro');
      // Add device to action list
      selectedDevices.push(deviceId.toUpperCase());
      $('#btn-trash-multiple').removeClass('disabled');
    }
  });

  $(document).on('click', '.ext-ref-type a', refreshExtRefType);

  $(document).on('click', '.btn-license-status-refresh', refreshLicenseStatus);

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

  $(document).on('click', '#btn-save-columns-on-page', function(event) {
    let selColumns = [];
    let elements = $('.dropdown-menu.dont-close a :checked');
    elements.each(function(index) {
      let columnId = $(this).attr('id');
      let columnNumber = columnId.split('-')[2];
      selColumns.push(columnNumber);
    });
    $.ajax({
      type: 'POST',
      url: '/user/visiblecolumnsperpage',
      traditional: true,
      data: {visiblecolumnsperpage: selColumns},
      success: function(res) {
        $('#save-columns-confirm').fadeTo('fast', 1, function() {
          $(this).fadeTo('slow', 0);
        });
      },
    });
  });

  $(document).on('click', '#export-csv', function(event) {
    let filterList = $('#devices-search-input').val();
    let exportURL = '/devicelist/export?filter=' +
                    encodeURIComponent(filterList);
    downloadCSV(exportURL, t('flashbox-cpes-list.csv'));
  });

  $(document).on('click', '.tab-switch-btn', function(event) {
    let tabId = $(this).data('tab-id');
    $(tabId).siblings().addClass('d-none');
    $(tabId).removeClass('d-none');
  });

  $(document).on('click', '#btn-upgrade-scheduler', function(event) {
    $('#upgrade-scheduler').modal('show');
  });

  $(document).on('click', '.btn-config-lan-dns-modal', function(event) {
    $('#config-lan-dns-modal.modal').modal('show');
  });

  $('#config-lan-dns-modal').on('hidden.bs.modal', function(event) {
    deleteDNSServersList();
  });

  $(document).on('click', '.btn-edit-submit', function(event) {
    deleteDNSServersList();
  });

  // Refresh table content
  $(document).on('click', '#refresh-table-content', function(event) {
    let pageNum = parseInt($('#curr-page-link').html());
    let filterList = $('#devices-search-input').val();
    filterList += ',' + columnToSort + ',' + columnSortType;
    loadDevicesTable(pageNum, filterList);
  });

  const updateSlavesRecursively = function(
    row, iter, update, status, remain, mac='', masterStatus,
  ) {
    if (iter < 0) {
      if (!update && masterStatus != 6 && masterStatus != 7 &&
        masterStatus != 20
      ) {
        // status 6 and 7 are special statuses that can happen before do_update
        // is activated
        // Activate dropdown
        row.find('.device-update .dropdown-toggle .selected').text(t('Choose'));
        row.find('.device-update .dropdown-toggle').attr('disabled', false);
        // Deactivate waiting status
        let upgradeStatus = row.find('span.upgrade-status');
        upgradeStatus.find('.status-none').removeClass('d-none');
        upgradeStatus.find('.status-waiting').addClass('d-none');
        upgradeStatus.find('.status-ok').addClass('d-none');
        upgradeStatus.find('.status-error').addClass('d-none');
        // Deactivate cancel button
        row.find('.btn-group .btn-cancel-update').attr('disabled', true);
        // Enable all disassoc buttons
        if (row.next().data('slaves').length > 0) {
          let slaveList = JSON.parse(row.next()
            .data('slaves').replaceAll('$', '"'));
          slaveList.forEach((s) => {
            $('tr[id="'+s+'"]').find('.btn-disassoc')
              .attr('disabled', false);
          });
        }
      } else {
        // Deactivate dropdown
        row.find('.device-update .dropdown-toggle').attr('disabled', true);
        // Disable all disassoc buttons
        if (row.next().data('slaves').length > 0) {
          let slaveList = JSON.parse(row.next()
            .data('slaves').replaceAll('$', '"'));
          slaveList.forEach((s) => {
            $('tr[id="'+s+'"]').find('.btn-disassoc')
              .attr('disabled', true);
          });
        }
        // Update waiting status
        let upgradeStatus = row.find('span.upgrade-status');
        upgradeStatus.find('.status-none').addClass('d-none');
        upgradeStatus.find('.status-waiting').addClass('d-none');
        upgradeStatus.find('.status-ok').addClass('d-none');
        upgradeStatus.find('.status-error').addClass('d-none');
        if ((status >= 2 && status <= 5) || masterStatus == 6 ||
          masterStatus == 7
        ) {
          // error statuses
          let slaveCount = row.data('slave-count');
          let progress = (remain === slaveCount+1) ? 0
            : slaveCount - remain + 1;
          let errorAnchor = upgradeStatus.find('.status-error');
          errorAnchor.attr('data-progress', progress);
          errorAnchor.attr('data-mac', mac);
          if (masterStatus == 6 || masterStatus == 7) {
            errorAnchor.attr('data-status', masterStatus);
          }
          errorAnchor.removeClass('d-none');
        } else if (status == 0 || status == 10 || masterStatus == 20) {
          upgradeStatus.find('.status-waiting').removeClass('d-none');
          let slaveCount = row.data('slave-count');
          let tooltip = t('upadatingCpe...');
          if (slaveCount) {
            if (masterStatus == 20) {
              tooltip = t('collectingTopology');
            } else {
              if (remain === 0) {
                // mesh v1 -> v2 update
                tooltip = t('waitingDevicesToBecomeOnline');
              } else {
                const currentDeviceNum = (slaveCount + 1 - remain) + 1;
                tooltip = t('updatingCpeXOfY...',
                  {x: currentDeviceNum, y: slaveCount+1});
              }
            }
          }
          upgradeStatus.find('.status-waiting').attr('title', tooltip);
        } else if (status == 1) {
          upgradeStatus.find('.status-ok').removeClass('d-none');
        }
        // Activate cancel button
        row.find('.btn-group .btn-cancel-update').attr('disabled', false);
      }
      return;
    }
    let slaveRow = row;
    for (let i = 0; i <= iter; i++) {
      slaveRow = slaveRow.next().next();
    }
    let localDeviceId = slaveRow.data('deviceid');
    $.ajax({
      url: '/devicelist/uiupdate/' + localDeviceId,
      type: 'GET',
      success: function(res) {
        slaveRow.find('.device-status')
          .removeClass('green-text red-text grey-text')
          .addClass(res.status_color + '-text');
        slaveRow.find('.device-wan-ip').html(res.wan_ip);
        slaveRow.find('.device-ip').html(res.ip);
        slaveRow.find('.device-installed-release').html(res.installed_release);
        let localUpdate = update;
        let localStatus = status;
        let localMac = mac;
        if (!localUpdate) {
          localUpdate = res.do_update;
          localStatus = res.do_update_status;
          localMac = res._id;
        }
        updateSlavesRecursively(row, iter-1, localUpdate,
          localStatus, remain, localMac, masterStatus);
      },
    });
  };

  // Refresh single row
  $(document).on('click', '.device-row-refresher', function(event) {
    let row = $(event.target).parents('tr');
    let deviceId = row.data('deviceid');
    let upstatusCmd = 'upstatus';
    let thisBtn = $(this);
    let sysUptime = row.find('.device-sys-up-time');
    let wanUptime = row.find('.device-wan-up-time');
    let ponSignal = row.find('.device-pon-signal');
    // Stop event from reaching tr element
    event.stopPropagation();
    // Block button until response has been received
    thisBtn.prop('disabled', true).css('color', 'grey');
    thisBtn.find('.icon-row-refresh').addClass('fa-spinner fa-pulse');
    // Dispatch update for wan and sys uptime only if not pending
    if (!sysUptime.hasClass('pending-update') &&
        !wanUptime.hasClass('pending-update') &&
        !ponSignal.hasClass('pending-update')) {
      $.ajax({
        url: '/devicelist/command/' + deviceId + '/' + upstatusCmd,
        type: 'post',
        dataType: 'json',
        success: function(res) {
          sysUptime.addClass('grey-text pending-update');
          wanUptime.addClass('grey-text pending-update');
          ponSignal.addClass('grey-text pending-update');
        },
      });
    }

    // fetch notifications and set triangle with exclamation mark.
    fetchNotificationsForDevice(deviceId);

    $.ajax({
      url: '/devicelist/uiupdate/' + deviceId,
      type: 'GET',
      success: function(res) {
        row.find('.device-status').removeClass('green-text red-text grey-text')
                                  .addClass(res.status_color + '-text');
        let wanip = res.wan_ip;
        let wanipv6 = res.wan_ipv6;

        // Assign both ipv4 and ipv6 to row
        row.find('.device-wan-ip').html(
          wanip +
          (wanipv6 ? '<br><h6 style="font-size:70%">' + wanipv6 + '</h6>' : ''),
        );

        row.find('.device-ip').html(res.ip);
        row.find('.device-installed-release').html(res.installed_release);
        row.find('.device-pppoe-user').html(res.pppoe_user);
        let slaveCount = row.data('slave-count');
        let resSlaveCount = (res.mesh_slaves) ? res.mesh_slaves.length : 0;
        if (slaveCount !== resSlaveCount) return;
        updateSlavesRecursively(
          row,
          slaveCount-1,
          res.do_update,
          res.do_update_status,
          res.mesh_update_remaining.length,
          deviceId,
          res.do_update_status,
        );
      },
      complete: function(xhr, status) {
        thisBtn.prop('disabled', false).css('color', 'black');
        thisBtn.find('.icon-row-refresh').removeClass('fa-spinner fa-pulse');
      },
    });
  });

  let changeDevicesColumnVisibility = function(changeTo, colNum) {
    let statusHCol = $('table#devices-table th:nth-child(' + colNum +')');
    let statusDCol = $('table#devices-table td:nth-child(' + colNum +')');
    if (changeTo === 'invisible') {
      statusHCol.hide();
      statusDCol.hide();
    } else if (changeTo === 'visible') {
      statusHCol.show();
      statusDCol.show();
    }
  };

  let applyVisibleColumns = function() {
    let allHideableCols = [];
    let elements = $('[id^=devices-column-]');
    elements.each(function(index) {
      let columnId = $(this).attr('id');
      let columnNumber = columnId.split('-')[2];
      $('#devices-column-' + columnNumber).prop('checked', true);
      changeDevicesColumnVisibility('visible', columnNumber);
      allHideableCols.push(columnNumber);
    });
    allHideableCols.forEach(function(index) {
      if (!visibleColumnsOnPage.includes(parseInt(index))) {
        $('#devices-column-' + index).prop('checked', false);
        changeDevicesColumnVisibility('invisible', index);
      }
    });
  };

  const buildRowData = function(device, index) {
    let rowAttr = 'id="' + device._id + '"';
    rowAttr += ' data-index="' + index + '"';
    rowAttr += ' data-is-tr069="'+device.use_tr069+'"';
    rowAttr += ' data-slave-count="' +
               (device.mesh_slaves ? device.mesh_slaves.length : 0) + '"';
    rowAttr += ' data-deviceid="' + device._id + '"';
    rowAttr += ' data-serialid="' + device.serial_tr069 + '"';
    if (device.alt_uid_tr069) {
      rowAttr += ' data-alt-uid-tr069="' + device.alt_uid_tr069 + '"';
    }
    return rowAttr;
  };

  const buildStatusClasses = function(device) {
    return 'fas fa-circle fa-lg device-status '+device.status_color;
  };

  const buildStatusAttributes = function(device) {
    return 'data-toggle="tooltip" title="' +
      new Date(device.last_contact).toString() + '"';
  };

  const buildNotification = function() {
    return '<a class="d-none">'+
      '<div class="fas fa-exclamation-triangle fa-lg orange-text '+
                  'device-alert animated heartBeat infinite">'+
      '</div>'+'<span>&nbsp;</span><span>&nbsp;</span>'+
    '</a>';
  };

  const buildPonSignalColumn = function(device, config,
  grantPonSignalSupport = false) {
    let ponSignalStatus;
    let ponSignalRxPower = `<span>${device.pon_rxpower}</span>`;
    if (device.pon_rxpower === undefined) {
      let st = t('NoSignal');
      ponSignalStatus = `<div class="badge badge-dark">${st}</div>`;
      ponSignalRxPower = '';
    } else if (device.pon_rxpower >= config.ponSignalThresholdCriticalHigh) {
      let st = t('SignalState', {state: 'VeryHigh'});
      ponSignalStatus = `<div class="badge bg-danger">${st}</div>`;
    } else if (device.pon_rxpower >= config.ponSignalThreshold) {
      let st = t('SignalState', {state: 'Good'});
      ponSignalStatus = `<div class="badge bg-success">${st}</div>`;
    } else if (device.pon_rxpower >= config.ponSignalThresholdCritical) {
      let st = t('SignalState', {state: 'Weak'});
      ponSignalStatus = `<div class="badge bg-warning">${st}</div>`;
    } else {
      let st = t('SignalState', {state: 'VeryWeak'});
      ponSignalStatus = `<div class="badge bg-danger">${st}</div>`;
    }
    let ponSignalStatusColumn = (grantPonSignalSupport) ? `
      <td>
        <div class="text-center align-items-center device-pon-signal">
          ${ponSignalRxPower}<br>
          ${ponSignalStatus} 
        </div>
      </td>
    ` : '<td></td>';
    return ponSignalStatusColumn;
  };

  const buildUpgradeCol = function(device, slaves=[]) {
    let upgradeOpts = '';
    for (let idx = 0; idx < device.releases.length; idx++) {
      let release = device.releases[idx];
      // Skip stock firmwares from being listed
      if (release.id === '9999-aix') {
        continue;
      }
      let slaveHasRelease = true;
      slaves.forEach((slave)=>{
        if (!slaveHasRelease) return;
        if (!slave.releases.find((r)=>r.id===release.id)) {
          slaveHasRelease = false;
        }
      });
      if (!slaveHasRelease) continue;
      upgradeOpts += '<a class="dropdown-item text-center">'+release.id+'</a>';
    }
    let upgradeCol = (!device.isUpgradeEnabled) ? '<td></td>':
    '<td>'+
      '<div class="btn-group device-update">'+
        '<button class="btn btn-sm px-2'+
        ' btn-cancel-update btn-danger" $NO_UPDATE>'+
          '<div class="fas fa-times"></div>'+
        '</button>'+
        '<div class="btn-group">'+
          '<button class="btn btn-sm btn-primary dropdown-toggle"'+
          ' type="button" data-toggle="dropdown" $NO_UPDATE_DROP>'+
            '<span class="selected">$UP_RELEASE</span>'+
          '</button>'+
          '<div class="dropdown-menu refresh-selected">'+upgradeOpts+'</div>'+
        '</div>'+
        '<span class="ml-3 upgrade-status">'+
          '<div class="fas fa-circle fa-2x white-text status-none $STATUS_NO">'+
          '</div>'+
          '<div data-toggle="tooltip" title="$TOOLTIP" '+
            'class="fas fa-spinner fa-2x fa-pulse status-waiting $STATUS_0">'+
          '</div>'+
          '<div '+
            'class="fas fa-check-circle fa-2x green-text status-ok $STATUS_1">'+
          '</div>'+
          '<a class="status-error $STATUS_2" $MESH_PARAMS>'+
            '<div class="fas fa-exclamation-circle fa-2x red-text"></div>'+
          '</a>'+
        '</span>'+
      '</div>'+
    '</td>';
    let meshCount = 1;
    const slaveCount = slaves.length;
    let currentDevice = device._id;
    let inProgress = device.do_update;
    let status = device.do_update_status;
    const masterStatus = device.do_update_status;
    let currentDeviceNum = slaveCount + 1;
    let tooltipMsg = t('upadatingCpe...');
    if (slaveCount) {
      if (device.mesh_next_to_update) {
        // get next device to update in mesh network
        currentDevice = device.mesh_next_to_update;
        if (currentDevice !== device._id) {
          // If currentDevice isn't master, look at slaves
          let currentSlave;
          for (let i=0; i<slaves.length; i++) {
            if (slaves[i]._id === currentDevice) {
              currentSlave = slaves[i];
              break;
            }
          }
          inProgress = currentSlave.do_update;
          status = currentSlave.do_update_status;
        }
        if (device.mesh_update_remaining && device.mesh_update_remaining.length
        ) {
          meshCount = device.mesh_update_remaining.length;
        }
        currentDeviceNum = slaveCount + 1 - meshCount + 1;
        tooltipMsg = t('updatingCpeXOfY...',
          {x: currentDeviceNum, y: slaveCount+1});
      } else {
        // Could be a normal update that has finished or could be mesh v1 -> v2
        // after all devices have begun download.
        let differentStatus = false;
        for (let i=0; i<slaves.length; i++) {
          if (slaves[i]._id === currentDevice) {
            if (slaves[i].do_update_status !== 1) {
              status = slaves[i].do_update_status;
              differentStatus = true;
              break;
            }
          }
        }
        if (differentStatus || masterStatus !== 1) {
          // this is a mesh v1 -> v2 update
          inProgress = true;
          tooltipMsg = t('waitingDevicesToBecomeOnline');
        } else {
          inProgress = false;
        }
      }
    }
    if (masterStatus == 6 || masterStatus == 7) {
      // Error status 6 and 7 are only saved on master device
      upgradeCol = upgradeCol.replace('$UP_RELEASE', device.release);
      upgradeCol = upgradeCol.replace('$NO_UPDATE', '');
      upgradeCol = upgradeCol.replace('$NO_UPDATE_DROP', 'disabled');
      upgradeCol = upgradeCol.replace('$STATUS_0', 'd-none');
      upgradeCol = upgradeCol.replace('$STATUS_1', 'd-none');
      upgradeCol = upgradeCol.replace('$STATUS_2', '');
      upgradeCol = upgradeCol.replace('$TOOLTIP', '');
      let meshParams = `data-progress="${currentDeviceNum}" 
        data-mac="${currentDevice}" data-status="${masterStatus}"`;
      upgradeCol = upgradeCol.replace('$MESH_PARAMS', meshParams);
    } else if (!inProgress && masterStatus == 20) {
      // Status 20 is only saved on master
      tooltipMsg = t('collectingTopology');
      upgradeCol = upgradeCol.replace('$UP_RELEASE', device.release);
      upgradeCol = upgradeCol.replace('$NO_UPDATE', '');
      upgradeCol = upgradeCol.replace('$NO_UPDATE_DROP', 'disabled');
      upgradeCol = upgradeCol.replace('$STATUS_0', '');
      upgradeCol = upgradeCol.replace('$STATUS_1', 'd-none');
      upgradeCol = upgradeCol.replace('$STATUS_2', 'd-none');
      upgradeCol = upgradeCol.replace('$TOOLTIP', tooltipMsg);
      upgradeCol = upgradeCol.replace('$MESH_PARAMS', '');
    } else if (inProgress) {
      upgradeCol = upgradeCol.replace('$UP_RELEASE', device.release);
      upgradeCol = upgradeCol.replace('$NO_UPDATE', '');
      upgradeCol = upgradeCol.replace('$NO_UPDATE_DROP', 'disabled');
      upgradeCol = upgradeCol.replace('$STATUS_NO', 'd-none');
      if ( status >= 2 && status <= 5) {
        // error statuses
        upgradeCol = upgradeCol.replace('$STATUS_0', 'd-none');
        upgradeCol = upgradeCol.replace('$STATUS_1', 'd-none');
        upgradeCol = upgradeCol.replace('$STATUS_2', '');
        upgradeCol = upgradeCol.replace('$TOOLTIP', '');
        if (slaveCount > 0) {
          let meshParams =
          `data-progress="${currentDeviceNum}" data-mac="${currentDevice}"`;
          upgradeCol = upgradeCol.replace('$MESH_PARAMS', meshParams);
        } else {
          upgradeCol = upgradeCol.replace('$MESH_PARAMS', '');
        }
      } else if (status == 0 || status == 10 || masterStatus == 20) {
        // Status 20 is only saved on master
        if (masterStatus == 20) {
          tooltipMsg = t('collectingTopology');
        }
        upgradeCol = upgradeCol.replace('$STATUS_0', '');
        upgradeCol = upgradeCol.replace('$STATUS_1', 'd-none');
        upgradeCol = upgradeCol.replace('$STATUS_2', 'd-none');
        upgradeCol = upgradeCol.replace('$TOOLTIP', tooltipMsg);
        upgradeCol = upgradeCol.replace('$MESH_PARAMS', '');
      } else if (status == 1) {
        upgradeCol = upgradeCol.replace('$STATUS_0', 'd-none');
        upgradeCol = upgradeCol.replace('$STATUS_1', '');
        upgradeCol = upgradeCol.replace('$STATUS_2', 'd-none');
        upgradeCol = upgradeCol.replace('$TOOLTIP', '');
        upgradeCol = upgradeCol.replace('$MESH_PARAMS', '');
      }
    } else {
      upgradeCol = upgradeCol.replace('$UP_RELEASE', t('Choose'));
      upgradeCol = upgradeCol.replace('$NO_UPDATE', 'disabled');
      upgradeCol = upgradeCol.replace('$NO_UPDATE_DROP', '');
      upgradeCol = upgradeCol.replace('$STATUS_NO', '');
      upgradeCol = upgradeCol.replace('$STATUS_0', 'd-none');
      upgradeCol = upgradeCol.replace('$STATUS_1', 'd-none');
      upgradeCol = upgradeCol.replace('$STATUS_2', 'd-none');
      upgradeCol = upgradeCol.replace('$TOOLTIP', '');
      upgradeCol = upgradeCol.replace('$MESH_PARAMS', '');
    }
    return upgradeCol;
  };

  const buildTableRowInfo = function(device, selectable,
                                     meshSlave=false, index=0, isTR069=false) {
    let rowClass = (meshSlave) ? 'd-none grey lighten-3 slave-'+index : '';
    let chevClass = (meshSlave) ? 'slave-row' : '';
    let selectableClass = (selectable) ?
      'selectable-device-row' : 'not-selectable-device-row';
    let refreshIcon = (meshSlave) ? '' :
    '<a class="device-row-refresher">'+
      '<div class="icon-row-refresh fas fa-sync-alt fa-lg hover-effect"></div>'+
    '</a>';
    let uid = device._id;
    if (device.use_tr069 && device.alt_uid_tr069) {
      uid = device.alt_uid_tr069;
    } else if (device.use_tr069) {
      uid = device.serial_tr069;
    }
    let infoRow =
    '<tr class=" ' + selectableClass + ' ' + rowClass +
    '" $REPLACE_ATTRIBUTES>'+
      '<td class="pl-1 pr-0">'+
        refreshIcon+
      '</td><td class="text-center">'+
        '<div class="fas fa-chevron-down fa-lg device-table-row hover-effect '+
          chevClass+'">'+
        '</div>'+
      '</td><td>'+
        '<div class="$REPLACE_COLOR_CLASS" $REPLACE_COLOR_ATTR>'+
        '<span>&nbsp;</span><span>&nbsp;</span>'+
        '$REPLACE_NOTIFICATIONS'+
        '</div>'+
        '<div class="badge teal primary-color">'+
          '$REPLACE_PILL_ICON'+
          '$REPLACE_PILL_TEXT'+
        '</div>'+
      '</td><td class="text-center device-pppoe-user">'+
        ((!device.pppoe_user) ? '' : device.pppoe_user) +
      '</td><td class="text-center">'+
        uid+

        // MAC address when TR-069
        // Add this information only if is TR-069 and uid is different than _id
        (device.use_tr069 && uid !== device._id ?
          '<br><h6 style="font-size:70%">' +
            t('MAC') + ': ' +
            device._id +
          '</h6>' : ''
        ) +

      '</td><td class="text-center device-wan-ip">'+
        device.wan_ip+
        (device.wan_ipv6 ?
          '<br><h6 style="font-size:70%">' + device.wan_ipv6 + '</h6>' : '') +
      '</td><td class="text-center device-ip">'+
        device.ip+
      '</td><td class="text-center device-installed-release">'+
        device.installed_release+
      '</td><td class="text-center">'+
        (device.external_reference ? device.external_reference.data : '')+
      '</td><td class="text-center device-sys-up-time">'+
        (device.sys_up_time && device.status_color !== 'grey-text' ?
          secondsTimeSpanToHMS(parseInt(device.sys_up_time)) : '') +
      '</td><td class="text-center device-wan-up-time">'+
        (device.wan_up_time && device.status_color !== 'grey-text' ?
          secondsTimeSpanToHMS(parseInt(device.wan_up_time)) : '')+
      '</td>'+
      '$REPLACE_PONSIGNAL'+
      '$REPLACE_UPGRADE'+
    '</tr>';
    return infoRow;
  };

  const buildRemoveDevice = function(small=false) {
    let smallClass = (small) ? 'btn-sm' : '';
    return '<button class="btn btn-danger '+
      smallClass+
    ' btn-trash m-0" type="button">'+
      '<i class="fas fa-trash"></i>'+
      '<span>&nbsp; '+
        t('Remove')+
      '</span>'+
    '</button>';
  };

  const buildDisassociateSlave = function(enable) {
    return '<button class="btn btn-danger btn-sm btn-disassoc m-0" '+
    'type="button"'+ (enable ? '' : 'disabled') + '>' +
      '<i class="fas fa-minus-circle"></i>'+
      '<span>&nbsp; '+t('Disassociate')+'</span>'+
    '</button>';
  };

  const buildMoreInfo = function(index, name) {
    return '<div class="row">'+
      '<div class="col text-right">'+
        '<button class="btn btn-primary mx-0 more-info-' +
            name +
            '-button" type="button">'+
          '<i class="fas fa-file-alt fa-lg"></i><span>&nbsp; '+
            t('MoreInfo')+
          '</span>'+
        '</button>'+
      '</div>'+
    '</div>';
  };

  const buildFormSubmit = function(index, mesh) {
    let meshClass = (mesh) ? 'edit-form-mesh' : '';
    return '<div class="row edit-button-'+index+'">'+
      '<div class="col text-right">'+
        '<button class="btn btn-primary mx-0 btn-edit-submit '+
          meshClass+'" type="submit">'+
          '<i class="fas fa-check fa-lg"></i><span>&nbsp; '+t('Edit')+'</span>'+
        '</button>'+
      '</div>'+
    '</div>';
  };

  const buildAboutTab = function(device, index, isTR069,
                                 hasExtendedChannels, mesh=-1) {
    let idIndex = ((mesh > -1) ? index + '_' + mesh : index); // Keep _ !
    let createdDateStr = '';
    let resetDateStr = '';
    if (isNaN(Date.parse(device.created_at))) {
      createdDateStr = t('notAvailable');
    } else {
      let createdDate = new Date(device.created_at);
      createdDateStr = createdDate.toLocaleDateString(
        document.documentElement.lang,
        {hour: '2-digit', minute: '2-digit'},
      );
    }
    if (isNaN(Date.parse(device.last_hardreset))) {
      resetDateStr = t('notAvailable');
    } else {
      let resetDate = new Date(device.last_hardreset);
      resetDateStr = resetDate.toLocaleDateString(
        document.documentElement.lang,
        {hour: '2-digit', minute: '2-digit'},
      );
    }
    let lastReset = '<div class="md-form input-entry pt-1">'+
      '<label class="active">'+t('lastCpeResetDoneAt')+'</label>'+
      '<input class="form-control" type="text" '+
      'disabled value="'+resetDateStr+'">'+
      '<div class="invalid-feedback"></div>'+
    '</div>';
    let aboutTab = '<div class="row">'+
      '<div class="col-6">'+
        '<div class="md-form input-entry pt-1">'+
          '<label class="active">'+t('cpeRegisterCreatedAt')+'</label>'+
          '<input class="form-control" type="text" '+
          'disabled value="'+createdDateStr+'">'+
          '<div class="invalid-feedback"></div>'+
        '</div>'+
        '<div class="md-form input-group input-entry">'+
          '<div class="input-group-btn">'+
            '<button class="btn btn-primary dropdown-toggle ml-0 my-0" '+
            'type="button" data-toggle="dropdown" $REPLACE_EN_ID>'+
              '<span class="selected" id="edit_ext_ref_type_selected-'+
                idIndex+
              '">'+
                (device.external_reference ? device.external_reference.kind :
                  t('personIdentificationSystem'))+
              '</span>'+
            '</button>'+
            '<div class="dropdown-menu ext-ref-type">'+
              '<a class="dropdown-item text-center $REPLACE_ID_CPF">'+
                t('personIdentificationSystem')+
              '</a>'+
              '<a class="dropdown-item text-center $REPLACE_ID_CNPJ">'+
                t('enterpriseIdentificationSystem')+
              '</a>'+
              '<a class="dropdown-item text-center $REPLACE_ID_OTHER">'+
                t('Other')+
              '</a>'+
            '</div>'+
          '</div>'+
          '<input class="form-control py-0 added-margin" type="text" '+
            'id="edit_external_reference-'+idIndex+
            '" placeholder="'+t('clientIdOptional')+'" '+
            'maxlength="256" value="$REPLACE_ID_VAL" $REPLACE_EN_ID>'+
          '</input>'+
          '<div class="invalid-feedback"></div>'+
        '</div>'+
        (!isTR069 ?
        '<div class="md-form input-group input-entry">'+
          '<label class="active">'+t('licenseStatusIs')+'</label>' +
          '<input class="form-control py-0 added-margin" type="text" '+
            'id="edit_license_status-'+idIndex+
            '" placeholder="'+t('Unknown')+'" '+
            'disabled value="$REPLACE_LICENSE_STATUS_VAL">'+
          '</input>'+
          '<div class="input-group-append">'+
            '<button '+
              'class="btn btn-primary mr-0 my-0 btn-license-status-refresh" '+
              'type="button">' +
                '<i class="fas fa-sync-alt"></i>'+
            '</button>'+
          '</div>'+
          '<div class="invalid-feedback"></div>'+
        '</div>':
        ''
        )+
        (mesh > -1 ?
          '<div class="md-form">'+
            '<div class="input-group">'+
              '<div class="md-selectfield form-control my-0">'+
                '<label class="text-primary active">'+
                  t('wifiXGhzChannel', {x: 2.4})+
                '</label>'+
                '<select class="browser-default md-select" '+
                  'id="edit_wifi_channel-'+idIndex+'" '+
                  '$REPLACE_WIFI_EN>'+
                    '<option value="auto" $REPLACE_SELECTED_CHANNEL_auto$>'+
                      t('auto')+
                    '</option>'+
                    '<option value="1" $REPLACE_SELECTED_CHANNEL_1$>1</option>'+
                    '<option value="2" $REPLACE_SELECTED_CHANNEL_2$>2</option>'+
                    '<option value="3" $REPLACE_SELECTED_CHANNEL_3$>3</option>'+
                    '<option value="4" $REPLACE_SELECTED_CHANNEL_4$>4</option>'+
                    '<option value="5" $REPLACE_SELECTED_CHANNEL_5$>5</option>'+
                    '<option value="6" $REPLACE_SELECTED_CHANNEL_6$>6</option>'+
                    '<option value="7" $REPLACE_SELECTED_CHANNEL_7$>7</option>'+
                    '<option value="8" $REPLACE_SELECTED_CHANNEL_8$>8</option>'+
                    '<option value="9" $REPLACE_SELECTED_CHANNEL_9$>9</option>'+
                    '<option value="10" $REPLACE_SELECTED_CHANNEL_10$>'+
                      '10'+
                    '</option>'+
                    '<option value="11" $REPLACE_SELECTED_CHANNEL_11$>'+
                      '11'+
                    '</option>'+
                    (hasExtendedChannels ?
                      '<option value="12" $REPLACE_SELECTED_CHANNEL_12$>'+
                        '12'+
                      '</option>'+
                      '<option value="13" $REPLACE_SELECTED_CHANNEL_13$>'+
                        '13'+
                      '</option>':
                      ''
                    )+
                '</select>'+
              '</div>'+
            '</div>'+
          '</div>'+
          (device.permissions.grantWifi5ghz ?
          '<div class="md-form">'+
            '<div class="input-group">'+
              '<div class="md-selectfield form-control my-0">'+
                '<label class="text-primary active">'+
                  t('wifiXGhzChannel', {x: '5.0'})+
                '</label>'+
                '<select class="browser-default md-select" '+
                  'id="edit_wifi5_channel-'+idIndex+'" '+
                  '$REPLACE_WIFI5_EN>'+
                    '<option value="auto" $REPLACE_SELECTED_CHANNEL5_auto$>'+
                      t('auto')+
                    '</option>'+
                    device.permissions.grantWifi5ChannelList.reduce(
                      (result, channel)=>result+(
                        '<option value="' + channel +
                          '" $REPLACE_SELECTED_CHANNEL5_' + channel + '$>' +
                          channel +
                        '</option>'),
                      '',
                    )+
                '</select>'+
              '</div>'+
            '</div>'+
          '</div>':
          ''
          ):
          ''
        )+
      '</div>'+
      '<div class="col-6">'+
        '$REPLACE_RESET_DATE'+
        '<div class="md-form input-entry pt-1">'+
          '<label class="active">'+t('Model')+'</label>'+
          '<input class="form-control" type="text" maxlength="32" '+
          'disabled value="'+(device.model_alias?
            device.model_alias:device.model)+'">'+
          '<div class="invalid-feedback"></div>'+
        '</div>'+
        '<div class="md-form input-entry">'+
          // If the model has hardware version info, then
          // renders two columns on a row to display firmware and
          // hardware versions side by side
          '<div class="row">'+
            '<div class="col">'+
              // Firmware version info
              '<label class="active">'+
                ((isTR069) ? t('firmwareVersion') : t('flashboxVersion'))+
              '</label>'+
              '<input class="form-control" type="text" maxlength="32" '+
              'disabled value="'+device.version+'">'+
              '<div class="invalid-feedback"></div>'+
            '</div>'+
            // Display hardware version info, if exists
            ((isTR069 && device.hw_version) ?
            '<div class="col">'+
              // Hardware version info
              '<label class="active">'+t('hardwareVersion')+'</label>'+
              '<input class="form-control" type="text" maxlength="32" '+
              'disabled value="'+device.hw_version+'">'+
              '<div class="invalid-feedback"></div>'+
            '</div>' : '') +
          '</div>'+
        '</div>'+
        (mesh > -1 ?
          '<div class="md-form">'+
            '<div class="input-group">'+
              '<div class="md-selectfield form-control my-0">'+
                '<label class="text-primary active">'+
                  t('xGhzSignalStrength', {x: 2.4})+
                '</label>'+
                '<select class="browser-default md-select" '+
                  'id="edit_wifi_power-'+idIndex+'" '+
                  '$REPLACE_WIFI_POWER_EN>'+
                    '<option value="100" $REPLACE_SELECTED_POWER_100$>'+
                      '100%'+
                    '</option>'+
                    '<option value="75"  $REPLACE_SELECTED_POWER_75$>'+
                      '75%'+
                    '</option>'+
                    '<option value="50"  $REPLACE_SELECTED_POWER_50$>'+
                      '50%'+
                    '</option>'+
                    '<option value="25"  $REPLACE_SELECTED_POWER_25$>'+
                      '25%'+
                    '</option>'+
                '</select>'+
              '</div>'+
            '</div>'+
          '</div>'+
          (device.permissions.grantWifi5ghz ?
          '<div class="md-form">'+
            '<div class="input-group">'+
              '<div class="md-selectfield form-control my-0">'+
                '<label class="text-primary active">'+
                  t('xGhzSignalStrength', {x: '5.0'})+
                '</label>'+
                '<select class="browser-default md-select" '+
                  'id="edit_wifi5_power-'+idIndex+'" '+
                  '$REPLACE_WIFI5_POWER_EN>'+
                    '<option value="100" $REPLACE_SELECTED_POWER5_100$>'+
                      '100%'+
                    '</option>'+
                    '<option value="75"  $REPLACE_SELECTED_POWER5_75$>'+
                      '75%'+
                    '</option>'+
                    '<option value="50"  $REPLACE_SELECTED_POWER5_50$>'+
                      '50%'+
                    '</option>'+
                    '<option value="25"  $REPLACE_SELECTED_POWER5_25$>'+
                      '25%'+
                    '</option>'+
                '</select>'+
              '</div>'+
            '</div>'+
          '</div>':
          ''
          ):
          ''
        )+
      '</div>'+
    '</div>';
    if (!isTR069) {
      aboutTab = aboutTab.replace('$REPLACE_RESET_DATE', lastReset);
    } else {
      aboutTab = aboutTab.replace('$REPLACE_RESET_DATE', '');
    }
    if (device.external_reference) {
      aboutTab = aboutTab.replace('$REPLACE_ID_VAL',
                                  device.external_reference.data);
    } else {
      aboutTab = aboutTab.replace('$REPLACE_ID_VAL', '');
    }
    if (device.is_license_active !== undefined) {
      let licenseStatusStr = device.is_license_active ?
        t('Active', {context: 'license'}) : t('Blocked', {context: 'license'});
      aboutTab = aboutTab.replace('$REPLACE_LICENSE_STATUS_VAL',
                                  licenseStatusStr);
    } else {
      aboutTab = aboutTab.replace('$REPLACE_LICENSE_STATUS_VAL', t('Unknown'));
    }
    if (!device.external_reference ||
        device.external_reference.kind === t('personIdentificationSystem')
    ) {
      aboutTab = aboutTab.replace('$REPLACE_ID_CPF', 'primary-color active');
      aboutTab = aboutTab.replace('$REPLACE_ID_CNPJ', '');
      aboutTab = aboutTab.replace('$REPLACE_ID_OTHER', '');
    } else if (
      device.external_reference &&
      device.external_reference.kind === t('enterpriseIdentificationSystem')
    ) {
      aboutTab = aboutTab.replace('$REPLACE_ID_CPF', '');
      aboutTab = aboutTab.replace('$REPLACE_ID_CNPJ', 'primary-color active');
      aboutTab = aboutTab.replace('$REPLACE_ID_OTHER', '');
    } else if (device.external_reference &&
               device.external_reference.kind === t('Other')
    ) {
      aboutTab = aboutTab.replace('$REPLACE_ID_CPF', '');
      aboutTab = aboutTab.replace('$REPLACE_ID_CNPJ', '');
      aboutTab = aboutTab.replace('$REPLACE_ID_OTHER', 'primary-color active');
    }
    // Channel change only possible in cable only mesh mode
    if ((!isSuperuser && grantWifiInfo <= 1) || (device.mesh_mode !== 1)) {
      aboutTab = aboutTab.replace(/\$REPLACE_WIFI_EN/g, 'disabled');
      aboutTab = aboutTab.replace(/\$REPLACE_WIFI5_EN/g, 'disabled');
    } else {
      aboutTab = aboutTab.replace(/\$REPLACE_WIFI_EN/g, '');
      aboutTab = aboutTab.replace(/\$REPLACE_WIFI5_EN/g, '');
    }
    if (!device.permissions.grantWifiPowerHiddenIpv6Box ||
       (!isSuperuser && grantWifiInfo <= 1)) {
      aboutTab = aboutTab.replace(/\$REPLACE_WIFI_POWER_EN/g, 'disabled');
      aboutTab = aboutTab.replace(/\$REPLACE_WIFI5_POWER_EN/g, 'disabled');
    } else {
      aboutTab = aboutTab.replace(/\$REPLACE_WIFI_POWER_EN/g, '');
      if (device.wifi_channel_5ghz == 'auto') {
        aboutTab = aboutTab.replace(/\$REPLACE_WIFI5_POWER_EN/g, 'disabled');
      } else {
        aboutTab = aboutTab.replace(/\$REPLACE_WIFI5_POWER_EN/g, '');
      }
    }

    let selectTarget = '$REPLACE_SELECTED_CHANNEL_' + device.wifi_channel;
    aboutTab = aboutTab.replace(selectTarget, 'selected="selected"');
    aboutTab = aboutTab.replace(/\$REPLACE_SELECTED_CHANNEL_.*?\$/g, '');
    selectTarget = '$REPLACE_SELECTED_CHANNEL5_' + device.wifi_channel_5ghz;
    aboutTab = aboutTab.replace(selectTarget, 'selected="selected"');
    aboutTab = aboutTab.replace(/\$REPLACE_SELECTED_CHANNEL5_.*?\$/g, '');
    selectTarget = '$REPLACE_SELECTED_POWER_' + device.wifi_power;
    aboutTab = aboutTab.replace(selectTarget, 'selected="selected"');
    aboutTab = aboutTab.replace(/\$REPLACE_SELECTED_POWER_.*?\$/g, '');
    selectTarget = '$REPLACE_SELECTED_POWER5_' + device.wifi_power_5ghz;
    aboutTab = aboutTab.replace(selectTarget, 'selected="selected"');
    aboutTab = aboutTab.replace(/\$REPLACE_SELECTED_POWER5_.*?\$/g, '');

    return aboutTab;
  };

  let loadDevicesTable = function(selelectedPage=1, filterList='') {
    let deviceTableContent = $('#devices-table-content');
    let deviceTablePagination = $('#devices-table-pagination');
    // Clean all elements before loading
    deviceTableContent.empty();
    deviceTablePagination.empty();
    // Start loading animation
    deviceTableContent.append(
      $('<tr>').append(
        $('<td>').attr('colspan', '13')
        .addClass('grey lighten-5 text-center')
        .append(
          $('<h3>').append(
            $('<i>').addClass('fas fa-spinner fa-pulse fa-2x grey-text'),
          ),
        ),
      ),
    );
    $.ajax({
      url: '/devicelist/search?page=' + selelectedPage,
      type: 'PUT',
      data: {filter_list: filterList},
      success: function(res) {
        if (res.type !== 'success') {
          displayAlertMsg(res);
          return;
        }
        setConfigStorage(
          'mustBlockLicenseAtRemoval', res.mustBlockLicenseAtRemoval);
        setConfigStorage('ssidPrefix', res.ssidPrefix);
        setConfigStorage('isSsidPrefixEnabled', res.isSsidPrefixEnabled);
        // ssid prefix in new device form
        if (res.isSsidPrefixEnabled) {
          $('#ssid_prefix').text(res.ssidPrefix);
          $('#ssid_prefix_div').removeClass('d-none');
          $('#ssid_prefix_div').addClass('d-block');
          $('#ssid_label').addClass('active');
        }
        // Stop loading animation
        deviceTableContent.empty();
        // Just fill not found message if there are no devices found
        if (res.devices.length == 0) {
          deviceTableContent.html(
            '<tr><td class="grey lighten-5 text-center" colspan="13">'+
              '<h5>'+t('noCpeFound')+'</h5>'+
            '</td></tr>',
          );
          // Attach elements back to DOM after manipulation
          $('#devices-table').append(deviceTableContent);
          return false;
        }

        // fill amount of devices from result.
        fillTotalDevicesFromSearch(res.status.totalnum);

        // Fill multiple update form
        updateSearchResultsScheduler(res);
        let finalHtml = '';
        // Fill status row
        let allUpgrade = '<td>'+
          '<div class="btn-group">'+
            '<div class="btn-group" id="all-devices">'+
              '<button class="btn btn-primary btn-sm px-3 py-2 teal darken-5" '+
                'id="btn-upgrade-scheduler">'+
                  '<i class="fas fa-clock fa-lg"></i>'+
                  '<span>&nbsp; &nbsp; '+t('updateMany')+'</span>'+
              '</button>'+
            '</div>'+
          '</div>'+
        '</td>';
        let searchSummary = '<td class="text-center">'+
          res.status.totalnum+' total'+
        '</td><td>'+
          '<div class="fas fa-circle green-text"></div>'+
          '<span>&nbsp;</span>'+
          '<a href="#" id="online-status-sum">'+res.status.onlinenum+'</a>'+
          '<br>'+
          '<div class="fas fa-circle red-text"></div>'+
          '<span>&nbsp;</span>'+
          '<a href="#" id="recovery-status-sum">'+res.status.recoverynum+'</a>'+
          '<br>'+
          '<div class="fas fa-circle grey-text"></div>'+
          '<span>&nbsp;</span>'+
          '<a href="#" id="offline-status-sum">'+res.status.offlinenum+'</a>'+
        '</td>';

        let statusRow = '<tr class="not-selectable-device-row">'+
          '<td class="pl-1 pr-0">'+
            '<a id="refresh-table-content">'+
              '<div class="fas fa-sync-alt fa-lg mt-2 hover-effect"></div>'+
            '</a>'+
          '</td>'+
          '$REPLACE_SEARCHSUMMARY'+
          '<td></td>'+
          '<td></td>'+
          '<td></td>'+
          '<td></td>'+
          '<td></td>'+
          '<td></td>'+
          '<td></td>'+
          '<td></td>'+
          '<td></td>'+
          '$REPLACE_ALLUPDATE'+
        '</tr>';
        if (isSuperuser || grantShowSearchSummary) {
          statusRow = statusRow.replace('$REPLACE_SEARCHSUMMARY',
                                        searchSummary);
        } else {
          statusRow = statusRow.replace('$REPLACE_SEARCHSUMMARY',
                                        '<td></td><td></td>');
        }
        if (isSuperuser || (grantFirmwareUpgrade && grantMassFirmwareUpgrade)) {
          statusRow = statusRow.replace('$REPLACE_ALLUPDATE', allUpgrade);
        } else {
          statusRow = statusRow.replace('$REPLACE_ALLUPDATE', '');
        }
        finalHtml += statusRow;
        let index = 0;
        // Fill remaining rows with devices
        for (let idx = 0; idx < res.devices.length; idx += 1) {
          let device = res.devices[idx];
          if (device.mesh_master !== '' && device.mesh_master !== undefined) {
            // Skip mesh slaves, master draws their form
            continue;
          }
          let isTR069 = device.use_tr069;
          let ponRXPower = device.pon_rxpower;
          let grantWifiModeRead = device.permissions.grantWifiModeRead;
          let grantWifiModeEdit = device.permissions.grantWifiModeEdit;
          let grantWifiBandRead2 = device.permissions.grantWifiBandRead2;
          let grantWifiBandRead5 = device.permissions.grantWifiBandRead5;
          let grantWifiBandEdit2 = device.permissions.grantWifiBandEdit2;
          let grantWifiBandEdit5 = device.permissions.grantWifiBandEdit5;
          let grantWifiBandAuto2 = device.permissions.grantWifiBandAuto2;
          let grantWifiBandAuto5 = device.permissions.grantWifiBandAuto5;
          let grantWifi2ghzEdit = device.permissions.grantWifi2ghzEdit;
          let grantWifi5ghz = device.permissions.grantWifi5ghz;
          let grantWifiState = device.permissions.grantWifiState;
          let grantWifiPowerHiddenIpv6Box =
            (device.use_tr069) ? false :
            device.permissions.grantWifiPowerHiddenIpv6Box;
          let grantWifiExtendedChannels =
            device.permissions.grantWifiExtendedChannels;
          let grantWifi5ChannelList = device.permissions.grantWifi5ChannelList;
          let grantDeviceLanRead = device.permissions.grantLanRead;
          let grantDeviceLanEdit = device.permissions.grantLanEdit;
          let grantLanGwEdit = device.permissions.grantLanGwEdit;
          let grantRebootAfterWANChange =
            device.permissions.grantRebootAfterWANChange;
          let grantOpmode = device.permissions.grantOpmode;
          let grantPortForwardAsym = device.permissions.grantPortForwardAsym;
          let grantPortOpenIpv6 = device.permissions.grantPortOpenIpv6;
          let grantViewLogs = device.permissions.grantViewLogs;
          let grantResetDevices = device.permissions.grantResetDevices;
          let grantPortForward = device.permissions.grantPortForward;
          let grantPingTest = device.permissions.grantPingTest;
          let grantTraceroute = device.permissions.grantTraceroute;
          let grantLanDevices = device.permissions.grantLanDevices;
          let grantLanDnsEdit = device.permissions.grantLanDnsEdit;
          let grantSiteSurvey = device.permissions.grantSiteSurvey;
          let grantUpnpSupport = device.permissions.grantUpnp;
          let grantDeviceSpeedTest = device.permissions.grantSpeedTest;
          let grantVlanSupport = device.permissions.grantVlanSupport;
          let grantStatisticsSupport =
            device.permissions.grantStatisticsSupport;
          let grantPonSignalSupport = device.permissions.grantPonSignalSupport;
          let grantMeshMode = device.permissions.grantMeshMode;
          let grantMeshV2PrimModeCable = device.permissions
            .grantMeshV2PrimaryModeCable;
          let grantMeshV2PrimModeWifi = device.permissions
            .grantMeshV2PrimaryModeWifi;
          let grantBlockWiredDevices =
            device.permissions.grantBlockWiredDevices;
          let grantBlockDevices = device.permissions.grantBlockDevices;
          let grantWiFiAXSupport = device.permissions.grantWiFiAXSupport;
          let grantDiacritics = device.permissions.grantDiacritics;
          let grantSsidSpaces = device.permissions.grantSsidSpaces;
          // WAN MTU and VLAN Id an MAC Information
          let grantDeviceWanMacRead = device.permissions.grantWanMacRead;
          let grantDeviceWanMtuRead = device.permissions.grantWanMtuRead;
          let grantDeviceWanVlanRead = device.permissions.grantWanVlanRead;
          let grantDeviceWanMtuEdit =
            grantDeviceWanMtuRead && device.permissions.grantWanMtuEdit;
          let grantDeviceWanVlanEdit =
            grantDeviceWanVlanRead && device.permissions.grantWanVlanEdit;
          // WAN and LAN Information
          let grantWanLanInformation =
            device.permissions.grantWanLanInformation;

          let rowAttr = buildRowData(device, index);
          let statusClasses = buildStatusClasses(device);
          let statusAttributes = buildStatusAttributes(device);
          let notifications = buildNotification();

          let grantWanMtuEdit = (grantDeviceWanMtuEdit &&
            (isSuperuser || grantWanAdvancedInfo >= 2));
          let grantWanVlanEdit = (grantDeviceWanVlanEdit &&
            (isSuperuser || grantWanAdvancedInfo >= 2));
          let grantWanMtuRead = (grantDeviceWanMtuRead &&
            (isSuperuser || grantWanAdvancedInfo >= 1));
          let grantWanVlanRead = (grantDeviceWanVlanRead &&
            (isSuperuser || grantWanAdvancedInfo >= 1));

          let slaves = [];
          let isSelectableRow = true;
          if (device.mesh_slaves && device.mesh_slaves.length > 0) {
            slaves = res.devices.filter((d) => {
              return device.mesh_slaves.includes(d._id);
            });
            isSelectableRow = false;
          }
          if (!isSuperuser && !grantDeviceMassRemoval) {
            isSelectableRow = false;
          }
          let upgradeCol = buildUpgradeCol(device, slaves);
          let ponSignalCol = buildPonSignalColumn(device, res.ponConfig,
                                                  grantPonSignalSupport);
          let infoRow = buildTableRowInfo(device, isSelectableRow,
                                          false, 0, isTR069);
          infoRow = infoRow.replace('$REPLACE_ATTRIBUTES', rowAttr);
          infoRow = infoRow.replace('$REPLACE_COLOR_CLASS', statusClasses);
          infoRow = infoRow.replace('$REPLACE_COLOR_ATTR', statusAttributes);
          infoRow = infoRow.replace('$REPLACE_PONSIGNAL', ponSignalCol);
          if (isSuperuser || grantNotificationPopups) {
            infoRow = infoRow.replace('$REPLACE_NOTIFICATIONS', notifications);
          } else {
            infoRow = infoRow.replace('$REPLACE_NOTIFICATIONS', '');
          }
          if (isSuperuser || grantFirmwareUpgrade) {
            infoRow = infoRow.replace('$REPLACE_UPGRADE', upgradeCol);
          } else {
            infoRow = infoRow.replace('$REPLACE_UPGRADE', '');
          }
          if (isTR069) {
            // Undefined treats legacy cases - which are all HTTPS
            infoRow = infoRow.replace(
              '$REPLACE_PILL_TEXT', '<span>&nbsp; TR-069</span>',
            );
            if (
              typeof device.secure_tr069 === 'undefined' || device.secure_tr069
            ) {
              infoRow = infoRow.replace(
                '$REPLACE_PILL_ICON',
                '<div class="fas fa-lock text-white"></div>',
              );
            } else {
              infoRow = infoRow.replace(
                '$REPLACE_PILL_ICON',
                '<div class="fas fa-lock-open text-white"></div>',
              );
            }
          } else {
            infoRow = infoRow.replace('$REPLACE_PILL_ICON', '');
            infoRow = infoRow.replace('$REPLACE_PILL_TEXT', 'Firmware');
          }

          finalHtml += infoRow;

          let formAttr = 'id="form-'+index+'"';
          formAttr += ' data-index="'+index+'"';
          formAttr += ' data-deviceid="'+device._id+'"';
          formAttr += ' data-serialid="'+device.serial_tr069+'"';
          if (device.alt_uid_tr069) {
            formAttr += ' data-alt-uid-tr069="'+device.alt_uid_tr069+'"';
          }
          formAttr += ' data-lan-subnet="'+device.lan_subnet+'"';
          formAttr += ' data-lan-submask="'+device.lan_netmask+'"';
          formAttr += ' data-lan-dns="'+device.lan_dns_servers+'"';
          formAttr += ' data-is-tr069="'+device.use_tr069+'"';
          formAttr += ' data-slave-count="'+
            ((device.mesh_slaves) ? device.mesh_slaves.length : 0)+'"';
          formAttr += ' data-slaves="'+
            ((device.mesh_slaves) ?
              JSON.stringify(device.mesh_slaves).replace(/"/g, '$') : '')+'"';
          formAttr += ' data-validate-wifi-diacritics="'+grantDiacritics+'"';
          formAttr += ' data-validate-wifi-space="'+grantSsidSpaces+'"';
          formAttr += ' data-validate-wifi="'+
            (isSuperuser || grantWifiInfo >= 1)+'"';
          formAttr += ' data-validate-pppoe="'+
            (isSuperuser || grantPPPoEInfo >= 1)+'"';
          formAttr += ' data-validate-wan-mtu="'+grantWanMtuEdit+'"';
          formAttr += ' data-validate-wan-vlan="'+grantWanVlanEdit+'"';
          formAttr += ' data-validate-ipv6-enabled="'+
            grantWifiPowerHiddenIpv6Box+'"';
          formAttr += ' data-validate-wifi-mode="'+
            (grantWifiModeEdit && (isSuperuser || grantWifiInfo >= 1))+'"';
          formAttr += ' data-validate-wifi-band-2ghz="'+
            (grantWifiBandEdit2 && (isSuperuser || grantWifiInfo >= 1))+'"';
          formAttr += ' data-validate-wifi-band-5ghz="'+
            (grantWifiBandEdit5 && (isSuperuser || grantWifiInfo >= 1))+'"';
          formAttr += ' data-validate-wifi-5ghz="'+
            (grantWifi5ghz && (isSuperuser || grantWifiInfo >= 1))+'"';
          formAttr += ' data-validate-wifi-power="'+
            (!device.use_tr069 && grantWifiPowerHiddenIpv6Box &&
              (isSuperuser || grantWifiInfo >= 1))+'"';
          formAttr += ' data-validate-lan="'+grantDeviceLanRead+'"';
          formAttr += ' data-validate-vlan-access="'+
            (isSuperuser?2:grantVlan)+'"';
          formAttr += ' data-validate-port-forward-asym="'+
            grantPortForwardAsym+'"';
          formAttr += ' data-validate-port-open-ipv6="'+grantPortOpenIpv6+'"';
          formAttr += ' data-validate-upnp="'+grantUpnpSupport+'"';
          formAttr += ' data-minlength-pass-pppoe="'+
            res.min_length_pass_pppoe+'"';
          formAttr += ' data-bridge-enabled="'+
            (device.bridge_mode_enabled ? t('Yes') : t('No'))+'"';
          formAttr += ' data-has-5ghz="'+grantWifi5ghz+'"';
          formAttr += ' data-has-extended-channels="'+
            grantWifiExtendedChannels+'"';
          formAttr += ' data-5ghz-channels="'+
            grantWifi5ChannelList.join('-')+'"';
          formAttr += ' data-device-model="'+
            (device.model ? device.model : '')+'"';
          formAttr += ' data-device-version="'+
            (device.version ? device.version : '')+'"';
          formAttr += ' data-qtd-ports="'+
            (device.qtdPorts ? device.qtdPorts : '')+'"';
          if (device.data_collecting !== undefined) {
            let booleans = ['is_active', 'has_latency', 'burst_loss',
                            'wifi_devices', 'ping_and_wan'];
            for (let parameter of booleans) {
              formAttr += ` data-data_collecting-${parameter}=
              "${device.data_collecting[parameter] ? 'true' : 'false'}"`;
            }
            let strings = ['ping_fqdn'];
            for (let parameter of strings) {
              formAttr += ` data-data_collecting-${parameter}=
              "${device.data_collecting[parameter] || ''}"`;
            }
          }
          formAttr += ' data-grant-block-wired-devices="' +
            grantBlockWiredDevices + '"';
          formAttr += ' data-grant-block-devices="' + grantBlockDevices + '"';

          let baseAction = '<div class="dropdown-divider"></div>'+
            '<a class="dropdown-item $REPLACE_BTN_CLASS">'+
              '<i class="fas $REPLACE_ICON"></i>'+
              '<span>&nbsp; $REPLACE_TEXT</span>'+
            '</a>';

          let logAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-log-modal')
          .replace('$REPLACE_ICON', 'fa-file-alt')
          .replace('$REPLACE_TEXT', t('cpeLogs'));

          let unblockAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-reset-blocked')
          .replace('$REPLACE_ICON', 'fa-ban')
          .replace('$REPLACE_TEXT', t('unblockDevices'));

          let portForwardAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-open-ports-modal')
          .replace('$REPLACE_ICON', 'fa-lock-open')
          .replace('$REPLACE_TEXT', t('portOpenning'));

          let portForwardTr069Action = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-port-forward-tr069-modal')
          .replace('$REPLACE_ICON', 'fa-lock-open')
          .replace('$REPLACE_TEXT', t('portOpenning'));

          let pingTestAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-ping-test-modal')
          .replace('$REPLACE_ICON', 'fa-stethoscope')
          .replace('$REPLACE_TEXT', t('latencyAndLossTest'));

          let devicesAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-lan-devices-modal')
          .replace('$REPLACE_ICON', 'fa-network-wired')
          .replace('$REPLACE_TEXT', t('connectedDevices'));

          let siteSurveyAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-site-survey-modal')
          .replace('$REPLACE_ICON', 'fa-wifi')
          .replace('$REPLACE_TEXT', t('neighboringNetworks'));

          let measureAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-throughput-measure-modal')
          .replace('$REPLACE_ICON', 'fa-tachometer-alt')
          .replace('$REPLACE_TEXT', t('speedMeasure'));

          let vlanAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-vlan-modal')
          .replace('$REPLACE_ICON', 'fa-project-diagram')
          .replace('$REPLACE_TEXT', t('manageVlans'));

          let statisticsAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-statistics-modal')
          .replace('$REPLACE_ICON', 'fa-chart-line')
          .replace('$REPLACE_TEXT', t('cpeStatistics'));

          let ponSignalAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-pon-signal-modal')
          .replace('$REPLACE_ICON', 'fa-wave-square')
          .replace('$REPLACE_TEXT', t('opcticalSignal'));

          let factoryAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-factory red-text')
          .replace('$REPLACE_ICON', 'fa-skull-crossbones')
          .replace('$REPLACE_TEXT', t('returnToStockFirmware'));

          let dataCollectingAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-data_collecting-device-modal')
          .replace('$REPLACE_ICON', 'fa-chart-bar')
          .replace('$REPLACE_TEXT', t('dataCollecting'));

          let tracerouteAction = baseAction
          .replace('$REPLACE_BTN_CLASS', 'btn-traceroute-test-modal')
          .replace('$REPLACE_ICON', 'fa-list')
          .replace('$REPLACE_TEXT', t('tracerouteTest'));

          let idxMenu = 0;
          let sideMenu = [];
          sideMenu[0] = '<div>'+
            '<a class="dropdown-item btn-reboot">'+
              '<i class="fas fa-sync"></i>'+
              '<span>&nbsp; '+t('rebootCpe')+'</span>'+
            '</a>';
          sideMenu[1] = '<div>'+
            '<a class="dropdown-item btn-reset-app">'+
              '<i class="fas fa-mobile-alt"></i>'+
              '<span>&nbsp; '+t('resetAppPassword')+'</span>'+
            '</a>';

          if ((isSuperuser || grantLOGAccess) && grantViewLogs) {
            sideMenu[idxMenu] += logAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (!isTR069 && !device.bridge_mode_enabled && grantResetDevices) {
            sideMenu[idxMenu] += unblockAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (!isTR069 && !device.bridge_mode_enabled && grantPortForward) {
            sideMenu[idxMenu] += portForwardAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (isTR069 && !device.bridge_mode_enabled && grantPortForward) {
            sideMenu[idxMenu] += portForwardTr069Action;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (grantPingTest) {
            sideMenu[idxMenu] += pingTestAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if ((isSuperuser || grantLanDevsAccess) && grantLanDevices) {
            sideMenu[idxMenu] += devicesAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if ((isSuperuser || grantSiteSurveyAccess) && grantSiteSurvey) {
            sideMenu[idxMenu] += siteSurveyAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if ((isSuperuser || grantSpeedMeasure >= 1) && grantDeviceSpeedTest) {
            sideMenu[idxMenu] += measureAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (!device.bridge_mode_enabled && (isSuperuser || grantVlan > 0) &&
              grantVlanSupport
          ) {
            sideMenu[idxMenu] += vlanAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if ((isSuperuser || grantStatistics) && grantStatisticsSupport) {
            sideMenu[idxMenu] += statisticsAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (!isTR069 && isSuperuser && enableDataCollecting) {
            sideMenu[idxMenu] += dataCollectingAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (isTR069 && grantPonSignalSupport) {
            sideMenu[idxMenu] += ponSignalAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (grantTraceroute) {
            sideMenu[idxMenu] += tracerouteAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }
          if (!isTR069 && slaves.length == 0 &&
              (isSuperuser || grantFactoryReset)
          ) {
            sideMenu[idxMenu] += factoryAction;
            idxMenu = ((idxMenu == 0) ? 1 : 0);
          }

          sideMenu[0] += '</div>';
          sideMenu[1] += '</div>';

          let devActions = '<button class="btn btn-primary dropdown-toggle" '+
          'type="button" data-toggle="dropdown">'+t('Options')+'</button>'+
          '<div class="dropdown-menu dropdown-menu-inline'+
          ' dropdown-menu-right" data-dropdown-in="fadeIn" '+
          'data-dropdown-out="fadeOut">'+
            '$REPLACE_LEFT_MENU'+
            '$REPLACE_RIGHT_MENU'+
          '</div>';
          devActions = devActions.replace('$REPLACE_LEFT_MENU', sideMenu[0]);
          devActions = devActions.replace('$REPLACE_RIGHT_MENU', sideMenu[1]);

          let aboutTab = '<div class="edit-tab" id="tab_about-'+index+'">'+
            buildAboutTab(device, index, isTR069, grantWifiExtendedChannels)+
          '</div>';
          if (!isSuperuser && !grantDeviceId) {
            aboutTab = aboutTab.replace(/\$REPLACE_EN_ID/g, 'disabled');
          } else {
            aboutTab = aboutTab.replace(/\$REPLACE_EN_ID/g, '');
          }

          let passwordToggle = '<div class="input-group-append">'+
            '<div class="input-group-text primary-color">'+
              '<a class="toggle-pass">'+
                '<i class="fas fa-eye-slash white-text"></i>'+
              '</a>'+
            '</div>'+
          '</div>';

          let pppoeForm =
          '<div class="col-4 $REPLACE_IS_PPPOE" '+
            'id="edit_pppoe_combo-'+index+'">'+
            '<div class="md-form input-entry">'+
              '<label class="active">'+t('pppoeUser')+'</label>'+
              '<input class="form-control" type="text" '+
                'id="edit_pppoe_user-'+index+'" '+
                'maxlength="64" value="'+device.pppoe_user+
                '" $REPLACE_PPPOE_FORM_EN>'+
              '</input>'+
              '<div class="invalid-feedback"></div>'+
            '</div>'+
            '<div class="md-form input-entry">'+
              '<div class="input-group">'+
                '<label class="active">'+t('pppoePassword')+'</label>'+
                '<input class="form-control my-0" type="password" '+
                  'id="edit_pppoe_pass-'+index+'" '+
                  'maxlength="64" value="'+device.pppoe_password+
                  '" $REPLACE_PPPOE_FORM_EN>'+
                '</input>'+
                '$REPLACE_PPPOE_PASS'+
                '<div class="invalid-feedback"></div>'+
              '</div>'+
            '</div>'+
          '</div>';

          let mtuForm = '';
          if (grantWanMtuRead) {
            let isIPoE = (!device.connection_type ||
              device.connection_type.toUpperCase() !== 'PPPOE');
            let max = (isIPoE) ? 1500 : 1492;
            mtuForm =
            '<div class="md-form input-entry">'+
              '<label class="active">'+'MTU'+'</label>'+
              '<input id="edit_wan_mtu-'+index+'" '+
                'class="form-control" type="number" '+
                'max='+max+' min=576 '+
                'value='+((device.wan_mtu) ? device.wan_mtu : '')+' '+
                (grantWanMtuEdit ? 'active' : 'disabled')+'>'+
              '</input>'+
              '<div class="invalid-feedback"></div>'+
            '</div>';
          }

          let vlanForm = '';
          if (grantWanVlanRead) {
            vlanForm =
            '<div class="md-form input-entry">'+
              '<label class="active">'+'VLAN'+'</label>'+
              '<input id="edit_wan_vlan-'+index+'" '+
                'class="form-control" type="number" '+
                'max=4094 min=1 '+
                'value='+((device.wan_vlan_id) ? device.wan_vlan_id : '')+' '+
                (grantWanVlanEdit ? 'active' : 'disabled')+'>'+
              '</input>'+
              '<div class="invalid-feedback"></div>'+
            '</div>';
          }

          if (!device.connection_type ||
              device.connection_type.toUpperCase() !== 'PPPOE') {
            pppoeForm = pppoeForm.replace('$REPLACE_IS_PPPOE', 'd-none');
          } else {
            pppoeForm = pppoeForm.replace('$REPLACE_IS_PPPOE', '');
          }
          if (isSuperuser || grantPassShow) {
            pppoeForm =
              pppoeForm.replace('$REPLACE_PPPOE_PASS', passwordToggle);
          } else {
            pppoeForm = pppoeForm.replace('$REPLACE_PPPOE_PASS', '');
          }
          if (device.bridge_mode_enabled ||
              (!isSuperuser && grantPPPoEInfo <= 1)
          ) {
            pppoeForm =
              pppoeForm.replace(/\$REPLACE_PPPOE_FORM_EN/g, 'disabled');
          } else {
            pppoeForm = pppoeForm.replace(/\$REPLACE_PPPOE_FORM_EN/g, '');
          }

          let wanTab = '<div class="edit-tab d-none" id="tab_wan-'+index+'">'+
            '<div class="row" $REPLACE_BRIDGE_WARN>'+
              '<div class="col-12">'+
                '<div class="alert alert-warning text-center">'+
                  '<div class="fas fa-exclamation-triangle fa-lg mr-2"></div>'+
                  '<span>'+
                    t('changeBridgeModeWarning', {interface: 'WAN'})+
                  '</span>'+
                '</div>'+
              '</div>'+
            '</div>'+
            '<div class="row">'+
              '<div class="col-4">'+
                '<div class="md-form">'+
                  '<div class="input-group has-warning">'+
                    '<div class="md-selectfield form-control my-0">'+
                      '<label class="active">'+t('connectionType')+'</label>'+
                      '<select class="browser-default md-select" '+
                        'id="edit_connect_type-'+index+'" $REPLACE_EDIT_WAN>'+
                        '<option value="DHCP" $REPLACE_SELECTED_DHCP$>'+
                          'DHCP'+
                        '</option>'+
                        '<option value="PPPoE" $REPLACE_SELECTED_PPPOE$>'+
                          'PPPoE'+
                        '</option>'+
                      '</select>'+
                    '</div>'+
                    '<h7 class="orange-text d-none" '+
                      'id="edit_connect_type_warning-'+index+'">'+
                      t('carefulThisCouldLeaveCpeInaccessible')+
                    '</h7>'+
                  '</div>'+
                '</div>'+

                // WAN MAC address section
                // Only show this info if it is available
                (device.wan_bssid && grantDeviceWanMacRead ?
                  '<div class="md-form input-entry pt-1">' +
                    '<label class="active">' + t('wanMacAddress') + '</label>' +
                    '<input class="form-control" type="text" disabled=""' +
                      'value="' + device.wan_bssid + '">' +
                  // The whole info or empty
                  '</div>' : ''
                ) +

                (grantDeviceWanMtuRead ? mtuForm : '')+
                (grantDeviceWanVlanRead ? vlanForm : '')+
                '<div class="custom-control custom-checkbox" '+
                  '$REPLACE_IPV6_ENABLED_EN>'+
                  '<input class="custom-control-input" type="checkbox" '+
                    'id="edit_ipv6_enabled-'+index+'" '+
                    '$REPLACE_SELECTED_IPV6_ENABLED>'+
                  '</input>'+
                  '<label class="custom-control-label" '+
                    'for="edit_ipv6_enabled-'+index+'">'+
                    t('enableIpv6')+
                  '</label>'+
                '</div>'+
              '</div>'+
              '<div class="col-4">'+
                '<div class="md-form input-entry">'+
                  '<label class="active">'+t('negotiatedSpeedMbps')+'</label>'+
                  '<input class="form-control" type="text" maxlength="32" '+
                  'value="'+
                  ((device.wan_negociated_speed) ?
                    device.wan_negociated_speed : t('notAvailable'))+
                  '" disabled></input>'+
                  '<div class="invalid-feedback"></div>'+
                '</div>'+
                '<div class="md-form input-entry">'+
                  '<label class="active">'+
                    t('transmissionModeDuplex')+
                  '</label>'+
                  '<input class="form-control" type="text" maxlength="32" '+
                  'value="'+
                  ((device.wan_negociated_duplex) ?
                    device.wan_negociated_duplex : t('notAvailable'))+
                  '" disabled></input>'+
                  '<div class="invalid-feedback"></div>'+
                '</div>'+
                (isTR069 ?
                  '<div class="md-form input-entry">'+
                    '<label class="active">'+
                      t('opticalSignalIntensity')+
                    '</label>'+
                    '<input class="form-control" type="text" maxlength="3" '+
                    'value="'+
                    ((ponRXPower) ? ponRXPower + ' dBm' : t('notAvailable'))+
                    '" disabled></input>'+
                    '<div class="invalid-feedback"></div>'+
                  '</div>':
                  ''
                )+
              '</div>'+
              '$REPLACE_PPPOE_FORM'+
            '</div>'+
            '<div class="row">'+
              '<div class="col-12">'+
                (grantRebootAfterWANChange ?
                  '<div class="alert alert-info">'+
                    '<div class="fas fa-info-circle fa-lg mr-2"></div>'+
                    '<span>'+t('needRebootAfterChangeWanWarning')+'</span>'+
                  '</div>' :
                  ''
                )+
              '</div>'+
            '</div>'+
            '$REPLACE_WAN_INFO'+
          '</div>';
          if (device.connection_type &&
              device.connection_type.toUpperCase() === 'PPPOE'
          ) {
            wanTab = wanTab.replace('$REPLACE_SELECTED_PPPOE',
                                    'selected="selected"');
          } else {
            wanTab = wanTab.replace('$REPLACE_SELECTED_DHCP',
                                    'selected="selected"');
          }

          let currIpv6Enabled =
            (parseInt(device.ipv6_enabled) == 1 ? 'checked' : '');
          wanTab = wanTab.replace(/\$REPLACE_SELECTED_IPV6_ENABLED/g,
                                  currIpv6Enabled);

          if (!grantWifiPowerHiddenIpv6Box) {
            wanTab = wanTab.replace('$REPLACE_IPV6_ENABLED_EN',
                                    'style="display: none;"');
          } else {
            wanTab = wanTab.replace('$REPLACE_IPV6_ENABLED_EN', '');
          }

          if (device.bridge_mode_enabled) {
            wanTab = wanTab.replace('$REPLACE_EDIT_WAN', 'disabled');
            wanTab = wanTab.replace('$REPLACE_BRIDGE_WARN', '');
          } else if (isTR069 || (!isSuperuser && !grantWanType)) {
            wanTab = wanTab.replace('$REPLACE_EDIT_WAN', 'disabled');
            wanTab = wanTab.replace('$REPLACE_BRIDGE_WARN',
                                    'style="display: none;"');
          } else {
            wanTab = wanTab.replace('$REPLACE_EDIT_WAN', '');
            wanTab = wanTab.replace('$REPLACE_BRIDGE_WARN',
                                    'style="display: none;"');
          }
          wanTab = wanTab.replace(/\$REPLACE_SELECTED_.*?\$/g, '');
          if (isSuperuser || grantPPPoEInfo >= 1) {
            wanTab = wanTab.replace('$REPLACE_PPPOE_FORM', pppoeForm);
          } else {
            wanTab = wanTab.replace('$REPLACE_PPPOE_FORM', '');
          }

          if (grantWanLanInformation) {
            wanTab = wanTab.replace(
              '$REPLACE_WAN_INFO',
              buildMoreInfo(index, 'wan'),
            );
          } else {
            wanTab = wanTab.replace('$REPLACE_WAN_INFO', '');
          }

          let lanTab = '<div class="edit-tab d-none" id="tab_lan-'+index+'">'+
            '<div class="row" $REPLACE_BRIDGE_WARN>'+
              '<div class="col-12">'+
                '<div class="alert alert-warning text-center">'+
                  '<div class="fas fa-exclamation-triangle fa-lg mr-2"></div>'+
                  '<span>'+
                    t('changeBridgeModeWarning', {interface: 'LAN'})+
                  '</span>'+
                '</div>'+
              '</div>'+
            '</div>'+
            '<div class="row">'+
              '<div class="col-6">'+
                '<div class="md-form input-entry input-group">'+
                  '<label class="active">'+
                    (grantLanGwEdit ? t('cpeIp') : t('networkIp'))+
                  '</label>'+
                  '<input class="form-control my-2 ip-mask-field" ' +
                    'type="text" id="edit_lan_subnet-'+index+'" '+
                    'maxlength="15" value="'+device.lan_subnet+
                    '" $REPLACE_LAN_EN>'+
                  '</input>'+
                  '<div class="invalid-feedback"></div>'+
                '</div>'+
                '<div class="md-form input-group">'+
                  '<div class="md-selectfield form-control my-0">'+
                    '<label class="active">'+t('Mask')+'</label>'+
                    '<select class="browser-default md-select my-0" ' +
                      'type="text"  id="edit_lan_netmask-'+index+'" '+
                      'maxlength="15" $REPLACE_LAN_EN>'+
                      '<option value="24" $REPLACE_SELECTED_24$>24</option>'+
                      '<option value="25" $REPLACE_SELECTED_25$>25</option>'+
                      '<option value="26" $REPLACE_SELECTED_26$>26</option>'+
                    '</select>'+
                  '</div>'+
                '</div>'+
                (grantLanGwEdit ?
                  '<div class="alert alert-info my-2">'+
                    '<div class="fas fa-info-circle fa-lg mr-2"></div>'+
                    '<span>'+t('networkIpCalculationDescription')+'</span>'+
                  '</div>' :
                  ''
                )+
              '</div>'+
              '<div class="col-6">'+
                // LAN MAC address section
                // Always show this section as it will always have an valid _id
                '<div class="md-form input-entry input-group">'+
                  '<label class="active">' + t('lanMacAddress') + '</label>'+
                    '<input class="form-control my-2 mr-2" type="text" ' +
                      'disabled="" value="' + device._id + '">' +
                '</div>'+
                (grantLanDnsEdit ?
                  '<div class="md-form input-entry input-group">'+
                    '<label class="active">' +
                      t('dnsServerInfoTitle') +
                    '</label>'+
                    '<input class="form-control lan-dns-field my-2 mr-2" ' +
                      'type="text" id="edit_lan_dns-'+index+'" '+
                      'maxlength="48" value="'+
                      ((device.lan_dns_servers) ?
                        device.lan_dns_servers : '')+ // treat undefined case
                      '" $REPLACE_LAN_EN disabled>'+
                    '</input>'+
                    ((isSuperuser || grantLanEditAccess) ?
                    '<div class="input-group-append">'+
                      '<button class="btn btn-primary btn-sm px-3 '+
                                       'btn-config-lan-dns-modal"' +
                          'type="button" '+
                          'data-index='+index+'>'+
                        '<i class="fas fa-pen fa-lg"></i>'+
                      '</button>'+
                    '</div>' :
                    ''
                    )+
                    '<div class="invalid-feedback"></div>'+
                  '</div>' :
                  ''
                )+
              '</div>'+
            '</div>'+
            '$REPLACE_LAN_INFO'+
          '</div>';
          if (device.bridge_mode_enabled || !grantDeviceLanEdit ||
              (!isSuperuser && !grantLanEditAccess)
          ) {
            lanTab = lanTab.replace(/\$REPLACE_LAN_EN/g, 'disabled');
          } else {
            lanTab = lanTab.replace(/\$REPLACE_LAN_EN/g, '');
          }
          if (device.bridge_mode_enabled) {
            lanTab = lanTab.replace('$REPLACE_BRIDGE_WARN', '');
          } else {
            lanTab = lanTab.replace('$REPLACE_BRIDGE_WARN',
                                    'style="display: none;"');
          }
          let selectTarget = '$REPLACE_SELECTED_' + device.lan_netmask;
          lanTab = lanTab.replace(selectTarget, 'selected="selected"');
          lanTab = lanTab.replace(/\$REPLACE_SELECTED_.*?\$/g, '');

          if (grantWanLanInformation) {
            lanTab = lanTab.replace(
              '$REPLACE_LAN_INFO',
              buildMoreInfo(index, 'lan'),
            );
          } else {
            lanTab = lanTab.replace('$REPLACE_LAN_INFO', '');
          }

          let meshForm = '<div class="md-form">'+
            '<div class="input-group">'+
              '<div class="md-selectfield form-control my-0">'+
                '<label class="active">Mesh</label>'+
                '<select class="browser-default md-select" type="text" '+
                  'id="edit_meshMode-'+index+'" '+
                  'maxlength="15" $REPLACE_OPMODE_EN'+
                '>'+
                  '<option value="0" $REPLACE_MESH_DISABLED_OPT '+
                    '$REPLACE_SELECTED_MESH_0$>'+
                    t('Disabled')+
                  '</option>'+
                  '<option value="1" $REPLACE_SELECTED_MESH_1$>'+
                    t('Cable')+
                  '</option>'+
                  (grantMeshV2PrimModeWifi ?
                  '<option value="2" $REPLACE_SELECTED_MESH_2$>'+
                    t('cableAndWifiXGhz', {x: 2.4})+
                  '</option>'+
                  (grantWifi5ghz ?
                    '<option value="3" $REPLACE_SELECTED_MESH_3$>'+
                      t('cableAndWifiXGhz', {x: '5.0'})+
                    '</option>'+
                    '<option value="4" $REPLACE_SELECTED_MESH_4$>'+
                      t('cableAndBothWifi')+
                    '</option>' : ''
                  ) : '') +
                '</select>'+
              '</div>'+
            '</div>'+
          '</div>';

          let opmodeTab =
          '<div class="edit-tab d-none" id="tab_opmode-'+index+'">'+
            '<div class="row">'+
              '<div class="col-6">'+
                (!isTR069 ?
                '<div class="md-form">'+
                  '<div class="input-group">'+
                    '<div class="md-selectfield form-control my-0">'+
                      '<label class="active">'+t('operationMode')+'</label>'+
                      '<select class="browser-default md-select" type="text" '+
                        'id="edit_opmode-'+index+'" '+
                        'maxlength="15" $REPLACE_OPMODE_EN '+
                        '$REPLACE_MESH_OPMODE_EN'+
                      '>'+
                        '<option value="router_mode" '+
                          '$REPLACE_SELECTED_ROUTER$>'+
                          t('routerMode')+
                        '</option>'+
                        '<option value="bridge_mode" '+
                          '$REPLACE_SELECTED_BRIDGE$>'+
                          t('bridgeApMode')+
                        '</option>'+
                      '</select>'+
                    '</div>'+
                  '</div>'+
                '</div>':
                ''
                )+
                '$REPLACE_MESH_MODE'+
                (!isTR069 ?
                '<div $REPLACE_OPMODE_VIS id="edit_opmode_checkboxes-'+index+
                '">'+
                  '<div class="custom-control custom-checkbox pb-3">'+
                    '<input class="custom-control-input" type="checkbox" '+
                      'id="edit_opmode_switch_en-'+index+'" '+
                      'name="edit_opmode_switch_en-'+index+
                      '" $REPLACE_SELECTED_OPMODE_SWITCH_STATE '+
                      '$REPLACE_OPMODE_EN>'+
                    '</input>'+
                    '<label class="custom-control-label" '+
                      'for="edit_opmode_switch_en-'+index+
                    '">'+
                      t('enableLanPortsForCpe')+
                    '</label>'+
                  '</div>'+
                  '<div class="custom-control custom-checkbox pb-3">'+
                    '<input class="custom-control-input" type="checkbox" '+
                      'id="edit_opmode_fixip_en-'+index+'" '+
                      'name="edit_opmode_fixip_en-'+index+
                      '" $REPLACE_SELECTED_OPMODE_IP_STATE $REPLACE_OPMODE_EN>'+
                    '</input>'+
                    '<label class="custom-control-label" '+
                      'for="edit_opmode_fixip_en-'+index+
                    '">'+
                      t('fixCpeIpInBridge')+
                    '</label>'+
                  '</div>'+
                  '<div class="alert alert-info mt-3">'+
                    '<div class="fas fa-info-circle fa-lg mr-2"></div>'+
                    '<span>'+
                      t('bridgeModeWorkingExplantion')+
                    '</span>'+
                  '</div>'+
                '</div>':
                ''
                )+
              '</div>'+
              (!isTR069 ?
              '<div class="col-6">'+
                '<div $REPLACE_OPMODE_IP_VIS id="edit_opmode_alert_ip-'+
                  index+
                '">'+
                  '<div class="md-form input-entry">'+
                    '<label class="active">'+
                      t('fixedIpForCpeInBridge')+
                    '</label>'+
                    '<input class="form-control ip-mask-field" type="text" '+
                      'id="edit_opmode_fixip-'+index+'" '+
                      'maxlength="15" value="$REPLACE_OPMODE_IP_VAL" '+
                      '$REPLACE_OPMODE_EN>'+
                    '</input>'+
                    '<div class="invalid-feedback"></div>'+
                  '</div>'+
                  '<div class="md-form input-entry">'+
                    '<label class="active">'+
                      t('gatewayIpForCpeInBridge')+
                    '</label>'+
                    '<input class="form-control ip-mask-field" type="text" '+
                      'id="edit_opmode_fixip_gateway-'+index+'" '+
                      'maxlength="15" value="$REPLACE_OPMODE_GATEWAY_VAL" '+
                      '$REPLACE_OPMODE_EN>'+
                    '</input>'+
                    '<div class="invalid-feedback"></div>'+
                  '</div>'+
                  '<div class="md-form input-entry">'+
                    '<label class="active">'+
                      t('dnsIpForCpeInBridge')+
                    '</label>'+
                    '<input class="form-control ip-mask-field" type="text" '+
                      'id="edit_opmode_fixip_dns-'+index+'" '+
                      'maxlength="15" value="$REPLACE_OPMODE_DNS_VAL" '+
                      '$REPLACE_OPMODE_EN>'+
                    '</input>'+
                    '<div class="invalid-feedback"></div>'+
                  '</div>'+
                  '<div class="alert alert-warning">'+
                    '<div class="fas fa-exclamation-triangle fa-lg mr-2">'+
                    '</div>'+
                    '<span>'+
                      t('carefulMakeSureYourNetworkCanGiveFixedIp')+
                    '</span>'+
                  '</div>'+
                '</div>'+
              '</div>':
              ''
              )+
            '</div>'+
          '</div>';
          if (!isSuperuser && !grantOpmodeEdit) {
            opmodeTab = opmodeTab.replace(/\$REPLACE_OPMODE_EN/g, 'disabled');
            meshForm = meshForm.replace(/\$REPLACE_OPMODE_EN/g, 'disabled');
          } else {
            opmodeTab = opmodeTab.replace(/\$REPLACE_OPMODE_EN/g, '');
            meshForm = meshForm.replace(/\$REPLACE_OPMODE_EN/g, '');
          }
          // Disable mode if there are routers in mesh connected
          if (device.mesh_slaves && device.mesh_slaves.length > 0) {
            opmodeTab = opmodeTab.replace(/\$REPLACE_MESH_OPMODE_EN/g,
                                          'disabled');
            meshForm = meshForm.replace(/\$REPLACE_MESH_DISABLED_OPT/g,
                                        'disabled');
          } else {
            opmodeTab = opmodeTab.replace(/\$REPLACE_MESH_OPMODE_EN/g, '');
            meshForm = meshForm.replace(/\$REPLACE_MESH_DISABLED_OPT/g, '');
          }
          if (device.bridge_mode_enabled) {
            opmodeTab = opmodeTab.replace(/\$REPLACE_OPMODE_VIS/g, '');
            opmodeTab = opmodeTab.replace('$REPLACE_SELECTED_BRIDGE',
                                          'selected="selected"');
            opmodeTab = opmodeTab.replace('$REPLACE_SELECTED_ROUTER', '');
            if (device.bridge_mode_switch_disable) {
              // If disabled, uncheck
              opmodeTab = opmodeTab.replace(
                '$REPLACE_SELECTED_OPMODE_SWITCH_STATE', '');
            } else {
              // If enable, check
              opmodeTab = opmodeTab.replace(
                '$REPLACE_SELECTED_OPMODE_SWITCH_STATE', 'checked');
            }
            if (device.bridge_mode_ip !== '') {
              opmodeTab = opmodeTab.replace(/\$REPLACE_OPMODE_IP_VIS/g, '');
              opmodeTab = opmodeTab.replace('$REPLACE_SELECTED_OPMODE_IP_STATE',
                                            'checked');
              opmodeTab = opmodeTab.replace('$REPLACE_OPMODE_IP_VAL',
                                            device.bridge_mode_ip);
              opmodeTab = opmodeTab.replace('$REPLACE_OPMODE_GATEWAY_VAL',
                                            device.bridge_mode_gateway);
              opmodeTab = opmodeTab.replace('$REPLACE_OPMODE_DNS_VAL',
                                            device.bridge_mode_dns);
            } else {
              opmodeTab = opmodeTab.replace(/\$REPLACE_OPMODE_IP_VIS/g,
                                            'style="display: none;"');
              opmodeTab = opmodeTab.replace('$REPLACE_SELECTED_OPMODE_IP_STATE',
                                            '');
            }
          } else {
            // The default value is Enabled when change
            // from Route mode to Bridge mode
            opmodeTab = opmodeTab.replace(
              '$REPLACE_SELECTED_OPMODE_SWITCH_STATE', 'checked');
            opmodeTab = opmodeTab.replace(/\$REPLACE_OPMODE_VIS/g,
                                          'style="display: none;"');
            opmodeTab = opmodeTab.replace(/\$REPLACE_OPMODE_IP_VIS/g,
                                          'style="display: none;"');
            opmodeTab = opmodeTab.replace('$REPLACE_SELECTED_ROUTER',
                                          'selected="selected"');
            opmodeTab = opmodeTab.replace('$REPLACE_SELECTED_BRIDGE', '');
          }
          if (grantMeshMode || grantMeshV2PrimModeCable
              || grantMeshV2PrimModeWifi) {
            selectTarget = '$REPLACE_SELECTED_MESH_' + device.mesh_mode;
            meshForm = meshForm.replace(selectTarget, 'selected="selected"');
            meshForm = meshForm.replace(/\$REPLACE_SELECTED_MESH_.*?\$/g, '');
            opmodeTab = opmodeTab.replace('$REPLACE_MESH_MODE', meshForm);
          } else {
            opmodeTab = opmodeTab.replace('$REPLACE_MESH_MODE', '');
          }

          let haveSsidPrefixPrepend =
            '<input class="form-control" type="text" id="edit_wifi_ssid-'+
              index+'" ';
          let haveSsidPrefixPrepend5G =
            '<input class="form-control" type="text" id="edit_wifi5_ssid-'+
              index+'" ';
          let ssidPrefixEnabledCheckbox = '';
          if (device.isToShowSsidPrefixCheckbox) {
            ssidPrefixEnabledCheckbox = '<div id="ssid_prefix_checkbox-'+index+
                '" class="custom-control custom-checkbox pl-2">'+
                '<input class="custom-control-input" type="checkbox" '+
                  'id="edit_is_ssid_prefix_enabled-'+index+'" '+
                  '$REPLACE_SSID_PREFIX_ENABLED '+
                  '$REPLACE_SSID_PREFIX_ENABLED_EN>'+
                '</input>'+
                '<label class="custom-control-label ml-3 my-3" '+
                  'for="edit_is_ssid_prefix_enabled-'+index+'">'+
                  t('enableSsidPrefix')+
                '</label>'+
              '</div>';
            if (device.isSsidPrefixEnabled) {
              haveSsidPrefixPrepend = '<div class="input-group-prepend">'+
                '<span class="input-group-text px-0 text-primary"'+
                ' style="background:inherit;border:none;">'+
                getConfigStorage('ssidPrefix')+
                '</span>'+
              '</div>'+
              '<input class="form-control pl-0" type="text" '+
                'id="edit_wifi_ssid-'+index+'" ';

              haveSsidPrefixPrepend5G = '<div class="input-group-prepend">'+
                '<span class="input-group-text px-0 text-primary"'+
                ' style="background:inherit;border:none;">'+
                getConfigStorage('ssidPrefix')+
                '</span>'+
              '</div>'+
              '<input class="form-control pl-0" type="text" '+
                'id="edit_wifi5_ssid-'+index+'" ';
            } else {
              haveSsidPrefixPrepend =
              '<div class="input-group-prepend d-none">'+
                '<span class="input-group-text px-0 text-primary"'+
                ' style="background:inherit;border:none;">'+
                getConfigStorage('ssidPrefix')+
                '</span>'+
              '</div>'+
              '<input class="form-control pl-0" type="text" '+
                'id="edit_wifi_ssid-'+index+'" ';

              haveSsidPrefixPrepend5G =
              '<div class="input-group-prepend d-none">'+
                '<span class="input-group-text px-0 text-primary"'+
                ' style="background:inherit;border:none;">'+
                getConfigStorage('ssidPrefix')+
                '</span>'+
              '</div>'+
              '<input class="form-control pl-0" type="text" '+
                'id="edit_wifi5_ssid-'+index+'" ';
            }
          } else {
            ssidPrefixEnabledCheckbox = '<div id="ssid_prefix_checkbox-'+index+
                '" class="custom-control custom-checkbox pl-2 d-none">'+
                '<input class="custom-control-input" type="checkbox" '+
                  'id="edit_is_ssid_prefix_enabled-'+index+'" '+
                  '$REPLACE_SSID_PREFIX_ENABLED '+
                  '$REPLACE_SSID_PREFIX_ENABLED_EN>'+
                '</input>'+
                '<label class="custom-control-label" '+
                  'for="edit_is_ssid_prefix_enabled-'+index+'">'+
                  t('enableSsidPrefix')+
                '</label>'+
              '</div>';
          }

          let wifi5Pane = '';
          let wifi5PaneNav = '';
          if (grantWifi5ghz) {
            wifi5Pane =
            '<div class="row tab-pane fade" id="wifi5-pane-'+index+
            '" role="tabpanel" aria-labelledby="wifi5-pane-tab-'+index+'">'+
              '<div class="col-6">'+
                '<div class="md-form">'+
                  '<div class="input-group">'+
                    '<div class="md-selectfield form-control my-0">'+
                      '<label class="active">'+
                        t('wifiChannel')+
                      '</label>'+
                      '<select class="browser-default md-select" '+
                        'id="edit_wifi5_channel-'+index+'" '+
                        '$REPLACE_WIFI5_EN $REPLACE_WIFI5_CHANNEL_EN>'+
                        '<option value="auto" '+
                          '$REPLACE_SELECTED_CHANNEL5_auto$>'+
                          t('auto')+
                        '</option>'+
                        device.permissions.grantWifi5ChannelList.reduce(
                          (result, channel)=>result+(
                            '<option value="' + channel +
                              '" $REPLACE_SELECTED_CHANNEL5_' + channel + '$>' +
                              channel +
                            '</option>'),
                          '',
                        ) +
                      '</select>'+
                      '<small class="text-muted" '+
                        '$AUTO_CHANNEL_SELECTED_VISIBILITY5$>'+
                          (device.wifi_last_channel_5ghz ?
                            t('channelChosenByAuto',
                              {x: device.wifi_last_channel_5ghz}) :
                            ''
                          )+
                      '</small>'+
                    '</div>'+
                  '</div>'+
                '</div>'+
                '<div class="md-form input-group input-entry">'+
                  '<label class="active">'+
                    t('wifiSsid')+
                  '</label>'+
                  haveSsidPrefixPrepend5G+
                  'maxlength="32" value="'+device.wifi_ssid_5ghz+
                  '" $REPLACE_WIFI5_EN>'+
                  '</input>'+
                  '<div class="invalid-feedback"></div>'+
                '</div>'+
                '<div class="md-form input-entry">'+
                  '<div class="input-group">'+
                    '<label class="active">'+t('wifiPassword')+'</label>'+
                    '<input class="form-control my-0" type="password" '+
                      'id="edit_wifi5_pass-'+index+'" '+
                      'maxlength="64" value="'+
                      ((device.wifi_password_5ghz) ?
                        device.wifi_password_5ghz : '')+ // treat undefined case
                      '" $REPLACE_WIFI5_EN>'+
                    '</input>'+
                    '$REPLACE_WIFI5_PASS'+
                    '<div class="invalid-feedback"></div>'+
                  '</div>'+
                '</div>'+
                '<div class="custom-control custom-checkbox">'+
                  '<input class="custom-control-input" type="checkbox" '+
                    'id="edit_wifi5_state-'+index+'" '+
                    '$REPLACE_SELECTED_WIFI5_STATE $REPLACE_WIFI5_STATE_EN>'+
                  '</input>'+
                  '<label class="custom-control-label" for="edit_wifi5_state-'+
                    index+'">'+
                      t('activateWifiXGhz', {x: '5.0'})+
                  '</label>'+
                '</div>'+
                '$REPLACE_WIFI5_HIDDEN'+
              '</div>'+
              '<div class="col-6">'+
                (grantWifiBandRead5 ?
                  '<div class="md-form">'+
                    '<div class="input-group">'+
                      '<div class="md-selectfield form-control my-0">'+
                        '<label class="active">'+t('bandwidth')+'</label>'+
                        '<select class="browser-default md-select" '+
                          'id="edit_wifi5_band-'+index+'" '+
                          '$REPLACE_WIFI5_BAND_EN>'+
                          (grantWifiBandAuto5 ?
                            '<option value="auto" ' +
                              '$REPLACE_SELECTED_BAND5_auto$>'+
                              t('auto')+
                            '</option>' :
                            ''
                          )+
                          '<option value="VHT80" ' +
                            '$REPLACE_SELECTED_BAND5_VHT80$>'+
                            '80 MHz'+
                          '</option>'+
                          '<option value="VHT40" ' +
                            '$REPLACE_SELECTED_BAND5_VHT40$>'+
                            '40 MHz'+
                          '</option>'+
                          '<option value="VHT20" ' +
                            '$REPLACE_SELECTED_BAND5_VHT20$>'+
                            '20 MHz'+
                          '</option>'+
                        '</select>'+
                        '<small class="text-muted" '+
                          '$AUTO_BAND_SELECTED_VISIBILITY5$>'+
                            (device.wifi_last_band_5ghz ?
                              t('bandwidthChoosenByAuto',
                                {x: device.wifi_last_band_5ghz}) :
                              ''
                            )+
                        '</small>'+
                      '</div>'+
                    '</div>'+
                  '</div>' :
                  ''
                ) +
                (grantWifiModeRead ?
                  '<div class="md-form">'+
                    '<div class="input-group">'+
                      '<div class="md-selectfield form-control my-0">'+
                        '<label class="active">'+
                          t('operationMode')+
                        '</label>'+
                        '<select class="browser-default md-select" '+
                          'id="edit_wifi5_mode-'+index+'" '+
                          '$REPLACE_WIFI5_MODE_EN'+
                        '>'+
                          '$REPLACE_WIFI5_AX_MODE' +
                          '<option value="11ac" $REPLACE_SELECTED_MODE5_11ac$>'+
                            'AC'+
                          '</option>'+
                          '<option value="11na" $REPLACE_SELECTED_MODE5_11na$>'+
                            'N'+
                          '</option>'+
                        '</select>'+
                      '</div>'+
                    '</div>'+
                  '</div>' :
                  ''
                ) +
                '$REPLACE_WIFI5_POWER'+
              '</div>'+
            '</div>';
            wifi5PaneNav =
            '<a class="btn-primary text-white nav-link" '+
              'id="wifi5-pane-tab-'+index+
              '" data-toggle="tab" href="#wifi5-pane-'+index+
              '" role="tab" aria-controls="#wifi5-pane-'+index+
              '" aria-selected="false">'+
                '5.0GHz'+
            '</a>';
          }

          let wifiTab = '<div class="edit-tab d-none" id="tab_wifi-'+index+'">'+
                ssidPrefixEnabledCheckbox+
                '<nav>'+
                  '<div class="nav nav-tabs" id="nav-tab" role="tablist">'+
                    '<a class="btn-primary text-white nav-link active mr-1" '+
                      'id="wifi-pane-tab-'+index+
                      '" data-toggle="tab" href="#wifi-pane-'+index+
                      '" role="tab" aria-controls="#wifi-pane-'+index+
                      '" aria-selected="true">'+
                        '2.4GHz'+
                    '</a>'+
                    wifi5PaneNav+
                  '</div>'+
                '</nav>'+
                '<div class="wifi-tab-content">'+
                  '<div class="row tab-pane fade show active" '+
                    'id="wifi-pane-'+index+'" role="tabpanel" '+
                    'aria-labelledby="wifi-pane-tab-'+index+
                  '">'+
                    '<div class="col-6">'+
                      '<div class="md-form">'+
                        '<div class="input-group">'+
                          '<div class="md-selectfield form-control my-0">'+
                            '<label class="active">'+
                              t('wifiChannel')+
                            '</label>'+
                            '<select class="browser-default md-select" '+
                              'id="edit_wifi_channel-'+index+'" '+
                              '$REPLACE_WIFI_EN>'+
                              '<option value="auto" '+
                                '$REPLACE_SELECTED_CHANNEL_auto$>'+
                                  t('auto')+
                              '</option>'+
                              '<option value="1" $REPLACE_SELECTED_CHANNEL_1$>'+
                                '1'+
                              '</option>'+
                              '<option value="2" $REPLACE_SELECTED_CHANNEL_2$>'+
                                '2'+
                              '</option>'+
                              '<option value="3" $REPLACE_SELECTED_CHANNEL_3$>'+
                                '3'+
                              '</option>'+
                              '<option value="4" $REPLACE_SELECTED_CHANNEL_4$>'+
                                '4'+
                              '</option>'+
                              '<option value="5" $REPLACE_SELECTED_CHANNEL_5$>'+
                                '5'+
                              '</option>'+
                              '<option value="6" $REPLACE_SELECTED_CHANNEL_6$>'+
                                '6'+
                              '</option>'+
                              '<option value="7" $REPLACE_SELECTED_CHANNEL_7$>'+
                                '7'+
                              '</option>'+
                              '<option value="8" $REPLACE_SELECTED_CHANNEL_8$>'+
                                '8'+
                              '</option>'+
                              '<option value="9" $REPLACE_SELECTED_CHANNEL_9$>'+
                                '9'+
                              '</option>'+
                              '<option value="10" '+
                                '$REPLACE_SELECTED_CHANNEL_10$>'+
                                  '10'+
                              '</option>'+
                              '<option value="11" '+
                                '$REPLACE_SELECTED_CHANNEL_11$>'+
                                  '11'+
                              '</option>'+
                              (grantWifiExtendedChannels ?
                                '<option value="12" '+
                                  '$REPLACE_SELECTED_CHANNEL_12$>'+
                                    '12'+
                                '</option>'+
                                '<option value="13" '+
                                  '$REPLACE_SELECTED_CHANNEL_13$>'+
                                    '13'+
                                '</option>':
                                ''
                              )+
                            '</select>'+
                            '<small class="text-muted" '+
                              '$AUTO_CHANNEL_SELECTED_VISIBILITY$>'+
                                (device.wifi_last_channel ?
                                  t('channelChosenByAuto',
                                    {x: device.wifi_last_channel}) :
                                  ''
                                )+
                            '</small>'+
                          '</div>'+
                        '</div>'+
                      '</div>'+
                      '<div class="md-form input-group input-entry">'+
                        '<label class="active">'+
                          t('wifiSsid')+
                        '</label>'+
                        haveSsidPrefixPrepend+'maxlength="32" value="'+
                        device.wifi_ssid+'" $REPLACE_WIFI_EN>'+
                        '</input>'+
                        '<div class="invalid-feedback"></div>'+
                      '</div>'+
                      '<div class="md-form input-entry">'+
                        '<div class="input-group">'+
                          '<label class="active">'+t('wifiPassword')+'</label>'+
                          '<input class="form-control my-0" type="password" '+
                            'id="edit_wifi_pass-'+index+'" '+
                            'maxlength="64" value="'+
                              ((device.wifi_password) ?
                                device.wifi_password :
                                '')+ // treat undefined case
                          '" $REPLACE_WIFI_EN></input>'+
                          '$REPLACE_WIFI_PASS'+
                          '<div class="invalid-feedback"></div>'+
                        '</div>'+
                      '</div>'+
                      '<div class="custom-control custom-checkbox">'+
                        '<input class="custom-control-input" type="checkbox" '+
                          'id="edit_wifi_state-'+index+'" '+
                          '$REPLACE_SELECTED_WIFI_STATE '+
                          '$REPLACE_WIFI_STATE_EN>'+
                        '</input>'+
                        '<label class="custom-control-label" '+
                          'for="edit_wifi_state-'+index+
                        '">'+
                          t('activateWifiXGhz', {x: 2.4})+
                        '</label>'+
                      '</div>'+
                      '$REPLACE_WIFI2_HIDDEN'+
                    '</div>'+
                    '<div class="col-6">'+
                      (grantWifiBandRead2 ?
                        '<div class="md-form">'+
                          '<div class="input-group">'+
                            '<div class="md-selectfield form-control my-0">'+
                              '<label class="active">'+t('bandwidth')+
                              '</label>'+
                              '<select class="browser-default md-select" '+
                                'id="edit_wifi_band-'+index+'" '+
                                '$REPLACE_WIFI_BAND_EN'+
                              '>'+
                                (grantWifiBandAuto2 ?
                                  '<option value="auto" '+
                                    '$REPLACE_SELECTED_BAND_auto$>'+
                                    'auto'+
                                  '</option>':
                                  ''
                                )+
                                '<option value="HT40" '+
                                  '$REPLACE_SELECTED_BAND_HT40$>'+
                                    '40 MHz'+
                                '</option>'+
                                '<option value="HT20" '+
                                  '$REPLACE_SELECTED_BAND_HT20$>'+
                                    '20 MHz'+
                                '</option>'+
                              '</select>'+
                              '<small class="text-muted" '+
                                '$AUTO_BAND_SELECTED_VISIBILITY$>'+
                                  (device.wifi_last_band ?
                                    t('bandwidthChoosenByAuto',
                                      {x: device.wifi_last_band}) :
                                    ''
                                  )+
                              '</small>'+
                            '</div>'+
                          '</div>'+
                        '</div>' :
                        ''
                      ) +
                      (grantWifiModeRead ?
                        '<div class="md-form">'+
                          '<div class="input-group">'+
                            '<div class="md-selectfield form-control my-0">'+
                              '<label class="active">'+
                                t('operationMode')+
                              '</label>'+
                              '<select class="browser-default md-select" '+
                                'id="edit_wifi_mode-'+index+'" '+
                                '$REPLACE_WIFI_MODE_EN>'+
                                  '$REPLACE_WIFI_AX_MODE' +
                                  '<option value="11n" '+
                                    '$REPLACE_SELECTED_MODE_11n$>BGN'+
                                  '</option>'+
                                  '<option value="11g" '+
                                    '$REPLACE_SELECTED_MODE_11g$>G'+
                                  '</option>'+
                              '</select>'+
                            '</div>'+
                          '</div>'+
                        '</div>' :
                        ''
                      ) +
                      '$REPLACE_WIFI2_POWER'+
                    '</div>'+
                  '</div>'+
                  wifi5Pane+
                '</div>'+
              '</div>'+
            '</ul>';
          let wifi2Hidden = '<div class="custom-control custom-checkbox">'+
            '<input class="custom-control-input" type="checkbox" '+
              'id="edit_wifi_hidden-'+index+'" '+
              '$REPLACE_SELECTED_WIFI_HIDDEN $REPLACE_WIFI_HIDDEN_EN>'+
            '</input>'+
            '<label class="custom-control-label" for="edit_wifi_hidden-'+index+
            '">'+
              t('hideXGhzSsid', {x: 2.4})+
            '</label>'+
          '</div>';
          let wifi2Power = '<div class="md-form">'+
            '<div class="input-group">'+
              '<div class="md-selectfield form-control my-0">'+
                '<label class="active">'+t('signalStrength')+'</label>'+
                '<select class="browser-default md-select" '+
                  'id="edit_wifi_power-'+index+'" '+
                  '$REPLACE_WIFI_POWER_EN>'+
                    '<option value="100" $REPLACE_SELECTED_POWER_100$>'+
                      '100%'+
                    '</option>'+
                    '<option value="75"  $REPLACE_SELECTED_POWER_75$>'+
                      '75%'+
                    '</option>'+
                    '<option value="50"  $REPLACE_SELECTED_POWER_50$>'+
                      '50%'+
                    '</option>'+
                    '<option value="25"  $REPLACE_SELECTED_POWER_25$>'+
                      '25%'+
                    '</option>'+
                '</select>'+
              '</div>'+
            '</div>'+
          '</div>';
          let wifi5Hidden = '<div class="custom-control custom-checkbox">'+
            '<input class="custom-control-input" type="checkbox" '+
              'id="edit_wifi5_hidden-'+index+'" '+
              '$REPLACE_SELECTED_WIFI5_HIDDEN $REPLACE_WIFI5_HIDDEN_EN>'+
            '</input>'+
            '<label class="custom-control-label" '+
              'for="edit_wifi5_hidden-'+index+'">'+
              t('hideXGhzSsid', {x: '5.0'})+
            '</label>'+
          '</div>';
          let wifi5Power = '<div class="md-form">'+
            '<div class="input-group">'+
              '<div class="md-selectfield form-control my-0">'+
                '<label class="active">'+t('signalStrength')+'</label>'+
                '<select class="browser-default md-select" '+
                  'id="edit_wifi5_power-'+index+'" '+
                  '$REPLACE_WIFI5_POWER_EN>'+
                    '<option value="100" $REPLACE_SELECTED_POWER5_100$>'+
                      '100%'+
                    '</option>'+
                    '<option value="75"  $REPLACE_SELECTED_POWER5_75$>'+
                      '75%'+
                    '</option>'+
                    '<option value="50"  $REPLACE_SELECTED_POWER5_50$>'+
                      '50%'+
                    '</option>'+
                    '<option value="25"  $REPLACE_SELECTED_POWER5_25$>'+
                      '25%'+
                    '</option>'+
                '</select>'+
              '</div>'+
            '</div>'+
          '</div>';
          if (!isTR069) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI2_HIDDEN', wifi2Hidden);
            wifiTab = wifiTab.replace('$REPLACE_WIFI2_POWER', wifi2Power);
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_HIDDEN', wifi5Hidden);
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_POWER', wifi5Power);
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI2_HIDDEN', '');
            wifiTab = wifiTab.replace('$REPLACE_WIFI2_POWER', '');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_HIDDEN', '');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_POWER', '');
          }
          if (!grantWifi2ghzEdit || (!isSuperuser && grantWifiInfo <= 1)) {
            wifiTab = wifiTab.replace(/\$REPLACE_WIFI_EN/g, 'disabled');
            wifiTab = wifiTab.replace(/\$REPLACE_WIFI5_EN/g, 'disabled');
          } else {
            wifiTab = wifiTab.replace(/\$REPLACE_WIFI_EN/g, '');
            wifiTab = wifiTab.replace(/\$REPLACE_WIFI5_EN/g, '');
          }
          if (device.mesh_mode > 1 && (grantMeshV2PrimModeCable ||
            grantMeshV2PrimModeWifi)) {
            wifiTab = wifiTab.replace(/\$REPLACE_WIFI5_CHANNEL_EN/g,
                                      'disabled');
          } else {
            wifiTab = wifiTab.replace(/\$REPLACE_WIFI5_CHANNEL_EN/g, '');
          }
          if (!grantWifiModeEdit || (!isSuperuser && grantWifiInfo <= 1)) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_MODE_EN', 'disabled');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_MODE_EN', 'disabled');
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_MODE_EN', '');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_MODE_EN', '');
          }
          if (!grantWifiBandEdit2 || (!isSuperuser && grantWifiInfo <= 1)) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_BAND_EN', 'disabled');
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_BAND_EN', '');
          }
          if (!grantWifiBandEdit5 || (!isSuperuser && grantWifiInfo <= 1)) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_BAND_EN', 'disabled');
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_BAND_EN', '');
          }
          if (!grantWifiState || (!isSuperuser && grantWifiInfo <= 1) ||
              (device.mesh_mode > 1 && (grantMeshV2PrimModeCable ||
              grantMeshV2PrimModeWifi))) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_STATE_EN', 'disabled');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_STATE_EN', 'disabled');
            wifiTab = wifiTab.replace('$REPLACE_SSID_PREFIX_ENABLED_EN',
                                      'disabled');
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_STATE_EN', '');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_STATE_EN', '');
            wifiTab = wifiTab.replace('$REPLACE_SSID_PREFIX_ENABLED_EN', '');
          }
          if (!grantWifiPowerHiddenIpv6Box ||
             (!isSuperuser && grantWifiInfo <= 1)) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_HIDDEN_EN', 'disabled');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_HIDDEN_EN', 'disabled');
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_HIDDEN_EN', '');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_HIDDEN_EN', '');
          }
          if (!grantWifiPowerHiddenIpv6Box ||
             (!isSuperuser && grantWifiInfo <= 1)) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_POWER_EN', 'disabled');
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_POWER_EN', '');
          }
          if (!grantWifiPowerHiddenIpv6Box ||
             (!isSuperuser && grantWifiInfo <= 1) ||
             (device.wifi_channel_5ghz == 'auto')) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_POWER_EN', 'disabled');
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_POWER_EN', '');
          }
          if (isSuperuser || grantPassShow) {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_PASS', passwordToggle);
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_PASS', passwordToggle);
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_PASS', '');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_PASS', '');
          }

          selectTarget = '$REPLACE_SELECTED_CHANNEL_' + device.wifi_channel;
          wifiTab = wifiTab.replace(selectTarget, 'selected="selected"');
          wifiTab = wifiTab.replace(/\$REPLACE_SELECTED_CHANNEL_.*?\$/g, '');
          // Show text about selected channel if in auto mode
          if (device.wifi_channel === 'auto') {
            wifiTab = wifiTab.replace('$AUTO_CHANNEL_SELECTED_VISIBILITY',
                                      '');
          } else {
            wifiTab = wifiTab.replace('$AUTO_CHANNEL_SELECTED_VISIBILITY',
                                      'style="display:none;"');
          }

          selectTarget = '$REPLACE_SELECTED_BAND_' + device.wifi_band;
          wifiTab = wifiTab.replace(selectTarget, 'selected="selected"');
          wifiTab = wifiTab.replace(/\$REPLACE_SELECTED_BAND_.*?\$/g, '');
          // Show text about selected band if in auto mode
          if (device.wifi_band === 'auto') {
            wifiTab = wifiTab.replace('$AUTO_BAND_SELECTED_VISIBILITY',
                                      '');
          } else {
            wifiTab = wifiTab.replace('$AUTO_BAND_SELECTED_VISIBILITY',
                                      'style="display:none;"');
          }

          selectTarget = '$REPLACE_SELECTED_MODE_' + device.wifi_mode;
          wifiTab = wifiTab.replace(selectTarget, 'selected="selected"');
          wifiTab = wifiTab.replace(/\$REPLACE_SELECTED_MODE_.*?\$/g, '');

          selectTarget = '$REPLACE_SELECTED_POWER_' + device.wifi_power;
          wifiTab = wifiTab.replace(selectTarget, 'selected="selected"');
          wifiTab = wifiTab.replace(/\$REPLACE_SELECTED_POWER_.*?\$/g, '');

          let currWifiState = (parseInt(device.wifi_state) == 1 ?
                              'checked' : '');
          wifiTab = wifiTab.replace('$REPLACE_SELECTED_WIFI_STATE',
                                    currWifiState);

          let currWifiHidden = (parseInt(device.wifi_hidden) == 1 ?
                                'checked' : '');
          wifiTab = wifiTab.replace('$REPLACE_SELECTED_WIFI_HIDDEN',
                                    currWifiHidden);

          selectTarget =
            '$REPLACE_SELECTED_CHANNEL5_' + device.wifi_channel_5ghz;
          wifiTab = wifiTab.replace(selectTarget, 'selected="selected"');
          wifiTab = wifiTab.replace(/\$REPLACE_SELECTED_CHANNEL5_.*?\$/g, '');
          // Show text about selected channel if in auto mode
          if (device.wifi_channel_5ghz === 'auto') {
            wifiTab = wifiTab.replace('$AUTO_CHANNEL_SELECTED_VISIBILITY5',
                                        '');
          } else {
            wifiTab = wifiTab.replace('$AUTO_CHANNEL_SELECTED_VISIBILITY5',
                                        'style="display:none;"');
          }

          let band = (device.wifi_band_5ghz === 'HT20' ||
                      device.wifi_band_5ghz === 'HT40') ?
                      ('V'+device.wifi_band_5ghz) : device.wifi_band_5ghz;
          selectTarget = '$REPLACE_SELECTED_BAND5_' + band;
          wifiTab = wifiTab.replace(selectTarget, 'selected="selected"');
          wifiTab = wifiTab.replace(/\$REPLACE_SELECTED_BAND5_.*?\$/g, '');
          // Show text about selected channel if in auto mode
          if (device.wifi_band_5ghz === 'auto') {
            wifiTab = wifiTab.replace('$AUTO_BAND_SELECTED_VISIBILITY5',
                                        '');
          } else {
            wifiTab = wifiTab.replace('$AUTO_BAND_SELECTED_VISIBILITY5',
                                        'style="display:none;"');
          }

          if (grantWiFiAXSupport) {
            let axOpt2 = '<option value="11ax" $REPLACE_SELECTED_MODE_11ax$>' +
              'AX</option>';
            let axOpt5 = '<option value="11ax" $REPLACE_SELECTED_MODE5_11ax$>' +
              'AX</option>';
            wifiTab = wifiTab.replace('$REPLACE_WIFI_AX_MODE', axOpt2);
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_AX_MODE', axOpt5);
          } else {
            wifiTab = wifiTab.replace('$REPLACE_WIFI_AX_MODE', '');
            wifiTab = wifiTab.replace('$REPLACE_WIFI5_AX_MODE', '');
          }
          selectTarget = '$REPLACE_SELECTED_MODE5_' + device.wifi_mode_5ghz;
          wifiTab = wifiTab.replace(selectTarget, 'selected="selected"');
          wifiTab = wifiTab.replace(/\$REPLACE_SELECTED_MODE5_.*?\$/g, '');

          selectTarget = '$REPLACE_SELECTED_POWER5_' + device.wifi_power_5ghz;
          wifiTab = wifiTab.replace(selectTarget, 'selected="selected"');
          wifiTab = wifiTab.replace(/\$REPLACE_SELECTED_POWER5_.*?\$/g, '');

          let currWifiState5ghz = (parseInt(device.wifi_state_5ghz) == 1 ?
                                  'checked' : '');
          wifiTab = wifiTab.replace('$REPLACE_SELECTED_WIFI5_STATE',
                                    currWifiState5ghz);

          let currWifiHidden5ghz = (parseInt(device.wifi_hidden_5ghz) == 1 ?
                                    'checked' : '');
          wifiTab = wifiTab.replace('$REPLACE_SELECTED_WIFI5_HIDDEN',
                                    currWifiHidden5ghz);

          let currSsidPrefixEnabled = (device.isSsidPrefixEnabled) ?
                                      'checked': '';
          wifiTab = wifiTab.replace('$REPLACE_SSID_PREFIX_ENABLED',
                                    currSsidPrefixEnabled);

          let baseEdit = '<label class="btn btn-primary tab-switch-btn" '+
          'data-tab-id="#tab_$REPLACE_TAB_TYPE-'+index+'">'+
            '$REPLACE_TAB_NAME<input type="radio"></input>'+
          '</label>';

          let lanEdit = baseEdit
          .replace('$REPLACE_TAB_TYPE', 'lan')
          .replace('$REPLACE_TAB_NAME', 'LAN');

          let modeEdit = baseEdit
          .replace('$REPLACE_TAB_TYPE', 'opmode')
          .replace('$REPLACE_TAB_NAME', t('mode'));

          let wifiEdit = baseEdit
          .replace('$REPLACE_TAB_TYPE', 'wifi')
          .replace('$REPLACE_TAB_NAME', 'Wi-Fi');

          let removeDevice = '<div class="col-2 text-right">'+
            buildRemoveDevice()+
          '</div>';

          let formRow = '<tr class="d-none" $REPLACE_ATTRIBUTES>'+
            '<td class="grey lighten-5" colspan="13">'+
              '<form class="edit-form needs-validation" novalidate="true">'+
                '<div class="row">'+
                  '<div class="col-10 actions-opts">'+
                    '<div class="btn-group btn-group-toggle" '+
                    'data-toggle="buttons">'+
                      '<label '+
                      'class="btn btn-primary tab-switch-btn active ml-0" '+
                      'data-tab-id="#tab_about-'+index+'">'+
                        t('About')+
                        '<input type="radio"></input>'+
                      '</label>'+
                      '$REPLACE_MODE_EDIT'+
                      '<label class="btn btn-primary tab-switch-btn" '+
                      'data-tab-id="#tab_wan-'+index+'">'+
                        'WAN<input type="radio"></input>'+
                      '</label>'+
                      '$REPLACE_LAN_EDIT'+
                      '$REPLACE_WIFI_EDIT'+
                      '$REPLACE_ACTIONS'+
                    '</div>'+
                    '<br>'+
                    '<span class="badge badge-success bounceIn d-none">'+
                      t('Success')+
                    '</span>'+
                    '<span class="badge badge-warning bounceIn d-none">'+
                      t('Failure')+
                    '</span>'+
                    '<br>'+
                  '</div>'+
                  '$REPLACE_DEVICE_REMOVE'+
                '</div>'+
                '<div class="row">'+
                  '<div class="col">'+
                    aboutTab+
                    opmodeTab+
                    wanTab+
                    lanTab+
                    wifiTab+
                  '</div>'+
                '</div>'+
                '$REPLACE_EDIT_BUTTON'+
              '</form>'+
            '</td>'+
          '</tr>';
          formRow = formRow.replace('$REPLACE_ATTRIBUTES', formAttr);
          if (grantDeviceLanRead) {
            formRow = formRow.replace('$REPLACE_LAN_EDIT', lanEdit);
          } else {
            formRow = formRow.replace('$REPLACE_LAN_EDIT', '');
          }
          if (grantOpmode) {
            formRow = formRow.replace('$REPLACE_MODE_EDIT', modeEdit);
          } else {
            formRow = formRow.replace('$REPLACE_MODE_EDIT', '');
          }
          if (isSuperuser || grantWifiInfo >= 1) {
            formRow = formRow.replace('$REPLACE_WIFI_EDIT', wifiEdit);
          } else {
            formRow = formRow.replace('$REPLACE_WIFI_EDIT', '');
          }
          if (isSuperuser || grantDeviceActions) {
            formRow = formRow.replace('$REPLACE_ACTIONS', devActions);
          } else {
            formRow = formRow.replace('$REPLACE_ACTIONS', '');
          }
          if ((!isSuperuser && !grantDeviceRemoval) ||
              (device.mesh_slaves && device.mesh_slaves.length > 0)) {
            formRow = formRow.replace('$REPLACE_DEVICE_REMOVE', '');
          } else {
            formRow = formRow.replace('$REPLACE_DEVICE_REMOVE', removeDevice);
          }
          if (!device.mesh_slaves || device.mesh_slaves.length === 0) {
            let editButtonRow = buildFormSubmit(index, false);
            formRow = formRow.replace('$REPLACE_EDIT_BUTTON', editButtonRow);
          } else {
            formRow = formRow.replace('$REPLACE_EDIT_BUTTON', '');
          }

          finalHtml += formRow;

          if (device.mesh_slaves && device.mesh_slaves.length > 0) {
            let slaveIdx = 0;
            device.mesh_slaves.forEach((slave)=>{
              let slaveDev = res.devices.find((d)=>d._id===slave);
              if (typeof slaveDev !== 'undefined') {
                let rowAttr = buildRowData(slaveDev, index);
                let statusClasses = buildStatusClasses(slaveDev);
                let statusAttributes = buildStatusAttributes(slaveDev);
                let notifications = buildNotification();
                let infoRow = buildTableRowInfo(slaveDev, false, true, index);
                infoRow = infoRow.replace('$REPLACE_ATTRIBUTES', rowAttr);
                infoRow = infoRow.replace('$REPLACE_COLOR_CLASS',
                                          statusClasses);
                infoRow = infoRow.replace('$REPLACE_COLOR_ATTR',
                                          statusAttributes);
                infoRow = infoRow.replace('$REPLACE_PONSIGNAL', '<td></td>');
                infoRow = infoRow.replace('$REPLACE_COLOR_CLASS_PILL',
                                          'lighten-2');
                infoRow = infoRow.replace('$REPLACE_PILL_ICON', '');
                infoRow = infoRow.replace('$REPLACE_PILL_TEXT', 'Firmware');
                if (isSuperuser || grantNotificationPopups) {
                  infoRow = infoRow.replace('$REPLACE_NOTIFICATIONS',
                                            notifications);
                } else {
                  infoRow = infoRow.replace('$REPLACE_NOTIFICATIONS', '');
                }
                if (grantMeshV2PrimModeCable || grantMeshV2PrimModeWifi) {
                  let disassocSlaveButton = '<td></td>';
                  if (isSuperuser || grantSlaveDisassociate) {
                    disassocSlaveButton =
                      '<td>' +
                      buildDisassociateSlave(slaveDev.do_update_status == 1) +
                      '</td>';
                  }
                  infoRow = infoRow.replace('$REPLACE_UPGRADE',
                                            disassocSlaveButton);
                } else {
                  let removeButton = '<td>' + buildRemoveDevice(true) + '</td>';
                  infoRow = infoRow.replace('$REPLACE_UPGRADE', removeButton);
                }
                finalHtml += infoRow;

                let formRow =
                '<tr class="d-none grey lighten-5 slave-form-'+index+'">'+
                  '<td colspan="13">'+
                    buildAboutTab(slaveDev, index, false,
                                  grantWifiExtendedChannels, slaveIdx)+
                  '</td>'+
                '</tr>';
                if (!isSuperuser && !grantDeviceId) {
                  formRow = formRow.replace(/\$REPLACE_EN_ID/g, 'disabled');
                } else {
                  formRow = formRow.replace(/\$REPLACE_EN_ID/g, '');
                }
                finalHtml += formRow;
                if (slaveDev.external_reference &&
                    slaveDev.external_reference.kind ===
                    t('personIdentificationSystem')
                ) {
                  $(document).on(
                    'keyup.edit_external_reference-' + index + '_' + slaveIdx,
                    '#edit_external_reference-' + index + '_' + slaveIdx,
                    (event) => {
                      $(event.target).mask(t('personIdentificationMask'));
                    },
                  );
                  $('#edit_external_reference-' + index + '_' + slaveIdx)
                    .trigger('keyup');
                } else if (
                  slaveDev.external_reference &&
                  slaveDev.external_reference.kind ===
                  t('enterpriseIdentificationSystem')
                ) {
                  $(document).on(
                    'keyup.edit_external_reference-' + index + '_' + slaveIdx,
                    '#edit_external_reference-' + index + '_' + slaveIdx,
                    (event) => {
                      $(event.target).mask(t('enterpriseIdentificationMask'));
                    },
                  );
                  $('#edit_external_reference-' + index + '_' + slaveIdx)
                    .trigger('keyup');
                }
              }
              slaveIdx++;
            });
            let editButtonRow = buildFormSubmit(index, true);
            let editButtonAttr =
              ' data-slave-count="'+device.mesh_slaves.length+'"';
            let editTableRow =
            '<tr class="d-none slave-'+index+'"'+editButtonAttr+'>'+
              '<td class="grey lighten-5" colspan="13">'+
                editButtonRow+
              '</td>'+
            '</tr>';
            finalHtml += editTableRow;
          }

          // Index variable has a global scope related to below functions
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
          $(document).on('change', '#edit_opmode-' + localIdx, (event)=>{
            if ($('#edit_opmode-' + localIdx).val() === 'router_mode') {
              $('#edit_opmode_checkboxes-' + localIdx).hide();
              $('#edit_opmode_ip_combo-' + localIdx).hide();
              $('#edit_opmode_alert-' + localIdx).hide();
              $('#edit_opmode_alert_ip-' + localIdx).hide();
              $('#edit_opmode_fixip_en-' + localIdx)[0].checked = false;
              // Changed to false because the text in the
              // label changed to a positive logic (Enable instead Disable)
              $('#edit_opmode_switch_en-' + localIdx)[0].checked = false;
            } else if ($('#edit_opmode-' + localIdx).val() === 'bridge_mode') {
              $('#edit_opmode_checkboxes-' + localIdx).show();
              $('#edit_opmode_alert-' + localIdx).show();
            }
          });
          $(document).on('change', '#edit_opmode_fixip_en-' + localIdx,
            (event) => {
              if ($('input[name="edit_opmode_fixip_en-'+localIdx+
                  '"]:checked').length > 0
              ) {
                $('#edit_opmode_alert_ip-' + localIdx).show();
                $('#edit_opmode_ip_combo-' + localIdx).show();
              } else {
                $('#edit_opmode_alert_ip-' + localIdx).hide();
                $('#edit_opmode_ip_combo-' + localIdx).hide();
              }
            },
          );

          // Apply mask on reference input
          if (
            device.external_reference &&
            device.external_reference.kind === t('personIdentificationSystem')
          ) {
            $(document).on('keyup.edit_external_reference-' + index,
                           '#edit_external_reference-' + index, (event) => {
              $(event.target).mask(t('personIdentificationMask'));
            });
            $('#edit_external_reference-' + index).trigger('keyup');
          } else if (
            device.external_reference &&
            device.external_reference.kind ===
            t('enterpriseIdentificationSystem')
          ) {
            $(document).on('keyup.edit_external_reference-' + index,
                           '#edit_external_reference-' + index, (event) => {
              $(event.target).mask(t('enterpriseIdentificationMask'));
            });
            $('#edit_external_reference-' + index).trigger('keyup');
          }

          index += 1;
        }
        // Attach elements back to DOM after manipulation
        deviceTableContent.html(finalHtml);
        // Hide filtered columns
        applyVisibleColumns();
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
                      .html(idx),
                    ),
                  );
                } else {
                  if (idx == res.pages &&
                      (currPage + delta <= res.pages - delta)
                  ) {
                    opts.append(
                      $('<li>').addClass('page-item').append(
                        $('<h3>').addClass('page-link disabled').html('...'),
                      ),
                    );
                  }
                  opts.append(
                    $('<li>').addClass('page-item').append(
                      $('<a>').addClass('page-link change-page-link')
                      .html(idx),
                    ),
                  );
                  if (idx == 1 && (currPage - delta > delta)) {
                    opts.append(
                      $('<li>').addClass('page-item').append(
                        $('<h3>').addClass('page-link disabled').html('...'),
                      ),
                    );
                  }
                }
              }
            }
            return opts.html();
          }),
        );
        // Apply IP mask on LAN subnet field
        deviceTableContent.find('.ip-mask-field').mask('099.099.099.099');
        // Fetch existing notifications
        $.ajax({
          url: '/notification/fetch',
          type: 'POST',
          traditional: true,
          data: {
            targets: res.devices.map((device) => device._id),
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
        // Important: include and initialize socket.io first using socket var
        socket.on('UPSTATUS', function(macaddr, data) {
          let row = $('[id="' + macaddr + '"]');
          if (data.sysuptime) {
            row.find('.device-sys-up-time')
            .html(
              secondsTimeSpanToHMS(parseInt(data.sysuptime)),
            );
          }
          if (data.wanuptime) {
            row.find('.device-wan-up-time')
            .html(
              secondsTimeSpanToHMS(parseInt(data.wanuptime)),
            );
          }
          if (data.ponsignal) {
            // rebuild pon signal values
            let ponSignalStatus;
            let ponSignalRxPower = `<span>${data.ponsignal.rxpower}</span>`;
            if (data.ponsignal.rxpower === undefined) {
              let st = t('NoSignal');
              ponSignalStatus = `<div class="badge badge-dark">${st}</div>`;
              ponSignalRxPower = '';
            } else if (data.ponsignal.rxpower >=
                data.ponsignal.thresholdCriticalHigh) {
              let st = t('signalState', {state: 'VeryHigh'});
              ponSignalStatus = `<div class="badge bg-danger">${st}</div>`;
            } else if (data.ponsignal.rxpower >=
                data.ponsignal.threshold) {
              let st = t('signalState', {state: 'Good'});
              ponSignalStatus =
                `<div class="badge bg-success">${st}</div>`;
            } else if (data.ponsignal.rxpower >=
              data.ponsignal.thresholdCritical) {
              let st = t('signalState', {state: 'Weak'});
              ponSignalStatus =
                `<div class="badge bg-warning">${st}</div>`;
            } else {
              let st = t('signalState', {state: 'VeryWeak'});
              ponSignalStatus =
                `<div class="badge bg-danger">${st}</div>`;
            }
            row.find('.device-pon-signal')
            .html(ponSignalRxPower+'<br>'+ponSignalStatus);
          }
          row.find('.device-sys-up-time')
            .removeClass('grey-text pending-update');
          row.find('.device-wan-up-time')
            .removeClass('grey-text pending-update');
          row.find('.device-pon-signal')
            .removeClass('grey-text pending-update');
        });
      },
      complete: () => {
        searchingDevices = false;
      },
    });
  };
  // Initial table
  // If the filters were passed to url and the path is /devicelist
  if (urlQueryFilterList === undefined || urlQueryFilterList === null) {
    urlQueryFilterList = '';
  } else if (typeof urlQueryFilterList !== 'string') {
    urlQueryFilterList = urlQueryFilterList.toString();
  }
  if (urlQueryFilterList && window.location.href.indexOf('devicelist') !== -1) {
    // Split the filters
    let filters = urlQueryFilterList.split(',');
    // Assign each filter to the search input field
    filters.forEach((filter) => {
      // Only insert the tag if the filter is not empty, if it passes the regex
      // and was not already added
      if (
        filter &&
        XSS_VALIDATION_REGEX.test(filter) &&
        !$('#devices-search-input').val().split(',').includes(filter)
      ) {
        $('.tags-input input').focus().val(filter).blur();
      }
    });

    // Load the table
    loadDevicesTable(1, urlQueryFilterList);
  } else if (window.location.href.indexOf('devicelist') !== -1) {
    // Load the table with filters that are already setted in device search
    // input
    loadDevicesTable(
      1, document.getElementById('devices-search-input').value,
    );
  }

  let searchingDevices = false;
  $(document).on('submit', '#devices-search-form', function(event) {
    if (!searchingDevices) {
      searchingDevices = true;
      let filterList = $('#devices-search-input').val();
      filterList += ',' + columnToSort + ',' + columnSortType;
      loadDevicesTable(1, filterList);
    }
    return false;
  });

  $(document).on('click', '.change-page-link', function(event) {
    let pageNum = parseInt($(event.target).html());
    let filterList = $('#devices-search-input').val();
    filterList += ',' + columnToSort + ',' + columnSortType;
    loadDevicesTable(pageNum, filterList);
  });

  let deviceRemovalSwal = function(isMultiple = false) {
    mustBlockLicenseAtRemoval = (
      getConfigStorage('mustBlockLicenseAtRemoval') === true ||
      getConfigStorage('mustBlockLicenseAtRemoval') === 'true'
    ) ? true : false;

    let hasBlockPermission = (isSuperuser || grantDeviceLicenseBlock);
    let denyButtonText = t('Remove');
    let willShowDeleteAndBlock = true;
    let willShowDelete = true;

    let alertDiv =
      '<div class="alert alert-danger text-center">' +
        '<div class="fas fa-exclamation-triangle fa-lg"></div>' +
        '<span>&nbsp;&nbsp;$REPLACE_TEXT</span>' +
      '</div>';

    if (mustBlockLicenseAtRemoval) {
      willShowDeleteAndBlock = false;
      denyButtonText = t('removeAndBlock');
      alertDiv = alertDiv.replace(
        '$REPLACE_TEXT', t('adminSetLicenseToBeBlockedAtDeviceRemovalWarning'),
      );
    } else if (!hasBlockPermission) {
      willShowDeleteAndBlock = false;
      alertDiv = '';
    } else if (isMultiple) {
      alertDiv = alertDiv.replace(
        '$REPLACE_TEXT', t('removeDevicesAndBlockLicensesWarning'),
      );
    } else {
      alertDiv = alertDiv.replace(
        '$REPLACE_TEXT', t('removeDeviceAndBlockLicenseWarning'),
      );
    }

    return {
      icon: 'warning',
      title: t('Attention!'),
      text: t('sureYouWantToRemoveRegister?'),
      // Remove and block button
      confirmButtonText: t('removeAndBlock'),
      confirmButtonColor: '#ff3547',
      showConfirmButton: willShowDeleteAndBlock,
      // Just remove button
      denyButtonText: denyButtonText,
      denyButtonColor: '#f2ab63',
      showDenyButton: willShowDelete,
      // Cancel button
      cancelButtonText: t('Cancel'),
      cancelButtonColor: '#4db6ac',
      showCancelButton: true,
      // Helper at footer
      footer: alertDiv,
    };
  };

  $(document).on('click', '.btn-trash', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    swal.fire(deviceRemovalSwal(false)).then((result)=>{
      if (result.isConfirmed) {
        // Block and delete...
        $.ajax({
          url: '/devicelist/deleteandblock',
          type: 'POST',
          traditional: true,
          dataType: 'json',
          data: {'block': true, 'ids': [id]},
          success: (res) => {
            swal.fire({
              icon: 'success',
              title: res.message,
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
          error: (xhr, status, error) => {
            swal.fire({
              icon: 'warning',
              title: t('internalError'),
              text: xhr.responseJSON ? xhr.responseJSON.message : '',
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
        });
        $('#btn-trash-multiple').addClass('disabled');
        let pageNum = parseInt($('#curr-page-link').html());
        let filterList = $('#devices-search-input').val();
        filterList += ',' + columnToSort + ',' + columnSortType;
        loadDevicesTable(pageNum, filterList);
      } else if (result.isDenied) {
        // Just delete...
        $.ajax({
          type: 'POST',
          url: '/devicelist/delete',
          traditional: true,
          data: {ids: [id]},
          success: (res) => {
            swal.fire({
              icon: 'success',
              title: res.message,
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
          error: (xhr, status, error) => {
            swal.fire({
              icon: 'warning',
              title: t('internalError'),
              text: xhr.responseJSON ? xhr.responseJSON.message : '',
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
        });
        $('#btn-trash-multiple').addClass('disabled');
        let pageNum = parseInt($('#curr-page-link').html());
        let filterList = $('#devices-search-input').val();
        filterList += ',' + columnToSort + ',' + columnSortType;
        loadDevicesTable(pageNum, filterList);
      }
    });
  });

  $(document).on('click', '#btn-trash-multiple', function(event) {
    swal.fire(deviceRemovalSwal(true)).then((result)=>{
      if (result.isConfirmed) {
        // Block and delete...
        $.ajax({
          url: '/devicelist/deleteandblock',
          type: 'POST',
          traditional: true,
          dataType: 'json',
          data: {'block': true, 'ids': selectedDevices},
          success: (res) => {
            swal.fire({
              icon: 'success',
              title: res.message,
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
          error: (xhr, status, error) => {
            swal.fire({
              icon: 'warning',
              title: t('internalError'),
              text: xhr.responseJSON ? xhr.responseJSON.message : '',
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
        });
        $('#btn-trash-multiple').addClass('disabled');
        let pageNum = parseInt($('#curr-page-link').html());
        let filterList = $('#devices-search-input').val();
        filterList += ',' + columnToSort + ',' + columnSortType;
        loadDevicesTable(pageNum, filterList);
      } else if (result.isDenied) {
        // Just delete...
        $.ajax({
          type: 'POST',
          url: '/devicelist/delete',
          traditional: true,
          data: {ids: selectedDevices},
          success: (res) => {
            swal.fire({
              icon: 'success',
              title: res.message,
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
          error: (xhr, status, error) => {
            swal.fire({
              icon: 'warning',
              title: t('internalError'),
              text: xhr.responseJSON ? xhr.responseJSON.message : '',
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
        });
        $('#btn-trash-multiple').addClass('disabled');
        let pageNum = parseInt($('#curr-page-link').html());
        let filterList = $('#devices-search-input').val();
        filterList += ',' + columnToSort + ',' + columnSortType;
        loadDevicesTable(pageNum, filterList);
      }
      selectedDevices = [];
    });
  });

  $(document).on('click', '.btn-factory', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let deviceModel = row.data('device-model');
    let deviceVersion = row.data('device-version');
    let abort = false;
    let abortMsg = '';
    // Special cases
    if (deviceModel !== '') {
      // Factory firmware issue caused by TP-Link partition change
      if (deviceModel === 'ARCHERC6V2US' &&
          parseInt(deviceVersion.split('.')[1]) < 28) {
        abort = true;
        abortMsg = t('factoryResetAbortMessage');
      }
    }
    swal.fire({
      icon: 'warning',
      title: t('Attention!'),
      text: t('thisCpeWillLoseAllItsConfigurations'),
      confirmButtonText: t('OK'),
      confirmButtonColor: '#4db6ac',
      cancelButtonText: t('Cancel'),
      cancelButtonColor: '#f2ab63',
      showCancelButton: true,
    }).then((result)=>{
      if (abort) {
        swal.fire({
          icon: 'warning',
          title: t('Attention!'),
          text: abortMsg,
          confirmButtonColor: '#4db6ac',
          confirmButtonText: t('OK'),
        });
      } else if (result.value) {
        swal.fire({
          title: t('gettingStockFirmwareReady...'),
          didOpen: () => {
            swal.showLoading();
          },
        });
        $.ajax({
          url: '/devicelist/factoryreset/' + id,
          type: 'post',
          success: function(res) {
            let pageNum = parseInt($('#curr-page-link').html());
            let filterList = $('#devices-search-input').val();
            filterList += ',' + columnToSort + ',' + columnSortType;
            loadDevicesTable(pageNum, filterList);
            swal.close();
            swal.fire({
              icon: 'success',
              title: t('processSuccessfullyStarted'),
              text: t('factoryResetRebootInstructions'),
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
          error: function(err) {
            swal.close();
            swal.fire({
              icon: 'error',
              title: t('errorOccurred'),
              text: t('couldnotRestoreStockFirmwareTryAgain'),
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
        });
      }
    });
  });

  $(document).on('click', '.btn-disassoc', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    swal.fire({
      icon: 'warning',
      title: t('Attention!'),
      text: t('routerDisassociateMeshConfirmation'),
      confirmButtonText: t('OK'),
      confirmButtonColor: '#4db6ac',
      cancelButtonText: t('Cancel'),
      cancelButtonColor: '#f2ab63',
      showCancelButton: true,
    }).then((result)=>{
      if (result.value) {
        $.ajax({
          url: '/devicelist/disassociate',
          type: 'post',
          traditional: true,
          data: {slave: id},
          success: function(res) {
            let pageNum = parseInt($('#curr-page-link').html());
            let filterList = $('#devices-search-input').val();
            filterList += ',' + columnToSort + ',' + columnSortType;
            loadDevicesTable(pageNum, filterList);
            swal.fire({
              icon: (res.success) ? 'success' : 'error',
              title: res.message,
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
          error: function(xhr, status, error) {
            let pageNum = parseInt($('#curr-page-link').html());
            let filterList = $('#devices-search-input').val();
            filterList += ',' + columnToSort + ',' + columnSortType;
            loadDevicesTable(pageNum, filterList);
            swal.fire({
              icon: 'error',
              title: t('internalError'),
              text: (xhr.responseJSON ? xhr.responseJSON.message : ''),
              confirmButtonColor: '#4db6ac',
              confirmButtonText: t('OK'),
            });
          },
        });
      }
    });
  });

  $(document).on('click', '[id^=devices-column-]',
  function(event) {
    let columnId = event.target.id;
    let columnNumber = columnId.split('-')[2];
    let statusHCol = $('table#devices-table th:nth-child(' + columnNumber +')');
    if (statusHCol.is(':visible')) {
      changeDevicesColumnVisibility('invisible', columnNumber);
      visibleColumnsOnPage.splice(
        visibleColumnsOnPage.indexOf(parseInt(columnNumber)), 1);
    } else {
      changeDevicesColumnVisibility('visible', columnNumber);
      visibleColumnsOnPage.push(parseInt(columnNumber));
    }
  });

  $(document).on('click', '.dropdown-menu.dont-close', function(event) {
    // Avoid closing the dropdown menu when clicking inside
    event.stopPropagation();
  });

  // Online devices
  $(document).on('click', '#online-status-sum', function(event) {
    if (!$('#devices-search-input').val().includes(t('online'))) {
      $('.tags-input input').focus().val(t('online')).blur();
    }

    // Always reload the table if clicked
    loadDevicesTable(1, $('#devices-search-input').val());
  });

  // Unstable devices
  $(document).on('click', '#recovery-status-sum', function(event) {
    if (!$('#devices-search-input').val().includes(t('unstable'))) {
      $('.tags-input input').focus().val(t('unstable')).blur();
    }

    // Always reload the table if clicked
    loadDevicesTable(1, $('#devices-search-input').val());
  });

  // Offline devices
  $(document).on('click', '#offline-status-sum', function(event) {
    if (!$('#devices-search-input').val().includes(t('offline'))) {
      $('.tags-input input').focus().val(t('offline')).blur();
    }

    // Always reload the table if clicked
    loadDevicesTable(1, $('#devices-search-input').val());
  });

  // Table column sorts
  $(document).on('click', '[id^=sort-]', function(event) {
    let pageNum = parseInt($('#curr-page-link').html());
    let filterList = $('#devices-search-input').val();
    // Reset other columns
    $('[id^=sort-]').css('font-weight', '').each(function(index) {
      let headerText = $(this).text().split('\u2191')[0];
      headerText = headerText.split('\u2193')[0];
      $(this).text(headerText);
    });
    // Set column sort visual
    $(event.target).css('font-weight', 'Bold');
    // Set sort tags
    columnToSort = '/' + this.id;
    if (columnSortType === '/sort-type-asc') {
      $(event.target).append('\u2193');
      columnSortType = '/sort-type-desc';
    } else {
      $(event.target).append('\u2191');
      columnSortType = '/sort-type-asc';
    }
    filterList += ',' + columnToSort + ',' + columnSortType;
    loadDevicesTable(pageNum, filterList);
  });

  $(document).on('change', '[id^=edit_is_ssid_prefix_enabled-]',
  function(input) {
    let cssClass1;
    let cssClass2;
    cssClass1 = input.target.parentNode.parentNode
      .childNodes[2].childNodes[0].childNodes[0]
      .childNodes[1].childNodes[1].classList;
    if (!input.target.parentNode.parentNode
      .childNodes[2].childNodes[1] == false) {
      cssClass2 = input.target.parentNode.parentNode
        .childNodes[2].childNodes[1].childNodes[0]
        .childNodes[1].childNodes[1].classList;
    }
    if (input.target.checked) {
      cssClass1.remove('d-none');
      if (!cssClass2 == false) {
        cssClass2.remove('d-none');
      }
    } else {
      cssClass1.add('d-none');
      if (!cssClass2 == false) {
        cssClass2.add('d-none');
      }
    }
  });
});
