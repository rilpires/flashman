
const selectizeOptionsMacs = {
  create: true,
  createFilter: RegExp('^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$'),
  labelField: 'label',
  render: {
    option_create: function(data, escape) {
      return $('<div></div>').addClass('create').append(
        'Adicionar: ',
        $('<strong></strong>').html(escape(data.input))
      );
    },
    option: function(data, escape) {
      return $('<div></div>').addClass('option').append(
        $('<span></span>').addClass('title').html(escape(data.label)),
        $('<span></span>').addClass('description').html(
          escape(JSON.parse(data.value)[0])
        )
      );
    },
  },
};

const selectizeOptionsPorts = {
  create: true,
  createFilter: function(input) {
    if (!isNaN(parseInt(input))) {
      let intPort = parseInt(input);
      if (intPort >= 1 && intPort <= 65535) {
        return true;
      }
    }
    return false;
  },
  render: {
    option_create: function(data, escape) {
      return $('<div></div>').addClass('create').append(
        'Adicionar: ',
        $('<strong></strong>').html(escape(data.input))
      );
    },
  },
};

const removeByKey = function(array, params) {
  array.some(function(item, index) {
    if (array[index][params.key] === params.value) {
      array.splice(index, 1);
      return true;
    }
    return false;
  });
  return array;
};

