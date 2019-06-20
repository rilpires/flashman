
// Store log to be downloadable
let logBodyRawContent = '';

// Important: include and initialize socket.io first using socket var
socket.on('LIVELOG', function(macaddr, data) {
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
        textarea.html('Erro: ' + res.message);
      } else {
        // Store log to be downloadable
        logBodyRawContent = res;
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
        // Enable export button
        $('#export-log').removeClass('disabled');
      }
    },
    error: function(xhr, status, error) {
      textarea.html(status + ' ' + error);
    },
  });
};

let downloadFile = function(body, filename) {
  let textFile;
  let downloadLink;
  // File content
  textFile = new Blob([body], {type: 'text/text'});
  // Download link
  downloadLink = document.createElement('a');
  // File name
  downloadLink.download = filename;
  // Create a link to the file
  downloadLink.href = window.URL.createObjectURL(textFile);
  // Hide download link
  downloadLink.style.display = 'none';
  // Add the link to DOM
  document.body.appendChild(downloadLink);
  // Click download link
  downloadLink.click();
};

let exportLogToFile = function(filename) {
  // Download log file
  downloadFile(logBodyRawContent, filename);
};

$(document).ready(function() {
  $(document).on('click', '.btn-log-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');

    $('#logRouterid_label').text(id);
    $('#analyse-logs').modal('show');
  });

  $(document).on('click', '.btn-log-live', function(event) {
    let textarea = $('#logArea');
    let id = $('#logRouterid_label').text();
    $.ajax({
      url: '/devicelist/command/' + id + '/log',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        $('#logs-placeholder').hide('fast', function() {
          $('#logArea').show('fast');
          if (res.success) {
            textarea.html('Aguardando resposta do roteador...');
          } else {
            textarea.html(res.message);
          }
        });
      },
      error: function(xhr, status, error) {
        $('#logs-placeholder').hide('fast', function() {
          $('#logArea').show('fast');
          textarea.html(status + ': ' + error);
        });
      },
    });
  });

  $(document).on('click', '.btn-log-upgrade', function(event) {
    $('#logs-placeholder').hide('fast', function() {
      $('#logArea').show('fast');
      printLogData('/devicelist/uifirstlog/');
    });
  });

  $(document).on('click', '.btn-log-init', function(event) {
    $('#logs-placeholder').hide('fast', function() {
      $('#logArea').show('fast');
      printLogData('/devicelist/uilastlog/');
    });
  });

  // Restore default modal state
  $('#analyse-logs').on('hidden.bs.modal', function() {
    $('#logs-placeholder').show();
    $('#logArea').hide();
    $('#export-log').addClass('disabled');
  });

  $('#export-log').click(function(event) {
    exportLogToFile('log.txt');
  });
});
