import {anlixDocumentReady} from '../src/common.index.js';
import Validator from './device_validator.js';
import {setPortForwardStorage,
        getPortForwardStorage,
        deletePortForwardStorage} from './session_storage.js';

const t = i18next.t;

let triggerRedAlert = function(message) {
  if ($('#port-forward-tr069-modal-alert')[0].classList.contains('d-block')) {
    $('#port-forward-tr069-modal-alert')
      .append(
        $('<hr>'),
      )
      .append(
        $('<h5>')
          .html(message),
      );
  } else {
    $('#port-forward-tr069-modal-alert')
      .removeClass('d-none')
      .addClass('d-block')
      .html(
        $('<h5>')
          .html(message),
      );
    setTimeout(function() {
      $('#port-forward-tr069-modal-alert')
        .removeClass('d-block')
        .addClass('d-none');
    }, 2500);
  }
};

let showIncompatibilityMessage = function(compatibility) {
  let portInputs = $('.port-forward-tr069-port-input');
  let isRangeOfPorts = $('#port-forward-tr069-'+
    'range-of-ports-checkbox')[0];
  let isAsymOpening = $('#port-forward-tr069-asym-opening-checkbox')[0];
  let compatInfoDiv = $('#port-forward-tr069-modal-compat-info');
  let compatInfoMessage = $('#port-forward-tr069-modal-compat-info-message');
  let compatInfoList = $('#port-forward-tr069-modal-compat-info-list');
  let message = t('tr069PortOpenningIncompatibilityMessage', {
    model: getPortForwardStorage('model'),
    version: getPortForwardStorage('version'),
  });
  let show = false;
  compatInfoList.html('');
  Object.keys(compatibility).forEach((c) => {
    if (!compatibility[c]) {
      show = true;
      compatInfoList.append(
        $('<li>').html(t(c)),
      );
    }
  });
  message += '';
  if (show) {
    compatInfoDiv
      .removeClass('d-none')
      .addClass('d-block');
    compatInfoMessage
      .html(message);
  } else {
    compatInfoDiv
      .removeClass('d-block')
      .addClass('d-none');
  }
  if (!compatibility.simpleSymmetric) {
    portInputs[0].disabled = portInputs[1].disabled =
     portInputs[2].disabled = portInputs[3].disabled = true;
  }
  if (!compatibility.simpleAsymmetric) {
    isAsymOpening.disabled = true;
  }
  if (!compatibility.rangeSymmetric) {
    isRangeOfPorts.disabled = true;
  }
};

window.checkAdvancedOptions = function() {
  let compatibility = getPortForwardStorage('compatibility');
  let isRangeOfPorts = $('#port-forward-tr069-range-of-ports-checkbox')[0];
  let isAsymOpening = $('#port-forward-tr069-asym-opening-checkbox')[0];
  let advOptionsLabel = $('#port-forward-tr069-advanced-options-labels')[0];
  let portBox = $('.port-forward-tr069-port');
  let portLabel = $('.port-forward-tr069-port-label');
  let portInputs = $('.port-forward-tr069-port-input');

  if (compatibility.simpleSymmetric &&
    compatibility.simpleAsymmetric &&
    !compatibility.rangeAsymmetric) {
    if (isRangeOfPorts.checked) {
      isAsymOpening.disabled = true;
    } else {
      isAsymOpening.disabled = false;
    }
    if (isAsymOpening.checked) {
      isRangeOfPorts.disabled = true;
    } else {
      isRangeOfPorts.disabled = false;
    }
  }

  if (isRangeOfPorts.checked == false && isAsymOpening.checked == false) {
    advOptionsLabel.className = 'row d-none';
    portBox[1].className = portBox[2].className =
     portBox[3].className = 'col-md-2 col-4 port-forward-tr069-port d-none';
    portLabel[0].innerHTML = 'Porta';
    portInputs[1].value = portInputs[2].value = portInputs[3].value = '';
  } else if (isRangeOfPorts.checked != isAsymOpening.checked) {
    advOptionsLabel.className = 'row d-none';
    portBox[1].className = 'col-md-2 col-4 port-forward-tr069-port';
    portBox[2].className =
    portBox[3].className = 'col-md-2 col-4 port-forward-tr069-port d-none';

    portInputs[2].value = portInputs[3].value = '';
    if (isRangeOfPorts.checked) {
      portLabel[0].innerHTML = t('Initial');
      portLabel[1].innerHTML = t('Final');
    } else {
      portLabel[0].innerHTML = t('Source');
      portLabel[1].innerHTML = t('Destination');
    }
  } else if (isRangeOfPorts.checked == true && isAsymOpening.checked == true) {
    advOptionsLabel.className = 'row';
    portBox[1].className = portBox[2].className =
     portBox[3].className = 'col-md-2 col-4 port-forward-tr069-port';
    portLabel[0].innerHTML = portLabel[2].innerHTML = t('Initial');
    portLabel[1].innerHTML = portLabel[3].innerHTML = t('Final');
  }
};

