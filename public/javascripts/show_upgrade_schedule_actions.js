import {anlixDocumentReady} from '../src/common.index.js';
import Stepper from 'bs-stepper';
import 'tempusdominus-bootstrap-4';

const t = i18next.t;

// Copied from environment
const MIN_TIMEOUT_PERIOD = 10;
const MAX_TIMEOUT_PERIOD = 1440;


// Firmware List
let firmwareList = [];
let informIntervalInMinutes = NaN;


// Errors
const ERROR_EMPTY_FIRMWARE_LIST = '[ ERROR ] Empty firmware list.';


// Buttons
const TR069_FIRMWARE_SELECTION_BUTTON = '#tr069-firmware-selection';
const FLASHBOX_FIRMWARE_SELECTION_BUTTON = '#flashbox-firmware-selection';

// Checkboxes
const CPE_WONT_RETURN_DIV = '#cpeWontReturnDiv';
const CPE_WONT_RETURN_CHECKBOX = '#cpeWontReturn';

// Inputs
const TIME_LIMIT_FOR_UPDATE_DIV = '#timeLimitUpdateDiv';
const TIME_LIMIT_FOR_UPDATE_INPUT = '#timeLimitUpdateInput';
const TIME_LIMIT_FOR_UPDATE_LABEL = '#timeLimitUpdateLabel';

// Messages
const WHEN_ERROR_MESSAGE_DIV = '#when-error-msg';
const WHEN_ERROR_MESSAGE = '#when-error-text';


// Dropdowns
const FIRMWARE_SELECTION_DROPDOWN = '#releases-dropdown';

// Dropdown Items
const createFirmwareSelectionItem = function(id) {
  return $('<a>')
    .addClass('dropdown-item text-center')
    .html(id);
};

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


// Description:
// This function builds the firmware selection dropdown based
// on firmwares avaiable and if the type of firmware buttons

// Inputs:
// tr069Active - If TR069 selection is active
// flashboxActive - If flashbox selection is active
const setFirmwareReleasesDropdown = function(
  tr069Active = false,
  flashboxActive = false,
) {
  // Clear the dropdown
  $(FIRMWARE_SELECTION_DROPDOWN).html('');

  // If the list is empty, return with error
  if (firmwareList.length === 0) {
    // console.error(ERROR_EMPTY_FIRMWARE_LIST);
    return;
  }

  // Sort the releases so the last firmware will be on top
  firmwareList.releaseInfo.sort(
    (release1, release2) => (release1.id < release2.id),
  ).forEach(function fillDropdown(release) {
    // Skip stock and debug firmwares and invalid releases from being listed
    if (release.id === '9999-aix' ||
        release.id === 'STOCK' ||
        release.count <= 0
    ) {
      return;
    }


    // Check if TR069 or Flashbox is selected and the respective release exists
    if (
      // TR069 button updated to active
      (tr069Active === true &&
      flashboxActive === false &&
      release.isTR069 === true) ||

      // Flashbox button updated to active
      (tr069Active === false &&
      flashboxActive === true &&
      release.isTR069 === false) ||

      // TR069
      ($(TR069_FIRMWARE_SELECTION_BUTTON).hasClass('active') &&
      release.isTR069 === true) ||

      // Flashbox
      ($(FLASHBOX_FIRMWARE_SELECTION_BUTTON).hasClass('active') &&
      release.isTR069 === false)
    ) {
      // Append the item
      $(FIRMWARE_SELECTION_DROPDOWN).append(
        createFirmwareSelectionItem(release.id),
      );

      // Update bindings and informations
      displayAndCheckUpdate(tr069Active);
    }
  });
};


