import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg, socket} from './common_actions.js';
import {
  setPingHostsList, getPingHostsList,
  setDefaultPingHostsList, getDefaultPingHostsList,
} from './session_storage.js';
import 'selectize';

const t = i18next.t;

let isPingHostListInitialized = false;

const editHostList = function() {
  if (isPingHostListInitialized) {
    let hostList = getPingHostsList('pingHostsInfo');
    let editedHostList = $('#hosts-list')[0].selectize.getValue();
    if (hostList.length > editedHostList.length) {
      removeHost(hostList, editedHostList);
    } else {
      addHost(editedHostList);
    }
  }
};

const addHost = function(editedHostList) {
  setPingHostsList('pingHostsInfo', editedHostList);
  $('#hosts-list').removeClass('is-invalid').addClass('is-valid');
  saveHostList(editedHostList);
};

const removeHost = function(hostList, editedHostList) {
  let deletedHost = hostList.filter((x) => !editedHostList.includes(x));
  let defaultHostList = getDefaultPingHostsList('defaultPingHostsInfo');
  if (defaultHostList.some((r) => deletedHost.includes(r))) {
    $('#hosts-list')[0].selectize.addOption(
      {value: deletedHost, text: deletedHost});
    $('#hosts-list')[0].selectize.addItem(deletedHost);
    $('#hosts-list-invalid-feedback').html(t('unableToRemoveADefaultHost'));
    $('#hosts-list').removeClass('is-valid').addClass('is-invalid');
  } else {
    setPingHostsList('pingHostsInfo', editedHostList);
    $('#hosts-list').removeClass('is-invalid').addClass('is-valid');
    saveHostList(editedHostList);
  }
};

const saveHostList = function(hostListToSave) {
  let id = $('#ping-test-hlabel').text();
  $.ajax({
    type: 'POST',
    url: '/devicelist/pinghostslist/' + id,
    dataType: 'json',
    data: JSON.stringify({
      'content': JSON.stringify({'hosts': hostListToSave}),
    }),
    contentType: 'application/json',
    success: function(res) {
      if (res.success) {
        setTimeout(function() {
          $('#hosts-list').removeClass('is-invalid is-valid');
        }, 2000);
      } else {
        $('#hosts-list-invalid-feedback').html(res.message);
        $('#hosts-list').removeClass('is-valid').addClass('is-invalid');
      }
    },
    error: function(xhr, status, error) {
      $('#hosts-list-invalid-feedback').html(error);
      $('#hosts-list').removeClass('is-valid').addClass('is-invalid');
    },
  });
};

const selectizeOptionsHosts = {
  create: true,
  onItemAdd: editHostList,
  onItemRemove: editHostList,
  render: {
    option_create: function(data, escape) {
      return $('<div>').addClass('create').append(
        t('Add') + ':',
        $('<strong>').html(escape(data.input)),
      );
    },
  },
};

// Important: include and initialize socket.io first using socket var
socket.on('PINGTEST', function(macaddr, data) {
  if (($('#ping-test').data('bs.modal') || {})._isShown) {
    let id = $('#ping-test-hlabel').text();
    let textarea = $('#ping-test-results');
    if (id == macaddr) {
      textarea.hide('fast').empty();
      let allDone = Object.keys(data.results).every(
        (k)=>(!('completed' in data.results[k]) || data.results[k].completed),
      );
      if (allDone) {
        $('.btn-start-ping-test').prop('disabled', false);
      }
      let resultsList = $('<ul>').addClass('list-group list-group-flush');

      $.each(data.results, function(key, value) {
        let hostname = key;
        let hostLatency = value.lat;
        let hostLoss = value.loss;

        if (('completed' in value) && value.completed === false) {
          if (hostLatency.includes('---') && hostLoss.includes('---')) {
            resultsList.append(
              $('<li>').addClass('list-group-item d-flex')
              .addClass('justify-content-between align-items-center')
              .html(hostname)
              .append(
                $('<span>')
                .addClass('text-center grey-text')
                .append(
                  $('<i>').addClass('fas fa-spinner fa-pulse fa-2x'),
                ),
              ),
            );
          }
        } else {
          resultsList.append(
            $('<li>').addClass('list-group-item d-flex')
            .addClass('justify-content-between align-items-center')
            .html(hostname)
            .append(
              $('<span>')
              .addClass('badge badge-primary badge-pill')
              .html(t('Latency=X', {x: hostLatency})),
              $('<span>')
              .addClass('badge badge-primary badge-pill')
              .html(hostLoss + t('%LostPackets')),
            ),
          );
        }
      });
      textarea.append(resultsList).show('fast');
    }
  }
});

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
      }
    },
  });
};

anlixDocumentReady.add(function() {
  // Init selectize fields
  $('#hosts-list').selectize(selectizeOptionsHosts);

  $(document).on('click', '.btn-ping-test-modal', function(event) {
    $('#hosts-list')[0].selectize.clear();
    getDefaultPingHosts(event);
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    if (row.data('is-tr069')) {
      $('#ping-test-tr069-spam').show();
    } else {
      $('#ping-test-tr069-spam').hide();
    }
    $.ajax({
      type: 'GET',
      url: '/devicelist/pinghostslist/' + id,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          let pingHosts = res.ping_hosts_list;
          setPingHostsList('pingHostsInfo', pingHosts);
          // Fill hosts field with selected values
          $.each(pingHosts, function(idx, value) {
            $('#hosts-list')[0].selectize.addOption(
              {value: value, text: value});
            $('#hosts-list')[0].selectize.addItem(value);
          });
          $('#hosts-list')[0].selectize.refreshItems();
          $('#ping-test-hlabel').text(id);
          $('#ping-test').modal('show');

          isPingHostListInitialized = true;
        } else {
          displayAlertMsg(res);
        }
      },
      error: function(xhr, status, error) {
        displayAlertMsg(JSON.parse(xhr.responseText));
      },
    });
  });

  $(document).on('click', '.btn-start-ping-test', function(event) {
    let textarea = $('#ping-test-results');
    let id = $('#ping-test-hlabel').text();
    $('.btn-start-ping-test').prop('disabled', true);
    $.ajax({
      url: '/devicelist/command/' + id + '/ping',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        $('#ping-test-placeholder').hide('fast', function() {
          $('#ping-test-results').empty().show('fast');
          if (res.success) {
            textarea.append(
              $('<h2>').addClass('text-center grey-text mb-3').append(
                $('<i>').addClass('fas fa-spinner fa-pulse fa-4x'),
                $('</br>'),
                $('</br>'),
                $('<span>').html(t('waitingCpeResponse...')),
              ),
            );
          } else {
            $('.btn-start-ping-test').prop('disabled', false);
            textarea.append(
              $('<h2>').addClass('text-center grey-text mb-3').append(
                $('<i>').addClass('fas fa-times fa-4x'),
                $('</br>'),
                $('<span>').html(res.message),
              ),
            );
          }
        });
      },
      error: function(xhr, status, error) {
        $('#ping-test-placeholder').hide('fast', function() {
          $('#ping-test-results').empty().show('fast');
          $('.btn-start-ping-test').prop('disabled', false);
          textarea.append($('<p>').text(status + ': ' + error));
        });
      },
    });
  });

  // Restore default modal state
  $('#ping-test').on('hidden.bs.modal', function() {
    $('#ping-test-results').hide().empty();
    $('#ping-test-placeholder').show();
    $('#hosts-list').removeClass('is-valid is-invalid');
    $('.btn-start-ping-test').prop('disabled', false);
    isPingHostListInitialized = false;
  });
});
