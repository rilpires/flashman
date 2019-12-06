$(document).ready(function() {
  if (!$('#measure-previous-arrow').hasClass('text-primary')) {
    $('#measure-previous-div').hide();
  }

  const updateMeasuresTable = function(id) {
    $.ajax({
      type: 'GET',
      url: '/devicelist/speedtest/' + id,
      dataType: 'json',
      contentType: 'application/json',
      success: function(res) {
        if (res.success) {
          let pastMeasures = res.measures;
          if (!pastMeasures || pastMeasures.length === 0) {
            $('#measure-previous-nodata').show();
            $('#measure-previous-table').hide();
            $('#measure-previous-data').hide();
            $('#speed-test').modal('show');
            return;
          }
          $('#measure-previous-data').empty();
          pastMeasures.forEach((measure)=>{
            console.log(measure.timestamp);
            $('#measure-previous-data').prepend(
              $('<tr>').append(
                '<td>'+measure.down_speed+'</td>'+
                '<td>'+measure.timestamp+'</td>'+
                '<td>'+measure.user+'</td>'
              ),
            );
          });
          $('#measure-previous-nodata').hide();
          $('#measure-previous-table').show();
          $('#measure-previous-data').show();
          $('#speed-test').modal('show');
        } else {
          displayAlertMsg(res);
        }
      },
      error: function(xhr, status, error) {
        displayAlertMsg(JSON.parse(xhr.responseText));
      },
    });
  };

  $(document).on('click', '.btn-throughput-measure-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    updateMeasuresTable(id);
    $('#speed-test-hlabel').text(id);
  });

  $('#measure-test-arrow').click((event)=>{
    let div = $('#measure-test-arrow');
    if (div.hasClass('text-primary')) {
      div.removeClass('text-primary fa-chevron-up').addClass('fa-chevron-down');
      $('#measure-test-div').hide();
    } else {
      div.removeClass('fa-chevron-down').addClass('text-primary fa-chevron-up');
      $('#measure-test-div').show();
    }
  });

  $('#measure-previous-arrow').click((event)=>{
    let div = $('#measure-previous-arrow');
    if (div.hasClass('text-primary')) {
      div.removeClass('text-primary fa-chevron-up').addClass('fa-chevron-down');
      $('#measure-previous-div').hide();
    } else {
      div.removeClass('fa-chevron-down').addClass('text-primary fa-chevron-up');
      $('#measure-previous-div').show();
    }
  });

  $('.btn-sync-speed-table').click(function(event) {
    let id = $('#speed-test-hlabel').text();
    updateMeasuresTable(id);
  });

  $('.btn-start-speed-test').click(function(event) {
    let id = $('#speed-test-hlabel').text();
    $('.btn-start-speed-test').prop('disabled', true);
    $.ajax({
      url: '/devicelist/speedtest/' + id,
      type: 'POST',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#speed-test-strong-text').empty();
          $('#speed-test-shown-text').html('Aguardando resposta do roteador...');
          $('#speed-test-shown-icon')
          .removeClass((i,c)=>c.match(/fa\-.*/))
          .addClass('fa-3x fa-spinner fa-pulse');
        } else {
          $('#speed-test-strong-text').empty();
          $('#speed-test-shown-text').html(res.message);
          $('#speed-test-shown-icon')
          .removeClass((i,c)=>c.match(/fa\-.*/))
          .addClass('fa-3x fa-times');
          $('.btn-start-speed-test').prop('disabled', false);
        }
      },
      error: function(xhr, status, error) {
        $('#speed-test-shown-text').html('Um erro ocorreu, por favor tente novamente');
        $('#speed-test-shown-icon')
        .removeClass((i,c)=>c.match(/fa\-.*/))
        .addClass('fa-3x fa-times');
        $('.btn-start-speed-test').prop('disabled', false);
      },
    });
  });

  // Important: include and initialize socket.io first using socket var
  socket.on('SPEEDTEST', function(macaddr, data) {
    if (($('#speed-test').data('bs.modal') || {})._isShown) {
      let id = $('#speed-test-hlabel').text();
      if (id === macaddr) {
        $('#speed-test-shown-text').html('Velocidade medida: ');
        $('#speed-test-strong-text').html(data.downSpeed);
        $('#speed-test-shown-icon')
        .removeClass((i,c)=>c.match(/fa\-.*/))
        .addClass('fa-3x fa-check');
        $('.btn-start-speed-test').prop('disabled', false);
        updateMeasuresTable(macaddr);
      }
    }
  });

  // Restore default modal state
  $('#speed-test').on('hidden.bs.modal', function() {
    $('#speed-test-strong-text').empty();
    $('#speed-test-shown-text')
    .html('Clique no botão abaixo para começar a medição');
    $('#speed-test-shown-icon')
    .removeClass((i,c)=>c.match(/fa\-.*/))
    .addClass('fa-3x fa-tachometer-alt');
    $('#measure-previous-data').empty();
  });
});
