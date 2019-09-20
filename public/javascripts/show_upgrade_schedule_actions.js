let updateSearchResultsScheduler = function(result) {
  $('#allDevicesLabel').html(' ' + result.status.totalnum);
  let pageCount = $('#input-elements-pp option:selected').text();
  let deviceCount = (parseInt(pageCount) > result.status.totalnum) ?
      result.status.totalnum : pageCount;
  $('#someDevicesLabel').html(' ' + deviceCount);
};

const resetStepperData = function(stepper) {
  $('#releases-dropdown').html('');
  $('#selected-release').html('Escolher');
  $('#warning-releases').hide();
  $('#which-error-msg').hide();
  $('#how-btn-next').prop('disabled', true);
};

const isWhenPartValidated = function() {
  let rangesLength = $('#time-ranges .time-range').length;
  let retval = true;
  for (let i = 0; i < rangesLength; i++) {
    $('#time-equal-error-'+i).hide();
    let startDay = $('#startWeekday-'+i).html();
    let endDay = $('#endWeekday-'+i).html();
    let startTime = $('#scheduleStart-'+i+' input').val();
    let endTime = $('#scheduleEnd-'+i+' input').val();
    if (!startTime || !endTime) retval = false;
    if (startDay === 'Dia da semana' || endDay === 'Dia da semana') {
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

$(document).ready(function() {
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
          $('#csv-result-count').html(' ' + res.result);
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
    } else {
    }
    return false;
  });

  let stepper = new Stepper($('.bs-stepper')[0], {animation: true});
  resetStepperData(stepper);

  $(document).on('submit', '#devices-search-form', function(event) {
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
        ($('input[name=deviceCount]:checked').length === 0)
      );
    }
  });

  $('#which-btn-next').prop('disabled', true);
  $('#which-btn-next').click((event)=>{
    $('#which-error-msg').hide();
    let useCsv = $('.nav-link.active').attr('id') === 'whichFile';
    let pageNum = parseInt($('#curr-page-link').html());
    let pageCount = parseInt($('#input-elements-pp option:selected').text());
    let filterList = $('#devices-search-form .tags-input').val();
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
        res.releases.sort((r, s)=>(r.id < s.id)).forEach((release)=>{
          dropdown.append(
            $('<a>').addClass('dropdown-item text-center').html(release.id)
          );
        });
        // Build missing firmware data
        $('#releases-dropdown a').unbind('click');
        $('#releases-dropdown a').click((event)=>{
          $('#warning-releases').hide();
          let release = event.originalEvent.target.text;
          $('#selected-release').html(release);
          let missingModels = res.releases.find((r)=>r.id===release).models;
          let missingCount = 0;
          $('#warning-missing-models').html('');
          missingModels.forEach((model)=>{
            $('#warning-missing-models').append(
              $('<li>').html(model.model)
            );
            missingCount += model.count;
          });
          let totalCount;
          if (useCsv) {
            totalCount = $('#csv-result-count').html();
          } else if (useAll) {
            totalCount = $('#allDevicesLabel').html();
          } else {
            totalCount = $('#someDevicesLabel').html();
          }
          $('#warning-prevTotal').html(totalCount);
          totalCount = parseInt(totalCount) - missingCount;
          if (totalCount > 0) {
            $('#warning-newTotal').html(' somente ' + totalCount);
            $('#how-btn-next').prop('disabled', false);
          } else {
            $('#how-btn-next').prop('disabled', true);
            $('#warning-newTotal').html(' nenhum');
          }
          if (missingCount > 0) {
            $('#warning-releases').show();
          } else {
            $('#how-btn-next').prop('disabled', false);
          }
        });
        stepper.next();
      },
      error: function(xhr, status, error) {
        $('#which-error-text').html('&nbsp; Ocorreu um erro no servidor. ' +
                                    'Por favor tente novamente.');
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
      $('#removeSchedule').prop('disabled', $('#time-ranges .time-range').length === 1);
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
    let filterList = $('#devices-search-form .tags-input').val();
    let release = $('#selected-release').html();
    let hasTimeRestriction = $('input[name=updateNow]:checked').length === 0;
    let timeRestrictions = [];
    if (hasTimeRestriction) {
      let rangeCount = $('#time-ranges .time-range').length;
      for (let i = 0; i < rangeCount; i++) {
        timeRestrictions.push({
          'startWeekday': $('startWeekday-' + i).html(),
          'endWeekday': $('endWeekday-' + i).html(),
          'startTime': $('#scheduleStart-' + i).val(),
          'endTime': $('#scheduleEnd-' + i).val(),
        });
      }
    }
    $('#when-error-msg').hide();
    $('#when-btn-icon')
      .removeClass('fa-check')
      .addClass('fa-spinner fa-pulse');
    $.ajax({
      url: '/devicelist/scheduler/start',
      type: 'POST',
      data: {
        use_csv: useCsv,
        use_all: useAll,
        use_time_restriction: hasTimeRestriction,
        start_time: startTime,
        end_time: endTime,
        time_restriction: timeRestrictions,
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
      },
      error: function(xhr, status, error) {
        console.log(JSON.parse(xhr.responseText));
        $('#when-btn-icon')
          .removeClass('fa-spinner fa-pulse')
          .addClass('fa-check');
        $('#when-error-text').html('&nbsp; Ocorreu um erro no servidor. ' +
                                    'Por favor tente novamente.');
        $('#when-error-msg').show();
        $('#when-btn-prev').prop('disabled', false);
        $('#when-btn-next').prop('disabled', false);
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
      $('<div class="time-range">').html(newHtml)
    );
    configureDateDiv(length);
    $('#removeSchedule').prop('disabled', false);
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });

  $('#removeSchedule').click((event)=>{
    let timeRangesContent = $('#time-ranges .time-range');
    timeRangesContent[timeRangesContent.length - 1].remove();
    $('#removeSchedule').prop('disabled', $('#time-ranges .time-range').length === 1);
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });
});
