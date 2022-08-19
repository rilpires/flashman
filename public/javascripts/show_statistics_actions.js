import {anlixDocumentReady} from '../src/common.index.js';
import ApexCharts from 'apexcharts';
import {socket} from './common_actions.js';


// Sections
const STATISTICS_READY_SECTION = '#estatistics-modal-placeholder-ready';
const STATISTICS_PROGRESS_SECTION = '#estatistics-modal-placeholder-progress';
const STATISTICS_NONE_SECTION = '#estatistics-modal-placeholder-none';
const STATISTICS_RESULTS_SECTION = '#statistics-results';
const STATISTICS_RESOURCES_SECTION = '#resources-section';
const STATISTICS_WAN_BYTES_SECTION = '#wan-bytes-section';


// Resources Progress Bars
const RESOURCE_PROGRESS_CPU_BAR = '#resource-cpu-usage-bar';
const RESOURCE_PROGRESS_CPU_VALUE = '#resource-cpu-usage-value';
const RESOURCE_PROGRESS_MEM_BAR = '#resource-memory-usage-bar';
const RESOURCE_PROGRESS_MEM_VALUE = '#resource-memory-usage-value';


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

  const refreshStatistics = function(deviceId) {
    $('#btn-estatistics-modal-refresh').prop('disabled', true);
    $.ajax({
      url: '/devicelist/command/' + deviceId + '/statistics',
      type: 'post',
      dataType: 'json',
      success: function(res) {
        if (res.success) {
          $('#btn-estatistics-modal-refresh > i')
            .addClass('animated rotateOut infinite');
          if ($(STATISTICS_RESULTS_SECTION).is(':hidden')) {
            $(STATISTICS_READY_SECTION).hide();
            $(STATISTICS_PROGRESS_SECTION).show();
            $(STATISTICS_NONE_SECTION).hide();
          }
        } else {
          $('#btn-estatistics-modal-refresh').prop('disabled', false);
          if ($(STATISTICS_RESULTS_SECTION).is(':hidden')) {
            $(STATISTICS_READY_SECTION).show();
            $(STATISTICS_PROGRESS_SECTION).hide();
            $(STATISTICS_NONE_SECTION).hide();
          }
        }
      },
      error: function(xhr, status, error) {
        $('#btn-estatistics-modal-refresh').prop('disabled', false);
        if ($(STATISTICS_RESULTS_SECTION).is(':hidden')) {
          $(STATISTICS_READY_SECTION).show();
          $(STATISTICS_PROGRESS_SECTION).hide();
          $(STATISTICS_NONE_SECTION).hide();
        }
      },
    });
  };

  // Important: include and initialize socket.io first using socket var
  socket.on('STATISTICS', function(macaddr, data) {
    // If resources object exists
    if (data.resources && macaddr === $('#estatistics-modal-hlabel').text()) {
      // Check if cpu usage, mem usage exists and they are valid
      if (
        !isNaN(data.resources.cpu_usage) && !isNaN(data.resources.mem_usage) &&
        data.resources.cpu_usage >= 0 && data.resources.cpu_usage <= 100 &&
        data.resources.mem_usage >= 0 && data.resources.mem_usage <= 100
      ) {
        // Set the values
        // CPU
        $(RESOURCE_PROGRESS_CPU_BAR).css(
          'width',
          data.resources.cpu_usage + '%',
        );
        $(RESOURCE_PROGRESS_CPU_VALUE).text(data.resources.cpu_usage + '%');

        // Memory
        $(RESOURCE_PROGRESS_MEM_BAR).css(
          'width',
          data.resources.mem_usage + '%',
        );
        $(RESOURCE_PROGRESS_MEM_VALUE).text(data.resources.mem_usage + '%');


        $(STATISTICS_RESOURCES_SECTION).show();
      } else {
        $(STATISTICS_RESOURCES_SECTION).hide();
      }

    // If this info is not present, hide it
    } else {
      $(STATISTICS_RESOURCES_SECTION).hide();
    }

    // If WAN Bytes exists
    if (data.wanbytes && macaddr === $('#estatistics-modal-hlabel').text()) {
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
      $('#btn-estatistics-modal-refresh').prop('disabled', false);
      $('#btn-estatistics-modal-refresh > i')
        .removeClass('animated rotateOut infinite');
      $(STATISTICS_READY_SECTION).hide();
      $(STATISTICS_PROGRESS_SECTION).hide();
      $(STATISTICS_NONE_SECTION).hide();
      $(STATISTICS_RESULTS_SECTION).show();
      $(STATISTICS_WAN_BYTES_SECTION).show();

    // If this info is not present, hide it
    } else {
      $(STATISTICS_WAN_BYTES_SECTION).hide();
    }
  });

  $(document).on('click', '#btn-estatistics-modal-refresh', function(event) {
    let id = $('#estatistics-modal-hlabel').text();
    refreshStatistics(id);
  });

  $(document).on('click', '.btn-estatistics-modal', function(event) {
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
    $('#estatistics-modal-hlabel').text(id);
    if (isTR069) {
      $('#estatistics-modal-visual').text(serialid);
    } else {
      $('#estatistics-modal-visual').text(id);
    }
    $(STATISTICS_READY_SECTION).show();
    $(STATISTICS_PROGRESS_SECTION).hide();
    $(STATISTICS_NONE_SECTION).hide();
    $(STATISTICS_RESULTS_SECTION).hide();
    $('#statistics').modal('show');
  });

  // Restore default modal state
  $('#statistics').on('hidden.bs.modal', function() {
    chartDownId = '';
    chartUpId = '';
    $('#btn-estatistics-modal-refresh').prop('disabled', false);
    $('#btn-estatistics-modal-refresh > i')
      .removeClass('animated rotateOut infinite');
    $(STATISTICS_READY_SECTION).show();
    $(STATISTICS_PROGRESS_SECTION).hide();
    $(STATISTICS_NONE_SECTION).hide();
    $(STATISTICS_RESULTS_SECTION).hide();
  });
});

