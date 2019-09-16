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
  if ($('input[name=updateNow]:checked').length > 0 || (
      $('input[name=weekDays]:checked').length > 0 &&
      $('#scheduleStart input').val() != '' &&
      $('#scheduleEnd input').val() != '')) {
    return true;
  }
  return false;
};

$(document).ready(function() {
  $('#scheduleStart').datetimepicker({
      format: 'HH:mm',
  });
  $('#scheduleEnd').datetimepicker({
      format: 'HH:mm',
  });

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
  $('#scheduleStart input').change((event)=>{
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });
  $('#scheduleEnd input').change((event)=>{
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });
  $('.custom-control.custom-checkbox').click((event)=>{
    $('#when-btn-next').prop('disabled', !isWhenPartValidated());
  });

  $('#updateNow').click((event)=>{
    if ($('input[name=updateNow]:checked').length > 0) {
      $('#scheduleStart input').prop('disabled', true);
      $('#scheduleEnd input').prop('disabled', true);
      $('[name=weekDays]').prop('disabled', true);
    } else {
      $('#scheduleStart input').prop('disabled', false);
      $('#scheduleEnd input').prop('disabled', false);
      $('[name=weekDays]').prop('disabled', false);
    }
  });
});
