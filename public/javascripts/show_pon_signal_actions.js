import {anlixDocumentReady} from '../src/common.index.js';
import ApexCharts from 'apexcharts';
import {socket} from './common_actions.js';

anlixDocumentReady.add(function() {
  let ponSignalRXId = '';
  let ponSignalTXId = '';

  const refreshPonSignal = function(deviceId) {
    $('#btn-pon-signal-refresh').prop('disabled', true);
    $.ajax({
      url: '/devicelist/command/' + deviceId + '/pondata',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#btn-pon-signal-refresh > i')
            .addClass('animated rotateOut infinite');
          if ($('#pon-signal-graphs').is(':hidden')) {
            $('#pon-signal-placeholder-ready').hide();
            $('#pon-signal-placeholder-progress').show();
            $('#pon-signal-placeholder-none').hide();
          }
        } else {
          $('#btn-pon-signal-refresh').prop('disabled', false);
          if ($('#pon-signal-graphs').is(':hidden')) {
            $('#pon-signal-placeholder-ready').show();
            $('#pon-signal-placeholder-progress').hide();
            $('#pon-signal-placeholder-none').hide();
          }
        }
      },
      error: function(xhr, status, error) {
        $('#btn-pon-signal-refresh').prop('disabled', false);
        if ($('#pon-signal-graphs').is(':hidden')) {
          $('#pon-signal-placeholder-ready').show();
          $('#pon-signal-placeholder-progress').hide();
          $('#pon-signal-placeholder-none').hide();
        }
      },
    });
  };

  // Important: include and initialize socket.io first using socket var
  socket.on('PONSIGNAL', function(macaddr, data) {
    if (data.ponsignalmeasure && macaddr === $('#pon-signal-hlabel').text()) {
      let ponSignalMeasure = data.ponsignalmeasure;
      $('#pon-signal-graph').empty();
      let txMeasure = [];
      let rxMeasure = Object.keys(ponSignalMeasure).map(function(time) {
        let epochInUs = Number(time) * 1000;
        // Also create upBytes array
        txMeasure.push([epochInUs, ponSignalMeasure[time][1]]);
        // Downstream
        return [epochInUs, ponSignalMeasure[time][0]];
      });
      let rxOptions = {
        chart: {id: 'rxSignalChart', type: 'line', toolbar: false,
                animations: {enabled: false}},
        tooltip: {x: {format: 'HH:mm'}},
        theme: {palette: 'palette4'},
        title: {text: 'RX', align: 'center'},
        series: [{name: 'RX', data: rxMeasure}],
        xaxis: {type: 'datetime', labels: {datetimeUTC: false}},
      };
      let txOptions = {
        chart: {id: 'txSignalChart', type: 'line', toolbar: false,
                animations: {enabled: false}},
        tooltip: {x: {format: 'HH:mm'}},
        theme: {palette: 'palette5'},
        title: {text: 'TX', align: 'center'},
        series: [{name: 'TX', data: txMeasure}],
        xaxis: {type: 'datetime', labels: {datetimeUTC: false}},
      };
      if (ponSignalRXId === '') {
        let chartRXObj = new ApexCharts(
          document.querySelector('#pon-signal-rxpower-graph'),
          rxOptions,
        );
        ponSignalRXId = rxOptions.chart.id;
        chartRXObj.render();
      } else {
        ApexCharts.exec(ponSignalRXId, 'updateOptions', rxOptions, false, true);
      }
      if (ponSignalTXId === '') {
        let chartTXObj = new ApexCharts(
          document.querySelector('#pon-signal-txpower-graph'),
          txOptions,
        );
        ponSignalTXId = txOptions.chart.id;
        chartTXObj.render();
      } else {
        ApexCharts.exec(ponSignalTXId, 'updateOptions', txOptions, false, true);
      }
      // Adjust modal content
      $('#btn-pon-signal-refresh').prop('disabled', false);
      $('#btn-pon-signal-refresh > i')
        .removeClass('animated rotateOut infinite');
      $('#pon-signal-placeholder-ready').hide();
      $('#pon-signal-placeholder-progress').hide();
      $('#pon-signal-placeholder-none').hide();
      $('#pon-signal-graphs').show();
    }
  });

  $(document).on('click', '#btn-pon-signal-refresh', function(event) {
    let id = $('#pon-signal-hlabel').text();
    refreshPonSignal(id);
  });

  $(document).on('click', '.btn-pon-signal-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let serialid = row.data('serialid');
    let altuid = row.data('alt-uid-tr069');
    if (altuid) {
      serialid = altuid;
    }
    let isTR069 = row.data('is-tr069') === true; // cast to bool
    ponSignalRXId = '';
    ponSignalTXId = '';
    $('#pon-signal-hlabel').text(id);
    if (isTR069) {
      $('#pon-signal-visual').text(serialid);
    } else {
      $('#pon-signal-visual').text(id);
    }
    $('#pon-signal-placeholder-ready').show();
    $('#pon-signal-placeholder-progress').hide();
    $('#pon-signal-placeholder-none').hide();
    $('#pon-signal-graphs').hide();
    $('#pon-signal').modal('show');
  });

  $('#pon-signal').on('hidden.bs.modal', function() {
    ponSignalRXId = '';
    ponSignalTXId = '';
    $('#btn-pon-signal-refresh').prop('disabled', false);
    $('#btn-pon-signal-refresh > i').removeClass('animated rotateOut infinite');
    $('#pon-signal-placeholder-ready').show();
    $('#pon-signal-placeholder-progress').hide();
    $('#pon-signal-placeholder-none').hide();
    $('#pon-signal-graphs').hide();
  });
});
