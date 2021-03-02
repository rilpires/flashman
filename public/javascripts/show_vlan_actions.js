
$(document).ready(function() {
  $(document).on('click', '.btn-vlan-modal', async function(event) {
    let row = $(event.target).parents('tr');
    let vlan_access = row.data('validateVlanAccess');
    if(vlan_access > 0) {
      // fetch data
      let bridgeenabled = row.data('bridgeEnabled') === "Sim" ? true : false ;
      let id = row.data('deviceid');
      let serialid = row.data('serialid');
      let isTR069 = row.data('is-tr069') === true; // cast to bool
      let qtdPorts = row.data('qtdPorts');

      var dataControl = {};
      dataControl.vlan_profiles = await fetchVlanProfiles(); 
      dataControl.vlan = await fetchVlanDeviceInfo(id);

      // build modal 
      $('#vlan-hlabel').text(id);
      if (isTR069) {
        $('#vlan-visual').text(serialid);
      } else {
        $('#vlan-visual').text(id);
      }

      let vlanCanvas = $("#vlan-ports-canvas").html('');
      let vlanBlock = $("<div></div>").addClass('d-flex').addClass('flex-row').addClass('flex-wrap');
      for(let i = 0 ; i < qtdPorts ; i++) {
        let vlanPortInput = $("<div></div>").addClass('d-flex').addClass('flex-column').addClass('mr-3').addClass('mb-3');

        vlanPortInput.append(
            $("<label></label>").addClass('mb-0').text("Porta "+(i+1)+" :")
          );

        let profilesOptions = $("<select></select>").addClass('browser-default').addClass('md-select').addClass('select-port-vlan').attr('name', (i+1));

        for(let j = 0 ; j < dataControl.vlan_profiles.length ; j++) {
          let option = $("<option></option>").attr('value', dataControl.vlan_profiles[j].vlan_id).text(dataControl.vlan_profiles[j].profile_name);
          /*
          when dataControl.vlan_profiles[j].vlan_id == dataControl.vlan[(i+1)].vlan_id 
          if() {
            option.attr('selected', 'selected');
          }
          */
          profilesOptions.append(option);
        }

        let profilesSelect = $("<div></div>").addClass('md-selectfield').append(profilesOptions);

        vlanPortInput.append(profilesSelect);

        vlanBlock.append(vlanPortInput);
      }
      vlanCanvas.append(vlanBlock);

      $('#vlan-modal').modal('show');
    }
  });

  $(document).on('click', '#btn-vlan-update', function(event) {
     let vlans_retrieved = getVlansFromModal();
     $.ajax({
      type: 'POST',
      url: '/vlan/update/'+$('#vlan-hlabel')[0].textContent,
      traditional: true,
      data: { vlans: JSON.stringify(vlans_retrieved) },
      success: function(res) {
        displayAlertMsg(res);
      },
    });
  });
});

const getVlansFromModal = function() {
  var ret = [];
  let portsVlan = $(".select-port-vlan");
  
  for(let i = 0 ; i < portsVlan.length ; i++) {
    if(parseInt(portsVlan[i].value) != 1) {
      ret.push({port: parseInt(portsVlan[i].name), vlan_id: parseInt(portsVlan[i].value)});
    }
  }
  
  return ret;
}

const fetchVlanDeviceInfo = async function(id) {
  var res, ret;
  res = await $.get('/vlan/fetch/'+id, 'json');
  if (res.type == 'success') {
    ret = res.vlan;
  }
  else {
    displayAlertMsg(res);
    ret = null;
  }
  return ret;
};

const fetchVlanProfiles = async function() {
  var res, ret;
  res = await $.get('/vlan/profile/fetch', 'json');
  if (res.type == 'success') {
    ret = res.vlanProfiles;
  }
  else {
    displayAlertMsg(res);
    ret = null;
  }
  return ret;
};