const isJsonString = function(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const insertOpenFirewallDoorRule = function(deviceEntry) {
  // Prepare badge list of ports
  let portListBadges = $('<td></td>').addClass('text-center');
  $.each(deviceEntry.port, function(idx, portValue) {
    portListBadges.append(
      $('<span></span>').addClass('badge badge-primary mr-1').html(portValue)
    );
  });
  // Prepare DMZ string
  let dmzString = deviceEntry.dmz ? 'Sim':'Não';
  // Delete rule if MAC already exists
  let rulesTable = $('#openFirewallPortsRules');
  rulesTable.find('[data-device="' + deviceEntry.mac + '"]').remove();
  // Create table entries
  rulesTable.append(
    $('<tr></tr>').append(
      $('<td></td>').addClass('text-left').append(
        $('<span></span>').css('display', 'block').append(
          $('<strong></strong>').html(deviceEntry.label)
                                .addClass('conn-device-label')
        ),
        $('<span></span>').css('display', 'block').html(deviceEntry.mac)
      ),
      portListBadges,
      $('<td></td>').addClass('text-center').html(dmzString),
      $('<td></td>').addClass('text-right').append(
        $('<button></button>').append(
          $('<div></div>').addClass('fas fa-times fa-lg')
        ).addClass('btn btn-sm btn-danger my-0 openFirewallPortsRemoveRule')
        .attr('type', 'button')
      )
    ).addClass('bounceIn')
    .attr('data-device', deviceEntry.mac)
  );
  // Delete rule from list if MAC already exists
  let rules = $('#openFirewallPortsFinalRules');
  let portsFinal = [];
  if (rules.val() != '') {
    portsFinal = JSON.parse(rules.val());
    portsFinal = removeByKey(portsFinal, {key: 'mac', value: deviceEntry.mac});
  }
  // Populate rules list
  let newport = {};
  newport.mac = deviceEntry.mac;
  newport.port = deviceEntry.port;
  newport.dmz = deviceEntry.dmz;
  portsFinal.push(newport);
  rules.val(JSON.stringify(portsFinal));
};

// Important: include and initialize socket.io first using socket var
socket.on('ONLINEDEV', function(macaddr, data) {
  if (($('#open-firewall-ports').data('bs.modal') || {})._isShown) {
    let id = $('#openfirewallRouterid_label').text();
    if (id == macaddr) {
      let inputDevs = $('#openFirewallPortsMac')[0].selectize;
      $('.btn-syncOnlineDevs').children()
                              .removeClass('animated rotateOut infinite');
      let macoptions = [];
      $.each(data.Devices, function(key, value) {
        let datanew = {};
        let deviceMac = key.toUpperCase();
        let deviceName = value.hostname.toUpperCase();
        // Check which label to display
        let deviceLabel = value.hostname == '!' ? deviceMac : deviceName;
        datanew.value = JSON.stringify([deviceMac, deviceLabel]);
        datanew.label = deviceLabel;
        // Populate connected devices dropdown options
        macoptions.push(datanew);
        // Change rendered table entries to include label information
        let rulesTable = $('#openFirewallPortsRules');
        rulesTable.find('[data-device="' + deviceMac + '"] .conn-device-label')
                  .html(deviceLabel);
      });
      inputDevs.addOption(macoptions);
    }
  }
});

$(document).ready(function() {
  // Init selectize fields
  $('#openFirewallPortsMac').selectize(selectizeOptionsMacs);
  $('#openFirewallPortsPorts').selectize(selectizeOptionsPorts);

  $('.btn-openFirewallPorts-modal').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');

    $.ajax({
      type: 'GET',
      url: '/devicelist/portforward/' + id,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          let rulesTable = $('#openFirewallPortsRules');
          let rules = $('#openFirewallPortsFinalRules');
          rules.val('');
          rulesTable.empty();
          $.each(res.landevices, function(idx, value) {
            insertOpenFirewallDoorRule(value);
          });

          $('#openfirewallRouterid_label').text(id);
          $('#open-firewall-ports').modal('show');
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
  });

  $('.btn-syncOnlineDevs').click(function(event) {
    let id = $('#openfirewallRouterid_label').text();
    $.ajax({
      url: '/devicelist/command/' + id + '/onlinedevs',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $(event.target).children().addClass('animated rotateOut infinite');
        } else {
          $(event.target).title = res.message;
          $(event.target).addClass('disabled');
        }
      },
      error: function(xhr, status, error) {
        $(event.target).title = status + ': ' + error;
        $(event.target).addClass('disabled');
      },
    });
  });

  // Use this format when adding button with AJAX
  $(document).on('click', '.openFirewallPortsRemoveRule', function(event) {
    let row = $(event.target).parents('tr');
    let mac = row.data('device');
    // Delete row form table
    let rulesTable = $('#openFirewallPortsRules');
    rulesTable.find('[data-device="' + mac + '"]').remove();
    // Delete rule from list
    let rules = $('#openFirewallPortsFinalRules');
    let portsFinal = [];
    if (rules.val() != '') {
      portsFinal = JSON.parse(rules.val());
      portsFinal = removeByKey(portsFinal, {key: 'mac', value: mac});
      rules.val(JSON.stringify(portsFinal));
    }
  });

  $('.btn-openFirewallPortsSaveRule').click(function(event) {
    let deviceId = $('#openFirewallPortsMac')[0].selectize.getValue();
    let ports = $('#openFirewallPortsPorts')[0].selectize.getValue();
    let dmz = $('#openFirewallPortsDMZ').is(':checked');
    if (deviceId == '') {
      swal({
        title: 'Falha na inclução da regra',
        text: 'O dispositivo deve ser informado!',
        type: 'error',
        confirmButtonColor: '#4db6ac',
      });
      return;
    }
    if (ports == '') {
      swal({
        title: 'Falha na inclução da regra',
        text: 'Informe, no mínimo, uma porta para liberar acesso!',
        type: 'error',
        confirmButtonColor: '#4db6ac',
      });
      return;
    }

    // Check if id has only a MAC or contains also a device name
    let deviceMac;
    let deviceLabel;
    if (isJsonString(deviceId)) {
      deviceMac = JSON.parse(deviceId)[0];
      deviceLabel = JSON.parse(deviceId)[1];
    } else {
      deviceMac = deviceId;
      deviceLabel = deviceId;
    }
    insertOpenFirewallDoorRule({
      mac: deviceMac, port: ports, dmz: dmz, label: deviceLabel,
    });
  });

  $('.btn-openFirewallPortsSubmit').click(function(event) {
    let id = $('#openfirewallRouterid_label').text();
    $.ajax({
      type: 'POST',
      url: '/devicelist/portforward/' + id,
      dataType: 'json',
      data: JSON.stringify({
        'content': $('#openFirewallPortsFinalRules').val(),
      }),
      contentType: 'application/json',
      success: function(res) {
        if (res.success) {
          swal({
            title: 'Regras aplicadas com sucesso',
            type: 'success',
            confirmButtonColor: '#4db6ac',
          });
        } else {
          swal({
            title: 'Falha ao aplicar regras',
            text: res.message,
            type: 'error',
            confirmButtonColor: '#4db6ac',
          });
        }
      },
      error: function(xhr, status, error) {
        swal({
          title: 'Falha ao aplicar regras',
          text: error,
          type: 'error',
          confirmButtonColor: '#4db6ac',
        });
      },
    });
  });
});
