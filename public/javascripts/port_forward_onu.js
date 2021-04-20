
let checkAdvancedOptions = function(input) {
  let isRangeofPorts = $('#port-forward-onu-range-of-ports-checkbox')[0].checked;
  let isAsymOpening = $('#port-forward-onu-asym-opening-checkbox')[0].checked;

  let advOptionsLabel = $('#port-forward-onu-advanced-options-labels')[0];

  let portBox = $('.port-forward-onu-port');
  let portLabel = $('.port-forward-onu-port-label');

  if (isRangeofPorts == false && isAsymOpening == false) {
    advOptionsLabel.className = 'row d-none';
    portBox[1].className = portBox[2].className = portBox[3].className = 'col-2 port-forward-onu-port d-none';
    portLabel[0].innerHTML = 'Porta';
  } else if (isRangeofPorts != isAsymOpening) {
    advOptionsLabel.className = 'row d-none';
    portBox[1].className = 'col-2 port-forward-onu-port';
    portBox[2].className = portBox[3].className = 'col-2 port-forward-onu-port d-none';
    if (isRangeofPorts) {
      portLabel[0].innerHTML = 'Inicial';
      portLabel[1].innerHTML = 'Final';
    } else {
      portLabel[0].innerHTML = 'Origem';
      portLabel[1].innerHTML = 'Destino';
    }
  } else if (isRangeofPorts == true && isAsymOpening == true) {
    advOptionsLabel.className = 'row';
    portBox[1].className = portBox[2].className = portBox[3].className = 'col-2 port-forward-onu-port';
    portLabel[0].innerHTML = portLabel[2].innerHTML = 'Inicial';
    portLabel[1].innerHTML = portLabel[3].innerHTML = 'Final';
  }
};

let checkPortMappingInputs = function() {
  let i;
  let aux;
  let deviceIp = $('#port-forward-onu').data('lanSubnet').split('.');
  let maskBits = $('#port-forward-onu').data('lanSubmask');
  let ipAddress = $('#port-forward-onu-ip-address-input')[0].value.split('.');
  let portBox = $('.port-forward-onu-port-input');
  let lanSubmask = [];
  let lanSubnet = [];
  let subnetRange = [];
  let maxRange = [];
  let isOnRange = true;

  // build the mask address from the number of bits that mask have
  for (i = 0; i < 4; i++) {
    if (maskBits > 7) {
      lanSubmask.push((2**8)-1);
    } else if (maskBits >= 0) {
      lanSubmask.push(256-2**(8-maskBits));
    } else {
      lanSubmask.push(0);
    }
    subnetRange.push(255 - lanSubmask[i]);
    maskBits -= 8;
  }
  // get the range of ip's that is allowed in that subnet

  // apply the mask to get the start of the subnet
  for (i = 0; i < lanSubmask.length; i++) {
    aux = lanSubmask[i] & deviceIp[i];
    lanSubnet.push(aux);
    maxRange.push(aux + subnetRange[i]);
  }

  console.log(lanSubnet, maxRange);

  // check if the given ip address for port mapping is in the range
  for (i = 0; i < ipAddress.length; i ++) {
    if (!(ipAddress[i] >= lanSubnet[i] && ipAddress[i] <= maxRange[i])) {
      // whenever block is out of range, put to false
      isOnRange = false;
    }
  }

  if (!isOnRange) {
    $('#port-forward-onu-modal-alert').
      removeClass('d-none').
      addClass('d-block').
      html(
        $('<h5></h5>').
          html('O Endereço IP fornecido não está na faixa de subrede do roteador!'),
      );
      setTimeout(function() {
          $('#port-forward-onu-modal-alert').
            removeClass('d-block').
            addClass('d-none');
        }, 2500);
  }
};

$(document).ready(function() {
  $(document).on('click', '.btn-port-forward-onu-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let serial = row.data('serialid');

    $('#port-forward-onu-main-label').text(serial);
    $('#port-forward-onu').attr('data-lan-subnet', row.data('lanSubnet'));
    $('#port-forward-onu').attr('data-lan-submask', row.data('lanSubmask'));
    $('#port-forward-onu').modal('show');
    /*
    $.ajax({
      type: 'GET',
      url: '/devicelist/uiportforward/' + id,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          let rulesTable = $('#openFirewallPortsRules');
          let rules = $('#openFirewallPortsFinalRules');
          rules.val('');
          rulesTable.empty();
          $.each(res.landevices, function(idx, value) {
            let deviceLabel = value.mac;
            deviceLabel = value.dhcp_name ? value.dhcp_name : deviceLabel;
            deviceLabel = value.name ? value.name : deviceLabel;
            devicePortAsym = hasPortForwardAsym ? value.router_port : null;
            insertOpenFirewallDoorRuleOnu({
              mac: value.mac, port: value.port, router_port: devicePortAsym,
              dmz: value.dmz, label: deviceLabel, has_dhcpv6: value.has_dhcpv6,
            });
          });

          $('#portForwardOnu_id_label').text(serialid);
          $('#port-forward-onu').modal('show');
          $('.btn-syncOnlineDevs').trigger('click');
        } else {
          badge = $(event.target).closest('.actions-opts')
                                 .find('.badge-warning');
          if (res.message) {
            badge.text(res.message);
          }
          badge.show();
          setTimeout(function() {
            badge.hide();
          }, 1500);
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
});
