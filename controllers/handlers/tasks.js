const TasksAPI = require('../external-genieacs/tasks-api');

let tasksHandlers = {};

tasksHandlers.deleteDeviceFromGenie = async function(device) {
  if (process.env.FLM_DO_REMOVE_FROM_GENIE
      && device.use_tr069 && device.acs_id) {
    try {
      // remove from genieacs database if env var is set
      await TasksAPI.deleteDevice(device.acs_id);
    } catch (e) {
      console.log('Error removing device ' +
        device.acs_id + ' from genieacs : ' + e);
      return false;
    }
  }
  return true;
};
module.exports = tasksHandlers;
