const socketio = require('socket.io');
const sharedsession = require('express-socket.io-session');
const mqtt = require('./mqtts');

let sio = socketio();

const SIO_NOTIFICATION_LIVELOG = 0;
const SIO_NOTIFICATION_ONLINEDEVS = 1;
const SIO_NOTIFICATION_DEVICE_STATUS = 2;

sio.anlixConnections = {};
sio.anlixNotifications = [];

sio.anlixBindSession = function(session) {
  sio.use(sharedsession(session, {
    autoSave: true,
  }));
};

sio.on('connection', function(socket) {
  console.log(socket.handshake.address + ' (' + socket.handshake.sessionID +
              ') connected on Notification Broker');
  // just save connections of authenticated users
  if (socket.handshake.session.passport) {
    // We keep only one connection for each session
    if (sio.anlixConnections[socket.handshake.sessionID]) {
      oldsock = sio.anlixConnections[socket.handshake.sessionID];
      oldsock.disconnect(true);
      console.log(oldsock.handshake.address + ' (' +
                  oldsock.handshake.sessionID +
                  ') disconnect from Notification Broker: Overwrite');
    }
    sio.anlixConnections[socket.handshake.sessionID]=socket;
  } else {
    socket.disconnect(true);
    console.log(socket.handshake.address + ' (' + socket.handshake.sessionID +
                ') BLOCKED: not authenticated!');
  }

  socket.on('disconnect', function(reason) {
    if (sio.anlixConnections[socket.handshake.sessionID]) {
      delete sio.anlixConnections[socket.handshake.sessionID];
    }
    console.log(socket.handshake.address + ' (' + socket.handshake.sessionID +
                ') disconnect from Notification Broker: '+ reason);
  });
});

sio.removeOldNotification = function(timer) {
  sio.anlixNotifications = sio.anlixNotifications.filter((item) => {
    if (item.timer >= timer) {
      console.log('SIO WARNING: Remove notification for ' +
                  item.session + ': Timeout');
    }
    return item.timer >= timer;
  });
};

sio.anlixWaitForLiveLogNotification = function(session, macaddr, timeout) {
  if (!session) {
    console.log('ERROR: SIO: ' +
                'Try to add livelog notification with an invalid session!');
    return false;
  }

  if (!macaddr) {
    console.log('ERROR: SIO: ' +
                'Try to add livelog notification with an invalid mac address!');
    return false;
  }

  if (!timeout || timeout == 0) {
    timeout = 5000;
  } // 5s default

  parameters = {};
  parameters.type = SIO_NOTIFICATION_LIVELOG;
  parameters.timer = Date.now();
  parameters.session = session;
  parameters.macaddr = macaddr;
  sio.anlixNotifications.push(parameters);

  // set a timer to remove the notification if it takes too long
  // set a 100ms error (to only remove AFTER timeout)
  const timelimit = Date.now() + timeout;
  setTimeout(function() {
    sio.removeOldNotification(timelimit);
  }, timeout + 100);
  console.log('SIO: Notification added to LIVELOG of ' +
              macaddr + ' for ' + session);

  return true;
};

