
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

      var dataControl = {};
      dataControl.qtdPorts = row.data('qtdPorts');
      dataControl.vlan_profiles = await fetchVlanProfiles(); 
      dataControl.vlan = await fetchVlanDeviceInfo(id);
      
      // build modal 
      $('#vlan-hlabel').text(id);
      if (isTR069) {
        $('#vlan-visual').text(serialid);
      } else {
        $('#vlan-visual').text(id);
      }

      buildVlanModal(dataControl, (vlan_access == 2) ? true : false);
    }
  });

  $(document).on('click', '#btn-vlan-update', async function(event) {
    let i;
    let vlans_on_modal = getVlansFromModal();
    let vlans_on_db = getOldVlansFromModal();
    let vlans_changed = false;

    if(vlans_on_db.length == vlans_on_modal.length) {
      for(i = 0 ; i < vlans_on_db.length ; i++) {
        if(vlans_on_modal[i].port == vlans_on_db[i].port) {
          if(vlans_on_modal[i].vlan_id != vlans_on_db[i].vlan_id) {
            vlans_changed = true;
            break;
          }
        }
        else {
          vlans_changed = true;
          break;
        }
      }
    }
    else {
      vlans_changed = true;
    }
    if(vlans_changed) {
      $.ajax({
        type: 'POST',
        url: '/vlan/update/'+$('#vlan-hlabel')[0].textContent,
        traditional: true,
        data: { vlans: JSON.stringify(vlans_on_modal) },
        success: function(res) {
          displayAlertMsg(res);
          $('#vlan-modal').modal('hide');
        }
      });
    }
  });
});

const getVlansFromModal = function() {
  var ret = [];
  let portsVlan = $(".select-port-vlan");
  
  for(let i = 0 ; i < portsVlan.length ; i++) {
    ret.push({port: parseInt(portsVlan[i].name), vlan_id: parseInt(portsVlan[i].value)});
  }
  
  return ret;
}


const getOldVlansFromModal = function() {
  var ret = [];
  let portsVlan = $(".select-port-vlan");
  let current_vlan_id;

  for(let i = 0 ; i < portsVlan.length ; i++) {
    current_vlan_id = $(portsVlan[i]).data('vlan-id');
    if(current_vlan_id) {
      ret.push({port: parseInt(portsVlan[i].name), vlan_id: current_vlan_id});
    }
  }
  
  return ret;
};

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

const buildVlanModal = function(dc, can_edit) {
  let vlanCanvas = $("#vlan-ports-canvas").html('');
  let vlanBlock = $("<div></div>").addClass('d-flex').addClass('flex-row').addClass('flex-wrap');

  if(dc.vlan_profiles.length == 0) {
    $('#frame-vlan-modal-alert').addClass('d-block').addClass('p-3').addClass('bg-danger').addClass('text-white').append($('<h5></h5>').html('É necessário pelo menos um Perfil de VLAN cadastrado!'));
  }
  else {
    for(let i = 0 ; i < dc.qtdPorts ; i++) {
      let vlanPortInput = $("<div></div>").addClass('d-flex').addClass('flex-column').addClass('mr-3').addClass('mb-3');

      vlanPortInput.append(
          $("<label></label>").addClass('mb-0').text("Porta "+(i+1)+" :")
        );

      let profilesOptions;
      if(can_edit) {
        profilesOptions = $("<select></select>").addClass('browser-default').addClass('md-select').addClass('select-port-vlan').attr('name', (i+1));
      }
      else {
        profilesOptions = $("<select></select>").addClass('browser-default').addClass('md-select').addClass('select-port-vlan').attr('name', (i+1)).attr('disabled', 'disabled');
        $('#btn-vlan-update').attr('disabled', 'disabled');
      }

      for(let j = 0 ; j < dc.vlan_profiles.length ; j++) {
        let option = $("<option></option>").attr('value', dc.vlan_profiles[j].vlan_id).text(dc.vlan_profiles[j].profile_name);
        if(dc.vlan !== undefined) {
          for(let k = 0 ; k < dc.vlan.length ; k++) {
            if(dc.vlan[0] !== null) {
              if(dc.vlan_profiles[j].vlan_id == dc.vlan[k].vlan_id && (i+1) == dc.vlan[k].port) {
                option.attr('selected', 'selected');
                profilesOptions.attr('data-vlan-id', dc.vlan_profiles[j].vlan_id);
              }
            }
          }
        }
        profilesOptions.append(option);
      }

      let profilesSelect = $("<div></div>").addClass('md-selectfield').append(profilesOptions);

      vlanPortInput.append(profilesSelect);

      vlanBlock.append(vlanPortInput);
    }
    vlanCanvas.append(vlanBlock);
  }

  $('#vlan-modal').modal('show');
};