window.removeOnePortMapping = function(input) {
  let ip = input.dataset['ip'];
  let portMapping = input.dataset['portMapping'];
  let listOfMappings = getPortForwardStorage('listOfMappings');
  let portsBadges = getPortForwardStorage('portsBadges-' + ip);

  let ports = portMapping.split(/-|:/).map((p) => parseInt(p));
  let isRangeOfPorts = portMapping.includes('-');

  if (portsBadges.length == 1) {
    window.removeSetOfPortMapping(input);
  } else {
    /* remove the one port mapping */
    portsBadges = portsBadges.filter((p) => {
      return p != portMapping;
    });
    if (ports.length == 1) {
      // 'ip' | 'ports[0]'
      listOfMappings = listOfMappings.filter((l) => {
        return l.external_port_start != ports[0];
      });
    } else if (ports.length == 2) {
      // 'ip' | 'ports[0]-ports[1]'
      if (isRangeOfPorts) {
        listOfMappings = listOfMappings.filter((l) => {
          return l.external_port_start != ports[0] &&
          l.external_port_end != ports[1];
        });
      } else {
        // 'ip' | 'ports[0]:ports[1]'
        listOfMappings = listOfMappings.filter((l) => {
          return l.external_port_start != ports[0] &&
          l.internal_port_start != ports[1];
        });
      }
    } else if (ports.length == 4) {
      // 'ip' | 'ports[0]-ports[1]:ports[2]-ports[3]'
      listOfMappings = listOfMappings.filter((l) => {
        return l.external_port_start != ports[0] &&
        l.external_port_end != ports[1] &&
        l.internal_port_start != ports[2] &&
        l.internal_port_end != ports[3];
      });
    } else {
      triggerRedAlert(t('unexpectedErrorHappened'));
    }
    /* *** */
    setPortForwardStorage('listOfMappings', listOfMappings);
    setPortForwardStorage('portsBadges-' + ip, portsBadges);
    $(input.parentElement).remove();
  }
};

window.removeSetOfPortMapping = function(input) {
  let ip = input.dataset['ip'];
  let portMappingTable = $('#port-forward-tr069-table');
  let listOfMappings = getPortForwardStorage('listOfMappings');
  listOfMappings = listOfMappings.filter((lm) => {
    return ip != lm.ip;
  });
  setPortForwardStorage('listOfMappings', listOfMappings);
  setPortForwardStorage('portsBadges-' + ip, null);
  portMappingTable.find('[data-ip="' + ip + '"]').remove();
};

window.removeAllPortMapping = function() {
  let portMappingTable = $('#port-forward-tr069-table');
  // get needful variables
  let variables = ['deviceId', 'serialId', 'model', 'version',
    'lanSubnet', 'lanSubmask', 'compatibility'];
  let values = [];
  variables.forEach((v) => {
    values.push(getPortForwardStorage(v));
  });
  // clean dom table and session storage
  portMappingTable.empty();
  deletePortForwardStorage();
  // return needful variables to session storage
  let i = 0;
  variables.forEach((v) => {
    setPortForwardStorage(v, values[i]);
    i++;
  });
};

