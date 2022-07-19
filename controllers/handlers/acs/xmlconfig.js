const TasksAPI = require('../../external-genieacs/tasks-api');
const DeviceModel = require('../../../models/device');
const utilHandlers = require('../util.js');
const XmlParser = require('fast-xml-parser').j2xParser;
const xml2js = require('fast-xml-parser');
const http = require('http');
const debug = require('debug')('ACS_XMLCONFIG');

let acsXMLConfigHandler = {};

const createNewPortFwTbl = function(pm) {
  return {'@_Name': 'PORT_FW_TBL', 'Value': [{
        '@_Name': 'InstanceNum', '@_Value': '0',
      }, {
        '@_Name': 'Dynamic', '@_Value': '0',
      }, {
        '@_Name': 'externalportEnd',
        '@_Value': pm.external_port_end.toString(),
      }, {
        '@_Name': 'externalportStart',
        '@_Value': pm.external_port_start.toString(),
      }, {
        '@_Name': 'remotehost', '@_Value': '0.0.0.0',
      }, {
        '@_Name': 'leaseduration', '@_Value': '0',
      }, {
        '@_Name': 'enable', '@_Value': '1',
      }, {
        '@_Name': 'OutInf', '@_Value': '65535',
      }, {
        '@_Name': 'Comment', '@_Value': '',
      }, {
        '@_Name': 'Protocol', '@_Value': '4',
      }, {
        '@_Name': 'PortEnd',
        '@_Value': pm.internal_port_end.toString(),
      }, {
        '@_Name': 'PortStart',
        '@_Value': pm.internal_port_start.toString(),
      }, {
        '@_Name': 'IP', '@_Value': pm.ip}]};
};

const setXmlPortForward = function(jsonConfigFile, device) {
  // find and set PORT_FW_ENABLE to 1
  let i = jsonConfigFile['Config']['Dir']
  .findIndex((e) => e['@_Name'] == 'MIB_TABLE');
  if (i < 0) {
    console.log('Error: failed MIB_TABLE index finding at '
      +device.serial_tr069);
    return '';
  }
  let j = jsonConfigFile['Config']['Dir'][i]['Value']
  .findIndex((e) => e['@_Name'] == 'PORT_FW_ENABLE');
  if (j < 0) {
    console.log('Error: failed PORT_FW_ENABLE index finding at '
      +device.serial_tr069);
    return '';
  }
  jsonConfigFile['Config']['Dir'][i]['Value'][j]['@_Value']
   = (device.port_mapping.length == 0)?'0':'1';
  // find first PORT_FW_TBL
  i = jsonConfigFile['Config']['Dir']
  .findIndex((e) => e['@_Name'] == 'PORT_FW_TBL');
  if (i < 0) {
    console.log('Error: failed PORT_FW_TBL index finding at '+
      device.serial_tr069);
    return '';
  }
  // delete others PORT_FW_TBL
  jsonConfigFile['Config']['Dir'] =
  jsonConfigFile['Config']['Dir']
  .filter((e) => e['@_Name'] != 'PORT_FW_TBL');
  // add new PORT_FW_TBL values based on device.port_mapping
  device.port_mapping.forEach((pm) => {
    let newPortFwTbl = createNewPortFwTbl(pm);
    jsonConfigFile['Config']['Dir'].splice(i, 0, newPortFwTbl);
  });
  if (device.port_mapping.length == 0) {
    jsonConfigFile['Config']['Dir'].splice(i, 0,
      {'@_Name': 'PORT_FW_TBL'});
  }
  return jsonConfigFile;
};

