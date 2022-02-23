import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';
import 'datatables.net-bs4';

window.check = function(input) {
  if (input.value != document.getElementById('new_pass').value) {
    input.setCustomValidity('As senhas estão diferentes');
  } else {
    input.setCustomValidity('');
  }
};

const fetchUsers = function(usersTable) {
  usersTable.clear().draw();
  $.get('/user/get/all', function(res) {
    if (res.type == 'success') {
      $('#loading-users').hide();
      $('#users-table-wrapper').show();

      res.users.forEach(function(userObj) {
        let userRow = $('<tr></tr>').append(
          (userObj.is_superuser ?
            $('<td></td>') :
            $('<td></td>').append(
              $('<input></input>').addClass('checkbox')
              .attr('type', 'checkbox')
              .attr('id', userObj._id)
            )
          ),
          $('<td></td>').html(userObj.name),
          (userObj.role ?
            $('<td></td>').html(userObj.role) :
            $('<td></td>')
          ),
          $('<td></td>').html(new Date(userObj.createdAt)
                        .toLocaleString('pt-BR')),
          (userObj.lastLogin ?
            $('<td></td>').html(new Date(userObj.lastLogin)
                          .toLocaleString('pt-BR')) :
            $('<td></td>')
          ),
          $('<td></td>').append(
            $('<button></button>').append(
              $('<div></div>').addClass('fas fa-edit btn-usr-edit-icon'),
              $('<span></span>').html('&nbsp Editar')
            ).addClass('btn btn-sm btn-primary my-0 btn-usr-edit')
            .attr('data-userid', userObj._id)
            .attr('type', 'button')
          )
        );
        usersTable.row.add(userRow).draw();
      });
    } else {
      displayAlertMsg(res);
    }
  }, 'json');
};

anlixDocumentReady.add(function() {
  let selectedItens = [];

  let usersTable = $('#users-table').DataTable({
    'destroy': true,
    'paging': true,
    'info': false,
    'pagingType': 'numbers',
    'language': {
      'zeroRecords': 'Nenhum usuário encontrado',
      'infoEmpty': 'Nenhum usuário encontrado',
      'search': '',
      'searchPlaceholder': 'Buscar...',
      'lengthMenu': 'Exibir _MENU_',
    },
    'order': [[1, 'asc'], [2, 'asc']],
    'columnDefs': [
      {className: 'text-center', targets: ['_all']},
      {orderable: false, targets: [0]},
    ],
    'dom': '<"row" <"col-sm-12 col-md-6 dt-users-table-btns">  ' +
           '       <"col-12 col-md-6 ml-0 pl-0 mt-3 mt-md-0"f>>' +
           '<"row" t>                                          ' +
           '<"row" <"col-6"l>                                  ' +
           '       <"col-6"p>                                 >',
  });
  // Initialize custom options on dataTable
  $('.dt-users-table-btns').append(
    $('<div></div>').addClass('btn-group').attr('role', 'group').append(
      $('<button></button>').addClass('btn btn-danger btn-trash').append(
        $('<div></div>').addClass('fas fa-trash fa-lg'))
    )
  );
  // Load table content
  fetchUsers(usersTable);

  $(document).on('click', '#card-header', function() {
    let plus = $(this).find('.fa-plus');
    let cross = $(this).find('.fa-times');
    plus.removeClass('fa-plus').addClass('fa-times');
    cross.removeClass('fa-times').addClass('fa-plus');
  });

  $(document).on('click', '.btn-trash', function(event) {
    $.ajax({
      type: 'POST',
      url: '/user/del',
      traditional: true,
      data: {ids: selectedItens},
      success: function(res) {
        displayAlertMsg(res);
        if (res.type == 'success') {
          fetchUsers(usersTable);
        }
      },
    });
  });

  // Use this format when adding button with AJAX
  $(document).on('click', '.btn-usr-edit', function(event) {
    let userid = $(this).data('userid');
    window.location.href = '/user/profile/' + userid;
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

  // Handle new users
  $('#new-user-form').submit(function(event) {
    if ($(this)[0].checkValidity()) {
      $.post($(this).attr('action'), $(this).serialize(), function(res) {
        displayAlertMsg(res);
        if (res.type == 'success') {
          fetchUsers(usersTable);
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
