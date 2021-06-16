import Validator from './device_validator.js';

let triggerRedAlert = function(message) {
  if ($('#port-forward-tr069-modal-alert')[0].classList.contains('d-block')) {
    $('#port-forward-tr069-modal-alert').
      append(
        $('<hr></hr>'),
      ).
      append(
        $('<h5></h5>').
          html(message),
      );
  } else {
    $('#port-forward-tr069-modal-alert').
      removeClass('d-none').
      addClass('d-block').
      html(
        $('<h5></h5>').
          html(message),
      );
    setTimeout(function() {
        $('#port-forward-tr069-modal-alert').
          removeClass('d-block').
          addClass('d-none');
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
  let message = 'O modelo '+
  sessionStorage.getItem('model')
  +' versão '+
  sessionStorage.getItem('version')
  +' não suporta as seguintes formas de a abertura de portas: ';
  let show = false;
  compatInfoList.html('');
  if (!compatibility.simpleSymmetric) {
    show = true;
    compatInfoList.append(
      $('<li>').html('simples simétrica'),
    );
  }
  if (!compatibility.simpleAsymmetric) {
    show = true;
    compatInfoList.append(
      $('<li>').html('simples assimétrica'),
    );
  }
  if (!compatibility.rangeSymmetric) {
    show = true;
    compatInfoList.append(
      $('<li>').html('faixa de portas simétrica'),
    );
  }
  if (!compatibility.rangeAsymmetric) {
    show = true;
    compatInfoList.append(
      $('<li>').html('faixa de portas assimétrica'),
    );
  }
  message += '';
  if (show) {
    compatInfoDiv.
        removeClass('d-none').
        addClass('d-block');
    compatInfoMessage.
      html(message);
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

let checkAdvancedOptions = function() {
  let compatibility = JSON.parse(sessionStorage.getItem('compatibility'));
  let isRangeOfPorts = $('#port-forward-tr069-'+
    'range-of-ports-checkbox')[0];
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
      portLabel[0].innerHTML = 'Inicial';
      portLabel[1].innerHTML = 'Final';
    } else {
      portLabel[0].innerHTML = 'Origem';
      portLabel[1].innerHTML = 'Destino';
    }
  } else if (isRangeOfPorts.checked == true && isAsymOpening.checked == true) {
    advOptionsLabel.className = 'row';
    portBox[1].className = portBox[2].className =
     portBox[3].className = 'col-md-2 col-4 port-forward-tr069-port';
    portLabel[0].innerHTML = portLabel[2].innerHTML = 'Inicial';
    portLabel[1].innerHTML = portLabel[3].innerHTML = 'Final';
  }
};

let checkPortsValues = function(portsValues) {
  let i;
  let isPortsNumber = true;
  let isPortsOnRange = true;
  let isPortsNotEmpty = true;
  let isRangeOfSameSize = true;
  let isRangeNegative = true;
  let isRangeOfPorts = $('#port-forward-tr069-range-of-ports-checkbox')[0].checked;
  let isAsymOpening = $('#port-forward-tr069-asym-opening-checkbox')[0].checked;
  let checkUntil = 1;
  let portToCheck;

  if (isRangeOfPorts == isAsymOpening) {
    if (isRangeOfPorts) {
      checkUntil = 4;
    }
  } else {
    checkUntil = 2;
  }

  if (Array.isArray(portsValues)) {
    for (i = 0; i < checkUntil; i++) {
      portToCheck = portsValues[i];
      if (portToCheck == '') {
        isPortsNotEmpty = false;
      } else if (isNaN(parseInt(portToCheck))) {
        isPortsNumber = false;
      } else if (!(parseInt(portToCheck) >= 1 &&
                   parseInt(portToCheck) <= 65535 &&
                   parseInt(portToCheck) != 22 &&
                   parseInt(portToCheck) != 23 &&
                   parseInt(portToCheck) != 80 &&
                   parseInt(portToCheck) != 443 &&
                   parseInt(portToCheck) != 7547 &&
                   parseInt(portToCheck) != 58000)) {
        isPortsOnRange = false;
      }
    }
  } else {
    isPortsNumber = false;
  }
  if (!isPortsNumber) {
    triggerRedAlert('As portas devem ser números!');
  } else {
    if (isRangeOfPorts) {
      let firstSlice = parseInt(portsValues[1]) - parseInt(portsValues[0]);
      if (isAsymOpening) {
        let secondSlice = parseInt(portsValues[3]) - parseInt(portsValues[2]);
        if (firstSlice != secondSlice) {
          isRangeOfSameSize = false;
        }
        if (firstSlice < 1 || secondSlice < 1) {
          isRangeNegative = false;
        }
      } else {
        if (firstSlice < 1) {
          isRangeNegative = false;
        }
      }
    }
  }
  if (!isPortsOnRange) {
    triggerRedAlert('As portas devem estar na faixa entre 1 - 65535! ' +
                    '(Por particularidades de aplicações do dispositivo ' +
                    'TR-069 as seguintes portas também não são permitidas : ' +
                    '22, 23, 80, 443, 7547 e 58000)');
  }
  if (!isPortsNotEmpty) {
    triggerRedAlert('Os campos devem ser preenchidos!');
  }
  if (!isRangeOfSameSize) {
    triggerRedAlert('As faixas de portas são de tamanhos diferentes!');
  }
  if (!isRangeNegative) {
    triggerRedAlert('As faixas de portas estão com limites invertidos!');
  }
  return (isPortsNumber && isPortsOnRange &&
    isPortsNotEmpty && isRangeOfSameSize && isRangeNegative);
};

window.removeOnePortMapping = function(input) {
  let ip = input.dataset['ip'];
  let portMapping = input.dataset['portMapping'];

  let listOfMappings = JSON.parse(sessionStorage.getItem('listOfMappings'));
  let portsBadges = JSON.parse(sessionStorage.getItem('portsBadges-'+ip));

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
      triggerRedAlert('Um erro inesperado aconteceu');
    }
    /* *** */
    sessionStorage.setItem('listOfMappings', JSON.stringify(listOfMappings));
    sessionStorage.setItem('portsBadges-'+ip, JSON.stringify(portsBadges));
    $(input.parentElement).remove();
  }
};

window.removeSetOfPortMapping = function(input) {
  let ip = input.dataset['ip'];
  let portMappingTable = $('#port-forward-tr069-table');
  let listOfMappings = JSON.parse(sessionStorage.getItem('listOfMappings'));
  listOfMappings = listOfMappings.filter((lm) => {
    return ip != lm.ip;
  });
  sessionStorage.setItem('listOfMappings', JSON.stringify(listOfMappings));
  sessionStorage.setItem('portsBadges-'+ip, null);

  portMappingTable.find('[data-ip="' + ip + '"]').remove();
};

window.removeAllPortMapping = function() {
  let portMappingTable = $('#port-forward-tr069-table');
  // get needful variables
  let deviceId = sessionStorage.getItem('deviceId');
  let serialId = sessionStorage.getItem('serialId');
  let model = sessionStorage.getItem('model');
  let version = sessionStorage.getItem('version');
  let lanSubnet = sessionStorage.getItem('lanSubnet');
  let lanSubmask = sessionStorage.getItem('lanSubmask');
  let compatibility = JSON.parse(sessionStorage.getItem('compatibility'));
  // clean dom table and session storage
  portMappingTable.empty();
  sessionStorage.clear();
  // return needful variables to session storage
  sessionStorage.setItem('deviceId', deviceId);
  sessionStorage.setItem('serialId', serialId);
  sessionStorage.setItem('model', model);
  sessionStorage.setItem('version', version);
  sessionStorage.setItem('lanSubnet', lanSubnet);
  sessionStorage.setItem('lanSubmask', lanSubmask);
  sessionStorage.setItem('compatibility',
            JSON.stringify(compatibility));
};

let checkOverlappingPorts = function(ip, listOfMappings,
                                     ports, isRangeOfPorts) {
  let ret = false;
  let i;
  for (i = 0; i < listOfMappings.length; i++) {
    if (ports.length == 1) {
      if ((ports[0] >= listOfMappings[i].external_port_start &&
        ports[0] <= listOfMappings[i].external_port_end) ||
        (ip == listOfMappings[i].ip &&
          ports[0] >= listOfMappings[i].internal_port_start &&
          ports[0] <= listOfMappings[i].internal_port_end)) {
        ret = true;
      }
    } else if (ports.length == 2) {
      if (isRangeOfPorts) {
        if ((ports[0] >= listOfMappings[i].external_port_start &&
          ports[0] <= listOfMappings[i].external_port_end) ||
          (ports[1] >= listOfMappings[i].external_port_start &&
          ports[1] <= listOfMappings[i].external_port_end) ||
          (ip == listOfMappings[i].ip &&
            ports[0] >= listOfMappings[i].internal_port_start &&
            ports[0] <= listOfMappings[i].internal_port_end) ||
          (ip == listOfMappings[i].ip &&
            ports[1] >= listOfMappings[i].internal_port_start &&
            ports[1] <= listOfMappings[i].internal_port_end)) {
          ret = true;
        }
      } else {
        if ((ports[0] >= listOfMappings[i].external_port_start &&
          ports[0] <= listOfMappings[i].external_port_end) ||
          (ip == listOfMappings[i].ip &&
            ports[1] >= listOfMappings[i].internal_port_start &&
            ports[1] <= listOfMappings[i].internal_port_end)) {
          ret = true;
        }
      }
    } else if (ports.length == 4) {
      if ((ports[0] >= listOfMappings[i].external_port_start &&
          ports[0] <= listOfMappings[i].external_port_end) ||
          (ports[1] >= listOfMappings[i].external_port_start &&
          ports[1] <= listOfMappings[i].external_port_end) ||
          (ip == listOfMappings[i].ip &&
            ports[2] >= listOfMappings[i].internal_port_start &&
            ports[2] <= listOfMappings[i].internal_port_end) ||
          (ip == listOfMappings[i].ip &&
            ports[3] >= listOfMappings[i].internal_port_start &&
            ports[3] <= listOfMappings[i].internal_port_end)) {
        ret = true;
      }
    } else {
      triggerRedAlert('Um erro inesperado aconteceu');
    }
  }
  return ret;
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
  let isOverlapping = false;
  let portMappingTable = $('#port-forward-tr069-table');
  let isRangeOfPorts = $('#port-forward-tr069-'+
    'range-of-ports-checkbox')[0].checked;

  let compatibility = JSON.parse(sessionStorage.getItem('compatibility'));
  let listOfMappings = JSON.parse(sessionStorage.getItem('listOfMappings'));
  let portsBadges = JSON.parse(sessionStorage.getItem('portsBadges-'+ip));

  if (portsBadges == null) {
    portsBadges = [];
  }
  if (listOfMappings == null) {
    listOfMappings = [];
  }
  isOverlapping = checkOverlappingPorts(ip, listOfMappings,
                                        ports, isRangeOfPorts);
  if (isOverlapping) {
    triggerRedAlert('Porta estão sobrepostas!');
    return;
  } else {
    if (ports.length == 1) {
      // 'ip' | 'ports[0]'
      if (compatibility.simpleSymmetric) {
        portsBadges.push(ports[0].toString());
        listOfMappings.push({
          'ip': ip,
          'external_port_start': ports[0],
          'external_port_end': ports[0],
          'internal_port_start': ports[0],
          'internal_port_end': ports[0],
        });
      } else {
        triggerRedAlert('Opção não compatível!');
        return;
      }
    } else if (ports.length == 2) {
      // 'ip' | 'ports[0]-ports[1]'
      if (isRangeOfPorts) {
        if (compatibility.rangeSymmetric) {
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
          triggerRedAlert('Opção não compatível!');
          return;
        }
      } else {
        // 'ip' | 'ports[0]:ports[1]'
        if (compatibility.simpleAsymmetric) {
          portsBadges.push(ports[0].toString()+
            ':' + ports[1].toString());
          listOfMappings.push({
            'ip': ip,
            'external_port_start': ports[0],
            'external_port_end': ports[0],
            'internal_port_start': ports[1],
            'internal_port_end': ports[1],
          });
        } else {
          triggerRedAlert('Opção não compatível!');
          return;
        }
      }
    } else if (ports.length == 4) {
      // 'ip' | 'ports[0]-ports[1]:ports[2]-ports[3]'
      if (compatibility.rangeAsymmetric) {
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
        triggerRedAlert('Opção não compatível!');
        return;
      }
    } else {
      triggerRedAlert('Um erro inesperado aconteceu');
      return;
    }
    let listOfBadges = $('<td>').
          addClass('d-flex').
          addClass('flex-row').
          addClass('align-items-center').
          addClass('justify-content-center').
          addClass('flex-wrap');
    for (i = 0; i < portsBadges.length; i++) {
      listOfBadges.append(
            $('<div>').
              addClass('badge badge-primary badge-pill mr-2').
              append(
                $('<label>').
                css('margin-top', '0.4rem').
                addClass('mr-1').
                html(
                  portsBadges[i],
                ),
              ).
              append(
                $('<a>').
                  addClass('close').
                  attr('onclick', 'removeOnePortMapping(this)').
                  attr('data-ip', ip).
                  attr('data-port-mapping', portsBadges[i]).
                  addClass('white-text').
                  html('&times;')),
              );
    }
    portMappingTable.find('[data-ip="' + ip + '"]').remove();
    portMappingTable.append(
      $('<tr>').append(
        $('<td>').
        addClass('text-left').
        append(
          $('<span>').
          css('display', 'block').
          html(ip),
        ),
        listOfBadges,
        $('<td>').
          addClass('text-right').
          append(
            $('<button>').
            append(
              $('<div>').
              addClass('fas fa-times fa-lg'),
            ).
            addClass('btn btn-sm btn-danger my-0')
            .attr('type', 'button')
            .attr('onclick', 'removeSetOfPortMapping(this)')
            .attr('data-ip', ip),
          ),
      ).addClass('bounceIn')
      .attr('data-ip', ip),
    );

    sessionStorage.setItem('listOfMappings', JSON.stringify(listOfMappings));
    sessionStorage.setItem('portsBadges-'+ip, JSON.stringify(portsBadges));
  }
};

window.checkPortMappingInputs = function() {
  let i;
  let deviceIp = sessionStorage.getItem('lanSubnet');
  let maskBits = sessionStorage.getItem('lanSubmask');
  let ipAddressGiven = $('#port-forward-tr069-ip-address-input')[0].value;
  let portsInputs = $('.port-forward-tr069-port-input');
  let isAddressValid;
  let isPortsValid;
  let portsValues = [];
  let validator = new Validator();
  isAddressValid = validator.
  checkAddressSubnetRange(deviceIp,
    ipAddressGiven, maskBits);
  if (!isAddressValid) {
    triggerRedAlert('Endereço IP inválido!');
  } else {
    for (i = 0; i < portsInputs.length; i++) {
      portsValues.push(portsInputs[i].value);
    }
    isPortsValid = checkPortsValues(portsValues);
    portsValues = [];
    for (i = 0; i < portsInputs.length; i++) {
      if (!isNaN(parseInt(portsInputs[i].value))) {
        portsValues.push(parseInt(portsInputs[i].value));
      }
    }
    if (isAddressValid && isPortsValid) {
      putPortMapping(ipAddressGiven, portsValues);
    }
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
      sessionStorage.setItem('listOfMappings', JSON.stringify(rules));
      sessionStorage.setItem('portsBadges-'+li,
        JSON.stringify(portsBadges[li]));
      buildMappingTable(li);
    }
  }
};