const setXmlWebAdmin = function(jsonConfigFile, device) {
  // find mib table
  let mibIndex = jsonConfigFile['Config']['Dir']
    .findIndex((e) => e['@_Name'] == 'MIB_TABLE');
  if (mibIndex < 0) {
    console.log('Error: failed MIB_TABLE index finding at '
      +device.serial_tr069);
    return '';
  }

  let passwordIndex = jsonConfigFile['Config']['Dir'][mibIndex]['Value']
    .findIndex((e) => e['@_Name'] === 'SUSER_PASSWORD');
  if (passwordIndex < 0) {
    console.log('Error: failed SUSER_PASSWORD index finding at '
      +device.serial_tr069);
    return '';
  }

  let nameIndex = jsonConfigFile['Config']['Dir'][mibIndex]['Value']
    .findIndex((e) => e['@_Name'] === 'SUSER_NAME');
  if (nameIndex < 0) {
    console.log('Error: failed SUSER_NAME index finding at '
      +device.serial_tr069);
    return '';
  }

  // set web login
  // this login can clash if the username is "admin"
  // beware if you're having trouble to login on web interface
  jsonConfigFile['Config']['Dir'][mibIndex]['Value'][nameIndex]['@_Value']
    = device.web_admin_username;

  // set web password
  jsonConfigFile['Config']['Dir'][mibIndex]['Value'][passwordIndex]['@_Value']
    = device.web_admin_password;

  return jsonConfigFile;
};

acsXMLConfigHandler.digestXmlConfig = function(device, rawXml, target) {
  let opts = {
    ignoreAttributes: false, // default is true
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: false, // default is true
    parseAttributeValue: false,
    trimValues: false, // default is true
    cdataTagName: false, // default is 'false'
    parseTrueNumberOnly: false,
    arrayMode: false,
  };
  if (xml2js.validate(rawXml) === true) {
    // parse xml to json
    let jsonConfigFile = xml2js.parse(rawXml, opts);
    if (target.includes('port-forward')) {
      jsonConfigFile = setXmlPortForward(jsonConfigFile, device);
    }
    if (target.includes('web-admin')) {
      jsonConfigFile = setXmlWebAdmin(jsonConfigFile, device);
    }
    // parse json to xml
    opts = {
      ignoreAttributes: false,
      format: true,
      indentBy: ' ',
      supressEmptyNode: false,
    };
    let js2xml = new XmlParser(opts);
    return js2xml.parse(jsonConfigFile)
      .replace(/(([\n\t\r])|(\s\s\n)|(\s\s))/g, '');
  } else {
    return '';
  }
};

const fetchAndEditConfigFile = async function(acsID, target) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    return;
  }
  if (!device || !device.use_tr069) {
    return;
  }
  let serial = device.serial_tr069;
  let configField = 'InternetGatewayDevice.DeviceConfig.ConfigFile';

  // get xml config file from genieacs
  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+
    '&projection='+configField;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let rawConfigFile = '';
    resp.on('data', (chunk)=>rawConfigFile+=chunk);
    resp.on('end', async () => {
      if (rawConfigFile.length > 0) {
        try {
          rawConfigFile = JSON.parse(rawConfigFile)[0];
        } catch (err) {
          debug(err);
          rawConfigFile = '';
        }
      }
      if (
        utilHandlers.checkForNestedKey(rawConfigFile, configField+'._value')
      ) {
        // modify xml config file
        rawConfigFile = utilHandlers.getFromNestedKey(
          rawConfigFile, configField+'._value',
        );
        let xmlConfigFile = acsXMLConfigHandler.digestXmlConfig(
          device, rawConfigFile, target,
        );
        if (xmlConfigFile != '') {
          // set xml config file to genieacs
          let task = {
            name: 'setParameterValues',
            parameterValues: [[configField, xmlConfigFile, 'xsd:string']],
          };
          let result = await TasksAPI.addTask(acsID, task);
          if (!result || !result.success) {
            console.log('Error: failed to write ConfigFile at '+serial);
            return;
          }
        } else {
          console.log('Error: failed xml validation at '+serial);
        }
      } else {
        console.log('Error: no config file retrieved at '+serial);
      }
    });
  });
  req.end();
};

acsXMLConfigHandler.configFileEditing = async function(device, target) {
  let acsID = device.acs_id;
  let serial = device.serial_tr069;
  // get xml config file to genieacs
  let configField = 'InternetGatewayDevice.DeviceConfig.ConfigFile';
  let task = {
    name: 'getParameterValues',
    parameterNames: [configField],
  };
  let cback = (acsID)=>fetchAndEditConfigFile(acsID, target);
  let result = await TasksAPI.addTask(acsID, task, cback);
  if (!result || !result.success) {
    console.log('Error: failed to retrieve ConfigFile at '+serial);
    return;
  }
};

module.exports = acsXMLConfigHandler;
