import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';
import {setFirmwareStorage,
        getFirmwareStorage,
        deleteFirmwareStorage} from './session_storage.js';
import 'datatables.net-bs4';

const t = i18next.t;


// This regex is copied from controllers/handlers/util/
// tr069FirmwareVersionRegex.
const VERSION_NAME_REGEX = /^[^&/\\"'`<>]{1,128}$/;


/*
 *  Description:
 *    This functions shows and hides the version name input when adding
 *    a TR-069 firmware.
 *
 *  Input:
 *    display - A boolean to change the visibility of the input firmware name
 *
 *  Output:
 */
const changeVersionNameInputDisplay = function(display) {
  if (display === true) {
    // Set the version name input as required
    $('#input-version-name').prop('required', true);

    // Clear the input
    $('#input-version-name').val('');

    // Show the version name input
    $('#input-version-name-col').show();
  } else {
    // Set the version name input as not required
    $('#input-version-name').prop('required', false);

    // Hide the version name input
    $('#input-version-name-col').hide();
  }
};


const fetchLocalFirmwares = function(firmwaresTable) {
  firmwaresTable.clear().draw();
  $.get('/firmware/fetch', function(res) {
    if (res.success) {
      res.firmwares.forEach(function(firmware) {
        let isRestricted = firmware.is_restricted;
        let displayRestricted = '';
        if (isRestricted) {
          displayRestricted = t('Yes');
        } else {
          displayRestricted = t('No');
        }
        let firmwareRow = $('<tr></tr>').append(
          $('<td></td>').append(
            $('<input></input>').addClass('checkbox')
                                .attr('id', firmware._id)
                                .attr('type', 'checkbox')
                                .attr('data-action', 'del')),
          $('<td></td>').html(firmware.vendor),
          $('<td></td>').html(firmware.model),
          $('<td></td>').html(firmware.version),
          $('<td></td>').html(firmware.release),
          $('<td></td>').html(firmware.wan_proto),
          $('<td></td>').html(firmware.flashbox_version),
          $('<td></td>').html(displayRestricted),
        );
        firmwaresTable.row.add(firmwareRow).draw();
      });
    } else {
      displayAlertMsg(res);
    }
  }, 'json');
};

const fetchModels = function(tr069Infos) {
  deleteFirmwareStorage();
  setFirmwareStorage('infos', tr069Infos);
  $('#select-productvendor option').remove();
  $('#select-productvendor').append(
    $('<option>')
      .attr('value', '')
      .text(''),
  );
  Object.keys(tr069Infos.vendors).forEach((v) => {
    $('#select-productvendor').append(
      $('<option>')
        .attr('value', v)
        .text(v),
    );
  });
};

window.updateModels = function(input) {
  let tr069Infos = getFirmwareStorage('infos');

  // Remove the version name input
  changeVersionNameInputDisplay(false);

  $('#select-productclass option').remove();
  $('#select-productclass').append(
    $('<option>')
      .attr('value', '')
      .text(''),
  );
  $('#select-version option').remove();
  $('#select-version').append(
    $('<option>')
      .attr('value', '')
      .text(''),
  );
  let chosenVendor = input.value;
  if (tr069Infos.vendors[chosenVendor]) {
    tr069Infos.vendors[chosenVendor].forEach((model) => {
      $('#select-productclass').append(
        $('<option>')
          .attr('value', model)
          .text(model),
      );
    });
  }
};

window.updateVersions = function(input) {
  let tr069Infos = getFirmwareStorage('infos');

  // Remove the version name input
  changeVersionNameInputDisplay(false);

  $('#select-version option').remove();
  $('#select-version').append(
    $('<option>')
      .attr('value', '')
      .text(''),
  );
  let chosenVendor = $('#select-productvendor option:selected').text();
  let chosenModel = input.value;
  let fullID = chosenVendor + ' ' + chosenModel;
  console.log(fullID);
  console.log(tr069Infos);
  if (tr069Infos.versions[fullID]) {
    tr069Infos.versions[fullID].forEach((v) => {
      $('#select-version').append(
        $('<option>')
          .attr('value', v)
          .text(v),
      );
    });

    // Append the other option in order to allow a different upgrade
    $('#select-version').append(
      $('<option id="otherVersionFirmware">')
        .attr('value', 'other')
        .text(t('Other')),
    );
  }
};


/*
 *  Description:
 *    This function changes the value of the other option whenever the version
 *    name input is changed.
 *
 *  Input:
 *    inputElement - The html element that called this function
 *
 *  Output:
 *
 */
window.setVersionNameInput = function(inputElement) {
  let chosenFirmware = inputElement.value;

  // The case where the user selected the other option to update to a different
  // firmware version
  if (chosenFirmware === $('#otherVersionFirmware').attr('value')) {
    changeVersionNameInputDisplay(true);
  } else {
    changeVersionNameInputDisplay(false);
  }
};


/*
 *  Description:
 *    This function changes the value of the other option whenever the version
 *    name input is changed.
 *
 *  Input:
 *
 *  Output:
 *
 */
window.updateVersionName = function() {
  let versionName = $('#input-version-name').val();
  $('#otherVersionFirmware').attr('value', versionName);

  // If the length is 0
  if (!versionName.length) {
    // Change the error
    $('#input-version-name-invalid-feedback').text(
      t('typeVersionName'),
    );

    // Show the error
    $('#input-version-name-invalid-feedback').show();

  // If there is an invalid character
  } else if (!VERSION_NAME_REGEX.test(versionName)) {
    // Change the error
    $('#input-version-name-invalid-feedback').text(
      t('invalidVersionName'),
    );

    // Show the error
    $('#input-version-name-invalid-feedback').show();

  // Normal input, hide the error
  } else {
    $('#input-version-name-invalid-feedback').hide();
  }
};


window.changeCpeForm = function(input) {
  if (input.value === 'tr069') {
    // display tr069 form
    $('#tr069-form').removeClass('d-none');
    $('#tr069-form').addClass('d-block');
    // hide flashbox form
    $('#flashbox-form').removeClass('d-block');
    $('#flashbox-form').addClass('d-none');
  } else {
    // display flashbox form
    $('#flashbox-form').removeClass('d-none');
    $('#flashbox-form').addClass('d-block');
    // hide tr069 form
    $('#tr069-form').removeClass('d-block');
    $('#tr069-form').addClass('d-none');
  }
};

anlixDocumentReady.add(function() {
  let selectedItensDel = [];
  let selectedItensAdd = [];
  let selectedItensRestrict = [];
  fetchModels($('#select-productvendor').data('json'));

  let firmwaresTable = $('#firmware-table').DataTable({
    'paging': true,
    'info': false,
    'lengthChange': false,
    'pagingType': 'numbers',
    'language': {
      'zeroRecords': t('noRegisterFound'),
      'infoEmpty': t('noFirmwaresAvailable'),
      'search': '',
      'searchPlaceholder': t('Search...'),
    },
    'order': [[1, 'asc'], [2, 'asc'], [3, 'asc'], [4, 'asc']],
    'columnDefs': [
      {className: 'text-center', targets: ['_all']},
      {orderable: false, targets: [0]},
    ],
    'dom': '<"row" <"col-12 col-md-6 dt-firm-table-btns">      ' +
           '       <"col-12 col-md-6 ml-0 pl-0 mt-3 mt-md-0"f>>' +
           '<"row" t>                                          ' +
           '<"row" <"col-6"l>                                  ' +
           '       <"col-6"p>                                 >',
  });
  // Initialize custom options on dataTable
  $('.dt-firm-table-btns').append(
    $('<div></div>').addClass('btn-group').attr('role', 'group').append(
      $('<button></button>').addClass('btn btn-danger btn-trash').append(
        $('<div></div>').addClass('fas fa-trash fa-lg'))
    )
  );
  $(document).on('click', '.btn-trash', function(event) {
    $.ajax({
      type: 'POST',
      url: '/firmware/del',
      traditional: true,
      data: {ids: selectedItensDel},
      success: function(res) {
        displayAlertMsg(res);
        if (res.type == 'success') {
          fetchLocalFirmwares(firmwaresTable);
        }
      },
    });
  });
  // Load local firmwares table
  fetchLocalFirmwares(firmwaresTable);

  // Firmware file upload
  $(document).on('change', ':file', function() {
    let input = $(this);
    let numFiles = input.get(0).files ? input.get(0).files.length : 1;
    let label = input.val().replace(/\\/g, '/').replace(/.*\//, '');

    input.trigger('fileselect', [numFiles, label]);
  });
  $(':file').on('fileselect', function(event, numFiles, label) {
    let input = $(this).parents('.input-group').find(':text');

    if (input.length) {
      input.val(label);
    }
  });

  // Use this format when adding button with AJAX
  $(document).on('click', '.btn-firmware-add', function(event) {
    let currBtn = $(this);

    currBtn.prop('disabled', true);
    currBtn.find('.btn-fw-add-icon')
      .removeClass('fa-check')
      .addClass('fa-spinner fa-pulse');

    let fws = [];

    selectedItensAdd.forEach(function(firmware) {
      let firmwareAttrs = {encoded: firmware.encoded,
                            company: firmware.company,
                            firmwarefile: firmware.firmwarefile,
                            wanproto: firmware.wanproto,
                            flashboxversion: firmware.flashboxver,
                            isbeta: firmware.isbeta,
                            isrestricted: selectedItensRestrict.includes(firmware.firmwarefile)};
      fws.push(firmwareAttrs);
    });

    $.ajax({
      type: 'POST',
      url: '/firmware/add',
      traditional: true,
      data: {firmwares: JSON.stringify(fws)},
      success: function(res) {
        currBtn.prop('disabled', false);
        currBtn.find('.btn-fw-add-icon')
          .removeClass('fa-spinner fa-pulse')
          .addClass('fa-check');
        displayAlertMsg(res);
        fetchLocalFirmwares(firmwaresTable);
      },
    });
  });

  $(document).on('change', '.checkbox', function(event) {

    let list = Array.from($('.checkbox'));

    if (this.hasAttribute('id')) { // é um dos checkboxes de marcar todos ou de deletar
      let itemId = $(this).prop('id');
      if (itemId == 'checkall_del') {
        for (let idx = 0; idx < list.length; idx++) {
          if ($(list[idx]).data('action') == 'del' && $(list[idx]).not(this)) {
            $(list[idx]).prop('checked', this.checked).change();
          }
        }
      } else if (itemId == 'checkall_add') {
        for (let idx = 0; idx < list.length; idx++) {
          if ($(list[idx]).data('action') == 'add' && $(list[idx]).not(this)) {
            $(list[idx]).prop('checked', this.checked).change();
          }
        }
      } else {
        let itemIdx = selectedItensDel.indexOf(itemId);
        if ($(this).is(':checked')) {
          if (itemIdx == -1) {
            selectedItensDel.push(itemId);
          }
        } else {
          if (itemIdx != -1) {
            selectedItensDel.splice(itemIdx, 1);
          }
        }
      }
    } else {
      let itemAction = $(this).data('action');
      if (itemAction == 'add') {
        let firmwareAttrs = {encoded: $('#avail-firmware-table')
                              .data('encoded'),
                              company: $(this).data('company'),
                              firmwarefile: $(this).data('firmwarefile'),
                              wanproto: $(this).data('wanproto'),
                              flashboxver: $(this).data('flashboxversion'),
                              isbeta: $(this).data('release').includes('B')};
        let i = 0;
        let itemIdx = -1;
        selectedItensAdd.every(function(obj, index) {
          if (obj.firmwarefile === firmwareAttrs.firmwarefile) {
            itemIdx = i;
            return false;
          } else {
            i ++;
            return true;
          }
        });
        if ($(this).is(':checked')) {
          if (itemIdx == -1) {
            selectedItensAdd.push(firmwareAttrs);
          }
        } else {
          if (itemIdx != -1) {
            selectedItensAdd.splice(itemIdx, 1);
          }
        }
      } else if (itemAction == 'restrict') {
        let firmwareFile = $(this).data('firmwarefile');
        let itemIdx = selectedItensRestrict.indexOf(firmwareFile);
        if ($(this).is(':checked')) {
          if (itemIdx == -1) {
            selectedItensRestrict.push(firmwareFile);
          }
        } else {
          if (itemIdx != -1) {
            selectedItensRestrict.splice(firmwareFile, 1);
          }
        }
      }
    }
  });

  let uploadFirmware = function(obj) {
    $('.btn-submit-upload').prop('disabled', true);
    $('.btn-submit-icon')
      .removeClass('fa-upload')
      .addClass('fa-spinner fa-pulse');
    $.ajax({
      type: 'POST',
      enctype: 'multipart/form-data',
      url: $(obj).attr('action'),
      data: new FormData($(obj)[0]),
      processData: false,
      contentType: false,
      cache: false,
      timeout: 600000,
      complete: function(res) {
        $('.btn-submit-upload').prop('disabled', false);
        $('.btn-submit-icon')
          .addClass('fa-upload')
          .removeClass('fa-spinner fa-pulse');
        displayAlertMsg(res.responseJSON);
        if (res.responseJSON.type === 'success') {
          fetchLocalFirmwares(firmwaresTable);
        }
      }
    });
  };

  $('form[name=firmwareflashboxform]').submit(function() {
    if ($('input[name=firmwareflashboxfile]').val().trim()) {
      uploadFirmware(this);
    } else {
      displayAlertMsg({
        type: 'danger',
        message: t('noFileSelected'),
      });
    }

    return false;
  });

  $('form[name=firmwaretr069form]').submit(function(event) {
    if ($(this)[0].checkValidity()) {
      uploadFirmware(this);
    } else {
      event.preventDefault();
      event.stopPropagation();
    }

    $(this).addClass('was-validated');
    return false;
  });

  $('form[name=firmwaresync]').submit(function() {
    $('#btn-firmware-sync').prop('disabled', true);
    $('#btn-firmware-sync-icon')
      .removeClass('fa-sync-alt')
      .addClass('fa-spinner fa-pulse');
    $('#avail-firmware-list').empty();
    $('#avail-firmware-tableres').hide();
    $('#avail-firmware-placeholder').show();
    $.post($(this).attr('action'), $(this).serialize(), function(res) {
      $('#btn-firmware-sync').prop('disabled', false);
      $('#btn-firmware-sync-icon')
        .addClass('fa-sync-alt')
        .removeClass('fa-spinner fa-pulse');
      if (res.type == 'success') {
        $('#avail-firmware-placeholder').hide();
        $('#avail-firmware-tableres').show();
        res.firmwarelist.forEach(function(firmwareInfoObj) {
          $('#avail-firmware-list').append(
            $('<tr></tr>').append(
              $('<td></td>').append(
                $('<input></input>').addClass('checkbox')
                                .attr('type', 'checkbox')
                                .attr('data-firmwarefile', firmwareInfoObj.uri)
                                .attr('data-wanproto', firmwareInfoObj.wan_proto)
                                .attr('data-flashboxversion', firmwareInfoObj.flashbox_version)
                                .attr('data-company', firmwareInfoObj.company)
                                .attr('data-release', firmwareInfoObj.release)
                                .attr('data-action', 'add')),
              $('<td></td>').addClass('text-center').html(firmwareInfoObj.vendor),
              $('<td></td>').addClass('text-center').html(firmwareInfoObj.model),
              $('<td></td>').addClass('text-center').html(firmwareInfoObj.version),
              $('<td></td>').addClass('text-center').html(firmwareInfoObj.release),
              $('<td></td>').addClass('text-center').html(firmwareInfoObj.wan_proto),
              $('<td></td>').addClass('text-center').html(firmwareInfoObj.flashbox_version),
              $('<td></td>').addClass('text-center').append(
                $('<input></input>').addClass('checkbox')
                                .attr('type', 'checkbox')
                                .attr('text', 'Restringir firmware')
                                .attr('data-action', 'restrict')
                                .attr('data-firmwarefile', firmwareInfoObj.uri)),
            ),
          );
        });
        $('#avail-firmware-table').attr('data-encoded', res.encoded);

        // eslint-disable-next-line new-cap
        $('#avail-firmware-table').DataTable({
          'destroy': true,
          'paging': true,
          'info': false,
          'pagingType': 'numbers',
          'language': {
            'zeroRecords': t('noRegisterFound'),
            'infoEmpty': t('noFirmwaresAvailable'),
            'search': '',
            'searchPlaceholder': t('Search...'),
            'lengthMenu': t('Show')+' _MENU_',
          },
          'order': [[1, 'asc'], [2, 'asc'], [3, 'asc'], [4, 'asc']],
          'columnDefs': [
            {className: 'text-center', targets: ['_all']},
            {orderable: false, targets: [0, -1]},
          ],
          'dom': '<"row" <"col-12 col-md-6 dt-up-firm-table-btns">   ' +
                 '       <"col-12 col-md-6 ml-0 pl-0 mt-3 mt-md-0"f>>' +
                 '<"row" t>                                          ' +
                 '<"row" <"col-6"l>                                  ' +
                 '       <"col-6"p>                                 >',
        });
        $('.dt-up-firm-table-btns').append(
          $('<div></div>').addClass('btn-group').attr('role', 'group').append(
            $('<div></div>').addClass('fas fa-plus fa-lg btn-fw-add-icon'),
                  $('<span></span>').html('&nbsp '+t('Add'))).addClass(
                  'btn btn-md ml-0 my-md-0 btn-primary btn-firmware-add'),
        );
      } else {
        displayAlertMsg({
          type: res.type,
          message: res.message,
        });
      }
    }, 'json');

    return false;
  });
});

$(window).on('unload', function() {
  // clean firmware session storage
  deleteFirmwareStorage();
});
