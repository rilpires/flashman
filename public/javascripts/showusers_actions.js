import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';
import 'datatables.net-bs4';

const t = i18next.t;

window.check = function(input) {
  if (input.value != document.getElementById('new_pass').value) {
    input.setCustomValidity(t('passwordsAreDifferent'));
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
        let userRow = $('<tr>').append(
          (userObj.is_superuser ?
            $('<td>') :
            $('<td>').append(
              $('<input>').addClass('checkbox')
              .attr('type', 'checkbox')
              .attr('id', userObj._id)
            )
          ),
          $('<td>').html(userObj.name),
          (userObj.role ?
            $('<td>').html(userObj.role) :
            $('<td>')
          ),
          $('<td>').html(userObj.createdAt),
          (userObj.lastLogin ?
            $('<td>').html(userObj.lastLogin) :
            $('<td>')
          ),
          $('<td>').append(
            $('<button>').append(
              $('<div>').addClass('fas fa-edit btn-usr-edit-icon'),
              $('<span>').html(`&nbsp ${t('Edit')}`)
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
      'zeroRecords': t('noUserFound'),
      'infoEmpty': t('noUserFound'),
      'search': '',
      'searchPlaceholder': t('Search...'),
      'lengthMenu': `${t('Show')} _MENU_`,
    },
    'order': [[1, 'asc'], [2, 'asc']],
    'columnDefs': [
      {className: 'text-center', targets: ['_all']},
      {orderable: false, targets: [0]},
      {
        targets: [3, 4],
        render: function (data, type, row) {
          // If 'data' exists and
          // If display or filter data is requested, format the date
          if (data && type === 'display' || type === 'filter') {
            let date = new Date(data);
            let value = date.toLocaleString(t('lang'));
            // if filtering, append month name to returned value.
            if (type === 'filter') {
              value += ' '+date.toLocaleString(t('lang'), {month: 'long'});
            }
            return value;
          }
   
          // Otherwise the data type requested (`type`) is type detection or
          // sorting data, for which we want to use the integer, so just return
          // that, unaltered
          return data;
        },
      },
    ],
    'dom': '<"row" <"col-sm-12 col-md-6 dt-users-table-btns">  ' +
           '       <"col-12 col-md-6 ml-0 pl-0 mt-3 mt-md-0"f>>' +
           '<"row" t>                                          ' +
           '<"row" <"col-6"l>                                  ' +
           '       <"col-6"p>                                 >',
  });
  // Initialize custom options on dataTable
  $('.dt-users-table-btns').append(
    $('<div>').addClass('btn-group').attr('role', 'group').append(
      $('<button>').addClass('btn btn-danger btn-trash').append(
        $('<div>').addClass('fas fa-trash fa-lg'))
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
