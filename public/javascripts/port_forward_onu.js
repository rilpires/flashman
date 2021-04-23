
let triggerRedAlert = function(message) {
  if ($('#port-forward-onu-modal-alert')[0].classList.contains('d-block')) {
    $('#port-forward-onu-modal-alert').
      append(
        $('<hr></hr>'),
      ).
      append(
        $('<h5></h5>').
          html(message),
      );
  } else {
    $('#port-forward-onu-modal-alert').
      removeClass('d-none').
      addClass('d-block').
      html(
        $('<h5></h5>').
          html(message),
      );
    setTimeout(function() {
        $('#port-forward-onu-modal-alert').
          removeClass('d-block').
          addClass('d-none');
      }, 2500);
  }
};

let checkAdvancedOptions = function(input) {
  let isRangeOfPorts = $('#port-forward-onu-range-of-ports-checkbox')[0].checked;
  let isAsymOpening = $('#port-forward-onu-asym-opening-checkbox')[0].checked;

  let advOptionsLabel = $('#port-forward-onu-advanced-options-labels')[0];

  let portBox = $('.port-forward-onu-port');
  let portLabel = $('.port-forward-onu-port-label');
  let portInputs = $('.port-forward-onu-port-input');

  if (isRangeOfPorts == false && isAsymOpening == false) {
    advOptionsLabel.className = 'row d-none';
    portBox[1].className = portBox[2].className = portBox[3].className = 'col-2 port-forward-onu-port d-none';
    portLabel[0].innerHTML = 'Porta';
    portInputs[1].value = portInputs[2].value = portInputs[3].value = '';
  } else if (isRangeOfPorts != isAsymOpening) {
    advOptionsLabel.className = 'row d-none';
    portBox[1].className = 'col-2 port-forward-onu-port';
    portBox[2].className = portBox[3].className = 'col-2 port-forward-onu-port d-none';

    portInputs[2].value = portInputs[3].value = '';
    if (isRangeOfPorts) {
      portLabel[0].innerHTML = 'Inicial';
      portLabel[1].innerHTML = 'Final';
    } else {
      portLabel[0].innerHTML = 'Origem';
      portLabel[1].innerHTML = 'Destino';
    }
  } else if (isRangeOfPorts == true && isAsymOpening == true) {
    advOptionsLabel.className = 'row';
    portBox[1].className = portBox[2].className = portBox[3].className = 'col-2 port-forward-onu-port';
    portLabel[0].innerHTML = portLabel[2].innerHTML = 'Inicial';
    portLabel[1].innerHTML = portLabel[3].innerHTML = 'Final';
  }
};

let checkAddressSubnetRange = function(deviceIp, ipAddressGiven, maskBits) {
  let i;
  let aux;
  let numberRegex = /[0-9]+/;
  let lanSubmask = [];
  let lanSubnet = [];
  let subnetRange = [];
  let maxRange = [];
  let isOnRange = true;
  let isIpFormatCorrect = true;

  deviceIp = deviceIp.split('.');
  ipAddressGiven = ipAddressGiven.split('.');

  if (ipAddressGiven.length != 4 || deviceIp.length != 4) {
    isIpFormatCorrect = false;
  } else {
    for (i = 0; i < ipAddressGiven.length; i++) {
      if (!numberRegex.test(ipAddressGiven[i]) ||
          !numberRegex.test(deviceIp[i])) {
        isIpFormatCorrect = false;
      }
    }
  }
  if (isIpFormatCorrect) {
    // build the mask address from the number of bits that mask have
    for (i = 0; i < 4; i++) {
      if (maskBits > 7) {
        lanSubmask.push((2**8)-1);
      } else if (maskBits >= 0) {
        // based on (sum of (2^(8-k)) from 0 to j)  - 256
        // to generate the sequence :
        // 0, 128, 192, 224, 240, 248, 252, 254
        lanSubmask.push(256-2**(8-maskBits));
      } else {
        lanSubmask.push(0);
      }
      subnetRange.push(255 - lanSubmask[i]);
      maskBits -= 8;
    }

    for (i = 0; i < lanSubmask.length; i++) {
      // apply the mask to get the start of the subnet
      aux = lanSubmask[i] & deviceIp[i];
      lanSubnet.push(aux);
      // get the range of ip's that is allowed in that subnet
      maxRange.push(aux + subnetRange[i]);
    }

    // check if the given ip address for port mapping is in the range
    for (i = 0; i < ipAddressGiven.length; i ++) {
      if (!(ipAddressGiven[i] >= lanSubnet[i] &&
            ipAddressGiven[i] <= maxRange[i])) {
        // whenever block is out of range, put to false
        isOnRange = false;
      }
    }
    // check if is broadcast or subnet id
    if (ipAddressGiven.every(function(e, idx) {
      return (e == lanSubnet[idx] || e == maxRange[idx]);
    })) {
      isOnRange = false;
    }
  }
  if (!isOnRange) {
    triggerRedAlert('O Endereço IP fornecido não está na faixa de subrede do roteador!');
  }

  if (!isIpFormatCorrect) {
    triggerRedAlert('Formato do Endereço dado está errado!');
  }

  return isOnRange && isIpFormatCorrect;
};

