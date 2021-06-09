import Stepper from 'bs-stepper';
import 'tempusdominus-bootstrap-4';

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
    }
    return false;
  });

  let lastDevicesSearchInputQuery = '';
  let stepper = $('.bs-stepper');
  if (stepper.length > 0) {
    stepper = new Stepper(stepper[0], {animation: true});
    resetStepperData(stepper);
    $(document).on('submit', '#devices-search-form', function(event) {
      lastDevicesSearchInputQuery = document.getElementById('devices-search-input').value;
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
      let filterList = lastDevicesSearchInputQuery;//$('#devices-search-input').val();
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
            // Skip stock firmwares from being listed
            if (release.id !== '9999-aix' && release.id !== 'STOCK') {
              dropdown.append(
                $('<a>').addClass('dropdown-item text-center').html(release.id)
              );
            }
          });
          // Build missing firmware data
          $('#releases-dropdown a').unbind('click');
          $('#releases-dropdown a').click((event)=>{
            $('#warning-releases').hide();
            $('#list-missing-models').hide();
            $('#list-onus').hide();
            let release = event.originalEvent.target.text;
            $('#selected-release').html(release);
            let missingModels = res.releases.find((r)=>r.id===release).models;
            let intersections = res.intersections;
            let missingCount = 0;
            let onuCount = 0;
            $('#warning-missing-models').html('');
            missingModels.forEach((model)=>{
              console.log(model)
              if (!model.isOnu) {
                console.log('got here')
                $('#warning-missing-models').append(
                  $('<li>').html(model.model),
                );
              }
              let count = model.count;
              // Discount mesh intersections
              intersections = intersections.filter((intersection)=>{
                if (model.model in intersection) {
                  Object.keys(intersection).forEach((imodel)=>{
                    if (model.model === imodel) return; // discard same model
                    if (!missingModels.find((m)=>m.model===imodel)) {
                      // Only discard intersection models if the other model
                      // is not in the missing models
                      count += intersection[imodel];
                    }
                  });
                  return false;
                }
                return true;
              });
              if (model.isOnu) onuCount += count;
              else missingCount += count;
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
            console.log('onuCount', onuCount)
            totalCount = parseInt(totalCount) - missingCount - onuCount;
            if (totalCount > 0) {
              $('#warning-newTotal').html(' somente ' + totalCount);
              $('#how-btn-next').prop('disabled', false);
            } else {
              $('#how-btn-next').prop('disabled', true);
              $('#warning-newTotal').html(' nenhum');
            }
            if (missingCount + onuCount > 0) {
              $('#warning-releases').show();
              if (missingCount > 0) {
                $('#list-missing-models').show();
              }
              if (onuCount > 0) {
                $('#onu-count').html(onuCount+' ');
                $('#list-onus').show();
              }
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
      let filterList = lastDevicesSearchInputQuery;//$('#devices-search-input').val();
      let release = $('#selected-release').html();
      let value = $('#devices-search-input').val();
      let tags = (value) ? value.split(',').map((v)=>'"' + v + '"').join(', ')
                         : 'Nenhum filtro utilizado';
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
      swal({
        title: 'Iniciando agendamento...',
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
          swal({
            type: 'success',
            title: 'Agendamento iniciado com sucesso!',
            text: 'Pressione OK para recarregar a página',
            confirmButtonColor: '#4db6ac',
          }).then(()=>{
            location.reload(true);
          });
        },
        error: function(xhr, status, error) {
          $('#when-btn-icon')
            .removeClass('fa-spinner fa-pulse')
            .addClass('fa-check');
          $('#when-error-text').html('&nbsp; Ocorreu um erro no servidor. ' +
                                      'Por favor tente novamente.');
          $('#when-error-msg').show();
          $('#when-btn-prev').prop('disabled', false);
          $('#when-btn-next').prop('disabled', false);
          swal.close();
          swal({
            type: 'error',
            title: 'Erro ao iniciar o agendamento',
            text: 'Por favor tente novamente',
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

    $('#devices-search-input').on('change textInput input', (event)=>{
      let value = $('#devices-search-input').val();
      let tags = (value) ? value.split(',').map((v)=>'"' + v + '"').join(', ')
                         : 'Nenhum filtro utilizado';
      $('#searchTags').html(tags);
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
    swal({
      type: 'warning',
      title: 'Atenção!',
      text: 'Ao abortar o agendamento todos os dispositivos que ainda não ' +
        'foram atualizados terão sua atualização descartada, precisando de ' +
        'um novo agendamento para atualiza-los. Deseja continuar mesmo assim?',
      confirmButtonText: 'Prosseguir',
      confirmButtonColor: '#4db6ac',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#f2ab63',
      showCancelButton: true,
    }).then((result)=>{
      if (!result.value) return;
      let p = Promise.resolve(true);
      if ($('#progress-todo').hasClass('doing')) {
        p = swal({
          type: 'warning',
          title: 'Atenção!',
          text: 'Alguns roteadores já iniciaram o processo de atualização, e ' +
            'não serão interrompidos ao abortar o agendamento. Exporte o CSV ' +
            'com os resultados para saber quais roteadores ainda estavam ' +
            'atualizando.',
          confirmButtonText: 'Prosseguir',
          confirmButtonColor: '#4db6ac',
        });
      }
      p.then((result)=>{
        swal({
          title: 'Abortando agendamento...',
          onOpen: () => {
            swal.showLoading();
          },
        });
        $.ajax({
          type: 'POST',
          url: '/devicelist/scheduler/abort',
          success: function(res) {
            swal.close();
            swal({
              type: 'success',
              title: 'Agendamento abortado com sucesso!',
              text: 'Pressione OK para recarregar a página',
              confirmButtonColor: '#4db6ac',
            }).then(()=>{
              location.reload(true);
            });
          },
          error: function(xhr, status, error) {
            swal.close();
            swal({
              type: 'error',
              title: 'Erro ao abortar o agendamento',
              text: 'Por favor tente novamente',
              confirmButtonColor: '#4db6ac',
            });
          },
        });
      });
    });
  });

  $('#refresh-btn').click((event)=>{
    swal({
      title: 'Buscando informações...',
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
        todo.html(' ' + res.todo);
        $('#progress-total').html(' ' + res.total);
        $('#progress-done').html(' ' + res.done);
        $('#progress-error').html(' ' + res.error);
        if (res.doing && !todo.hasClass('doing')) {
          todo.addClass('doing');
        } else if (!res.doing && todo.hasClass('doing')) {
          todo.removeClass('doing');
        }
        if (res.total === (res.done + res.error)) {
          // All devices done, prompt page reload
          swal({
            type: 'success',
            title: 'As atualizações foram concluídas',
            text: 'Os resultados podem ser vistos exportando o arquivo CSV. ' +
              'Para iniciar outro agendamento é necessário recarregar a ' +
              'página. Deseja recarrega-la agora?',
            confirmButtonText: 'Recarregar',
            confirmButtonColor: '#4db6ac',
            cancelButtonText: 'Mais tarde',
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
        swal({
          type: 'error',
          title: 'Erro ao buscar informações',
          text: 'Por favor tente novamente',
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
    swal({
      title: 'Buscando informações...',
      onOpen: () => {
        swal.showLoading();
      },
    });
    $.ajax({
      type: 'POST',
      url: '/devicelist/scheduler/results',
      success: function(res) {
        swal.close();
        downloadCSV(res, 'agendamento.csv');
      },
      error: function(xhr, status, error) {
        swal.close();
        swal({
          type: 'error',
          title: 'Erro ao buscar informações',
          text: 'Por favor tente novamente',
          confirmButtonColor: '#4db6ac',
        });
      },
    });
  });

  $('#prev-config-panel').hide();
});

export {updateSearchResultsScheduler};
