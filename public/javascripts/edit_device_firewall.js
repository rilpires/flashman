
const selectizeOptionsMacs = {
  create: true,
  valueField: 'value',
  labelField: 'label',
  render: {
    option_create: function(data, escape) {
      return '<div class="create">Novo MAC: <strong>' + escape(data.input) +
             '</strong>&hellip;</div>';
    },
  },
};

const selectizeOptionsPorts = {
  create: true,
  valueField: 'value',
  labelField: 'label',
  render: {
    option_create: function(data, escape) {
      return '<div class="create">Nova Porta: <strong>' + escape(data.input) +
             '</strong>&hellip;</div>';
    },
  },
};

let removeByKey = function(array, params) {
  array.some(function(item, index) {
    if (array[index][params.key] === params.value) {
      array.splice(index, 1);
      return true;
    }
    return false;
  });
  return array;
};

let insertOpenFirewallDoorRule = function(deviceEntry) {
  // Prepare badge list of ports
  let portListBadges = $('<td></td>').addClass('text-center');
  $.each(deviceEntry.port, function(idx, portValue) {
    portListBadges.append(
      $('<span></span>').addClass('badge badge-primary mr-1').html(portValue)
    );
  });
  // Prepare DMZ string
  let dmzString = deviceEntry.dmz ? 'Sim':'Não';
  // Create table entries
  let rulesTable = $('#openFirewallPortsRules');
  rulesTable.append(
    $('<tr></tr>').append(
      $('<td></td>').addClass('text-left').html(deviceEntry.mac),
      portListBadges,
      $('<td></td>').addClass('text-center').html(dmzString),
      $('<td></td>').addClass('text-right').append(
        $('<button></button>').append(
          $('<div></div>').addClass('fas fa-times fa-lg')
        ).addClass('btn btn-sm btn-danger my-0 openFirewallPortsRemoveRule')
        .attr('type', 'button')
      )
    ).attr('data-device', deviceEntry.mac)
  );
  // Populate rules list
  let rules = $('#openFirewallPortsFinalRules');
  let portsFinal = [];
  let newport = {};
  if (rules.val() != '') {
    portsFinal = JSON.parse(rules.val());
  }
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
      macoptions = [];
      $.each(data.Devices, function(key, value) {
        datanew = {};
        datanew.value = key;
        datanew.label = key;
        macoptions.push(datanew);
      });
      inputDevs.addOption(macoptions);
    }
  }
});

$(document).ready(function() {
  $('#openFirewallPortsMac').selectize(selectizeOptionsMacs);
  $('#openFirewallPortsPorts').selectize(selectizeOptionsPorts);

  $('.btn-openFirewallPorts-modal').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');

    $.ajax({
      url: '/devicelist/portforward/' + id,
      type: 'get',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          let rulesTable = $('#openFirewallPortsRules');
          let rules = $('#openFirewallPortsFinalRules');
          rules.val('');
          rulesTable.empty();
          $.each(res.Devices, function(idx, value) {
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
    let mac = $('#openFirewallPortsMac').val();
    let ports = $('#openFirewallPortsPorts')[0].selectize.getValue();
    let dmz = $('#openFirewallPortsDMZ').is(':checked');
    if (mac == '') {
      swal({
        title: 'Falha na Inclução da Regra',
        text: 'Endereço MAC deve ser informado!',
        type: 'error',
        confirmButtonColor: '#4db6ac',
      });
      return;
    }
    if (ports == '') {
      swal({
        title: 'Falha na Inclução da Regra',
        text: 'Informe, no mínimo, uma porta para liberar acesso!',
        type: 'error',
        confirmButtonColor: '#4db6ac',
      });
      return;
    }
    insertOpenFirewallDoorRule({mac: mac, port: ports, dmz: dmz});
  });

  $('.btn-openFirewallPortsSubmit').click(function(event) {
    let id = $('#openfirewallRouterid_label').text();
    $.ajax({
      url: '/devicelist/portforward/' + id,
      type: 'post',
      traditional: true,
      data: {rules: $('#openFirewallPortsFinalRules').val()},
      success: function(res) {
        if (res.success) {
          console.log('yes');
        } else {
          console.log(res.message);
        }
      },
      error: function(xhr, status, error) {
        console.log(error);
      },
    });
  });
});
