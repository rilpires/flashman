const async = require('asyncawait/async');
const await = require('asyncawait/await');

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
    for (device in content.device_list) {
      if (Object.prototype.hasOwnProperty.call(content.device_list, device)) {
        let mac = returnStrOrEmptyStr(device.mac);
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
      }
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

  // For each device, register new PSK and send MQTT message
  let deviceList = req.body.device_list;
  try {
    deviceList.forEach((dev)=>{
      let mac = dev.mac;
      let psk = dev.psk;
      let device = await(DeviceModel.findById(mac));
      device.measure_config.measure_psk = psk;
      await(device.save());
      mqtts.anlix_message_router_measure(mac, psk);
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
    for (mac in content.mac_list) {
      if (Object.prototype.hasOwnProperty.call(content.mac_list, mac)) {
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
      }
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

  // For each device, register new PSK and send MQTT message
  let macList = req.body.mac_list;
  macList.forEach((mac)=>{
    mqtts.anlix_message_router_measure(mac);
  });
  return res.status(200).end();
});

module.exports = measureController;
