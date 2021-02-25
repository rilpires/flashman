
let checkVlanId = function(input) {
  if (input.value != 1 && (input.value < 10 || input.value > 4094)) {
    input.setCustomValidity('O VLAN ID não pode ser menor que 10 ou maior que 4094.');
  } else {
    let distinctValidity = false;
    vlanIdsOnTable = $('.td-vlan-id');
    for(i in vlanIdsOnTable) {
      if(vlanIdsOnTable[i].innerText === input.value) {
        distinctValidity = true;
      }
    }
    if(distinctValidity) {
      input.setCustomValidity('O VLAN ID deve ser distinto dos já existentes.');
    }
    else {
      input.setCustomValidity('');
    }
  }
};

let checkVlanName = function(input) {
  if (/[^A-Za-z\-0-9_]+/.test(input.value)) {
    input.setCustomValidity('O nome deve ter caracteres alfanumericos, hífen ou sublinhado.');
  } else {
    let distinctValidity = false;
    vlanIdsOnTable = $('.td-profile-name');
    for(i in vlanIdsOnTable) {
      if(vlanIdsOnTable[i].innerText === input.value) {
        distinctValidity = true;
      }
    }
    if(distinctValidity) {
      input.setCustomValidity('O Nome do Perfil da VLAN deve ser distinto dos já existentes.');
    }
    else {
      input.setCustomValidity('');
    }
  }
};

const fetchVlanProfiles = function(vlanProfilesTable) {
  vlanProfilesTable.clear().draw();
  $.get('/vlan/profile/fetch', function(res) {
    if (res.type == 'success') {
      $('#loading-vlan-profile').hide();
      $('#vlan-profile-table-wrapper').show();

      res.vlanProfiles.forEach(function(vlanProfileObj) {
        let vlanProfileRow = $('<tr></tr>').append(
          (vlanProfileObj.is_superuser || vlanProfileObj.vlan_id == 1 ?
            $('<td></td>') :
            $('<td></td>').addClass('col-xs-1').append(
              $('<input></input>').addClass('checkbox')
              .attr('type', 'checkbox')
              .attr('id', vlanProfileObj._id)
            )
          ),
          $('<td></td>').addClass('td-vlan-id').html(vlanProfileObj.vlan_id),
          $('<td></td>').addClass('td-profile-name').html(vlanProfileObj.profile_name),
          $('<td></td>').append(
            $('<button></button>').append(
              $('<div></div>').addClass('fas fa-edit btn-vp-edit-icon'),
              $('<span></span>').html('&nbsp Editar')
            ).addClass('btn btn-sm btn-primary my-0 btn-vp-edit')
            .attr('data-vlan-profile-id', vlanProfileObj.vlan_id)
            .attr('type', 'button')
          )
        );
        vlanProfilesTable.row.add(vlanProfileRow).draw();
      });
    } else {
      displayAlertMsg(res);
    }
  }, 'json');
};

$(document).ready(function() {
  let selectedItens = [];

  let vlanProfilesTable = $('#vlan-profile-table').DataTable({
    'destroy': true,
    'paging': true,
    'info': false,
    'pagingType': 'numbers',
    'language': {
      'zeroRecords': 'Nenhum perfil de VLAN encontrado',
      'infoEmpty': 'Nenhum perfil de VLAN encontrado',
      'search': '',
      'searchPlaceholder': 'Buscar...',
      'lengthMenu': 'Exibir _MENU_',
    },
    'order': [[1, 'asc'], [2, 'asc']],
    'columnDefs': [
      {className: 'text-center', targets: ['_all']},
      {orderable: false, targets: [0]},
    ],
    'dom': '<"row" <"col-sm-12 col-md-6 dt-vlan-profiles-table-btns">  ' +
           '       <"col-12 col-md-6 ml-0 pl-0 mt-3 mt-md-0"f>>' +
           '<"row" t>                                          ' +
           '<"row" <"col-6"l>                                  ' +
           '       <"col-6"p>                                 >',
  });
  // Initialize custom options on dataTable
  $('.dt-vlan-profiles-table-btns').append(
    $('<div></div>').addClass('btn-group').attr('role', 'group').append(
      $('<button></button>').addClass('btn btn-danger btn-trash').append(
        $('<div></div>').addClass('fas fa-trash fa-lg'))
    )
  );
  // Load table content
  fetchVlanProfiles(vlanProfilesTable);

  $(document).on('click', '#card-header', function() {
    let plus = $(this).find('.fa-plus');
    let cross = $(this).find('.fa-times');
    plus.removeClass('fa-plus').addClass('fa-times');
    cross.removeClass('fa-times').addClass('fa-plus');
  });

  $(document).on('click', '.btn-trash', function(event) {
    $.ajax({
      type: 'DELETE',
      url: '/vlan/profile/del',
      traditional: true,
      data: {ids: selectedItens},
      success: function(res) {
        displayAlertMsg(res);
        if (res.type == 'success') {
          fetchVlanProfiles(vlanProfilesTable);
        }
      },
    });
  });

  // Use this format when adding button with AJAX
  $(document).on('click', '.btn-vp-edit', function(event) {
    let vlanprofileid = $(this).data('vlan-profile-id');
    window.location.href = '/vlan/profile/' + vlanprofileid;
  });

  $(document).on('change', '.checkbox', function(event) {
    let itemId = $(this).prop('id');
    if (itemId == 'checkall') {
      $('.checkbox').not(this).prop('checked', this.checked).change();
    } else {
      let itemIdx = selectedItens.indexOf(itemId);
      if ($(this).is(':checked')) {
        if (itemIdx == -1) {
          selectedItens.push(itemId);
        }
      } else {
        if (itemIdx != -1) {
          selectedItens.splice(itemIdx, 1);
        }
      }
    }
  });

  // Handle new vlanProfiles
  $('#new-vlan-profile-form').submit(function(event) {
    if ($(this)[0].checkValidity()) {
      $.post($(this).attr('action'), $(this).serialize(), function(res) {
        displayAlertMsg(res);
        if (res.type == 'success') {
          fetchVlanProfiles(vlanProfilesTable);
        }
      }, 'json');
    } else {
      event.preventDefault();
      event.stopPropagation();
    }
    $(this).addClass('was-validated');
    return false;
  });
});