let putPortMapping = function(ip, ports) {
  /*
    listOfMappings: [{
      ip: String,
      external_port_start: Number,
      external_port_end: Number,
      internal_port_start: Number,
      internal_port_end: Number,
    }]
  */
  let i;
  let portMappingTable = $('#port-forward-tr069-table');
  let isRangeOfPorts = $('#port-forward-tr069-'+
    'range-of-ports-checkbox')[0].checked;
  let compatibility = getPortForwardStorage('compatibility');
  let listOfMappings = getPortForwardStorage('listOfMappings');
  let portsBadges = getPortForwardStorage('portsBadges-' + ip);
  if (portsBadges == null) {
    portsBadges = [];
  }
  if (listOfMappings == null) {
    listOfMappings = [];
  }
  if (ports.length == 1) {
    // 'ip' | 'ports[0]'
    portsBadges.push(ports[0].toString());
    listOfMappings.push({
      'ip': ip,
      'external_port_start': ports[0],
      'external_port_end': ports[0],
      'internal_port_start': ports[0],
      'internal_port_end': ports[0],
    });
  } else if (ports.length == 2) {
    // 'ip' | 'ports[0]-ports[1]'
    if (isRangeOfPorts) {
      portsBadges.push(ports[0].toString()+
        '-' + ports[1].toString());
      listOfMappings.push({
        'ip': ip,
        'external_port_start': ports[0],
        'external_port_end': ports[1],
        'internal_port_start': ports[0],
        'internal_port_end': ports[1],
      });
    } else {
      // 'ip' | 'ports[0]:ports[1]'
      portsBadges.push(ports[0].toString()+
        ':' + ports[1].toString());
      listOfMappings.push({
        'ip': ip,
        'external_port_start': ports[0],
        'external_port_end': ports[0],
        'internal_port_start': ports[1],
        'internal_port_end': ports[1],
      });
    }
  } else if (ports.length == 4) {
    // 'ip' | 'ports[0]-ports[1]:ports[2]-ports[3]'
    portsBadges.push(ports[0].toString()+
        '-' + ports[1].toString() +
        ':' + ports[2].toString() +
        '-' + ports[3].toString());
    listOfMappings.push({
      'ip': ip,
      'external_port_start': ports[0],
      'external_port_end': ports[1],
      'internal_port_start': ports[2],
      'internal_port_end': ports[3],
    });
  } else {
    triggerRedAlert(t('unexpectedErrorHappened'));
    return;
  }
  // validate the new port mapping among others
  let validator = new Validator();
  let isOverlapping = validator.checkOverlappingPorts(listOfMappings);
  if (!isOverlapping.success) {
    triggerRedAlert(t('portsAreOverlapping!'));
    return;
  }
  let isCompatible = validator.checkIncompatibility(
    listOfMappings, compatibility);
  if (!isCompatible.success) {
    triggerRedAlert(t('incompatibleOption!'));
    return;
  }
  // process frontend information
  let listOfBadges = $('<td>').addClass('align-items-center')
                              .addClass('justify-content-center');
  for (i = 0; i < portsBadges.length; i++) {
    listOfBadges.append(
      $('<div>')
        .addClass('badge badge-primary badge-pill mr-2 mb-1')
        .append(
          $('<label>')
          .css('margin-top', '0.4rem')
          .addClass('mr-1')
          .html(
            portsBadges[i],
          ),
        )
        .append(
          $('<a>')
            .addClass('close')
            .attr('onclick', 'removeOnePortMapping(this)')
            .attr('data-ip', ip)
            .attr('data-port-mapping', portsBadges[i])
            .addClass('white-text')
            .html('&times;')),
        );
  }
  portMappingTable.find('[data-ip="' + ip + '"]').remove();
  portMappingTable.append(
    $('<tr>').append(
      $('<td>')
      .addClass('text-left')
      .append(
        $('<span>')
        .css('display', 'block')
        .html(ip),
      ),
      listOfBadges,
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
          .attr('onclick', 'removeSetOfPortMapping(this)')
          .attr('data-ip', ip),
        ),
    ).addClass('bounceIn')
    .attr('data-ip', ip),
  );
  // everything clean, then save in session storage
  setPortForwardStorage('listOfMappings', listOfMappings);
  setPortForwardStorage('portsBadges-' + ip, portsBadges);
};

