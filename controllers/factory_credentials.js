const ConfigModel = require('../models/config');

const factoryCredentialsController = {};

// TODO: Usar esse objeto para compor os dropdowns na tela de adição de preset
factoryCredentialsController.credentialsDropdownObj = {
  'D-Link': ['DIR-841', 'DIR-842'],
  'FastWireless': ['FW323DAC'],
  'Greatek': ['Stavix G421RQ'],
  'Huawei': [
    'EG8145V5', 'EG8145X6', 'HG8245Q2',
    'WS5200', 'WS7001 / AX2', 'WS7100 / AX3',
  ],
  'Hurakall': ['ST-1001-FL'],
  'Intelbras': ['WiFiber 121 AC'],
  'Multilaser / ZTE': ['F660', 'F670L', 'F680', 'H198A', 'H199A'],
  'Nokia': ['BEACON HA-020W-B', 'G-140W-C', 'G-2425G-A'],
  'Tenda': ['AC10', 'HG9'],
  'TP-Link': ['Archer C6 v3.2', 'EC220-G5 v2'],
  'UNEE': ['Stavix MPG421R'],
  'ZTE': ['F670L'],
};

// TODO: remove this
factoryCredentialsController.onuFactoryCredentials = {
  timestamp: new Date(),
  credentials: [
    {vendor: 'D-Link', model: 'DIR-841', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'D-Link', model: 'DIR-842', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'FastWireless', model: 'FW323DAC', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Greatek', model: 'Stavix G421RQ', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'EG8145V5', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'EG8145X6', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'HG8245Q2', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'WS5200', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'WS7001 / AX2', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'WS7100 / AX3', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Hurakall', model: 'ST-1001-FL', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Intelbras', model: 'WiFiber 121 AC', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'F660', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'F670L', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'F680', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'H198A', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'H199A', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Nokia', model: 'BEACON HA-020W-B', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Nokia', model: 'G-140W-C', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Nokia', model: 'G-2425G-A', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Tenda', model: 'AC10', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Tenda', model: 'HG9', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'TP-Link', model: 'Archer C6 v3.2', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'TP-Link', model: 'EC220-G5 v2', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'UNEE', model: 'Stavix MPG421R', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'ZTE', model: 'F670L', username: 'admin', password: 'A@Nlix123'},
  ],
};

factoryCredentialsController.getVendorList = function() {
  return Array.from(factoryCredentialsController.credentialsDropdownObj.keys());
};

factoryCredentialsController.getModelListByVendor = function(vendor) {
  return factoryCredentialsController.credentialsDropdownObj[vendor];
};


factoryCredentialsController.getCredentialsAtConfig = async function() {
  let config = await ConfigModel.findOne(
    {is_default: true},
    {tr069: true, pppoePassLength: true, licenseApiSecret: true, company: true},
  ).lean().catch((err) => (err));
  // TODO: remove this
  // ).catch((err) => (err));
  // Get onu credentials inside config, if present
  console.log('config', config);
  if (config && config.tr069) {
    // TODO: remove this
    // config.tr069.onu_factory_credentials =
    //   factoryCredentialsController.onuFactoryCredentials;
    // await config.save();
    if (config.tr069.onu_factory_credentials) {
      const onuFactoryCredentials = config.tr069.onu_factory_credentials;
      if (onuFactoryCredentials.timestamp &&
          onuFactoryCredentials.credentials) {
        return onuFactoryCredentials;
      }
    }
  }
  return {};
};

module.exports = factoryCredentialsController;
