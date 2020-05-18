const DeviceModel = require('../../models/device');
const mqtt = require('../../mqtts');

let meshHandlers = {};

meshHandlers.syncSlave = function(master, slave) {
  slave.mesh_mode = master.mesh_mode;
  slave.wifi_ssid = master.wifi_ssid;
  slave.wifi_password = master.wifi_password;
  slave.wifi_channel = master.wifi_channel;
  slave.wifi_band = master.wifi_band;
  slave.wifi_mode = master.wifi_mode;
  slave.wifi_state = master.wifi_state;
  if(slave.wifi_is_5ghz_capable) {
    slave.wifi_ssid_5ghz = master.wifi_ssid_5ghz;
    slave.wifi_password_5ghz = master.wifi_password_5ghz;
    slave.wifi_channel_5ghz = master.wifi_channel_5ghz;
    slave.wifi_band_5ghz = master.wifi_band_5ghz;
    slave.wifi_mode_5ghz = master.wifi_mode_5ghz;
    slave.wifi_state_5ghz = master.wifi_state_5ghz;
  }
}

meshHandlers.syncSlaves = function(master) {

  master.mesh_slaves.forEach(function (s) {
    DeviceModel.findById(s, function(err, slaveDevice) {
      if (err) {
        console.log('Attempt to modify mesh slave '+ s +' from master ' +
          master._id + ' failed: cant get slave device.');
      } else 
      if (!slaveDevice) {
        console.log('Attempt to modify mesh slave '+ s +' from master ' +
          master._id + ' failed: cant get slave device.');
      } else {
        meshHandlers.syncSlave(master,slaveDevice);
        slaveDevice.save();

        // Push updates to the Slave
        mqtt.anlixMessageRouterUpdate(s);
      }
    });
  });
}

module.exports = meshHandlers;
