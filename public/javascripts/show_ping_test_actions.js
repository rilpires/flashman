
let isPingHostListInitialized = false;

const saveHostList = function() {
  if (isPingHostListInitialized) {
    let hostList = $('#hosts-list')[0].selectize.getValue();
    let id = $('#ping-test-hlabel').text();

    $.ajax({
      type: 'POST',
      url: '/devicelist/pinghostslist/' + id,
      dataType: 'json',
      data: {
        'hosts': hostList,
      },
      contentType: 'application/json',
      success: function(res) {
        if (res.success) {
          swal({
            title: 'Endereços salvos com sucesso',
            type: 'success',
            confirmButtonColor: '#4db6ac',
          });
        } else {
          swal({
            title: 'Falha ao salvar endereços',
            text: res.message,
            type: 'error',
            confirmButtonColor: '#4db6ac',
          });
        }
      },
      error: function(xhr, status, error) {
        swal({
          title: 'Falha na comunicação com o servidor',
          text: error,
          type: 'error',
          confirmButtonColor: '#4db6ac',
        });
      },
    });
  }
};

const selectizeOptionsHosts = {
  create: true,
  onItemAdd: saveHostList,
  onItemRemove: saveHostList,
  render: {
    option_create: function(data, escape) {
      return $('<div></div>').addClass('create').append(
        'Adicionar: ',
        $('<strong></strong>').html(escape(data.input))
      );
    },
  },
};

// Important: include and initialize socket.io first using socket var
socket.on('PINGRESULT', function(macaddr, data) {
  if (($('#ping-test').data('bs.modal') || {})._isShown) {
    let id = $('#ping-test-hlabel').text();
    if (id == macaddr) {
      $('#ping-test-results').empty();
      let resultsList = $('<ul></ul>').addClass('list-group');

      $.each(data.results, function(key, value) {
        let hostname = key;
        let hostLatency = value.lat;
        let hostLoss = value.loss;

        resultsList.append(
          $('<li></li>').addClass('list-group-item d-flex')
          .addClass('justify-content-between align-items-center')
          .html(hostname)
          .append(
            $('<span></span>')
            .addClass('badge badge-primary badge-pill')
            .html(hostLatency + ' ms'),
            $('<span></span>')
            .addClass('badge badge-primary badge-pill')
            .html(hostLoss + '%')
          )
        );
      });
      $('#ping-test-results').append(resultsList);
    }
  }
});

$(document).ready(function() {
  // Init selectize fields
  $('#hosts-list').selectize(selectizeOptionsHosts);

  $('.btn-ping-test-modal').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');

    $.ajax({
      type: 'GET',
      url: '/devicelist/pinghostslist/' + id,
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          let pingHosts = res.ping_hosts_list;
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

  $('.btn-start-ping-test').click(function(event) {
    let textarea = $('#ping-test-results');
    let id = $('#ping-test-hlabel').text();
    $.ajax({
      url: '/devicelist/command/' + id + '/ping',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        $('#ping-test-placeholder').hide('fast', function() {
          $('#ping-test-results').show('fast');
          if (res.success) {
            textarea.append(
              $('<p></p>').text('Aguardando resposta do roteador...')
            );
          } else {
            textarea.append($('<p></p>').text(res.message));
          }
        });
      },
      error: function(xhr, status, error) {
        $('#ping-test-placeholder').hide('fast', function() {
          $('#ping-test-results').show('fast');
          textarea.append($('<p></p>').text(status + ': ' + error));
        });
      },
    });
  });

  // Restore default modal state
  $('#ping-test').on('hidden.bs.modal', function() {
    $('#ping-test-results').hide().empty();
    $('#ping-test-placeholder').show();
    isPingHostListInitialized = false;
  });
});
