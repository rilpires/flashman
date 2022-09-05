import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg, socket} from './common_actions.js';

const t = i18next.t;

anlixDocumentReady.add(function() {
  let socketIoResponse = false;

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
              measure.down_speed = t('moreThanXMbps', {x: limit});
            }
            let name = measure.user.replace(/_/g, ' ');
            $('#measure-previous-data').prepend(
              $('<tr>').append(
                '<td>'+measure.down_speed+'</td>'+
                '<td>'+measure.timestamp+'</td>'+
                '<td>'+name+'</td>',
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
    swal.fire({
      icon: 'warning',
      title: t('Attention!'),
      text: t('speedTestWarningMessage'),
      confirmButtonText: t('Proceed'),
      confirmButtonColor: '#4db6ac',
      cancelButtonText: t('Cancel'),
      cancelButtonColor: '#f2ab63',
      showCancelButton: true,
    }).then((result)=>{
      if (!result.value) {
        $('.btn-start-speed-test').prop('disabled', false);
        return;
      }
      $('#speed-test-warn-text').hide();
      $.ajax({
        url: '/devicelist/speedtest/' + id,
        type: 'POST',
        dataType: 'json',
        success: function(res) {
          if (res.success) {
            $('#speed-test-strong-text').empty();
            $('#speed-test-shown-text').html(t('waitingCpeResponse...'));
            $('#speed-test-shown-icon')
            .removeClass((i, c)=>c.match(/fa-.*/))
            .addClass('fa-3x fa-spinner fa-pulse');
          } else {
            $('#speed-test-strong-text').empty();
            $('#speed-test-shown-text').html(res.message);
            $('#speed-test-shown-icon')
            .removeClass((i, c)=>c.match(/fa-.*/))
            .addClass('fa-3x fa-times');
            $('.btn-start-speed-test').prop('disabled', false);
          }
        },
        error: function(xhr, status, error) {
          $('#speed-test-shown-text').html(t('errorOccurredTryAgain'));
          $('#speed-test-shown-icon')
          .removeClass((i, c)=>c.match(/fa-.*/))
          .addClass('fa-3x fa-times');
          $('.btn-start-speed-test').prop('disabled', false);
        },
      });
    });
  });

  // Important: include and initialize socket.io first using socket var
  socket.on('SPEEDTEST', function(macaddr, data) {
    if (($('#speed-test').data('bs.modal') || {})._isShown) {
      let id = $('#speed-test-hlabel').text();
      if (id === macaddr) {
        // only do this if timeout has not happened yet
        socketIoResponse = true;
        if (data.downSpeed.includes(t('Mbps'))) {
          let downSpeed = parseInt(data.downSpeed);
          if (downSpeed > data.limit) {
            data.downSpeed = t('moreThanXMbps', {x: data.limit});
          }
          $('#speed-test-shown-text').html(`${t('speedMeasured')}:`);
          $('#speed-test-strong-text').html(data.downSpeed);
          $('#speed-test-shown-icon')
          .removeClass((i, c)=>c.match(/fa-.*/))
          .addClass('fa-3x fa-check');
          updateMeasuresTable(macaddr);
        } else {
          if (data.downSpeed === 'Unavailable') {
            $('#speed-test-shown-text')
              .html(t('serverBusyTryAgain'));
            $('#speed-test-warn-text').show();
          } else {
            $('#speed-test-shown-text')
              .html(t('errorOccurredTryAgain'));
          }
          $('#speed-test-shown-icon')
          .removeClass((i, c)=>c.match(/fa-.*/))
          .addClass('fa-3x fa-times');
        }
        $('.btn-start-speed-test').prop('disabled', false);
      }
    }
  });

  socket.on('SPEEDESTIMATIVE', function(macaddr, data) {
    if (($('#speed-test').data('bs.modal') || {})._isShown) {
      let id = $('#speed-test-hlabel').text();
      if (id === macaddr) {
        // only do this if timeout has not happened yet
        socketIoResponse = true;
        $('#speed-test-strong-text').empty();
        $('#speed-test-shown-text').html(t('waitingResult'));
        $('#speed-test-shown-icon')
        .removeClass((i, c)=>c.match(/fa-.*/))
        .addClass('fa-3x fa-spinner fa-pulse');
      }
    }
  });

  // Restore default modal state
  $('#speed-test').on('hidden.bs.modal', function() {
    $('#speed-test-warn-text').hide();
    $('#speed-test-strong-text').empty();
    $('#speed-test-shown-text')
    .html(t('clickButtonBelowToStartMeasure'));
    $('#speed-test-shown-icon')
    .removeClass((i, c)=>c.match(/fa-.*/))
    .addClass('fa-3x fa-tachometer-alt');
    $('#measure-previous-data').empty();
    $('.btn-start-speed-test').prop('disabled', false);
  });
});
