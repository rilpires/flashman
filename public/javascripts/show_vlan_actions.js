
$(document).ready(function() {
  $(document).on('click', '.btn-vlan-modal', async function(event) {
    let row = $(event.target).parents('tr');
    let vlanAccess = row.data('validateVlanAccess');
    if (vlanAccess > 0) {
      // fetch data
      let bridgeenabled = row.data('bridgeEnabled') === 'Sim' ? true : false;
      let id = row.data('deviceid');
      let serialid = row.data('serialid');
      let isTR069 = row.data('is-tr069') === true; // cast to bool
      if (!bridgeenabled) {
        let dataControl = {};
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

        buildVlanModal(dataControl, (vlanAccess == 2) ? true : false);
      }
    }
  });

  $(document).on('click', '#btn-vlan-update', async function(event) {
    let i;
    let vlansOnModal = getVlansFromModal();
    let vlansOnDb = getOldVlansFromModal();
    let vlansChanged = false;

    if (vlansOnDb.length == vlansOnModal.length) {
      for (i = 0; i < vlansOnDb.length; i++) {
        if (vlansOnModal[i].port == vlansOnDb[i].port) {
          if (vlansOnModal[i].vlan_id != vlansOnDb[i].vlan_id) {
            vlansChanged = true;
            break;
          }
        } else {
          vlansChanged = true;
          break;
        }
      }
    } else {
      vlansChanged = true;
    }
    if (vlansChanged) {
      $.ajax({
        type: 'POST',
        url: '/vlan/update/'+$('#vlan-hlabel')[0].textContent,
        traditional: true,
        data: {
          vlans: JSON.stringify(vlansOnModal),
        },
        success: function(res) {
          displayAlertMsg(res);
          $('#vlan-modal').modal('hide');
        },
      });
    }
  });
});

const getVlansFromModal = function() {
  let ret = [];
  let portsVlan = $('.select-port-vlan');

  for (let i = 0; i < portsVlan.length; i++) {
    ret.push({
      port: parseInt(portsVlan[i].name),
      vlan_id: parseInt(portsVlan[i].value)});
  }

  return ret;
};


const getOldVlansFromModal = function() {
  let ret = [];
  let portsVlan = $('.select-port-vlan');
  let currentVlanId;

  for (let i = 0; i < portsVlan.length; i++) {
    currentVlanId = $(portsVlan[i]).data('vlan-id');
    if (currentVlanId) {
      ret.push({port: parseInt(portsVlan[i].name), vlan_id: currentVlanId});
    }
  }

  return ret;
};

const fetchVlanDeviceInfo = async function(id) {
  let res;
  let ret;
  res = await $.get('/vlan/fetch/'+id, 'json');
  if (res.type == 'success') {
    ret = res.vlan;
  } else {
    displayAlertMsg(res);
    ret = null;
  }
  return ret;
};

const fetchVlanProfiles = async function() {
  let res;
  let ret;
  res = await $.get('/vlan/profile/fetch', 'json');
  if (res.type == 'success') {
    ret = res.vlanProfiles;
  } else {
    displayAlertMsg(res);
    ret = null;
  }
  return ret;
};

const buildVlanModal = function(dc, canEdit) {
  let vlanCanvas = $('#vlan-ports-canvas').html('');
  let vlanBlock = $('<div></div>').
      addClass('d-flex').
      addClass('flex-row').
      addClass('justify-content-center').
      addClass('flex-wrap');

  if (dc.vlan_profiles.length == 0) {
    $('#frame-vlan-modal-alert').
      addClass('d-block').
      addClass('p-3').
      addClass('bg-danger').
      addClass('text-white').
      append($('<h5></h5>').
      html('É necessário pelo menos um Perfil de VLAN cadastrado!'));
  } else {
    for (let i = 0; i < dc.qtdPorts; i++) {
      let vlanPortInput = $('<div></div>').
        addClass('d-flex').
        addClass('flex-column').
        addClass('mr-3').
        addClass('mb-3');

      vlanPortInput.append(
          $('<label></label>').
            addClass('mb-0').
            text('Porta '+(i+1)+' :'),
        );

      let profilesOptions;
      if (canEdit) {
        profilesOptions = $('<select></select>').
          addClass('browser-default').
          addClass('md-select').
          addClass('md-select-vlan').
          addClass('select-port-vlan').
          attr('name', (i+1));
      } else {
        profilesOptions = $('<select></select>').
          addClass('browser-default').
          addClass('md-select').
          addClass('md-select-vlan').
          addClass('select-port-vlan').
          attr('name', (i+1)).
          attr('disabled', 'disabled');
        $('#btn-vlan-update').
          attr('disabled', 'disabled');
      }

      for (let j = 0; j < dc.vlan_profiles.length; j++) {
        let option = $('<option></option>').
          attr('value', dc.vlan_profiles[j].vlan_id).
          text(dc.vlan_profiles[j].profile_name);
        if (dc.vlan !== undefined) {
          for (let k = 0; k < dc.vlan.length; k++) {
            if (dc.vlan[0] !== null) {
              if (dc.vlan_profiles[j].vlan_id == dc.vlan[k].vlan_id &&
                (i+1) == dc.vlan[k].port) {
                option.attr('selected', 'selected');
                profilesOptions.
                  attr('data-vlan-id', dc.vlan_profiles[j].vlan_id);
              }
            }
          }
        }
        profilesOptions.append(option);
      }

      let profilesSelect = $('<div></div>').
        addClass('md-selectfield').
        addClass('md-selectfield-vlan').
        addClass('form-control').
        append(profilesOptions);

      vlanPortInput.append(profilesSelect);

      vlanBlock.append(vlanPortInput);
    }
    vlanCanvas.append(vlanBlock);
  }

  $('#vlan-modal').modal('show');
};