let checkPortsValues = function(portsValues) {
  let i;
  let isPortsNumber = true;
  let isPortsOnRange = true;
  let isPortsNotEmpty = true;
  let isRangeOfSameSize = true;
  let isRangeNegative = true;
  let isRangeOfPorts = $('#port-forward-onu-range-of-ports-checkbox')[0].checked;
  let isAsymOpening = $('#port-forward-onu-asym-opening-checkbox')[0].checked;
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
                   parseInt(portToCheck) <= 65535)) {
        isPortsOnRange = false;
      }
    }
  } else {
    isPortsNumber = false;
  }

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

  if (!isPortsNumber) {
    triggerRedAlert('As portas devem ser números!');
  }
  if (!isPortsOnRange) {
    triggerRedAlert('As portas devem estar na faixa entre 1 - 65535!');
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

let removeOnePortMapping = function(input) {
  let ip = input.dataset['ip'];
  let portMapping = input.dataset['portMapping'];

  let portsBadges = JSON.parse(sessionStorage.getItem('portsBadges-'+ip));
  let listOfMappings = JSON.parse(sessionStorage.getItem('listOfMappings-'+ip));
  let mapOfExternalPorts = new Set(JSON.parse(sessionStorage.getItem('mapOfExternalPorts-'+ip)));
  let mapOfInternalPorts = new Set(JSON.parse(sessionStorage.getItem('mapOfInternalPorts-'+ip)));

  let ports = portMapping.split(/-|:/);
  let isRangeOfPorts = portMapping.includes('-');
  let i;
  let j;

  /* remove the one port mapping */
  if (ports.length == 1) {
    // 'ip' | 'ports[0]'
    portsBadges = portsBadges.filter((p) => {
        return p != portMapping;
      });
    listOfMappings = listOfMappings.filter((l) => {
      return l.external != ports[0] &&
      l.internal != ports[0];
    });
    mapOfExternalPorts.delete(parseInt(ports[0]));
    mapOfInternalPorts.delete(parseInt(ports[0]));
    // console.log('!1');
  } else if (ports.length == 2) {
    // 'ip' | 'ports[0]-ports[1]'
    if (isRangeOfPorts) {
      portsBadges = portsBadges.filter((p) => {
        return p != portMapping;
      });
      for (i = parseInt(ports[0]); i <= parseInt(ports[1]); i++) {
        listOfMappings = listOfMappings.filter((l) => {
          return l.external != i &&
          l.internal != i;
        });
        mapOfExternalPorts.delete(i);
        mapOfInternalPorts.delete(i);
      }
      // console.log('!2');
    } else {
      // 'ip' | 'ports[0]:ports[1]'
      portsBadges = portsBadges.filter((p) => {
        return p != portMapping;
      });
      listOfMappings = listOfMappings.filter((l) => {
        return l.external != ports[0] &&
        l.internal != ports[1];
      });
      mapOfExternalPorts.delete(parseInt(ports[0]));
      mapOfInternalPorts.delete(parseInt(ports[1]));
      // console.log('!3');
    }
  } else if (ports.length == 4) {
    // 'ip' | 'ports[0]-ports[1]:ports[2]-ports[3]'
    portsBadges = portsBadges.filter((p) => {
        return p != portMapping;
      });
    for (i = parseInt(ports[0]); i <= parseInt(ports[1]); i++) {
      j = parseInt(ports[2])+(i-parseInt(ports[0]));
      listOfMappings = listOfMappings.filter((l) => {
        return l.external != i &&
        l.internal != j;
      });
      mapOfExternalPorts.delete(i);
      mapOfInternalPorts.delete(j);
    }
    // console.log('!4');
  } else {
    triggerRedAlert('Algo muito errado aconteceu...');
  }
  /* *** */

  sessionStorage.setItem('listOfMappings-'+ip, JSON.stringify(listOfMappings));
  sessionStorage.setItem('portsBadges-'+ip, JSON.stringify(portsBadges));
  sessionStorage.setItem('mapOfExternalPorts-'+ip,
   JSON.stringify(Array.from(mapOfExternalPorts)));
  sessionStorage.setItem('mapOfInternalPorts-'+ip,
   JSON.stringify(Array.from(mapOfInternalPorts)));

  $(input.parentElement).remove();
};

let removeSetOfPortMapping = function(input) {
  let ip = input.dataset['ip'];
  let portMappingTable = $('#port-forward-onu-table');

  sessionStorage.setItem('listOfMappings-'+ip, null);
  sessionStorage.setItem('portsBadges-'+ip, null);
  sessionStorage.setItem('mapOfExternalPorts-'+ip, null);
  sessionStorage.setItem('mapOfInternalPorts-'+ip, null);

  portMappingTable.find('[data-ip="' + ip + '"]').remove();
};

let removeAllPortMapping = function() {
  let portMappingTable = $('#port-forward-onu-table');
  let deviceId = sessionStorage.getItem('deviceId');
  let serialId = sessionStorage.getItem('serialId');
  let lanSubnet = sessionStorage.getItem('lanSubnet');
  let lanSubmask = sessionStorage.getItem('lanSubmask');

  portMappingTable.empty();
  sessionStorage.clear();

  sessionStorage.setItem('deviceId', deviceId);
  sessionStorage.setItem('serialId', serialId);
  sessionStorage.setItem('lanSubnet', lanSubnet);
  sessionStorage.setItem('lanSubmask', lanSubmask);
};

let putPortMapping = function(ip, ports) {
  /*
    // to present to modal
    portsBadges: [{String}],
    //  to save to database
    listOfMappings: [{
      external: Number,
      internal: Number,
      isOnRange: Boolean,
    }]
    // to check superposition
    mapOfPorts: Set({Integer}),
  */
  let i;
  let j;
  let isOverlapping = false;
  let portMappingTable = $('#port-forward-onu-table');
  let isRangeOfPorts = $('#port-forward-onu-range-of-ports-checkbox')[0].checked;

  let portsBadges = JSON.parse(sessionStorage.getItem('portsBadges-'+ip));
  let listOfMappings = JSON.parse(sessionStorage.getItem('listOfMappings-'+ip));
  let mapOfExternalPorts = JSON.parse(sessionStorage.getItem('mapOfExternalPorts-'+ip));
  let mapOfInternalPorts = JSON.parse(sessionStorage.getItem('mapOfInternalPorts-'+ip));

  if (portsBadges == null) {
    portsBadges = [];
  }
  if (listOfMappings == null) {
    listOfMappings = [];
  }
  mapOfExternalPorts = new Set(mapOfExternalPorts);

  mapOfInternalPorts = new Set(mapOfInternalPorts);


  if (ports.length == 1) {
    // 'ip' | 'ports[0]'
    if (!mapOfExternalPorts.has(ports[0])) {
      portsBadges.push(ports[0].toString());
      listOfMappings.push({
        'external': ports[0],
        'internal': ports[0],
        'is_on_range': false,
      });
      mapOfExternalPorts.add(ports[0]);
      mapOfInternalPorts.add(ports[0]);
      // console.log('#1');
    } else {
      isOverlapping = true;
      // console.log('#2');
    }
  } else if (ports.length == 2) {
    // 'ip' | 'ports[0]-ports[1]'
    if (isRangeOfPorts) {
      for (i = ports[0]; i <= ports[1]; i++) {
        if (mapOfExternalPorts.has(i)
          || mapOfInternalPorts.has(i)) {
          isOverlapping = true;
          // console.log('#3');
        }
      }
      if (!isOverlapping) {
        portsBadges.push(ports[0].toString()+
          '-' + ports[1].toString());
        for (i = ports[0]; i <= ports[1]; i++) {
          listOfMappings.push({
            'external': i,
            'internal': i,
            'is_on_range': true,
          });
          mapOfExternalPorts.add(i);
          mapOfInternalPorts.add(i);
        }
        // console.log('#4');
      }
    } else {
      // 'ip' | 'ports[0]:ports[1]'
      if (!mapOfExternalPorts.has(ports[0])
          && !mapOfInternalPorts.has(ports[1])) {
        portsBadges.push(ports[0].toString()+
          ':' + ports[1].toString());
        listOfMappings.push({
          'external': ports[0],
          'internal': ports[1],
          'is_on_range': false,
        });
        mapOfExternalPorts.add(ports[0]);
        mapOfInternalPorts.add(ports[1]);
        // console.log('#5');
      } else {
        isOverlapping = true;
        // console.log('#6');
      }
    }
  } else if (ports.length == 4) {
    // 'ip' | 'ports[0]-ports[1]:ports[2]-ports[3]'
    for (i = ports[0]; i <= ports[1]; i++) {
      j = ports[2]+(i-ports[0]);
      if (mapOfExternalPorts.has(i)
        || mapOfInternalPorts.has(j)) {
        isOverlapping = true;
        // console.log('#7');
      }
    }
    if (!isOverlapping) {
      portsBadges.push(ports[0].toString()+
          '-' + ports[1].toString() +
          ':' + ports[2].toString() +
          '-' + ports[3].toString());
      for (i = ports[0]; i <= ports[1]; i++) {
        j = ports[2]+(i-ports[0]);
        listOfMappings.push({
          'external': i,
          'internal': j,
          'is_on_range': true,
        });
        mapOfExternalPorts.add(i);
        mapOfInternalPorts.add(j);
      }
      // console.log('#8');
    }
  } else {
    triggerRedAlert('Algo muito errado aconteceu...');
  }

  if (isOverlapping) {
    triggerRedAlert('Porta estão sobrepostas!');
  } else {
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
    portMappingTable.find('[data-id="' + ip + '"]').remove();
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
      .attr('data-ip', ip)
      .attr('data-id', ip),
    );

    sessionStorage.setItem('listOfMappings-'+ip, JSON.stringify(listOfMappings));
    sessionStorage.setItem('portsBadges-'+ip, JSON.stringify(portsBadges));
    sessionStorage.setItem('mapOfExternalPorts-'+ip,
     JSON.stringify(Array.from(mapOfExternalPorts)));
    sessionStorage.setItem('mapOfInternalPorts-'+ip,
     JSON.stringify(Array.from(mapOfInternalPorts)));
  }
};

