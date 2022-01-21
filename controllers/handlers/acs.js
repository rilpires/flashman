const xml2js = require('fast-xml-parser');
const XmlParser = require('fast-xml-parser').j2xParser;
let acsHandlers = {};

acsHandlers.createNewPortFwTbl = function(pm) {
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

acsHandlers.setXmlPortForward = function(jsonConfigFile, device) {
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
    let newPortFwTbl = acsHandlers.createNewPortFwTbl(pm);
    jsonConfigFile['Config']['Dir'].splice(i, 0, newPortFwTbl);
  });
  if (device.port_mapping.length == 0) {
    jsonConfigFile['Config']['Dir'].splice(i, 0,
      {'@_Name': 'PORT_FW_TBL'});
  }
  return jsonConfigFile;
};

acsHandlers.setXmlWebAdmin = function(jsonConfigFile, device) {
  if (device.model === 'MP-G421R') {
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

    console.log(jsonConfigFile['Config']['Dir'][mibIndex]['Value'][nameIndex]['@_Value'])
    console.log(jsonConfigFile['Config']['Dir'][mibIndex]['Value'][passwordIndex]['@_Value'])

    // set web login
    // this login can clash if the username is "admin"
    // beware if you're having trouble to login on web interface
    jsonConfigFile['Config']['Dir'][mibIndex]['Value'][nameIndex]['@_Value']
      = device.web_admin_user;

    // set web password 
    jsonConfigFile['Config']['Dir'][mibIndex]['Value'][passwordIndex]['@_Value']
      = device.web_admin_password;

    return jsonConfigFile;
  }
  // find mib table
  let i = jsonConfigFile['Config']['Dir']
    .findIndex((e) => e['@_Name'] == 'MIB_TABLE');
  if (i < 0) {
    console.log('Error: failed MIB_TABLE index finding at '
      +device.serial_tr069);
    return '';
  }
  let j = jsonConfigFile['Config']['Dir'][i]['Value']
    .findIndex((e) => e['@_Name'] == 'SUSER_NAME');
  if (j < 0) {
    console.log('Error: failed SUSER_NAME index finding at '
      +device.serial_tr069);
    return '';
  }
  console.log(jsonConfigFile['Config']['Dir'][i]['Value'][j]['@_Value'])
  // set web login
  jsonConfigFile['Config']['Dir'][i]['Value'][j]['@_Value']
   = device.web_admin_user;

  j = jsonConfigFile['Config']['Dir'][i]['Value']
  .findIndex((e) => e['@_Name'] == 'SUSER_PASSWORD');
  if (j < 0) {
    console.log('Error: failed SUSER_PASSWORD index finding at '
      +device.serial_tr069);
    return '';
  }
  // set web password
  console.log(jsonConfigFile['Config']['Dir'][i]['Value'][j]['@_Value'])
  jsonConfigFile['Config']['Dir'][i]['Value'][j]['@_Value']
   = device.web_admin_password;

  return jsonConfigFile;
};

acsHandlers.digestXmlConfig = function(device, rawXml, target) {
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
      jsonConfigFile = acsHandlers.setXmlPortForward(jsonConfigFile, device);
    }
    if (target.includes('web-admin')) {
      jsonConfigFile = acsHandlers.setXmlWebAdmin(jsonConfigFile, device);
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

module.exports = acsHandlers;