sio.anlixSendLiveLogNotifications = function(macaddr, logdata) {
  if (!macaddr) {
    console.log('ERROR: SIO: ' +
                'Try to send livelog notification to an invalid mac address!');
    return false;
  }
  let found = false;

  // Get who is waiting for this notification
  sio.anlixNotifications = sio.anlixNotifications.filter((item) => {
    if (item.type == SIO_NOTIFICATION_LIVELOG) {
      if (item.macaddr == macaddr) {
        if (sio.anlixConnections[item.session]) {
          console.log('SIO: Send LIVELOG of ' + macaddr +
                      ' information for ' + item.session);
          sio.anlixConnections[item.session].emit('LIVELOG', macaddr, logdata);
          found = true;
          return false;
        }
      }
    }
    return true;
  });

  if (!found) {
    console.log('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
};

sio.anlixWaitForOnlineDevNotification = function(session, macaddr, timeout) {
  if (!session) {
    console.log('ERROR: SIO: ' +
                'Try to add onlinedev notification with an invalid session!');
    return false;
  }

  if (!macaddr) {
    console.log('ERROR: SIO: ' +
                'Try to add onlinedev notification with an invalid mac address!');
    return false;
  }

  if (!timeout || timeout == 0) {
    timeout = 5000;
  } // 5s default

  parameters = {};
  parameters.type = SIO_NOTIFICATION_ONLINEDEVS;
  parameters.timer = Date.now();
  parameters.session = session;
  parameters.macaddr = macaddr;
  sio.anlixNotifications.push(parameters);

  // set a timer to remove the notification if it takes too long
  // set a 100ms error (to only remove AFTER timeout)
  const timelimit = Date.now() + timeout;
  setTimeout(function() {
    sio.removeOldNotification(timelimit);
  }, timeout + 100);
  console.log('SIO: Notification added to ONLINEDEVS of ' +
              macaddr + ' for ' + session);

  return true;
};

sio.anlixSendOnlineDevNotifications = function(matchedDevice, devsData) {
  if (!matchedDevice) {
    console.log(
      'ERROR: SIO: ' +
      'Try to send onlinedev notification to an invalid mac address!'
    );
    return false;
  }
  let found = false;

  // Enrich information about connected devices
  for (let connDeviceMac in devsData.Devices) {
    if (devsData.Devices.hasOwnProperty(connDeviceMac)) {
      let upConnDevMac = connDeviceMac.toLowerCase();
      let lanDevice = matchedDevice.lan_devices.filter(function(lanDev) {
        return lanDev.mac.toLowerCase() == upConnDevMac;
      });
      if (lanDevice[0] && ('name' in lanDevice[0]) && lanDevice[0].name != '') {
        devsData.Devices[connDeviceMac].hostname = lanDevice[0].name;
      } else if (lanDevice[0] && ('dhcp_name' in lanDevice[0]) &&
                 lanDevice[0].dhcp_name != '') {
        devsData.Devices[connDeviceMac].hostname = lanDevice[0].dhcp_name;
      }
    }
  }

  // Get who is waiting for this notification
  sio.anlixNotifications = sio.anlixNotifications.filter((item) => {
    if (item.type == SIO_NOTIFICATION_ONLINEDEVS) {
      if (item.macaddr == matchedDevice._id) {
        if (sio.anlixConnections[item.session]) {
          console.log('SIO: Send ONLINEDEV of ' + matchedDevice._id +
                      ' information for ' + item.session);
          sio.anlixConnections[item.session].emit(
            'ONLINEDEV',
            matchedDevice._id,
            devsData
          );
          found = true;
          return false;
        }
      }
    }
    return true;
  });

  if (!found) {
    console.log('SIO: NO Session found for ' +
                matchedDevice._id + '! Discarding message...');
  }
};

sio.anlixWaitDeviceStatusNotification = function(session) {
  if (!session) {
    console.log('ERROR: SIO: Try to add device status ' +
                'notification with an invalid session!');
    return false;
  }

  parameters = {};
  parameters.type = SIO_NOTIFICATION_DEVICE_STATUS;
  parameters.timer = Date.now();
  parameters.session = session;
  sio.anlixNotifications.push(parameters);

  console.log('SIO: Notification added to DEVICESTATUS of for ' + session);
  return true;
};

sio.anlixSendDeviceStatusNotification = function(mac) {
  if (!mac) {
    console.log(
      'ERROR: SIO: ' +
      'Try to send status notification to an invalid mac address!'
    );
    return false;
  }
  let found = false;

  let status = 'red-text';
  if (mqtt.clients[mac.toUpperCase()]) {
    status = 'green-text';
  }

  // Get who is waiting for this notification
  sio.anlixNotifications.forEach((item) => {
    if (item.type == SIO_NOTIFICATION_DEVICE_STATUS) {
      if (sio.anlixConnections[item.session]) {
        console.log('SIO: Send DEVICESTATUS of ' + mac +
                    ' information for ' + item.session);
        sio.anlixConnections[item.session].emit(
          'DEVICESTATUS',
          mac,
          status
        );
        found = true;
      }
    }
  });

  if (!found) {
    console.log('SIO: NO Session found for ' + mac + '! Discarding message...');
    return false;
  }
  return true;
};

module.exports = sio;