window.checkPortMappingInputs = function() {
  let i;
  let deviceIp = getPortForwardStorage('lanSubnet');
  let maskBits = getPortForwardStorage('lanSubmask');
  let ipAddressGiven = $('#port-forward-tr069-ip-address-input')[0].value;
  let portsInputs = $('.port-forward-tr069-port-input');
  let isRangeOfPorts =
    $('#port-forward-tr069-range-of-ports-checkbox')[0].checked;
  let isAsymOpening = $('#port-forward-tr069-asym-opening-checkbox')[0].checked;
  let pvs = {ip: ipAddressGiven};
  if (!isRangeOfPorts && !isAsymOpening) { // simple
    pvs.external_port_start = pvs.external_port_end =
    pvs.internal_port_start = pvs.internal_port_end = portsInputs[0].value;
  } else if (isRangeOfPorts && isAsymOpening) { // asym and range
    pvs.external_port_start = portsInputs[0].value;
    pvs.external_port_end = portsInputs[1].value;
    pvs.internal_port_start = portsInputs[2].value;
    pvs.internal_port_end = portsInputs[3].value;
  } else if (isRangeOfPorts && !isAsymOpening) { // only range
    pvs.external_port_start = pvs.internal_port_start = portsInputs[0].value;
    pvs.external_port_end = pvs.internal_port_end = portsInputs[1].value;
  } else if (!isRangeOfPorts && isAsymOpening) { // only asym
    pvs.external_port_start = pvs.external_port_end = portsInputs[0].value;
    pvs.internal_port_start = pvs.internal_port_end = portsInputs[1].value;
  }
  let rules = [pvs];
  let validator = new Validator();
  let validity = validator.checkPortMappingValidity(rules, deviceIp, maskBits);
  if (validity.success) {
    let portsValues = [];
    for (i = 0; i < portsInputs.length; i++) {
      if (!isNaN(parseInt(portsInputs[i].value))) {
        portsValues.push(portsInputs[i].value);
      }
    }
    putPortMapping(ipAddressGiven, portsValues);
  } else {
    triggerRedAlert(validity.message);
  }
};

let fillSessionStorage = function(rules) {
  let i;
  let portsBadges = {};
  let listOfIps = [];

  for (i = 0; i < rules.length; i++) {
    if (portsBadges[rules[i].ip] == undefined) {
      portsBadges[rules[i].ip] = [];
      listOfIps.push(rules[i].ip);
    }
    // build portsBadges list from list of mappings
    // 'ip' | 'ports[0]'
    if (rules[i].external_port_start ==
      rules[i].external_port_end &&
      rules[i].external_port_end ==
      rules[i].internal_port_start &&
      rules[i].internal_port_start ==
      rules[i].internal_port_end) {
      portsBadges[rules[i].ip].push(rules[i].external_port_start.toString());
    } else if (rules[i].external_port_start ==
    // 'ip' | 'ports[0]-ports[1]'
      rules[i].internal_port_start &&
      rules[i].external_port_start <
      rules[i].external_port_end) {
      portsBadges[rules[i].ip].push(''+
        rules[i].external_port_start.toString()+
        '-'+
        rules[i].external_port_end.toString(),
      );
    } else if (rules[i].external_port_start ==
    // 'ip' | 'ports[0]:ports[1]'
      rules[i].external_port_end &&
      rules[i].external_port_start !=
      rules[i].internal_port_start) {
      portsBadges[rules[i].ip].push(''+
        rules[i].external_port_start.toString()+
        ':'+
        rules[i].internal_port_start.toString(),
      );
    } else if (rules[i].external_port_start <
    // 'ip' | 'ports[0]-ports[1]:ports[2]-ports[3]'
      rules[i].external_port_end &&
      rules[i].internal_port_start <
      rules[i].internal_port_end) {
      portsBadges[rules[i].ip].push(''+
        rules[i].external_port_start.toString()+
        '-'+
        rules[i].external_port_end.toString()+
        ':'+
        rules[i].internal_port_start.toString()+
        '-'+
        rules[i].internal_port_end.toString(),
      );
    }
    for (let li of listOfIps) {
      setPortForwardStorage('listOfMappings', rules);
      setPortForwardStorage('portsBadges-' + li, portsBadges[li]);
      buildMappingTable(li);
    }
  }
};

let buildMappingTable = function(ip) {
  let portsBadges = getPortForwardStorage('portsBadges-' + ip);
  let portMappingTable = $('#port-forward-tr069-table');
  let listOfBadges = $('<td>').addClass('align-items-center')
                              .addClass('justify-content-center');
  for (let i = 0; i < portsBadges.length; i++) {
    listOfBadges.append(
          $('<div>')
            .addClass('badge badge-primary badge-pill mr-2 mb-1')
            .append(
              $('<label>')
              .css('margin-top', '0.4rem')
              .addClass('mr-1')
              .html(
                portsBadges[i],
              ),
            )
            .append(
              $('<a>')
                .addClass('close')
                .attr('onclick', 'removeOnePortMapping(this)')
                .attr('data-ip', ip)
                .attr('data-port-mapping', portsBadges[i])
                .addClass('white-text')
                .html('&times;')),
            );
  }
  portMappingTable.find('[data-ip="' + ip + '"]').remove();
  portMappingTable.append(
    $('<tr>').append(
      $('<td>')
      .addClass('text-left')
      .append(
        $('<span>')
        .css('display', 'block')
        .html(ip),
      ),
      listOfBadges,
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
          .attr('onclick', 'removeSetOfPortMapping(this)')
          .attr('data-ip', ip),
        ),
    ).addClass('bounceIn')
    .attr('data-ip', ip),
  );
};

