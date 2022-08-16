import {anlixDocumentReady} from '../src/common.index.js';
import Stepper from 'bs-stepper';
import 'tempusdominus-bootstrap-4';

const t = i18next.t;

let updateSearchResultsScheduler = function(result) {
  $('#allDevicesLabel').html(t('allXSearchResults',
    {x: result.status.totalnum}));
  let pageCount = $('#input-elements-pp option:selected').text();
  let deviceCount = (parseInt(pageCount) > result.status.totalnum) ?
      result.status.totalnum : pageCount;
  $('#someDevicesLabel').html(t('onlyXFirstSearchResults', {x: deviceCount}));
};

const resetStepperData = function(stepper) {
  $('#releases-dropdown').html('');
  $('#selected-release').html(t('Choose'));
  $('#warning-releases').hide();
  $('#which-error-msg').hide();
  $('#how-btn-next').prop('disabled', true);
};

const isWhenPartValidated = function() {
  if ($('input[name=updateNow]:checked').length > 0) return true;
  let rangesLength = $('#time-ranges .time-range').length;
  let retval = true;
  for (let i = 0; i < rangesLength; i++) {
    $('#time-equal-error-'+i).hide();
    let startDay = $('#startWeekday-'+i).html();
    let endDay = $('#endWeekday-'+i).html();
    let startTime = $('#scheduleStart-'+i+' input').val();
    let endTime = $('#scheduleEnd-'+i+' input').val();
    if (!startTime || !endTime) retval = false;
    if (startDay === t('dayOfTheWeek') || endDay === t('dayOfTheWeek')) {
      retval = false;
    } else if (startTime === endTime && startDay === endDay) {
      $('#time-equal-error-'+i).show();
      retval = false;
    }
  }
  return retval;
};

const configureDateDiv = function(i) {
  $('#scheduleStart-' + i).datetimepicker({
    format: 'HH:mm',
  });
  $('#scheduleEnd-' + i).datetimepicker({
    format: 'HH:mm',
  });
  $('#time-equal-error-' + i).hide();
  $('#scheduleStart-' + i + ' input').on('input', (event)=>{
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });
  $('#scheduleEnd-' + i + ' input').on('input', (event)=>{
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });
  $('#dropdown-startWeekday-' + i + ' a').click((event)=>{
    let weekday = event.originalEvent.target.text;
    $('#startWeekday-' + i).html(weekday);
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });
  $('#dropdown-endWeekday-' + i + ' a').click((event)=>{
    let weekday = event.originalEvent.target.text;
    $('#endWeekday-' + i).html(weekday);
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });
};

