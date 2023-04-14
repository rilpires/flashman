/* eslint-disable no-prototype-builtins */

import {anlixDocumentReady} from '../src/common.index.js';
import {
  setDNSServersList, getDNSServersList, deleteDNSServersList,
} from './session_storage.js';

const t = i18next.t;
const modalIdPrefix = '#config-lan-dns-modal';

let DEVICE_ID = null;
let MAX_DNS_SERVERS = 1;
let TARGET_INDEX = null;
let LAN_SUBNET = null;

const getDNSServers = function(event) {
  // Get device id
  let row = $(event.target).parents('tr');
  DEVICE_ID = row.data('deviceid');
  $.ajax({
    type: 'GET',
    url: '/devicelist/landnsserverslist/' + DEVICE_ID,
    dataType: 'json',
    success: function(res) {
      if (res.success) {
        if (res.max_dns) {
          MAX_DNS_SERVERS = res.max_dns;
        }
        if (res.lan_dns_servers_list &&
            getDNSServersList('dnsServersInfo') === null) {
          setDNSServersList(
            'dnsServersInfo',
            res.lan_dns_servers_list.slice(0, MAX_DNS_SERVERS),
          );
        }
        if (res.lan_subnet) {
          LAN_SUBNET = res.lan_subnet;
        }
        // Trigger toggles
        cannotAddNewDNSToggle();
        dnsServersTableToggle();
        buildDNSServersTable();
        cannotRemoveAllAlertToggle(true);
        loadingMessageToggle(true);
      } else {
        swal.fire({
          icon: 'error',
          title: res.message,
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

const dnsServersTableToggle = function(addingNewDNS = false) {
  let dnsServersInfo = getDNSServersList('dnsServersInfo');
  // dnsServersInfo length can be greater than MAX_DNS_SERVERS. This conditions
  // make the toggle be in function of MAX_DNS_SERVERS
  if ((dnsServersInfo.length > 0 && dnsServersInfo.length <= MAX_DNS_SERVERS)
      || addingNewDNS) {
    // Non empty table
    $(modalIdPrefix+'-table-empty').hide();
    $(modalIdPrefix+'-table-show').show();
  } else {
    // Empty table
    $(modalIdPrefix+'-table-empty').show();
    $(modalIdPrefix+'-table-show').hide();
  }
};

const cannotAddNewDNSToggle = function() {
  let dnsServersInfo = getDNSServersList('dnsServersInfo');
  if (dnsServersInfo.length >= MAX_DNS_SERVERS) {
    // Cannot add
    // Update warning with correct max of dns servers
    let isPlural = (MAX_DNS_SERVERS !== 1) ?
      t('dnsLimitReachedMany', {max: MAX_DNS_SERVERS}) :
      t('dnsLimitReachedOne');
    $(modalIdPrefix+'-input-warning-msg').text(isPlural);
    $(modalIdPrefix+'-add-button').prop('disabled', true);
    $(modalIdPrefix+'-input-warning').show();
  } else {
    // Can add
    $(modalIdPrefix+'-add-button').prop('disabled', false);
    $(modalIdPrefix+'-input-warning').hide();
  }
};

const cannotRemoveAllAlertToggle = function(hide) {
  if (hide) {
    $(modalIdPrefix+'-footer-warning').hide();
  } else {
    $(modalIdPrefix+'-footer-warning').show();
  }
};

const loadingMessageToggle = function(btnEnabled) {
  if (btnEnabled) {
    $(modalIdPrefix+'-submit-button-icon').addClass('fa-check fa-lg');
    $(modalIdPrefix+'-submit-button-icon').removeClass('fa-spinner fa-pulse');
    $(modalIdPrefix+'-submit-button').prop('disabled', false);
  } else {
    $(modalIdPrefix+'-submit-button-icon').removeClass('fa-check fa-lg');
    $(modalIdPrefix+'-submit-button-icon').addClass('fa-spinner fa-pulse');
    $(modalIdPrefix+'-submit-button').prop('disabled', true);
  }
};

const removeAllDNSFromTable = function() {
  // Clears DNS Servers list
  setDNSServersList('dnsServersInfo', []);
  $(modalIdPrefix+'-table-show-body').empty();
  // As the user cannot delete all DNS servers, it adds the LAN IP in the table
  addLanIpToDnsTable();
};

const addLanIpToDnsTable = function() {
  // Add a new line with DNS = device's LAN IP
  dnsServersTableToggle(true);
  buildTableLine(LAN_SUBNET);
  setDNSServersList('dnsServersInfo', [LAN_SUBNET]);
  // Trigger toggles
  cannotRemoveAllAlertToggle(false);
  cannotAddNewDNSToggle();
};

const buildDNSServersTable = function() {
  $(modalIdPrefix+'-table-show-body').empty();
  let dnsServersInfo = getDNSServersList('dnsServersInfo');
  if (dnsServersInfo.length > 0) {
    for (let i = 0; i < dnsServersInfo.length; i++) {
      buildTableLine(dnsServersInfo[i]);
    }
  }
};

const buildTableLine = function(dns) {
  let dnsServersTable = $(modalIdPrefix+'-table-show-body');
  let tableIndex = dnsServersTable.children('tr').length;
  dnsServersTable.append(
    $('<tr>').append(
      // DNS column
      $('<td>')
        .addClass('text-left')
        .append(
          $('<span>')
          .css('display', 'block')
          .html('<b>' + findDNSTypeFromTableIndex(tableIndex) + ': </b>' + dns),
        ),
        // Remove entry column
        $('<td>')
          .addClass('text-right')
          .append(
            $('<button>')
            .append(
              $('<div>')
              .addClass('fas fa-times fa-lg'),
            )
            .addClass('btn btn-sm btn-danger my-0 mr-0')
            .attr('type', 'button')
            .attr('onclick', 'removeDNSFromTable(this)')
            .attr('data-id', dns),
          ),
    )
    .attr('data-id', dns),
  );
};

const addNewDNSServer = function(event) {
  let dnsServersInfo = getDNSServersList('dnsServersInfo');
  const newDNS = $(modalIdPrefix+'-input').val();
  // The program flow should prevent this scenario from happening, but, to
  // prevent javascript injection, it performs this check
  if (dnsServersInfo.length > MAX_DNS_SERVERS) {
    let isPlural = (MAX_DNS_SERVERS !== 1) ?
      t('dnsLimitReachedMany', {max: MAX_DNS_SERVERS}) :
      t('dnsLimitReachedOne');
    swal.fire({
      icon: 'error',
      title: isPlural,
      confirmButtonColor: '#4db6ac',
    });
    return false;
  }
  // It also shouldn't be possible to receive an invalid value as new DNS, but
  // it also performs that check
  if (!newDNS || newDNS === '') {
    swal.fire({
      icon: 'error',
      title: t('emptyDNSError'),
      confirmButtonColor: '#4db6ac',
    });
    return false;
  }
  // Does not accept duplicate entries
  if (dnsServersInfo.filter((i) => i === newDNS).length > 0) {
    swal.fire({
      icon: 'error',
      title: t('duplicatedDNS', {dns: newDNS}),
      confirmButtonColor: '#4db6ac',
    });
    return false;
  } else {
    // Successful addition
    dnsServersTableToggle(true);
    buildTableLine(newDNS);
    dnsServersInfo.push(newDNS);
    setDNSServersList('dnsServersInfo', dnsServersInfo);
  }
  return true;
};

window.removeDNSFromTable = function(input) {
  let dnsTable = $(modalIdPrefix+'-table-show-body');
  let dns = input.dataset['id'];
  let newDNSInfo = getDNSServersList('dnsServersInfo').filter(
    (item) => (item != dns),
  );
  setDNSServersList('dnsServersInfo', newDNSInfo);
  dnsTable.find('[data-id="' + dns + '"]').remove();
  dnsServersTableToggle();
  cannotAddNewDNSToggle();
  cannotRemoveAllAlertToggle(true);
  // Update DNS type
  dnsTable.find('tr').each(function(index) {
    let dns = $(this).attr('data-id');
    $(this).find('td:first-child span').html(
      '<b>' + findDNSTypeFromTableIndex(index) + ': </b>' + dns,
    );
  });
};

const findDNSTypeFromTableIndex = function(index) {
  return (index === 0) ? t('primaryDNS') :
         (index === 1) ? t('secondaryDNS') :
         (index === 2) ? t('tertiaryDNS') :
         t('dnsServerAddress');
};

const setDNSServers = function(event) {
  if ((TARGET_INDEX === undefined || TARGET_INDEX === null)
      && (DEVICE_ID === undefined || DEVICE_ID === null)) {
    loadingMessageToggle(true);
    swal.fire({
      icon: 'error',
      title: t('unexpectedErrorHappened'),
      confirmButtonColor: '#4db6ac',
    });
    return;
  } else if (getDNSServersList('dnsServersInfo').length === 0) {
    // User cannot send an empty list of hosts
    loadingMessageToggle(true);
    addLanIpToDnsTable();
    return;
  } else {
    // Send HTTP post request
    $.ajax({
      type: 'POST',
      url: '/devicelist/landnsserverslist/' + DEVICE_ID,
      dataType: 'json',
      data: JSON.stringify({
        dns_servers_list: getDNSServersList('dnsServersInfo'),
      }),
      contentType: 'application/json',
      success: function(res) {
        // Changes the form value to the backend approved DNS servers
        $('#edit_lan_dns-' + TARGET_INDEX).val(res.approved_dns_servers_list);
        // Clear storage
        deleteDNSServersList();
        // Close modal
        $(modalIdPrefix).modal('hide');
        swal.fire({
          icon: 'success',
          title: res.message,
          confirmButtonColor: '#4db6ac',
        });
      },
      error: function(xhr, status, error) {
        swal.fire({
          icon: 'error',
          title: error,
          confirmButtonColor: '#4db6ac',
        });
      },
    });
  }
};

anlixDocumentReady.add(function() {
  // Lists the DNS servers when the button that opens the modal is clicked
  $(document).on('click', '#btn-config-lan-dns-modal', (event) => {
    // Retrieves the id of the form referring to the device being edited
    TARGET_INDEX = $(event.currentTarget).data('index');
    getDNSServers(event);
  });
  // Remove all DNS servers from table
  $(document).on('click', modalIdPrefix+'-btn-remove-all', (event) => {
    // It is not possible for the DNS field to be empty. If the user wants to
    // delete all configured DNS servers, the DNS value will automatically be
    // equal to the LAN IP
    removeAllDNSFromTable();
    dnsServersTableToggle();
    cannotAddNewDNSToggle();
  });
  // Add a new DNS server
  $(document).on('click', modalIdPrefix+'-add-button', (event) => {
    if (addNewDNSServer(event)) {
      cannotRemoveAllAlertToggle(true);
      cannotAddNewDNSToggle();
    }
    $(modalIdPrefix+'-input').val('');
  });
  // Submit button to apply changes
  $(document).on('click', modalIdPrefix+'-submit-button', (event) => {
    loadingMessageToggle(false);
    setDNSServers(event);
  });
});
