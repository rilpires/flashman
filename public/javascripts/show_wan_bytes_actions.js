import {anlixDocumentReady} from '../src/common.index.js';
import ApexCharts from 'apexcharts';
import {socket} from './common_actions.js';

anlixDocumentReady.add(function() {
  let chartDownId = '';
  let chartUpId = '';

  const formatBytes = function(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const refreshWanBytes = function(deviceId) {
    $('#btn-wan-bytes-refresh').prop('disabled', true);
    $.ajax({
      url: '/devicelist/command/' + deviceId + '/wanbytes',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#btn-wan-bytes-refresh > i')
            .addClass('animated rotateOut infinite');
          if ($('#wan-bytes-graphs').is(':hidden')) {
            $('#wan-bytes-placeholder-ready').hide();
            $('#wan-bytes-placeholder-progress').show();
            $('#wan-bytes-placeholder-none').hide();
          }
        } else {
          $('#btn-wan-bytes-refresh').prop('disabled', false);
          if ($('#wan-bytes-graphs').is(':hidden')) {
            $('#wan-bytes-placeholder-ready').show();
            $('#wan-bytes-placeholder-progress').hide();
            $('#wan-bytes-placeholder-none').hide();
          }
        }
      },
      error: function(xhr, status, error) {
        $('#btn-wan-bytes-refresh').prop('disabled', false);
        if ($('#wan-bytes-graphs').is(':hidden')) {
          $('#wan-bytes-placeholder-ready').show();
          $('#wan-bytes-placeholder-progress').hide();
          $('#wan-bytes-placeholder-none').hide();
        }
      },
    });
  };

  // Important: include and initialize socket.io first using socket var
  socket.on('WANBYTES', function(macaddr, data) {
    if (data.wanbytes && macaddr === $('#wan-bytes-hlabel').text()) {
      $('#wan-bytes-graph').empty();
      let upBytes = [];
      let downBytes = Object.keys(data.wanbytes).map(function(time) {
        let epochInUs = Number(time) * 1000;
        // Also create upBytes array
        upBytes.push([epochInUs, data.wanbytes[time][1]]);
        // Downstream
        return [epochInUs, data.wanbytes[time][0]];
      });
      let downOptions = {
        chart: {id: 'downChart', type: 'line', toolbar: false,
                animations: {enabled: false}},
        tooltip: {x: {format: 'HH:mm'}},
        theme: {palette: 'palette4'},
        title: {text: 'Download', align: 'center'},
        series: [{name: 'Download', data: downBytes}],
        xaxis: {type: 'datetime', labels: {datetimeUTC: false}},
        yaxis: {labels: {
          formatter: function(val, index) {
            return formatBytes(val);
          },
        }},
      };
      let upOptions = {
        chart: {id: 'upChart', type: 'line', toolbar: false,
                animations: {enabled: false}},
        tooltip: {x: {format: 'HH:mm'}},
        theme: {palette: 'palette5'},
        title: {text: 'Upload', align: 'center'},
        series: [{name: 'Upload', data: upBytes}],
        xaxis: {type: 'datetime', labels: {datetimeUTC: false}},
        yaxis: {labels: {
          formatter: function(val, index) {
            return formatBytes(val);
          },
        }},
      };
      if (chartDownId === '') {
        let chartDownObj = new ApexCharts(
          document.querySelector('#wan-bytes-down-graph'),
          downOptions,
        );
        chartDownId = downOptions.chart.id;
        chartDownObj.render();
      } else {
        ApexCharts.exec(chartDownId, 'updateOptions', downOptions, false, true);
      }
      if (chartUpId === '') {
        let chartUpObj = new ApexCharts(
          document.querySelector('#wan-bytes-up-graph'),
          upOptions,
        );
        chartUpId = upOptions.chart.id;
        chartUpObj.render();
      } else {
        ApexCharts.exec(chartUpId, 'updateOptions', upOptions, false, true);
      }
      // Adjust modal content
      $('#btn-wan-bytes-refresh').prop('disabled', false);
      $('#btn-wan-bytes-refresh > i')
        .removeClass('animated rotateOut infinite');
      $('#wan-bytes-placeholder-ready').hide();
      $('#wan-bytes-placeholder-progress').hide();
      $('#wan-bytes-placeholder-none').hide();
      $('#wan-bytes-graphs').show();
    }
  });

  $(document).on('click', '#btn-wan-bytes-refresh', function(event) {
    let id = $('#wan-bytes-hlabel').text();
    refreshWanBytes(id);
  });

  $(document).on('click', '.btn-wan-bytes-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let serialid = row.data('serialid');
    let altuid = row.data('alt-uid-tr069');
    if (altuid) {
      serialid = altuid;
    }
    let isTR069 = row.data('is-tr069') === true; // cast to bool
    chartDownId = '';
    chartUpId = '';
    $('#wan-bytes-hlabel').text(id);
    if (isTR069) {
      $('#wan-bytes-visual').text(serialid);
    } else {
      $('#wan-bytes-visual').text(id);
    }
    $('#wan-bytes-placeholder-ready').show();
    $('#wan-bytes-placeholder-progress').hide();
    $('#wan-bytes-placeholder-none').hide();
    $('#wan-bytes-graphs').hide();
    $('#wan-bytes').modal('show');
  });

  // Restore default modal state
  $('#wan-bytes').on('hidden.bs.modal', function() {
    chartDownId = '';
    chartUpId = '';
    $('#btn-wan-bytes-refresh').prop('disabled', false);
    $('#btn-wan-bytes-refresh > i').removeClass('animated rotateOut infinite');
    $('#wan-bytes-placeholder-ready').show();
    $('#wan-bytes-placeholder-progress').hide();
    $('#wan-bytes-placeholder-none').hide();
    $('#wan-bytes-graphs').hide();
  });
});