const displayAndCheckUpdate = function(tr069Active) {
  $('#releases-dropdown a').unbind('click');
  $('#releases-dropdown a').click((event)=>{
    // Hide information sections
    $('#warning-releases').hide();
    $('#list-missing-models').hide();
    $('#list-onus').hide();
    $('#list-mesh').hide();
    $('#list-mesh-roles').hide();

    // Show which release is selected
    let release = event.originalEvent.target.text;
    $('#selected-release').html(release);

    // Get missing models
    let missingModels = firmwareList.releaseInfo.find(
      (r)=>(r.id === release),
    ).missingModels;

    // Get the total count of routers
    let totalCount = firmwareList.totalCount;

    // Calculate how many routers wouldn't be updated
    let noUpgradeCount = totalCount - firmwareList.releaseInfo.find(
      (r)=>(r.id === release),
    ).count;

    // Get the count of ONUs
    let onuCount = firmwareList.onuCount;

    // Get the count of mesh devices that are incompatibles
    let meshIncompatibles = firmwareList.releaseInfo.find(
      (r)=>(r.id === release),
    ).meshIncompatibles;

    // Get if the release is TR-069 or not
    let isReleaseTr069 = firmwareList.releaseInfo.find(
      (rel)=>rel.id === release,
    ).isTR069;

    // Get the quantity of different TR-069 models
    // The quantity of cpes with different models is equal to the whole
    // quantity of onus minus the quantity of models for that release
    let differentModel = onuCount - firmwareList.releaseInfo.find(
      (r)=>(r.id === release),
    ).count;

    let meshRolesIncompatibles = firmwareList.releaseInfo.find(
      (r)=>(r.id === release),
    ).meshRolesIncompatibles;

    // Set the information about missing models
    $('#warning-missing-models').html('');
    missingModels.forEach((model)=>{
      $('#warning-missing-models').append(
        $('<li>').html(model),
      );
    });

    // Calculate how many will be updated
    let selectedCount = parseInt(totalCount) - noUpgradeCount;

    // If there is at least one that can be updated, allow to click on next
    if (selectedCount > 0) {
      $('#how-btn-next').prop('disabled', false);
    } else {
      $('#how-btn-next').prop('disabled', true);
    }

    // Display how many will be updated
    $('#warning-selected-to-update')
    .html(
      t('XOfYSelectedCpesWillUpdate!', {
        x: selectedCount > 0 ?
          t('onlyX', {x: selectedCount}) : t('none'),
        y: totalCount,
      }) + ' ' + t('wontUpdate', {
        // If the release selected is not TR-069, display that all TR-069
        // models will not be updated
        x: (!isReleaseTr069 && onuCount > 0) ?
          t('modelsWithTr069', {x: onuCount}) : '',

        // If the release selected is TR-069, display the quantity of firmware
        // Anlix and with different models
        y: (isReleaseTr069 && (totalCount - onuCount) > 0) ?
          t('modelsWithAnlixFirmware', {x: totalCount - onuCount}) : '',

        // The quantity of cpes with different models
        z: (isReleaseTr069 && differentModel > 0) ?
          t('modelsWithDifferentFirmware', {x: differentModel}) : '',
      }),
    );

    // If cannot upgrade at least one
    if (noUpgradeCount > 0) {
      // Dispĺay all models that cannot be updated
      $('#warning-releases').show();
      if (
        noUpgradeCount-onuCount-meshIncompatibles-meshRolesIncompatibles > 0 &&
        tr069Active === false
      ) {
        $('#list-missing-models').show();
      }

      // Display how many ONUs cannot be updated
      // if (onuCount > 0) {
      //   $('#onu-count').html(t('onuSelectedToUpdate', {x: onuCount}));
      //   $('#list-onus').show();
      // }

      // Display how many mesh routers cannot be updated
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

    // Allow updating
    } else {
      $('#how-btn-next').prop('disabled', false);
    }
  });
};