let triggerModalShow = function(res) {
  fillSessionStorage(res.content);
  setPortForwardStorage('compatibility', res.compatibility);
  window.checkAdvancedOptions();
  $('#port-forward-tr069-main-label').text(
    getPortForwardStorage('serialId'));
  $('#port-forward-tr069-modal').modal('show');
  showIncompatibilityMessage(res.compatibility);
  if (res.xmlWarning) {
    $('#port-forward-tr069-modal-reboot-info')
      .removeClass('d-none')
      .addClass('d-block');
  } else {
    $('#port-forward-tr069-modal-reboot-info')
      .removeClass('d-block')
      .addClass('d-none');
  }
};

anlixDocumentReady.add(function() {
  $(document).on('click', '.btn-port-forward-tr069-modal', function(event) {
    let row = $(event.target).parents('tr');
    // clean modal
    let portMappingTable = $('#port-forward-tr069-table');
    let portInputs = $('.port-forward-tr069-port-input');
    for (let i = 0; i < portInputs.length; i++) {
      portInputs[i].value = '';
    }
    $('#port-forward-tr069-range-of-ports-checkbox')[0].checked = false;
    $('#port-forward-tr069-asym-opening-checkbox')[0].checked = false;
    $('#port-forward-tr069-ip-address-input')[0].value = '';
    portMappingTable.empty();
    deletePortForwardStorage();
    setPortForwardStorage('deviceId', row.data('deviceid'));
    setPortForwardStorage('serialId', row.data('serialid'));
    setPortForwardStorage('model', row.data('deviceModel'));
    setPortForwardStorage('version', row.data('deviceVersion'));
    setPortForwardStorage('lanSubnet', row.data('lanSubnet'));
    setPortForwardStorage('lanSubmask', row.data('lanSubmask'));
    $.ajax({
      type: 'GET',
      url: '/devicelist/uiportforward/' + getPortForwardStorage('deviceId'),
      dataType: 'json',
      success: function(res) {
        if (res.wrongPortMapping) {
          let alertDiv = '<div class="alert alert-danger text-center">' +
            '<div class="fas fa-exclamation-triangle fa-lg"></div>' +
            '<span>&nbsp;&nbsp;'+t('allowPortMappingManagementWarning') +
            '</span></div>';
          swal.fire({
            icon: 'warning',
            title: t('portOpenning'),
            html: alertDiv,
            // Edit button
            confirmButtonText: t('Edit'),
            confirmButtonColor: '#ff3547',
            showConfirmButton: true,
            // Cancel button
            cancelButtonText: t('Cancel'),
            cancelButtonColor: '#4db6ac',
            showCancelButton: true,
          }).then((result)=>{
            if (result.isConfirmed && res.success) {
              triggerModalShow(res);
            }
          });
          return;
        }
        if (res.success) {
          triggerModalShow(res);
        } else {
          let badge = $(event.target).closest('.actions-opts')
                                     .find('.badge-warning');
          if (res.message) {
            badge.text(status + ': ' + res.message);
            badge.show();
            setTimeout(function() {
              badge.hide();
            }, 1500);
          }
        }
      },
    });
  });

  $(document).on('click', '#port-forward-tr069-submit-button',
    function(event) {
    $.ajax({
      type: 'POST',
      url: '/devicelist/uiportforward/' + getPortForwardStorage('deviceId'),
      dataType: 'json',
      data: JSON.stringify({
        'content': (getPortForwardStorage('listOfMappings') == null ?
                    '[]' :
                    JSON.stringify(getPortForwardStorage('listOfMappings'))),
      }),
      contentType: 'application/json',
      success: function(res) {
        if (res.success) {
          swal.fire({
            title: t('Success!'),
            icon: 'success',
            confirmButtonColor: '#4db6ac',
          });
        } else {
          swal.fire({
            title: t('failedToApplyPortOpenning'),
            text: res.message,
            icon: 'error',
            confirmButtonColor: '#4db6ac',
          });
        }
      },
      error: function(xhr, status, error) {
        swal.fire({
          title: t('failedToApplyPortOpenning'),
          text: error,
          icon: 'error',
          confirmButtonColor: '#4db6ac',
        });
      },
    });
  });
});
