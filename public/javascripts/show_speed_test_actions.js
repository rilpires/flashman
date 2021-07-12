import {displayAlertMsg, socket} from './common_actions.js';

$(document).ready(function() {
  let socketIoTimeout = false;
  let socketIoResponse = false;
  let socketIoTimeoutTimerID = null;

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
          let limit = res.limit;
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
            let downSpeed = parseInt(measure.down_speed);
            if (downSpeed > limit) {
              measure.down_speed = 'Mais de ' + limit + ' Mbps';
            }
            let name = measure.user.replace(/_/g, ' ');
            $('#measure-previous-data').prepend(
              $('<tr>').append(
                '<td>'+measure.down_speed+'</td>'+
                '<td>'+measure.timestamp+'</td>'+
                '<td>'+name+'</td>'
              )
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
    $('#speed-test-warn-text').hide();
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
    swal({
      type: 'warning',
      title: 'Atenção!',
      text: 'Para garantir a precisão do teste de velocidade, o acesso à '+
        'internet dos dispositivos do cliente é interrompido temporariamente.'+
        ' Garanta que o cliente esteja ciente deste procedimento antes de '+
        'inicia-lo!',
      confirmButtonText: 'Prosseguir',
      confirmButtonColor: '#4db6ac',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#f2ab63',
      showCancelButton: true,
    }).then((result)=>{
      if (!result.value) {
        $('.btn-start-speed-test').prop('disabled', false);
        return;
      }
      $('#speed-test-warn-text').hide();
      socketIoTimeout = false;
      socketIoResponse = false;
      $.ajax({
        url: '/devicelist/speedtest/' + id,
        type: 'POST',
        dataType: 'json',
        success: function(res) {
          if (res.success) {
            $('#speed-test-strong-text').empty();
            $('#speed-test-shown-text').html('Aguardando resposta do CPE...');
            $('#speed-test-shown-icon')
            .removeClass((i, c)=>c.match(/fa\-.*/))
            .addClass('fa-3x fa-spinner fa-pulse');
            // wait 20 seconds to timeout socket IO response
            socketIoTimeoutTimerID = setTimeout(()=>{
              // only do this if socket io didn't reply
              if (socketIoResponse) return;
              socketIoTimeout = true;
              $('#speed-test-shown-text').html('Não houve resposta, por favor tente novamente');
              $('#speed-test-shown-icon')
              .removeClass((i, c)=>c.match(/fa\-.*/))
              .addClass('fa-3x fa-times');
              $('.btn-start-speed-test').prop('disabled', false);
            }, 20*1000);
          } else {
            $('#speed-test-strong-text').empty();
            $('#speed-test-shown-text').html(res.message);
            $('#speed-test-shown-icon')
            .removeClass((i, c)=>c.match(/fa\-.*/))
            .addClass('fa-3x fa-times');
            $('.btn-start-speed-test').prop('disabled', false);
          }
        },
        error: function(xhr, status, error) {
          $('#speed-test-shown-text').html('Um erro ocorreu, por favor tente novamente');
          $('#speed-test-shown-icon')
          .removeClass((i, c)=>c.match(/fa\-.*/))
          .addClass('fa-3x fa-times');
          $('.btn-start-speed-test').prop('disabled', false);
        },
      });
    });
  });

  // Important: include and initialize socket.io first using socket var
  socket.on('SPEEDTEST', function(macaddr, data) {
    // only do this if timeout has not happened yet
    if (socketIoTimeout) return;
    socketIoResponse = true;
    clearTimeout(socketIoTimeoutTimerID);
    if (($('#speed-test').data('bs.modal') || {})._isShown) {
      let id = $('#speed-test-hlabel').text();
      if (id === macaddr) {
        if (data.downSpeed.includes('Mbps')) {
          let downSpeed = parseInt(data.downSpeed);
          if (downSpeed > data.limit) {
            data.downSpeed = 'Mais de ' + data.limit + ' Mbps';
          }
          $('#speed-test-shown-text').html('Velocidade medida: ');
          $('#speed-test-strong-text').html(data.downSpeed);
          $('#speed-test-shown-icon')
          .removeClass((i, c)=>c.match(/fa\-.*/))
          .addClass('fa-3x fa-check');
          updateMeasuresTable(macaddr);
        } else {
          if (data.downSpeed === 'Unavailable') {
            $('#speed-test-shown-text').html('O servidor está ocupado, tente mais tarde');
            $('#speed-test-warn-text').show();
          } else {
            $('#speed-test-shown-text').html('Um erro ocorreu, por favor tente novamente');
          }
          $('#speed-test-shown-icon')
          .removeClass((i, c)=>c.match(/fa\-.*/))
          .addClass('fa-3x fa-times');
        }
        $('.btn-start-speed-test').prop('disabled', false);
      }
    }
  });

  // Restore default modal state
  $('#speed-test').on('hidden.bs.modal', function() {
    $('#speed-test-warn-text').hide();
    $('#speed-test-strong-text').empty();
    $('#speed-test-shown-text')
    .html('Clique no botão abaixo para começar a medição');
    $('#speed-test-shown-icon')
    .removeClass((i, c)=>c.match(/fa\-.*/))
    .addClass('fa-3x fa-tachometer-alt');
    $('#measure-previous-data').empty();
    $('.btn-start-speed-test').prop('disabled', false);
  });
});
