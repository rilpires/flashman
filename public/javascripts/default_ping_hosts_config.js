/* eslint-disable no-prototype-builtins */
/* global __line */

import {anlixDocumentReady} from '../src/common.index.js';
import {
  setDefaultPingHostsList,
  getDefaultPingHostsList,
} from './session_storage.js';

const t = i18next.t;

const getDefaultPingHosts = function(event) {
  $.ajax({
    type: 'GET',
    url: '/devicelist/defaultpinghostslist',
    dataType: 'json',
    success: function(res) {
      if (res.success) {
        if (res.default_ping_hosts_list) {
          setDefaultPingHostsList(
            'defaultPingHostsInfo', res.default_ping_hosts_list,
          );
        }
        buildHostsTable();
        defaultHostsTableToggle();
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

const defaultHostsTableToggle = function(addingNewDevice = false) {
  if (getDefaultPingHostsList('defaultPingHostsInfo').length > 0 ||
      addingNewDevice) {
    $('#default-hosts-config-table-hide').hide();
    $('#default-hosts-config-table').show();
  } else if (getDefaultPingHostsList('defaultPingHostsInfo').length == 0) {
    $('#default-hosts-config-table-hide').show();
    $('#default-hosts-config-table').hide();
  }
};

const setDefaultPingHosts = function(event) {
  $.ajax({
    type: 'POST',
    url: '/devicelist/defaultpinghostslist',
    dataType: 'json',
    data: JSON.stringify({
      default_ping_hosts_list: getDefaultPingHostsList('defaultPingHostsInfo'),
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

let buildHostsTable = function() {
  $('#default-hosts-config-table').empty();
  let defaultPingHostsInfo = getDefaultPingHostsList('defaultPingHostsInfo');
  for (let i = 0; i < defaultPingHostsInfo.length; i++) {
    buildTableLine(defaultPingHostsInfo[i]);
  }
};

const buildTableLine = function(host) {
  let hostsTable = $('#default-hosts-config-table');
  hostsTable.append(
    $('<tr>').append(
      // Host column
      $('<td>')
        .addClass('text-left')
        .append(
          $('<span>')
          .css('display', 'block')
          .html(host),
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
            .attr('onclick', 'removeHostFromTable(this)')
            .attr('data-id', host),
          ),
    )
    .addClass('bounceIn')
    .attr('data-id', host),
  );
};

window.removeHostFromTable = function(input) {
  let hostsTable = $('#default-hosts-config-table');
  let host = input.dataset['id'];
  let newDefaultPingHostsInfo =
    getDefaultPingHostsList('defaultPingHostsInfo')
    .filter(
      (item) => (item != host),
    );
  setDefaultPingHostsList('defaultPingHostsInfo', newDefaultPingHostsInfo);
  hostsTable.find('[data-id="' + host + '"]').remove();
  defaultHostsTableToggle();
};

const addNewDefaultHost = function(event) {
  defaultHostsTableToggle(true);
  let defaultPingHostsInfo = getDefaultPingHostsList('defaultPingHostsInfo');
  const newHost = $('#default-hosts-config-input').val();
  if (!newHost || newHost === '') {
    swal.fire({
      icon: 'error',
      title: t('emptyHostError'),
      confirmButtonColor: '#4db6ac',
    });
  }
  if (defaultPingHostsInfo.filter((item) => item == newHost).length > 0) {
    swal.fire({
      icon: 'error',
      title: t('duplicatedHost', {host: newHost}),
      confirmButtonColor: '#4db6ac',
    });
  } else {
    buildTableLine(newHost);
    defaultPingHostsInfo.push(newHost);
    setDefaultPingHostsList('defaultPingHostsInfo', defaultPingHostsInfo);
  }
};

anlixDocumentReady.add(function() {
  // Lists the default hosts when the button that opens the modal is clicked
  $(document).on('click', '#default-hosts-config-button', (event) =>
    getDefaultPingHosts(event));
  // Submit button to apply changes
  $(document).on('click', '#default-hosts-config-submit-button', (event) =>
    setDefaultPingHosts(event));
  // Remove all hosts from table
  $(document).on('click', '#default-hosts-config-remove-all', function(event) {
    setDefaultPingHostsList('defaultPingHostsInfo', []);
    defaultHostsTableToggle();
    $('#default-hosts-config-table').empty();
  });
  // Add a new default host
  $(document).on('click', '#default-hosts-config-add-button', function(event) {
    addNewDefaultHost(event);
    $('#default-hosts-config-input').val('');
  });
});
