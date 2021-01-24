const fetchLocalFirmwares = function(firmwaresTable) {
  firmwaresTable.clear().draw();
  $.get('/firmware/fetch', function(res) {
    if (res.success) {
      res.firmwares.forEach(function(firmware) {
        let is_restricted = firmware.is_restricted
        let display_restricted = ''
        if (is_restricted){
          display_restricted = 'Sim'
        } else{
          display_restricted = 'Não'
        }
        //console.log(firmware)
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
          $('<td></td>').html(display_restricted)
        );
        firmwaresTable.row.add(firmwareRow).draw();
      });
    } else {
      displayAlertMsg(res);
    }
  }, 'json');
};

$(document).ready(function() {
  let selectedItensDel = [];
  let selectedItensAdd = [];
  let selectedItensRestrict = [];

  let firmwaresTable = $('#firmware-table').DataTable({
    'paging': true,
    'info': false,
    'lengthChange': false,
    'pagingType': 'numbers',
    'language': {
      'zeroRecords': 'Nenhum registro encontrado',
      'infoEmpty': 'Nenhum firmware disponível',
      'search': '',
      'searchPlaceholder': 'Buscar...',
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
    let encoded = $('#avail-firmware-table').data('encoded');
    let currBtn = $(this);

    currBtn.prop('disabled', true);
    currBtn.find('.btn-fw-add-icon')
      .removeClass('fa-check')
      .addClass('fa-spinner fa-pulse');

    let fws = [];

    selectedItensAdd.forEach(function(firmware){
      var firmwareAttrs = {encoded: firmware.encoded,
                            company: firmware.company,
                            firmwareFile: firmware.firmwareFile,
                            wanProto: firmware.wanProto,
                            flashboxVer: firmware.flashboxVer,
                            isBeta: firmware.isBeta,
                            isRestricted: selectedItensRestrict.includes(firmware.firmwareFile)};
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

    if (this.hasAttribute('id')){ //é um dos checkboxes de marcar todos ou de deletar
      let itemId = $(this).prop('id');
      if (itemId == 'checkall_del'){
        console.log(this.checked);
        list.forEach(function(checkbox){
          if ($(checkbox).data('action') == 'del' && $(checkbox).not(this)){
            $(checkbox).prop('checked', this.checked).change();
          }
        });
      }else if (itemId == 'checkall_add'){
        list.forEach(function(checkbox){
          if ($(checkbox).data('action') == 'add' && $(checkbox).not(this)){
            $(checkbox).prop('checked', this.checked).change();
          }
        });
      } else{
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
    } else{
      let itemAction = $(this).data('action');
      if (itemAction == 'add'){
        var firmwareAttrs = {encoded: $('#avail-firmware-table').data('encoded'),
                              company: $(this).data('company'),
                              firmwareFile: $(this).data('firmwarefile'),
                              wanProto: $(this).data('wanproto'),
                              flashboxVer: $(this).data('flashboxversion'),
                              isBeta: $(this).data('release').includes('B')};
        let i = 0;
        let itemIdx = -1;
        selectedItensAdd.forEach(function(obj){
          if (obj.firmwareFile == firmwareAttrs.firmwareFile){
            itemIdx = i;
          }
          i ++;
        });
        //let itemIdx = selectedItensAdd.indexOf(firmwareAttrs);
        if ($(this).is(':checked')) {
          if (itemIdx == -1) {
            selectedItensAdd.push(firmwareAttrs);
          }
        } else {
          if (itemIdx != -1) {
            selectedItensAdd.splice(itemIdx, 1);
          }
        }
      } else if (itemAction == 'restrict'){
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

  $('form[name=firmwareform]').submit(function() {
    if ($('input[name=firmwarefile]').val().trim()) {
      $('#btn-submit-upload').prop('disabled', true);
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
          $('#btn-submit-upload').prop('disabled', false);
          $('#btn-submit-icon')
            .addClass('fa-upload')
            .removeClass('fa-spinner fa-pulse');
          displayAlertMsg(res);
          fetchLocalFirmwares(firmwaresTable);
        },
      });
    } else {
      displayAlertMsg({
        type: 'danger',
        message: 'Nenhum arquivo foi selecionado',
      });
    }

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
                                .attr('data-firmwarefile', firmwareInfoObj.uri))
            )
          );
        });
        $('#avail-firmware-table').attr('data-encoded', res.encoded);

        $('#avail-firmware-table').DataTable({
          'destroy': true,
          'paging': true,
          'info': false,
          'pagingType': 'numbers',
          'language': {
            'zeroRecords': 'Nenhum registro encontrado',
            'infoEmpty': 'Nenhum firmware disponível',
            'search': '',
            'searchPlaceholder': 'Buscar...',
            'lengthMenu': 'Exibir _MENU_',
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
        // Initialize custom options on dataTable
        $('.dt-up-firm-table-btns').append(
          $('<div></div>').addClass('btn-group').attr('role', 'group').append(
            $('<button></button>').addClass('fas fa-check btn-fw-add-icon'),
                  $('<span></span>').html('&nbsp Adicionar')).addClass(
                  'btn btn-sm my-0 btn-primary btn-firmware-add')
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