let buildMappingTable = function(ip) {
  let portsBadges = JSON.parse(sessionStorage.getItem('portsBadges-'+ip));
  let portMappingTable = $('#port-forward-tr069-table');
  let listOfBadges = $('<td>').
          addClass('d-flex').
          addClass('flex-row').
          addClass('align-items-center').
          addClass('justify-content-center').
          addClass('flex-wrap');
  for (let i = 0; i < portsBadges.length; i++) {
    listOfBadges.append(
          $('<div>').
            addClass('badge badge-primary badge-pill mr-2').
            append(
              $('<label>').
              css('margin-top', '0.4rem').
              addClass('mr-1').
              html(
                portsBadges[i],
              ),
            ).
            append(
              $('<a>').
                addClass('close').
                attr('onclick', 'removeOnePortMapping(this)').
                attr('data-ip', ip).
                attr('data-port-mapping', portsBadges[i]).
                addClass('white-text').
                html('&times;')),
            );
  }
  portMappingTable.find('[data-ip="' + ip + '"]').remove();
  portMappingTable.append(
    $('<tr>').append(
      $('<td>').
      addClass('text-left').
      append(
        $('<span>').
        css('display', 'block').
        html(ip),
      ),
      listOfBadges,
      $('<td>').
        addClass('text-right').
        append(
          $('<button>').
          append(
            $('<div>').
            addClass('fas fa-times fa-lg'),
          ).
          addClass('btn btn-sm btn-danger my-0')
          .attr('type', 'button')
          .attr('onclick', 'removeSetOfPortMapping(this)')
          .attr('data-ip', ip),
        ),
    ).addClass('bounceIn')
    .attr('data-ip', ip),
  );
};

