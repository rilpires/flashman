const huaweiModel = require('./huawei-eg8145v5');

let nextFiberModel = Object.assign({}, huaweiModel);

nextFiberModel.identifier = {vendor: 'Next Fiber', model: 'NXT-425AC'};

nextFiberModel.modelPermissions = function() {
  let permissions = huaweiModel.modelPermissions();
  permissions.wan.speedTestLimit = 300;
  /* Disabled Connected Devices because on the attempt to perform the task,
    genieacs throw this error:
      Missing or invalid XML node; element="Value" parameter=
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration
      .5.AssociatedDevice.1.X_HW_WMMStatus" */
  permissions.lan.listLANDevices = false;
  permissions.features.cableRxRate = false;
  permissions.lan.LANDeviceHasSNR = true;

  // Not found port forward settings in web interface
  permissions.features.portForward = false;
  permissions.wan.portForwardPermissions = null;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161,
  ];
  permissions.firmwareUpgrades = {
    'V5R019C00S100': [],
  };
  return permissions;
};

module.exports = nextFiberModel;