anlixDocumentReady.add(function() {
  $('#removeSchedule').prop('disabled', true);
  $('#when-error-msg').hide();

  $(document).on('change', ':file', function() {
    let input = $(this);
    let numFiles = input.get(0).files ? input.get(0).files.length : 1;
    let label = input.val().replace(/\\/g, '/').replace(/.*\//, '');

    input.trigger('fileselect', [numFiles, label]);
  });
  $(':file').on('fileselect', function(event, numFiles, label) {
    let input = $(this).parents('.input-group').find(':text');
    if (input.length) {
      $('#btn-submit-upload').prop('disabled', false);
      input.val(label);
    }
  });

  $('#csv-result').hide();
  $('#csv-result-error').hide();
  $('#btn-submit-upload').prop('disabled', true);
  $('form[name=scheduleform]').submit(function() {
    if ($('input[name=schedulefile]').val().trim()) {
      $('#btn-submit-upload').prop('disabled', true);
      $('#csv-result-error').hide();
      $('#csv-result').removeClass('red-text');
      $('#btn-submit-icon')
        .removeClass('fa-upload')
        .addClass('fa-spinner fa-pulse');
      $.ajax({
        type: 'POST',
        enctype: 'multipart/form-data',
        url: $(this).attr('action'),
        data: new FormData($(this)[0]),
        processData: false,
        contentType: false,
        cache: false,
        timeout: 600000,
        success: function(res) {
          $('#csv-result-count').html(t('itHasBeenFoundXCpesFromFile',
            {x: res.result}));
          $('#csv-result').show();
          if (res.result > 0) {
            $('#which-btn-next').prop('disabled', false);
          } else {
            $('#csv-result-error').show();
            $('#csv-result').addClass('red-text');
          }
          $('#btn-submit-upload').prop('disabled', false);
          $('#btn-submit-icon')
            .addClass('fa-upload')
            .removeClass('fa-spinner fa-pulse');
        },
      });
    }
    return false;
  });

  let lastDevicesSearchInputQuery = '';
  let stepper = $('.bs-stepper');
  if (stepper.length > 0) {
    stepper = new Stepper(stepper[0], {animation: true});
    resetStepperData(stepper);
    $(document).on('submit', '#devices-search-form', function(event) {
      lastDevicesSearchInputQuery = document.getElementById(
        'devices-search-input').value;
      resetStepperData(stepper);
      stepper.to(1);
      return false;
    });

    configureDateDiv(0);

    $('#how-btn-prev').click((event)=>{
      resetStepperData(stepper);
      stepper.previous();
    });

    $('#when-btn-prev').click((event)=>{
      stepper.previous();
    });

    $('#how-btn-next').prop('disabled', true);
    $('#how-btn-next').click((event)=>{
      stepper.next();
    });

    $('.custom-control.custom-radio').click((event)=>{
      $('#which-btn-next').prop('disabled', false);
    });

    $('#who-part-type').click((event)=>{
      let useCsv = $('.nav-link.active').attr('id') === 'whichSearch';
      if (useCsv) {
        $('#which-btn-next').prop('disabled', true);
      } else {
        $('#which-btn-next').prop(
          'disabled',
          ($('input[name=deviceCount]:checked').length === 0),
        );
      }
    });

    $('#which-btn-next').prop('disabled', true);
    $('#which-btn-next').click((event)=>{
      $('#which-error-msg').hide();
      let useCsv = $('.nav-link.active').attr('id') === 'whichFile';
      let pageNum = parseInt($('#curr-page-link').html());
      let pageCount = parseInt($('#input-elements-pp option:selected').text());
      let filterList = lastDevicesSearchInputQuery;
      let useAll = (useCsv) ? false :
          ($('input[name=deviceCount]:checked')[0].id === 'allDevices');
      $.ajax({
        url: '/devicelist/scheduler/releases',
        type: 'PUT',
        data: {
          use_csv: useCsv,
          use_all: useAll,
          page_num: pageNum,
          page_count: pageCount,
          filter_list: filterList,
        },
        success: function(res) {
          // Build options dropdown
          let dropdown = $('#releases-dropdown');
          dropdown.html('');
          res.releaseInfo.sort((r, s)=>(r.id < s.id)).forEach((release)=>{
            // Skip stock firmwares from being listed
            if (release.id !== '9999-aix' && release.id !== 'STOCK' &&
                release.count > 0
            ) {
              dropdown.append(
                $('<a>').addClass('dropdown-item text-center').html(release.id),
              );
            }
          });
          // Build missing firmware data
          $('#releases-dropdown a').unbind('click');
          $('#releases-dropdown a').click((event)=>{
            $('#warning-releases').hide();
            $('#list-missing-models').hide();
            $('#list-onus').hide();
            $('#list-mesh').hide();
            $('#list-mesh-roles').hide();
            let release = event.originalEvent.target.text;
            $('#selected-release').html(release);
            let missingModels = res.releaseInfo.find(
              (r)=>(r.id === release),
            ).missingModels;
            let totalCount = res.totalCount;
            let noUpgradeCount = totalCount - res.releaseInfo.find(
              (r)=>(r.id === release),
            ).count;
            let onuCount = res.onuCount;
            let meshIncompatibles = res.releaseInfo.find(
              (r)=>(r.id === release),
            ).meshIncompatibles;
            let meshRolesIncompatibles = res.releaseInfo.find(
              (r)=>(r.id === release),
            ).meshRolesIncompatibles;
            $('#warning-missing-models').html('');
            missingModels.forEach((model)=>{
              $('#warning-missing-models').append(
                $('<li>').html(model),
              );
            });
            let selectedCount = parseInt(totalCount) - noUpgradeCount;
            if (selectedCount > 0) {
              $('#how-btn-next').prop('disabled', false);
            } else {
              $('#how-btn-next').prop('disabled', true);
            }
            $('#warning-selected-to-update')
            .html(t('XOfYSelectedCpesWillUpdate!', {
              x: selectedCount > 0 ?
                t('onlyX', {x: selectedCount}) : t('none'),
              y: totalCount,
            }));

            if (noUpgradeCount > 0) {
              $('#warning-releases').show();
              if (noUpgradeCount - onuCount - meshIncompatibles -
                meshRolesIncompatibles > 0) {
                $('#list-missing-models').show();
              }
              if (onuCount > 0) {
                $('#onu-count').html(t('onuSelectedToUpdate', {x: onuCount}));
                $('#list-onus').show();
              }
              if (meshIncompatibles > 0) {
                $('#mesh-count').html(t('meshSelectedToUpdate',
                  {x: meshIncompatibles}));
                $('#list-mesh').show();
              }
              if (meshRolesIncompatibles > 0) {
                $('#mesh-roles-count').html(t('meshRolesSelectedToUpdate',
                  {x: meshRolesIncompatibles}));
                $('#list-mesh-roles').show();
              }
            } else {
              $('#how-btn-next').prop('disabled', false);
            }
          });
          stepper.next();
        },
        error: function(xhr, status, error) {
          $('#which-error-text').html('&nbsp; '+t('serverErrorPleaseTryAgain'));
          $('#which-error-msg').show();
        },
      });
    });

    $('#when-btn-next').prop('disabled', true);
    $('.custom-control.custom-checkbox').click((event)=>{
      $('#when-btn-next').prop('disabled', !isWhenPartValidated());
    });

    $('#updateNow').click((event)=>{
      let rangesLength = $('#time-ranges .time-range').length;
      if ($('input[name=updateNow]:checked').length > 0) {
        for (let i = 0; i < rangesLength; i++) {
          $('#scheduleStart-' + i + ' input').prop('disabled', true);
          $('#scheduleEnd-' + i + ' input').prop('disabled', true);
          $('#startWeekday-' + i).prop('disabled', true);
          $('#endWeekday-' + i).prop('disabled', true);
        }
        $('#addSchedule').prop('disabled', true);
        $('#removeSchedule').prop('disabled', true);
      } else {
        for (let i = 0; i < rangesLength; i++) {
          $('#scheduleStart-' + i + ' input').prop('disabled', false);
          $('#scheduleEnd-' + i + ' input').prop('disabled', false);
          $('#startWeekday-' + i).prop('disabled', false);
          $('#endWeekday-' + i).prop('disabled', false);
        }
        $('#addSchedule').prop('disabled', false);
        $('#removeSchedule').prop('disabled',
                                  $('#time-ranges .time-range').length === 1);
      }
    });

    $('#when-btn-next').click((event)=>{
      $('#when-btn-prev').prop('disabled', true);
      $('#when-btn-next').prop('disabled', true);
      let useCsv = $('.nav-link.active').attr('id') === 'whichFile';
      let useAll = (useCsv) ? false :
          ($('input[name=deviceCount]:checked')[0].id === 'allDevices');
      let pageNum = parseInt($('#curr-page-link').html());
      let pageCount = parseInt($('#input-elements-pp option:selected').text());
      let filterList = lastDevicesSearchInputQuery;
      let release = $('#selected-release').html();
      let value = $('#devices-search-input').val();
      let tags = (value) ? value.split(',').map((v)=>'"' + v + '"').join(', ')
                         : t('noFilterUsed');
      let hasTimeRestriction = $('input[name=updateNow]:checked').length === 0;
      let timeRestrictions = [];
      if (hasTimeRestriction) {
        let rangeCount = $('#time-ranges .time-range').length;
        for (let i = 0; i < rangeCount; i++) {
          timeRestrictions.push({
            'startWeekday': $('#startWeekday-' + i).html(),
            'endWeekday': $('#endWeekday-' + i).html(),
            'startTime': $('#scheduleStart-' + i + ' input').val(),
            'endTime': $('#scheduleEnd-' + i + ' input').val(),
          });
        }
      }
      $('#when-error-msg').hide();
      $('#when-btn-icon')
        .removeClass('fa-check')
        .addClass('fa-spinner fa-pulse');
      swal.fire({
        title: t('startingSchedule...'),
        onOpen: () => {
          swal.showLoading();
        },
      });
      $.ajax({
        url: '/devicelist/scheduler/start',
        type: 'POST',
        data: {
          use_search: tags,
          use_csv: useCsv,
          use_all: useAll,
          use_time_restriction: hasTimeRestriction,
          time_restriction: JSON.stringify(timeRestrictions),
          release: release,
          page_num: pageNum,
          page_count: pageCount,
          filter_list: filterList,
        },
        success: function(res) {
          $('#when-btn-icon')
            .removeClass('fa-spinner fa-pulse')
            .addClass('fa-check');
          $('#when-btn-prev').prop('disabled', false);
          $('#when-btn-next').prop('disabled', false);
          swal.close();
          swal.fire({
            icon: 'success',
            title: t('scheduleStartedSuccessfully!'),
            text: t('pressOkToRefreshPage'),
            confirmButtonColor: '#4db6ac',
          }).then(()=>{
            location.reload(true);
          });
        },
        error: function(xhr, status, error) {
          $('#when-btn-icon')
            .removeClass('fa-spinner fa-pulse')
            .addClass('fa-check');
          $('#when-error-text').html('&nbsp; '+t('serverErrorPleaseTryAgain'));
          $('#when-error-msg').show();
          $('#when-btn-prev').prop('disabled', false);
          $('#when-btn-next').prop('disabled', false);
          swal.close();
          swal.fire({
            icon: 'error',
            title: t('errorStartingSchedule'),
            text: t('pleaseTryAgain'),
            confirmButtonColor: '#4db6ac',
          });
        },
      });
    });

    $('#addSchedule').click((event)=>{
      let timeRangesContent = $('#time-ranges .time-range');
      let length = timeRangesContent.length;
      let newHtml = timeRangesContent[0].innerHTML;
      newHtml = newHtml.replace(/scheduleStart-0/g, 'scheduleStart-' + length);
      newHtml = newHtml.replace(/startWeekday-0/g, 'startWeekday-' + length);
      newHtml = newHtml.replace(/scheduleEnd-0/g, 'scheduleEnd-' + length);
      newHtml = newHtml.replace(/endWeekday-0/g, 'endWeekday-' + length);
      newHtml = newHtml.replace(/equal-error-0/g, 'equal-error-' + length);
      $('#time-ranges').append(
        $('<div class="time-range">').html(newHtml),
      );
      configureDateDiv(length);
      $('#removeSchedule').prop('disabled', false);
      $('#when-btn-next').prop('disabled', !isWhenPartValidated());
    });

    $('#removeSchedule').click((event)=>{
      let timeRangesContent = $('#time-ranges .time-range');
      timeRangesContent[timeRangesContent.length - 1].remove();
      $('#removeSchedule').prop('disabled',
                                $('#time-ranges .time-range').length === 1);
      $('#when-btn-next').prop('disabled', !isWhenPartValidated());
    });

    $('#devices-search-input').on('change textInput input', (event)=>{
      let value = $('#devices-search-input').val();
      let tags = (value) ? value.split(',').map((v)=>'"' + v + '"').join(', ')
                         : t('noFilterUsed');
      $('#searchTags').html(t('searchFiltersUsed=X', {filters: tags}));
    });
  }

  $('#config-panel-arrow').click((event)=>{
    let div = $('#config-panel-arrow');
    if (div.hasClass('text-primary')) {
      div.removeClass('text-primary fa-chevron-up').addClass('fa-chevron-down');
      $('#config-panel').hide();
    } else {
      div.removeClass('fa-chevron-down').addClass('text-primary fa-chevron-up');
      $('#config-panel').show();
    }
  });

  $('#prev-config-panel-arrow').click((event)=>{
    let div = $('#prev-config-panel-arrow');
    if (div.hasClass('text-primary')) {
      div.removeClass('text-primary fa-chevron-up').addClass('fa-chevron-down');
      $('#prev-config-panel').hide();
    } else {
      div.removeClass('fa-chevron-down').addClass('text-primary fa-chevron-up');
      $('#prev-config-panel').show();
    }
  });

  $('#result-panel-arrow').click((event)=>{
    let div = $('#result-panel-arrow');
    if (div.hasClass('text-primary')) {
      div.removeClass('text-primary fa-chevron-up').addClass('fa-chevron-down');
      $('#result-panel').hide();
    } else {
      div.removeClass('fa-chevron-down').addClass('text-primary fa-chevron-up');
      $('#result-panel').show();
    }
  });

  $('#abort-btn').click((event)=>{
    swal.fire({
      icon: 'warning',
      title: t('Attention!'),
      text: t('abortScheduleWarningMessage'),
      confirmButtonText: t('Proceed'),
      confirmButtonColor: '#4db6ac',
      cancelButtonText: t('Cancel'),
      cancelButtonColor: '#f2ab63',
      showCancelButton: true,
    }).then((result)=>{
      if (!result.value) return;
      let p = Promise.resolve(true);
      if ($('#progress-todo').hasClass('doing')) {
        p = swal.fire({
          icon: 'warning',
          title: t('Attention!'),
          text: t('abortScheduleProgressToDoWarningMessage'),
          confirmButtonText: t('Proceed'),
          confirmButtonColor: '#4db6ac',
        });
      }
      p.then((result)=>{
        swal.fire({
          title: t('abortingSchedule...'),
          onOpen: () => {
            swal.showLoading();
          },
        });
        $.ajax({
          type: 'POST',
          url: '/devicelist/scheduler/abort',
          success: function(res) {
            swal.close();
            swal.fire({
              icon: 'success',
              title: t('scheduleSuccessfullyAborted!'),
              text: t('pressOkToRefreshPage'),
              confirmButtonColor: '#4db6ac',
            }).then(()=>{
              location.reload(true);
            });
          },
          error: function(xhr, status, error) {
            swal.close();
            swal.fire({
              icon: 'error',
              title: t('errorAbortingSchedule'),
              text: t('pleaseTryAgain'),
              confirmButtonColor: '#4db6ac',
            });
          },
        });
      });
    });
  });

  $('#refresh-btn').click((event)=>{
    swal.fire({
      title: t('searchingInfo...'),
      onOpen: () => {
        swal.showLoading();
      },
    });
    $.ajax({
      type: 'POST',
      url: '/devicelist/scheduler/update',
      success: function(res) {
        swal.close();
        let todo = $('#progress-todo');
        todo.html(t('Remaining=X', {x: res.todo}));
        $('#progress-total').html(t('Total=X', {x: res.total}));
        $('#progress-done').html(t('Success=X', {x: res.done}));
        $('#progress-error').html(t('Error=X', {x: res.error}));
        if (res.doing && !todo.hasClass('doing')) {
          todo.addClass('doing');
        } else if (!res.doing && todo.hasClass('doing')) {
          todo.removeClass('doing');
        }
        if (res.total === (res.done + res.error)) {
          // All devices done, prompt page reload
          swal.fire({
            icon: 'success',
            title: t('updatesConcluded'),
            text: t('newScheduleModalMessage'),
            confirmButtonText: t('Refresh'),
            confirmButtonColor: '#4db6ac',
            cancelButtonText: t('Later'),
            cancelButtonColor: '#f2ab63',
            showCancelButton: true,
          }).then((result)=>{
            if (result.value) {
              location.reload(true);
            }
          });
        }
      },
      error: function(xhr, status, error) {
        swal.close();
        swal.fire({
          icon: 'error',
          title: t('errorSearchingInfo'),
          text: t('pleaseTryAgain'),
          confirmButtonColor: '#4db6ac',
        });
      },
    });
  });

  const downloadCSV = function(csv, filename) {
    let csvFile;
    let downloadLink;
    // CSV file
    csvFile = new Blob([csv], {type: 'text/csv'});
    // Download link
    downloadLink = document.createElement('a');
    // File name
    downloadLink.download = filename;
    // Create a link to the file
    downloadLink.href = window.URL.createObjectURL(csvFile);
    // Hide download link
    downloadLink.style.display = 'none';
    // Add the link to DOM
    document.body.appendChild(downloadLink);
    // Click download link
    downloadLink.click();
  };

  $('#results-btn').click((event)=>{
    swal.fire({
      title: t('searchingInfo...'),
      onOpen: () => {
        swal.showLoading();
      },
    });
    $.ajax({
      type: 'POST',
      url: '/devicelist/scheduler/results',
      success: function(res) {
        swal.close();
        downloadCSV(res, t('scheduling') + '.csv');
      },
      error: function(xhr, status, error) {
        swal.close();
        swal.fire({
          icon: 'error',
          title: t('errorSearchingInfo'),
          text: t('pleaseTryAgain'),
          confirmButtonColor: '#4db6ac',
        });
      },
    });
  });

  $('#prev-config-panel').hide();
});

export {updateSearchResultsScheduler};
