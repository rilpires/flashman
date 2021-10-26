const acsHandlers = require('../../controllers/handlers/acs');
const fs = require('fs');

const xmlFailTest = function(idx) {
  let device = {
    serial_tr069: '8H3F98AHF9Q38FH',
    port_mapping: [],
  };
  let initXml = fs.readFileSync('./test/assets/config_file_stavix_'+
    idx+'.xml', 'utf8');
  return acsHandlers
    .digestXmlConfig(device, initXml, ['port-forward']);
};

describe('TR-069 GenieACS communication methods', () => {
  // when x>0 port foward entries PORT_FW_TBL
  // amount must be = x and PORT_FW_ENABLE = 1
  test('digestXmlConfig: when x>0 port foward entries'+
    ' PORT_FW_TBL amount must be = x and PORT_FW_ENABLE = 1', () => {
    let device = {
      serial_tr069: '8H3F98AHF9Q38FH',
      port_mapping: [{
        internal_port_start: 78,
        internal_port_end: 78,
        external_port_start: 78,
        external_port_end: 78,
        ip: '192.168.1.78',
      },
      {
        internal_port_start: 1100,
        internal_port_end: 1110,
        external_port_start: 1100,
        external_port_end: 1110,
        ip: '192.168.1.11',
      },
      {
        internal_port_start: 1313,
        internal_port_end: 1313,
        external_port_start: 3131,
        external_port_end: 3131,
        ip: '192.168.1.13',
      },
      {
        internal_port_start: 4540,
        internal_port_end: 4550,
        external_port_start: 5440,
        external_port_end: 5450,
        ip: '192.168.1.45',
      }],
    };
    let initXml = fs.readFileSync('./test/assets/config_file_stavix_1.xml',
      'utf8');
    let searchDirNames = new RegExp('Dir Name="[A-Z_]*"', 'g');
    let initDirNamesList = initXml.match(searchDirNames);
    let DirNamesMap = new Map();
    initDirNamesList.forEach((dn) => {
      DirNamesMap.set(dn);
    });
    let finiXml = acsHandlers
      .digestXmlConfig(device, initXml, ['port-forward']);
    let searchPortFwTbl = new RegExp('Dir Name="PORT_FW_TBL"', 'g');
    let searchPortFwEnable = new RegExp('PORT_FW_ENABLE" Value="[0-9]');
    let finiDirNamesList = finiXml.match(searchDirNames);
    let pfw = finiXml.match(searchPortFwEnable)[0];
    let portFwEnableValue = pfw[pfw.length-1];
    let portFwTblAmount = finiXml.match(searchPortFwTbl).length;
    let sameDirNamesCheck = finiDirNamesList.every((dn) => {
      return DirNamesMap.has(dn);
    });

    expect(sameDirNamesCheck).toBe(true);
    expect(portFwEnableValue).toBe('1');
    expect(portFwTblAmount).toBe(4);
  });

  // when 0 port forward entries PORT_FW_ENABLE = 0
  test('digestXmlConfig: when 0 port forward entries'+
    ' PORT_FW_ENABLE = 0', () => {
    let device = {
      serial_tr069: '8H3F98AHF9Q38FH',
      port_mapping: [],
    };
    let initXml = fs.readFileSync('./test/assets/config_file_stavix_1.xml',
      'utf8');
    let searchDirNames = new RegExp('Dir Name="[A-Z_]*"', 'g');
    let initDirNamesList = initXml.match(searchDirNames);
    let DirNamesMap = new Map();
    initDirNamesList.forEach((dn) => {
      DirNamesMap.set(dn);
    });
    let finiXml = acsHandlers
      .digestXmlConfig(device, initXml, ['port-forward']);
    let searchPortFwTbl = new RegExp('Dir Name="PORT_FW_TBL"', 'g');
    let searchPortFwEnable = new RegExp('PORT_FW_ENABLE" Value="[0-9]');
    let finiDirNamesList = finiXml.match(searchDirNames);
    let pfw = finiXml.match(searchPortFwEnable)[0];
    let portFwEnableValue = pfw[pfw.length-1];
    let portFwTblAmount = finiXml.match(searchPortFwTbl).length;
    let sameDirNamesCheck = finiDirNamesList.every((dn) => {
      return DirNamesMap.has(dn);
    });

    expect(sameDirNamesCheck).toBe(true);
    expect(portFwEnableValue).toBe('0');
    expect(portFwTblAmount).toBe(1);
  });

  // doesnt have PORT_FW_TBL
  test('digestXmlConfig: doesnt have PORT_FW_TBL', () => {
    let finiXml = xmlFailTest(2);
    expect(finiXml).toBe('');
  });
  // doesnt have PORT_FW_ENABLE
  test('digestXmlConfig: doesnt have PORT_FW_ENABLE', () => {
    let finiXml = xmlFailTest(3);
    expect(finiXml).toBe('');
  });
  // doesnt have MIB_TABLE
  test('digestXmlConfig: doesnt have MIB_TABLE', () => {
    let finiXml = xmlFailTest(4);
    expect(finiXml).toBe('');
  });
  // is not a xml
  test('digestXmlConfig: is not a xml', () => {
    let finiXml = xmlFailTest(5);
    expect(finiXml).toBe('');
  });
});