$(document).ready(function() {
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
    sessionStorage.clear();
    sessionStorage.setItem('deviceId', row.data('deviceid'));
    sessionStorage.setItem('serialId', row.data('serialid'));
    sessionStorage.setItem('model', row.data('deviceModel'));
    sessionStorage.setItem('version', row.data('deviceVersion'));
    sessionStorage.setItem('lanSubnet', row.data('lanSubnet'));
    sessionStorage.setItem('lanSubmask', row.data('lanSubmask'));
    $.ajax({
      type: 'GET',
      url: '/devicelist/uiportforward/' + sessionStorage.getItem('deviceId'),
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          fillSessionStorage(res.content);
          sessionStorage.setItem('compatibility',
            JSON.stringify(res.compatibility));
          checkAdvancedOptions();
          $('#port-forward-tr069-main-label').text(sessionStorage
                                             .getItem('serialId'));
          $('#port-forward-tr069-modal').modal('show');
          showIncompatibilityMessage(res.compatibility);
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
      url: '/devicelist/uiportforward/' + sessionStorage.getItem('deviceId'),
      dataType: 'json',
      data: JSON.stringify({
        'content': sessionStorage.getItem('listOfMappings') == null ?
        '[]':sessionStorage.getItem('listOfMappings'),
      }),
      contentType: 'application/json',
      success: function(res) {
        if (res.success) {
          swal({
            title: 'Sucesso!',
            type: 'success',
            confirmButtonColor: '#4db6ac',
          });
        } else {
          swal({
            title: 'Falha ao aplicar a abertura de portas',
            text: res.message,
            type: 'error',
            confirmButtonColor: '#4db6ac',
          });
        }
      },
      error: function(xhr, status, error) {
        swal({
          title: 'Falha ao aplicar a abertura de portas',
          text: error,
          type: 'error',
          confirmButtonColor: '#4db6ac',
        });
      },
    });
  });
});
