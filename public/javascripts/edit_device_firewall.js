
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

// Important: include and initialize socket.io first using socket var
socket.on('ONLINEDEV', function(macaddr, data) {
  if (($('#open-firewall-ports').data('bs.modal') || {})._isShown) {
    let id = $('#openfirewallRouterid_label').text();
    if (id == macaddr) {
      let buttonRefresh = $('#btnAnimSyncOnlineDevs');
      let inputDevs = $('#openFirewallPortsMac')[0].selectize;
      buttonRefresh.removeClass('animated rotateOut infinite');
      macoptions=[];
      $.each(data.Devices, function(key, value) {
        datanew={};
        datanew.value=key;
        datanew.label=key;
        macoptions.push(datanew);
      });
      inputDevs.addOption(macoptions);
    }
  }
});

let insertOpenFirewallDoorRule = function(value) {
  let ulr = $('#openFirewallPortsRules');
  let rules = $('#openFirewallPortsFinalRules');

  let textinfo='<span>'+value.mac+'</span>';
  let butdel='<span class="pull-right button-group">'
    +'<a class="badge teal lighten-2 openFirewallPortsRemoveRule"'
    +'<span>del</span></a></span>';
  ulr.append('<li class="list-group-item d-flex'
    +' justify-content-between">'+textinfo
    +butdel+'</li>');

  portsFinal=[];
  if (rules.val()!='') {
    portsFinal=JSON.parse(rules.val());
  }

  newport={};
  newport.mac=value.mac;
  newport.port=value.port;
  newport.dmz=value.dmz;
  portsFinal.push(newport);
  rules.val(JSON.stringify(portsFinal));
  console.log(portsFinal);
  console.log(rules.val());
};

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
          let ulr = $('#openFirewallPortsRules');
          let rules = $('#openFirewallPortsFinalRules');
          let hasChanged = $('#openFirewallPortsFinalRulesChanged');
          hasChanged.text='false';
          rules.val('');
          console.log(res.Devices);
          ulr.empty();
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
          badge.text(status+': '+error);
        }
        badge.show();
        setTimeout(function() {
          badge.hide();
        }, 1500);
      },
    });
  });

  $('.btn-syncOnlineDevs').click(function(event) {
    let buttonRefresh = $('#btnAnimSyncOnlineDevs');
    let id = $('#openfirewallRouterid_label').text();
    $.ajax({
      url: '/devicelist/command/' + id + '/onlinedevs',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          buttonRefresh.addClass('animated rotateOut infinite');
        } else {
          event.target.title=res.message;
          buttonRefresh.addClass('text-danger');
        }
      },
      error: function(xhr, status, error) {
        event.target.title=status+': '+error;
        buttonRefresh.addClass('text-danger');
      },
    });
  });

  $('#openFirewallPortsRules').on('click', 'a', function(event) {
    // Delete rule
    console.log('FIRED!');
    console.log($(this).index());
  });

  $('.btn-openFirewallPortsSaveRule').click(function(event) {
    let mac=$('#openFirewallPortsMac').val();
    let ports=$('#openFirewallPortsPorts').val();
    let dmz=$('#openFirewallPortsDMZ').val();
    if (mac=='') {
      swal({
        title: 'Falha na Inclução da Regra',
        text: 'Endereço MAC deve ser informado!',
        type: 'error',
        confirmButtonColor: '#4db6ac',
      });
      return;
    }
    if (ports=='') {
      swal({
        title: 'Falha na Inclução da Regra',
        text: 'Informe, no mínimo, uma porta para liberar acesso!',
        type: 'error',
        confirmButtonColor: '#4db6ac',
      });
      return;
    }

    insertOpenFirewallDoorRule({
      mac: mac,
      port: ports,
      dmz: dmz,
    });
  });
});
