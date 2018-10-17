
// Important: include and initialize socket.io first using socket var
socket.on('LIVELOG', function(macaddr, data) {
  if (($('#analyse-logs').data('bs.modal') || {})._isShown) {
    let id = $('#logRouterid_label').text();
    if (id == macaddr) {
      let textarea = $('#logArea');
      if (textarea.text() == 'Aguardando resposta do roteador...') {
        let usrtypes = ['user', 'daemon', 'kern', 'local1', 'authpriv'];
        textarea.html('<code>' + pako.ungzip(data, {to: 'string'}) + '</code>');
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
      }
    }
  }
});

let printLogData = function(url) {
  let textarea = $('#logArea');
  let id = $('#logRouterid_label').text();
  let usrtypes = ['user', 'daemon', 'kern', 'local1', 'authpriv'];
  $.ajax({
    url: url + id,
    type: 'get',
    success: function(res, status, xhr) {
      let ct = xhr.getResponseHeader('content-type') || '';
      if (ct.indexOf('json') > -1) {
        textarea.html('ERRO: ' + res.message);
      } else {
        textarea.html('<code>' + res + '</code>');
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
            return x + '.debug';
          }),
          {element: 'strong', className: 'text-info'}
        );
      }
    },
    error: function(xhr, status, error) {
      textarea.html(status + ' ' + error);
    },
  });
};

$(document).ready(function() {
  $('.btn-log-modal').click(function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');

    $('#logRouterid_label').text(id);
    $('#analyse-logs').modal('show');
  });

  $('.btn-log-live').click(function(event) {
    let textarea = $('#logArea');
    let id = $('#logRouterid_label').text();
    $.ajax({
      url: '/devicelist/command/' + id + '/log',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          textarea.html('Aguardando resposta do roteador...');
        } else {
          textarea.html(res.message);
        }
      },
      error: function(xhr, status, error) {
        textarea.html(status+': '+error);
      },
    });
  });

  $('.btn-log-upgrade').click(function(event) {
    printLogData('/devicelist/uifirstlog/');
  });

  $('.btn-log-init').click(function(event) {
    printLogData('/devicelist/uilastlog/');
  });
});