anlixDocumentReady.add(function() {
  $('#removeSchedule').prop('disabled', true);
  $(WHEN_ERROR_MESSAGE_DIV).hide();


  // Set the mask for time limit for upgrade input
  $(TIME_LIMIT_FOR_UPDATE_INPUT).mask('###0');


  // Get the inform interval
  $.ajax({
    type: 'GET',
    url: '/upgrade/config',
    success: function(response) {
      // Validate inform interval
      if (!response.tr069InformInterval) {
        informIntervalInMinutes = MIN_TIMEOUT_PERIOD;
      } else {
        informIntervalInMinutes = Math.ceil(response.tr069InformInterval / 60);
      }

      // Set the time limit for update text
      $(TIME_LIMIT_FOR_UPDATE_LABEL).text(
        t('updateTimeLimitInputText', {default:
          informIntervalInMinutes * 5 + MIN_TIMEOUT_PERIOD,
        }),
      );
    },
  });


  // At the beginning hide the won't return to flashman checkbox as it starts
  // with TR-069
  $(CPE_WONT_RETURN_DIV).hide();

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

  // Assign on change to firmware selection buttons
  $(document).on('change', TR069_FIRMWARE_SELECTION_BUTTON, function() {
    resetStepperData();
    setFirmwareReleasesDropdown(true, false);

    // Remove the won't return to flashman checkbox, only allow for flashbox
    $(CPE_WONT_RETURN_DIV).hide();
    $(CPE_WONT_RETURN_CHECKBOX).prop('checked', false);
  });


  // Show a popup when the user selects the cpe won't return checkbox
  $(document).on('change', CPE_WONT_RETURN_CHECKBOX, function() {
    let cpesWontReturn = $(CPE_WONT_RETURN_CHECKBOX).is(':checked');

    // If it is marked, show the popup
    if (cpesWontReturn === true) {
      swal.fire({
        title: t('caution'),
        html: t('cpeWontReturnToFlashmanWarning'),
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: t('yesSure'),
        cancelButtonText: t('noBack'),
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#4db6ac',
        allowOutsideClick: false,
      }).then((result) => {
        // If the user accepted, continue to the next step
        if (result.dismiss && result.dismiss === 'cancel') {
          $(CPE_WONT_RETURN_CHECKBOX).prop('checked', false);
        }
      });
    }
  });


  $(document).on('change', FLASHBOX_FIRMWARE_SELECTION_BUTTON, function() {
    resetStepperData();
    setFirmwareReleasesDropdown(false, true);

    // Show the won't return to flashman checkbox, only for flashbox
    $(CPE_WONT_RETURN_DIV).show();
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


  let stepper = $('.bs-stepper');
  if (stepper.length > 0) {
    stepper = new Stepper(stepper[0], {animation: true});
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
      let cpesWontReturn = $(CPE_WONT_RETURN_CHECKBOX).is(':checked');


      // Validate inform interval
      if (!informIntervalInMinutes) {
        informIntervalInMinutes = MIN_TIMEOUT_PERIOD;
      }

      // Reset firmware upgrade time limit
      $(TIME_LIMIT_FOR_UPDATE_INPUT).val(
        (informIntervalInMinutes * 5 + MIN_TIMEOUT_PERIOD).toString(),
      );

      // If the user selected a TR-069 firmware, show the input to set the
      // time limit for update.
      if ($(TR069_FIRMWARE_SELECTION_BUTTON).hasClass('active')) {
        $(TIME_LIMIT_FOR_UPDATE_DIV).show();
      } else {
        $(TIME_LIMIT_FOR_UPDATE_DIV).hide();
      }


      // If the devices will return to flashman, just continue to the same
      // procedure
      if (!cpesWontReturn) {
        stepper.next();

      // Otherwise, show a popup asking for confirmation
      } else {
        swal.fire({
          title: t('caution'),
          html: t('noReturnToFlashmanUpgrade'),
          showConfirmButton: true,
          showCancelButton: true,
          confirmButtonText: t('yesSure'),
          cancelButtonText: t('noBack'),
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#4db6ac',
        }).then((result) => {
          // If the user accepted, continue to the next step
          if (result.value) {
            stepper.next();
          }
        });
      }
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
      // Hide error message
      $('#which-error-msg').hide();

      let useCsv = $('.nav-link.active').attr('id') === 'whichFile';
      let pageNum = parseInt($('#curr-page-link').html());
      let pageCount = parseInt($('#input-elements-pp option:selected').text());
      // Always use the last list of filters
      let filterList = document
        .getElementById('devices-search-input').value;
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
          if (res.success === false) {
            $('#which-error-text')
              .html('&nbsp; '+t('serverErrorPleaseTryAgain'));
            $('#which-error-msg').show();

            return;
          }

          // Save the last firmware list
          firmwareList = res;

          // Build the options dropdown
          setFirmwareReleasesDropdown();

          // Build missing firmware data
          displayAndCheckUpdate(
            $(TR069_FIRMWARE_SELECTION_BUTTON).hasClass('active'),
          );
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
      // Always use the last list of filters
      let filterList = document
        .getElementById('devices-search-input').value;
      let release = $('#selected-release').html();
      let cpesWontReturn = $(CPE_WONT_RETURN_CHECKBOX).is(':checked');
      let value = $('#devices-search-input').val();
      let tags = (value) ? value.split(',').map((v)=>'"' + v + '"').join(', ')
                         : t('noFilterUsed');
      let hasTimeRestriction = $('input[name=updateNow]:checked').length === 0;


      let firmware = firmwareList.releaseInfo.find(
        (firmware) => firmware.id === release,
      );
      let isRG1200 = firmware.validModels.includes('ACTIONRG1200V1');


      // Set the timeout period for upgrading TR-069 firmware
      let upgradeTimeoutEnable = false;
      let upgradeTimeoutPeriod = parseInt(
        $(TIME_LIMIT_FOR_UPDATE_INPUT).val(),
      );


      // If the inform came invalid, use the minimum timeout
      if (!informIntervalInMinutes) {
        informIntervalInMinutes = MIN_TIMEOUT_PERIOD;
      }


      // Validate the timeout period, only for TR-069
      if (
        firmware.isTR069 &&
        (
          !upgradeTimeoutPeriod || upgradeTimeoutPeriod <
          (informIntervalInMinutes + MIN_TIMEOUT_PERIOD) ||
          upgradeTimeoutPeriod > MAX_TIMEOUT_PERIOD
        )
      ) {
        // Show the error message
        $(WHEN_ERROR_MESSAGE).html(
          '&nbsp; '+ t(
            'updateTimeLimitInputErrorText', {
            min: (informIntervalInMinutes + MIN_TIMEOUT_PERIOD),
            max: MAX_TIMEOUT_PERIOD,
          }),
        );
        $(WHEN_ERROR_MESSAGE_DIV).show();

        // Enable buttons
        $('#when-btn-prev').prop('disabled', false);
        $('#when-btn-next').prop('disabled', false);

        // Do not continue
        return;

      // If period is valid and is TR-069 or RG 1200
      } else if (firmware.isTR069 || isRG1200) {
        $(WHEN_ERROR_MESSAGE_DIV).hide();
        upgradeTimeoutEnable = true;

        // If RG 1200 use the default timeout
        if (isRG1200) {
          upgradeTimeoutPeriod = 5 * informIntervalInMinutes +
            MIN_TIMEOUT_PERIOD;
        }
      }


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
      $(WHEN_ERROR_MESSAGE_DIV).hide();
      $('#when-btn-icon')
        .removeClass('fa-check')
        .addClass('fa-spinner fa-pulse');
      swal.fire({
        title: t('startingSchedule...'),
        didOpen: () => {
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
          cpes_wont_return: JSON.stringify(cpesWontReturn),
          page_num: pageNum,
          page_count: pageCount,
          filter_list: filterList,
          timeout_enable: JSON.stringify(upgradeTimeoutEnable),
          timeout_period: upgradeTimeoutPeriod,
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
          $(WHEN_ERROR_MESSAGE).html('&nbsp; '+t('serverErrorPleaseTryAgain'));
          $(WHEN_ERROR_MESSAGE_DIV).show();
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
          didOpen: () => {
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
      didOpen: () => {
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
      didOpen: () => {
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
