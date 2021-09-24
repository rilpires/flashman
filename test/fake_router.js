const {connect} = require('mqtt');

const populateDevices = async (macList) => {
  let devicesInstances = [];
  for (let i = 0; i < macList.length; i++) {
    let fakeRouters = await connect(
      `mqtt://${macList[i]}:teste@localhost:1883?clientId=${macList[i]}`,
    ).on('connect', () => {
      fakeRouters.subscribe(`flashman/update/${macList[i]}`, (err) => {
        if (err) {
          console.log(err);
        }
      });
    });
    devicesInstances.push(fakeRouters);
  }
  return devicesInstances;
};

const disconnectThemAll = (fakeDevicesInstances) => {
  fakeDevicesInstances.map((fakeRouter) => {
    fakeRouter.end();
  });
};

module.exports = {
  populateDevices,
  disconnectThemAll,
};