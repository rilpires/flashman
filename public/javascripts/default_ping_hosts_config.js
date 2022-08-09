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
      } else {
        swal({
          type: res.type,
          title: res.message,
          confirmButtonColor: '#4db6ac',
        });
      }
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
  console.log('ola');
  let hostsTable = $('#default-hosts-config-table');
  let host = input.dataset['id'];
  let newDefaultPingHostsInfo =
    getDefaultPingHostsList('defaultPingHostsInfo')
    .filter(
      (item) => (item != host),
    );
    setDefaultPingHostsList('defaultPingHostsInfo', newDefaultPingHostsInfo);
    hostsTable.find('[data-id="' + host + '"]').remove();
};

anlixDocumentReady.add(function() {
  $(document).on('click', '#default-hosts-config-button', (event) =>
  getDefaultPingHosts(event));
});
