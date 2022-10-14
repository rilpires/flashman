import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';
import 'datatables.net-bs4';
import 'regenerator-runtime/runtime';

const t = i18next.t;

window.checkVlanId = function(input) {
  // restricted to this range of value by the definition of 802.1q protocol
  // vlan 2 is restricted to wan
  if (input.value != 1 && (input.value < 3 || input.value > 4094)) {
    input.setCustomValidity(t('vlanIdLengthRule')+'.');
  } else {
    let distinctValidity = false;
    let vlanIdsOnTable = $('.td-vlan-id');
    for (let i in vlanIdsOnTable) {
      if (vlanIdsOnTable[i].innerText === input.value) {
        distinctValidity = true;
      }
    }
    if (distinctValidity) {
      input.setCustomValidity(t('vlanIdUniquenessRule')+'.');
    } else {
      input.setCustomValidity('');
    }
  }
};

window.checkVlanName = function(input) {
  if (/^[A-Za-z][A-Za-z\-0-9_]+$/.test(input.value) == false) {
    input.setCustomValidity(t('vlanProfileNameRules')+'.');
  } else {
    let distinctValidity = false;
    let vlanIdsOnTable = $('.td-profile-name');
    for (let i in vlanIdsOnTable) {
      if (vlanIdsOnTable[i].innerText === input.value) {
        distinctValidity = true;
      }
    }
    if (distinctValidity) {
      input.setCustomValidity(t('vlanProfileNameUniquenessRule')+'.');
    } else {
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
        let vlanProfileRow = $('<tr>').append(
          (vlanProfileObj.is_superuser || vlanProfileObj.vlan_id == 1 ?
            $('<td>') :
            $('<td>').addClass('col-xs-1').append(
              $('<input>').addClass('checkbox')
              .attr('type', 'checkbox')
              .attr('id', vlanProfileObj._id),
            )
          ),
          $('<td>').addClass('td-vlan-id').html(vlanProfileObj.vlan_id),
          $('<td>').addClass('td-profile-name').
            html(vlanProfileObj.profile_name),
          $('<td>').append(
            $('<button>').append(
              $('<div>').addClass('fas fa-edit btn-vp-edit-icon'),
              $('<span>').html(`&nbsp ${t('editName')}`),
            ).addClass('btn btn-sm btn-primary my-0 btn-vp-edit')
            .attr('data-vlan-profile-id', vlanProfileObj.vlan_id)
            .attr('type', 'button'),
          ),
        );
        vlanProfilesTable.row.add(vlanProfileRow).draw();
      });
    } else {
      displayAlertMsg(res);
    }
  }, 'json');
};

anlixDocumentReady.add(function() {
  let selectedItens = [];

  let vlanProfilesTable = $('#vlan-profile-table').DataTable({
    'destroy': true,
    'paging': true,
    'info': false,
    'pagingType': 'numbers',
    'language': {
      'zeroRecords': t('noVlanProfileFound'),
      'infoEmpty': t('noVlanProfileFound'),
      'search': '',
      'searchPlaceholder': t('Search...'),
      'lengthMenu': `${t('Show')} _MENU_`,
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
  $.ajax({
    type: 'GET',
    url: '/vlan/fetchvlancompatible',
    dataType: 'json',
    contentType: 'application/json',
    success: function(res) {
      if (res.success) {
        let compatibleModels = res.compatibleModels;
        $.ajax({
          type: 'POST',
          url: '/vlan/fetchmaxvid',
          traditional: true,
          data: {
            models: JSON.stringify(compatibleModels),
          },
          success: function(res) {
            if (res.success) {
              let maxVids = res.maxVids;
              for (let model of compatibleModels) {
                $('#max-vlan-table').append(
                  $('<tr>').append(
                    $('<td>').text(model),
                    $('<td>').text(maxVids[model])
                  ),
                );
              }
            } else {
              displayAlertMsg(res.message);
            }
          },
          error: function(res) {
            displayAlertMsg(res.message);
          },
        });
      }
    },
  });
  // Initialize custom options on dataTable
  $('.dt-vlan-profiles-table-btns').append(
    $('<div>').addClass('btn-group').attr('role', 'group').append(
      $('<button>').addClass('btn btn-danger btn-trash').append(
        $('<div>').addClass('fas fa-trash fa-lg')),
    ),
  );
  // Load table content
  if (window.location.href.indexOf('/vlan/profile') !== -1) {
    fetchVlanProfiles(vlanProfilesTable);
  }

  $(document).on('click', '#card-header', function() {
    let plus = $(this).find('.fa-plus');
    let cross = $(this).find('.fa-times');
    plus.removeClass('fa-plus').addClass('fa-times');
    cross.removeClass('fa-times').addClass('fa-plus');
  });

  $(document).on('click', '.btn-trash', async function(event) {
    swal.fire({
      icon: 'warning',
      title: t('Attention!'),
      text: t('vlanDeleteWarning'),
      confirmButtonText: t('Proceed'),
      confirmButtonColor: '#4db6ac',
      cancelButtonText: t('Cancel'),
      cancelButtonColor: '#f2ab63',
      showCancelButton: true,
    }).then(async function(result) {
      if (!result.value) return;
      let updatesFailed = false;
      for (let i = 0; i < selectedItens.length; i++) {
        let res = await $.get('/vlan/profile/check/'+selectedItens[i], 'json');
        if (!res.success) {
          updatesFailed = true;
          break;
        }
      }
      if (updatesFailed === true) {
        swal.close();
        swal.fire({
          icon: 'error',
          title: t('errorDeletingVlanProfile'),
          text: t('cannotDeleteVlanProfileCpesDidNotUpdateVlanConfiguration'),
          confirmButtonColor: '#4db6ac',
        });
      } else {
        $.ajax({
          type: 'DELETE',
          url: '/vlan/profile/del',
          traditional: true,
          data: {ids: selectedItens},
          success: function(res) {
            swal.close();
            swal.fire({
              icon: 'success',
              title: t('operationSuccessful'),
              confirmButtonColor: '#4db6ac',
            });
            if (res.type == 'success') {
              fetchVlanProfiles(vlanProfilesTable);
            }
          },
        });
      }
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
