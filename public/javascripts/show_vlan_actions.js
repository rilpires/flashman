
  $(document).on('click', '.btn-vlan-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    let serialid = row.data('serialid');
    let isTR069 = row.data('is-tr069') === true; // cast to bool
    chartDownId = '';
    chartUpId = '';
    $('#vlan-hlabel').text(id);
    if (isTR069) {
      $('#vlan-visual').text(serialid);
    } else {
      $('#vlan-visual').text(id);
    }
    
    $('#vlan-modal').modal('show');
  });
