const async = require('asyncawait/async');
const await = require('asyncawait/await');
const request = require('request-promise-native');
const mqtt = require('../mqtts');

const DeviceModel = require('../models/device');
const ConfigModel = require('../models/config');

let measureController = {};

const macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;

const isJSONObject = (val) => val instanceof Object ? true : false;

const isArrayObject = (val) => val instanceof Array ? true : false;

const returnStrOrEmptyStr = (query) =>
    (typeof query === 'string') ? query : '';

// This should check request json and company secret validity (API only)
const genericRequestErrorHandler = async(function(req) {
  if (!isJSONObject(req.body)) {
    return [500, 'Erro no JSON recebido'];
  }
  try {
    let config = await(ConfigModel.findOne({is_default: true}));
    if (!config || !config.measure_configs.is_active) {
      return [403, 'Este Flashman não possui configurações de medição ativas'];
    }
  } catch (err) {
    console.log(err);
    return [500, 'Erro ao verificar status da licença'];
  }
  if (!req.body.hasOwnProperty('secret')) {
    return [403, 'Não foi fornecido um secret para autenticação'];
  }
  if (req.body.secret !== req.app.locals.secret) {
    return [403, 'O secret fornecido não está correto'];
  }
  return [200, ''];
});

const requestErrorHandler = async(function(req, customHandler) {
  let [errorCode, errorMsg] = await(genericRequestErrorHandler(req));
  if (errorCode === 200 && errorMsg === '' && customHandler) {
    [errorCode, errorMsg] = await(customHandler(req));
  }
  return [errorCode, errorMsg];
});

measureController.activateDevices = async(function(req, res) {
  const customHandler = async(function(req) {
    let content = req.body;
    if (!content.hasOwnProperty('device_list') ||
        !isArrayObject(content.device_list) ||
        content.device_list.length < 1) {
      return [500, 'Não foi fornecida uma lista de dispositivos'];
    }
    return content.device_list.reduce((status, device) => {
      if (status[0] != 200) return status;
      let mac = returnStrOrEmptyStr(device.mac).toUpperCase();
      let psk = returnStrOrEmptyStr(device.psk);
      if (!mac) {
        return [500, 'Um elemento da lista não forneceu endereço MAC'];
      }
      if (!psk) {
        return [500, 'Um elemento da lista não forneceu chave de segurança'];
      }
      if (!mac.match(macRegex)) {
        return [500, 'Um endereço MAC fornecido não é válido'];
      }
      try {
        let device = await(DeviceModel.findById(mac));
        if (!device) {
          return [500, 'Um endereço MAC fornecido não está cadastrado'];
        }
      } catch (err) {
        console.log(err);
        return [500, 'Erro interno ao consultar o banco de dados'];
      }
      return status;
    }, [200, '']);
  });

  // Handle request errors
  let [errorCode, errorMsg] = await(requestErrorHandler(req, customHandler));
  if (errorCode !== 200 && errorMsg !== '') {
    return res.status(errorCode).json({
      message: errorMsg,
    });
  }

  // For each device, register new PSK and send MQTT message
  let deviceList = req.body.device_list;
  try {
    deviceList.forEach((dev)=>{
      let mac = dev.mac.toUpperCase();
      let psk = dev.psk;
      let device = await(DeviceModel.findById(mac));
      device.measure_config.measure_psk = psk;
      await(device.save());
      mqtt.anlixMessageRouterMeasure(mac, psk);
    });
    return res.status(200).end();
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Erro interno ao consultar o banco de dados',
    });
  }
});

measureController.deactivateDevices = async(function(req, res) {
  const customHandler = async(function(req) {
    let content = req.body;
    if (!content.hasOwnProperty('mac_list') ||
        !isArrayObject(content.mac_list) ||
        content.mac_list.length < 1) {
      return [500, 'Não foi fornecida uma lista de dispositivos'];
    }
    return content.mac_list.reduce((status, mac)=>{
      if (status[0] != 200) return status;
      if (!mac.match(macRegex)) {
        return [500, 'Um endereço MAC fornecido não é válido'];
      }
      try {
        let device = await(DeviceModel.findById(mac.toUpperCase()));
        if (!device) {
          return [500, 'Um endereço MAC fornecido não está cadastrado'];
        }
      } catch (err) {
        console.log(err);
        return [500, 'Erro interno ao consultar o banco de dados'];
      }
      return [200, ''];
    }, [200, '']);
  });

  // Handle request errors
  let [errorCode, errorMsg] = await(requestErrorHandler(req, customHandler));
  if (errorCode !== 200 && errorMsg !== '') {
    return res.status(errorCode).json({
      message: errorMsg,
    });
  }

  // For each device, send MQTT message
  let macList = req.body.mac_list;
  macList.forEach((mac)=>{
    mqtt.anlixMessageRouterMeasure(mac.toUpperCase());
  });
  return res.status(200).end();
});

measureController.updateLicenseStatus = async(function(req, res) {
  const customHandler = async(function(req) {
    let content = req.body;
    if (!content.hasOwnProperty('status')) {
      return [500, 'Não foi fornecido um valor de status para a licença'];
    }
    return [200, ''];
  });

  // Handle request errors
  let [errorCode, errorMsg] = await(requestErrorHandler(req, customHandler));
  if (errorCode !== 200 && errorMsg !== '') {
    return res.status(errorCode).json({
      message: errorMsg,
    });
  }

  // Save new license status in config
  let status = req.body.status;
  try {
    let config = await(ConfigModel.findOne({is_default: true}));
    if (!config) throw new {};
    config.measure_configs.is_license_active = status;
    await(config.save());
    return res.status(200).end();
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Erro acessando o banco de dados',
    });
  }
});

measureController.pingLicenseStatus = async(function() {
  try {
    let config = await(ConfigModel.findOne({is_default: true}));
    if (!config || !config.measure_configs.is_active) return;
    let controllerUrl = 'https://';
    controllerUrl += config.measure_configs.controller_fqdn;
    controllerUrl += '/license/status';
    let body = await(request({
      url: controllerUrl,
      method: 'POST',
      json: {
        'secret': process.env.FLM_COMPANY_SECRET,
      },
    }));
    config.measure_configs.is_license_active = body.is_active;
    await(config.save());
  } catch (err) {
    console.log('Failed to update license status');
    console.log(err);
  }
});

module.exports = measureController;
