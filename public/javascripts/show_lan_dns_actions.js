/* eslint-disable no-prototype-builtins */
/* global __line */

import {anlixDocumentReady} from '../src/common.index.js';
import {setDNSServersList, getDNSServersList} from './session_storage.js';

const t = i18next.t;

let MAX_DNS_SERVERS = 3;
let TARGET_INDEX = null;
let LAN_SUBNET = null;

const getDNSServers = function(event) {
  // Get device id
  let row = $(event.target).parents('tr');
  let id = row.data('deviceid');
  $.ajax({
    type: 'GET',
    url: '/devicelist/landnsserverslist/' + id,
    dataType: 'json',
    success: function(res) {
      if (res.success) {
        if (res.max_dns && res.max_dns > 0) {
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
        cannotAddNewDNSToggle();
        buildDNSServersTable();
        dnsServersTableToggle();
        cannotRemoveAllAlertToggle(true);
      } else {
        swal.fire({
          icon: res.type,
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
    $('#config-lan-dns-table-none').hide();
    $('#config-lan-dns-table').show();
  } else if (dnsServersInfo.length === 0 ||
             dnsServersInfo.length > MAX_DNS_SERVERS) {
    // Empty table
    $('#config-lan-dns-table-none').show();
    $('#config-lan-dns-table').hide();
  }
};

const cannotAddNewDNSToggle = function() {
  let dnsServersInfo = getDNSServersList('dnsServersInfo');
  if (dnsServersInfo.length >= MAX_DNS_SERVERS) {
    // Cannot add
    $('#add-new-dns-section').hide();
    $('#cannot-add-new-dns-section').show();
    // Update warning with correct max of dns servers
    let plural = (MAX_DNS_SERVERS !== 1) ? 's' : '';
    $('#max-dns-warning').text(
      t('dnsLimitReached', {max: MAX_DNS_SERVERS, plural: plural}),
    );
  } else if (dnsServersInfo.length < MAX_DNS_SERVERS) {
    // Can add
    $('#add-new-dns-section').show();
    $('#cannot-add-new-dns-section').hide();
  }
};

const cannotRemoveAllAlertToggle = function(hide) {
  if (hide) {
    $('#cannot-remove-all-warning').hide();
  } else {
    $('#cannot-remove-all-warning').show();
  }
};

const removeAllDNSFromTable = function() {
  // Clears DNS Servers list
  setDNSServersList('dnsServersInfo', []);
  $('#config-lan-dns-table').empty();
  // Add a new line with DNS = device's LAN IP
  dnsServersTableToggle(true);
  buildTableLine(LAN_SUBNET);
  setDNSServersList('dnsServersInfo', [LAN_SUBNET]);
  // Toggle warning
  cannotRemoveAllAlertToggle(false);
};

const buildDNSServersTable = function() {
  $('#config-lan-dns-table').empty();
  let dnsServersInfo = getDNSServersList('dnsServersInfo');
  for (let i = 0; i < dnsServersInfo.length; i++) {
    buildTableLine(dnsServersInfo[i]);
  }
};

const buildTableLine = function(dns) {
  let dnsServersTable = $('#config-lan-dns-table');
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
    .addClass('bounceIn')
    .attr('data-id', dns),
  );
};

const addNewDNSServer = function(event) {
  dnsServersTableToggle(true);
  let dnsServersInfo = getDNSServersList('dnsServersInfo');
  const newDNS = $('#config-lan-dns-input').val();
  // The program flow should prevent this scenario from happening, but, to
  // prevent javascript injection, it performs this check
  if (dnsServersInfo.length > MAX_DNS_SERVERS) {
    let plural = (MAX_DNS_SERVERS !== 1) ? 's' : '';
    swal.fire({
      icon: 'error',
      title: t('dnsLimitReached', {max: MAX_DNS_SERVERS, plural: plural}),
      confirmButtonColor: '#4db6ac',
    });
    return;
  }
  // It also shouldn't be possible to receive an invalid value as new DNS, but
  // it also performs that check
  if (!newDNS || newDNS === '') {
    swal.fire({
      icon: 'error',
      title: t('emptyDNSError'),
      confirmButtonColor: '#4db6ac',
    });
    return;
  }
  // Does not accept duplicate entries
  if (dnsServersInfo.filter((i) => i === newDNS).length > 0) {
    swal.fire({
      icon: 'error',
      title: t('duplicatedDNS', {dns: newDNS}),
      confirmButtonColor: '#4db6ac',
    });
    return;
  } else {
    // Successful addition
    buildTableLine(newDNS);
    dnsServersInfo.push(newDNS);
    setDNSServersList('dnsServersInfo', dnsServersInfo);
  }
};

window.removeDNSFromTable = function(input) {
  let dnsTable = $('#config-lan-dns-table');
  let dns = input.dataset['id'];
  let newDNSInfo = getDNSServersList('dnsServersInfo').filter(
    (item) => (item != dns),
  );
  setDNSServersList('dnsServersInfo', newDNSInfo);
  dnsTable.find('[data-id="' + dns + '"]').remove();
  dnsServersTableToggle();
  cannotAddNewDNSToggle();
  // Update DNS type
  dnsTable.find('tr').each(function(index) {
    let dns = $(this).attr('data-id');
    $(this).find('td:first-child span').html(
      '<b>' + findDNSTypeFromTableIndex(index) + ': </b>' + dns,
    );
  });
  if (getDNSServersList('dnsServersInfo').length === 0) {
    removeAllDNSFromTable();
  }
};

const findDNSTypeFromTableIndex = function(index) {
  return (index === 0) ? t('primaryDNS') :
         (index === 1) ? t('secondaryDNS') :
         (index === 2) ? t('tertiaryDNS') :
         t('dnsServerAddress');
};

const setDNSServers = function() {
  let dnsServersInfo = getDNSServersList('dnsServersInfo');
  if (TARGET_INDEX === undefined || TARGET_INDEX === null) {
    swal.fire({
      icon: 'error',
      title: t('unexpectedErrorHappened'),
      confirmButtonColor: '#4db6ac',
    });
    return;
  } else {
    // Changes the form referring to the device being edited
    $('#edit_lan_dns-' + TARGET_INDEX).val(
      dnsServersInfo.slice(0, MAX_DNS_SERVERS).join(','),
    );
    // Close modal
    $('#config-lan-dns-modal.modal').modal('hide');
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
  $(document).on('click', '#config-lan-dns-remove-all', (event) => {
    // It is not possible for the DNS field to be empty. If the user wants to
    // delete all configured DNS servers, the DNS value will automatically be
    // equal to the LAN IP
    removeAllDNSFromTable();
    dnsServersTableToggle();
    cannotAddNewDNSToggle();
  });
  // Add a new DNS server
  $(document).on('click', '#config-lan-dns-add-button', (event) => {
    cannotAddNewDNSToggle();
    addNewDNSServer(event);
    cannotRemoveAllAlertToggle(true);
    cannotAddNewDNSToggle();
    $('#config-lan-dns-input').val('');
  });
  // Submit button to apply changes
  $(document).on('click', '#config-lan-dns-submit-button', (event) => {
    setDNSServers(event);
  });
});
