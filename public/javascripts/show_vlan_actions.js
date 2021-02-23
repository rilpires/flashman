
$(document).ready(function() {
  $(document).on('click', '.btn-vlan-modal', function(event) {
    let row = $(event.target).parents('tr');
    let vlan_access = row.data('validateVlanAccess');
    if(vlan_access > 0) {
      let bridgeenabled = row.data('bridgeEnabled') === "Sim" ? true : false ;
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

      /* 
      fetchVlanProfiles();
      fetchVlanDeviceInfo(id);
      */

      $('#vlan-modal').modal('show');
    }
  });
});


const fetchVlanDeviceInfo = function(id) {
  /*
    $('#vlan-ports-canvas') ...
  */
};

const fetchVlanProfiles = function() {
  $.ajax({
    type: 'GET',
    url: '/vlan/profiles/fetch',
    dataType: 'json',
    success: function(res) {
      if (res.success) {
        /* put on a var to be used on <select><option> for each vlan port */
        let vlan_profiles = res.vlan_profiles;
      } else {
        displayAlertMsg(res);
      }
    },
    error: function(xhr, status, error) {
      displayAlertMsg(JSON.parse(xhr.responseText));
    },
  });
};