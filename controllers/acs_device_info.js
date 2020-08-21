const DeviceModel = require('../models/device');

let acsDeviceInfoController = {};

const createRegistry = async function(req) {
  let newDevice = new DeviceModel({
    _id: req.body.mac,
    use_tr069: true,
    acs_id: req.body.acs_id,
    model: '',
    connection_type: 'dhcp',
    last_contact: Date.now(),
  });
  try {
    await newDevice.save();
  } catch (err) {
    console.log(err);
    return false;
  }
  return true;
};

acsDeviceInfoController.syncDevice = async function(req, res) {
  console.log(req.body);
  let reqMac = req.body.mac;
  let reqAcsId = req.body.acs_id;

  let device = await DeviceModel.findById(reqMac);
  if (!device) {
    if (reqMac && await createRegistry(req)) {
      return res.status(200).json({success: true});
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to create device registry',
      });
    }
  }
  if (!device.use_tr069) {
    return res.status(500).json({
      success: false,
      message: 'Attempt to sync acs data with non-tr-069 device',
    });
  }
  device.acs_id = reqAcsId;
  await device.save();
  return res.status(200).json({success: true});
};

module.exports = acsDeviceInfoController;
