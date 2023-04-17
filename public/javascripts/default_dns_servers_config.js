/* eslint-disable no-prototype-builtins */

import {anlixDocumentReady} from '../src/common.index.js';
import {
  setDefaultLanDnsServersList,
  getDefaultLanDnsServersList,
} from './session_storage.js';

const t = i18next.t;
const modalIdPrefix = '#default-dns-servers-modal';
let selectedTabId = modalIdPrefix+'-tab-0';

const getDefaultLanDNSServers = function(event) {
  $.ajax({
    type: 'GET',
    url: '/devicelist/defaultlandnsservers',
    dataType: 'json',
    success: function(res) {
      if (res.success) {
        if (res.default_dns_servers) {
          setDefaultLanDnsServersList(
            'defaultDnsServersObj', res.default_dns_servers,
          );
        }
        buildDnsServersTable();
        defaultDnsTableToggle();
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

const defaultDnsTableToggle = function(addingNewEntry = false) {
  let dnsServerList = [];
  if ($(selectedTabId).text().toLowerCase() === 'ipv4') {
    dnsServerList = getDefaultLanDnsServersList('defaultDnsServersObj').ipv4;
  } else {
    dnsServerList = getDefaultLanDnsServersList('defaultDnsServersObj').ipv6;
  }
  if (dnsServerList.length > 0 || addingNewEntry) {
    $(modalIdPrefix+'-tab-table-empty').hide();
    $(modalIdPrefix+'-tab-table-show').show();
  } else {
    $(modalIdPrefix+'-tab-table-empty').show();
    $(modalIdPrefix+'-tab-table-show').hide();
  }
};

const setDefaultDnsServers = function(event) {
  $.ajax({
    type: 'POST',
    url: '/devicelist/defaultlandnsservers',
    dataType: 'json',
    data: JSON.stringify({
      default_dns_servers: getDefaultLanDnsServersList('defaultDnsServersObj'),
    }),
    contentType: 'application/json',
    success: function(res) {
      swal.fire({
        icon: res.type,
        title: res.message,
        confirmButtonColor: '#4db6ac',
      });
    },
  });
};

let buildDnsServersTable = function() {
  $(modalIdPrefix+'-tab-table-show-body').empty();
  let defaultDnsServersObj =
    getDefaultLanDnsServersList('defaultDnsServersObj');
  let defaultDnsServersList = [];
  if ($(selectedTabId).text().toLowerCase() === 'ipv4') {
    defaultDnsServersList = defaultDnsServersObj.ipv4;
  } else {
    defaultDnsServersList = defaultDnsServersObj.ipv6;
  }
  for (let i = 0; i < defaultDnsServersList.length; i++) {
    buildTableLine(defaultDnsServersList[i]);
  }
};

const buildTableLine = function(server) {
  let serversTable = $(modalIdPrefix+'-tab-table-show-body');
  serversTable.append(
    $('<tr>').append(
      // Host column
      $('<td>')
        .addClass('text-left')
        .append(
          $('<span>')
          .css('display', 'block')
          .html(server),
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
            .attr('onclick', 'removeDnsServersFromTable(this)')
            .attr('data-id', server),
          ),
    )
    .attr('data-id', server),
  );
};

window.removeDnsServersFromTable = function(input) {
  let serversTable = $(modalIdPrefix+'-tab-table-show-body');
  let server = input.dataset['id'];
  let defaultDnsServersObj =
    getDefaultLanDnsServersList('defaultDnsServersObj');
  defaultDnsServersObj.ipv4 = defaultDnsServersObj.ipv4.filter(
    (item) => (item != server),
  );
  defaultDnsServersObj.ipv6 = defaultDnsServersObj.ipv6.filter(
    (item) => (item != server),
  );
  setDefaultLanDnsServersList('defaultDnsServersObj', defaultDnsServersObj);
  serversTable.find('[data-id="' + server + '"]').remove();
  defaultDnsTableToggle();
};

const addNewDefaultDnsServer = function(event) {
  defaultDnsTableToggle(true);
  let defaultDnsServersObj =
    getDefaultLanDnsServersList('defaultDnsServersObj');
  const newServer = $(modalIdPrefix+'-tab-input').val();
  if (!newServer || newServer === '') {
    swal.fire({
      icon: 'error',
      title: t('emptyHostError'),
      confirmButtonColor: '#4db6ac',
    });
    return;
  }
  if (
    (defaultDnsServersObj.ipv4.filter((s) => s == newServer).length > 0) ||
    (defaultDnsServersObj.ipv6.filter((s) => s == newServer).length > 0)
  ) {
    swal.fire({
      icon: 'error',
      title: t('duplicatedHost', {host: newServer}),
      confirmButtonColor: '#4db6ac',
    });
    return;
  } else {
    if ($(selectedTabId).text().toLowerCase() === 'ipv4') {
      buildTableLine(newServer);
      defaultDnsServersObj.ipv4.push(newServer);
    } else {
      buildTableLine(newServer);
      defaultDnsServersObj.ipv6.push(newServer);
    }
    setDefaultLanDnsServersList('defaultDnsServersObj', defaultDnsServersObj);
  }
};

anlixDocumentReady.add(function() {
  // Lists the default dns servers
  // when the button that opens the modal is clicked
  $(document).on('click', '#default-dns-servers-config-button', (event) => {
    $(modalIdPrefix).modal('show');
    getDefaultLanDNSServers(event);
  });
  // Submit button to apply changes
  $(document).on('click', modalIdPrefix+'-tab-submit-button', (event) =>
    setDefaultDnsServers(event));
  // // Remove all from table
  $(document).on('click', modalIdPrefix+'-tab-btn-remove-all',
    function(event) {
      setDefaultLanDnsServersList('defaultDnsServersObj', {ipv4: [], ipv6: []});
      defaultDnsTableToggle();
      $(modalIdPrefix+'-tab-table-show-body').empty();
    },
  );
  // Add a new default
  $(document).on('click', modalIdPrefix+'-tab-add-button',
    function(event) {
      addNewDefaultDnsServer(event);
      $(modalIdPrefix+'-tab-input').val('');
    },
  );
  // Toggle tabs
  $(document).on('click', modalIdPrefix+'-tabs a', (event) => {
    event.preventDefault();
    $(this).tab('show');
    selectedTabId = '#' + $(event.target).attr('id');
    buildDnsServersTable();
    defaultDnsTableToggle();
  });
});
