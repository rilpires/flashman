
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
  $('.btn-ping-test-modal').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');

    $('#ping-test-hlabel').text(id);
    $('#ping-test').modal('show');
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
  });
});
