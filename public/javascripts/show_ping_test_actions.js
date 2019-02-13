
// Important: include and initialize socket.io first using socket var
socket.on('PINGRESULT', function(macaddr, data) {
  if (($('#analyse-logs').data('bs.modal') || {})._isShown) {
    let id = $('#logRouterid_label').text();
    if (id == macaddr) {
      let textarea = $('#logArea');
      if (textarea.text() == 'Aguardando resposta do roteador...') {
        let usrtypes = ['user', 'daemon', 'kern', 'local1', 'authpriv'];
        let logContent = pako.ungzip(data, {to: 'string'});
        // Store log to be downloadable
        logBodyRawContent = logContent;
        textarea.html('<code>' + logContent + '</code>');
        textarea.highlight(
          usrtypes.map(function(x) {
            return x + '.warn';
          }),
          {element: 'strong', className: 'text-warning'}
        );
        textarea.highlight(
          usrtypes.map(function(x) {
            return x + '.err';
          }),
          {element: 'strong', className: 'text-danger'}
        );
        textarea.highlight(
          usrtypes.map(function(x) {
            return x+'.debug';
          }),
          {element: 'strong', className: 'text-info'}
        );
        // Enable export button
        $('#export-log').removeClass('disabled');
      }
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
            textarea.html('Aguardando resposta do roteador...');
          } else {
            textarea.html(res.message);
          }
        });
      },
      error: function(xhr, status, error) {
        $('#ping-test-placeholder').hide('fast', function() {
          $('#ping-test-results').show('fast');
          textarea.html(status + ': ' + error);
        });
      },
    });
  });

  // Restore default modal state
  $('#ping-test').on('hidden.bs.modal', function() {
    $('#ping-test-placeholder').show();
  });
});