let checkPortMappingInputs = function() {
  let i;
  let deviceIp = sessionStorage.getItem('lanSubnet'); // $('#port-forward-onu').data('lanSubnet');
  let maskBits = sessionStorage.getItem('lanSubmask'); // $('#port-forward-onu').data('lanSubmask');
  let ipAddressGiven = $('#port-forward-onu-ip-address-input')[0].value;
  let portsInputs = $('.port-forward-onu-port-input');
  let isAddressValid;
  let isPortsValid;
  let isPortsAlreadyDefined;
  let portsValues = [];

  isAddressValid = checkAddressSubnetRange(deviceIp, ipAddressGiven, maskBits);

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

  isPortsAlreadyDefined = true;

  if (isAddressValid && isPortsValid && isPortsAlreadyDefined) {
    putPortMapping(ipAddressGiven, portsValues);
  }
};

$(document).ready(function() {
  $(document).on('click', '.btn-port-forward-onu-modal', function(event) {
    let row = $(event.target).parents('tr');
    sessionStorage.clear();
    sessionStorage.setItem('deviceId', row.data('deviceid'));
    sessionStorage.setItem('serialId', row.data('serialid'));
    sessionStorage.setItem('lanSubnet', row.data('lanSubnet'));
    sessionStorage.setItem('lanSubmask', row.data('lanSubmask'));

    $('#port-forward-onu-main-label').text(sessionStorage.getItem('serialId'));
    $('#port-forward-onu-modal').modal('show');
    /*
    $.ajax({
      type: 'GET',
      url: '/devicelist/uiportforward/' + sessionStorage.getItem('deviceId'),
      dataType: 'json',
      success: function(res) {
        if (res.success) {
        }
      },
      error: function(xhr, status, error) {
        badge = $(event.target).closest('.actions-opts')
                               .find('.badge-warning');
        if (res.message) {
          badge.text(status + ': ' + error);
        }
        badge.show();
        setTimeout(function() {
          badge.hide();
        }, 1500);
      },
    });
    */
  });

  $(document).on('click', '#port-forward-onu-submit-button',
    function(event) {
    // let portMappingTable = $('#port-forward-onu-table');
    // portMappingTable.find('[data-id]')[0].dataset['id'];
  });
});
