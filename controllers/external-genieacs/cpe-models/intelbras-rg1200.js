const basicCPEModel = require('./base-model');

let intelbrasModel = Object.assign({}, basicCPEModel);

intelbrasModel.identifier = {vendor: 'Intelbras', model: 'Action RG1200AC'};

// Wifi possible channels:
// 2.4Ghz: 1,2,3,4,5,6,7,8,9,10,11,12,13
// 5Ghz: 36,40,44,48,149,153,157,161,165

// Wifi possible modes:
// 2.4Ghz: "n", "b,g", "b,g,n"
// 5Ghz: "a,n,ac"

intelbrasModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = false; // will enable ping test dialog
  permissions.features.speedTest = true; // will enable speed test dialogs
  permissions.features.siteSurvey = true;
  permissions.lan.listLANDevices = false;
  permissions.lan.configWrite = false;
  permissions.siteSurvey.survey2Index = '1';
  permissions.siteSurvey.survey5Index = '2';
  // speedtest limit, values above show as "limit+ Mbps"
  permissions.wan.speedTestLimit = 120;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161];
  permissions.wifi.modeWrite = false;
  permissions.lan.LANDeviceHasAssocTree = false;
  // firmware upgrade permissions
  permissions.firmwareUpgrades = {
    '2.1.4': [],
  };

  // flag for devices that stay online post reset
  return permissions;
};

// Conversion from Flashman format to CPE format
intelbrasModel.convertWifiMode = function(mode) {
  // 2.4Ghz modes: "n", "b,g", "b,g,n"
  // 5Ghz modes: "a,n,ac"
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'b,g,n';
    case '11na':
    case '11ac':
      return 'a,n,ac';
    case '11ax':
    default:
      return '';
  }
};

// Conversion from Flashman format to CPE format
intelbrasModel.convertWifiBand = function(band, is5ghz=false) {
  // 2.4Ghz modes: "20M", "40M", "Auto20M40M"
  // 5Ghz modes: "20M", "40M", "80M", "Auto20M40M80M"
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20M';
    case 'HT40':
    case 'VHT40':
      return '40M';
    case 'VHT80':
      return '80M';
    case 'auto':
      return (is5ghz) ? 'Auto20M40M80M' : 'Auto20M40M';
    default:
      return '';
  }
};

intelbrasModel.convertWifiBandToFlashman = function(band, isAC) {
  // 2Ghz modes: "20M", "40M", "Auto20M40M"
  // 5Ghz modes: "20M", "40M", "80M", "Auto20M40M80M"
  switch (band) {
    // Strings
    case '20M':
      return (isAC) ? 'HT20' : 'VHT20';
    case '40M':
      return (isAC) ? 'HT40' : 'VHT40';
    case '80M':
      return (isAC) ? 'VHT80' : undefined;
    case 'Auto20M40M80M':
    case 'Auto20M40M':
      return 'auto';
    default:
      return undefined;
  }
};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  // stun fields:
  // These should only be added whenever they exist, for legacy reasons:
  fields.common.web_admin_user = 'InternetGatewayDevice.User.1.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.User.1.Password';
  fields.common.stun_enable =
    'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
  fields.common.alt_uid =
    'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.MACAddress';
  // wifi fields:
  fields.wifi2.band = // modes: "20M", "40M", "Auto20M40M"
    'InternetGatewayDevice.LANDevice.1.X_CT-COM_Radio.1.FrequencyWidth';
  fields.wifi5.band = // modes: "20M", "40M", "80M", "Auto20M40M80M"
    'InternetGatewayDevice.LANDevice.1.X_CT-COM_Radio.2.FrequencyWidth';
  // site survey fields:
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.LANDevice.1.' +
    'X_CT-COM_Radio.*.WLANNeighbor';
  fields.diagnostics.sitesurvey.ssid = 'SSIDName';
  // speedtest fields:
  delete fields.diagnostics.speedtest.num_of_conn;
  delete fields.diagnostics.speedtest.down_transports;
  delete fields.diagnostics.speedtest.full_load_bytes_rec;
  delete fields.diagnostics.speedtest.full_load_period;
  return fields;
};

module.exports = intelbrasModel;

