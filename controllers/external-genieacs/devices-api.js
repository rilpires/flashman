/*
The scripts in this directory are loaded by genieacs along with the provision
script. Configure genieacs' cwmp server parameter EXT_DIR to the following:
"path/to/flashman/controllers/external-genieacs"
*/

// ***** WARNING!!! *****
// DO NOT CHANGE THIS VARIABLE WITHOUT ALSO CHANGING THE COMMAND THAT ALTERS IT
// IN CONTROLLERS/UPDATE_FLASHMAN.JS! THIS LINE IS ALTERED AUTOMATICALLY WHEN
// FLASHMAN IS RESTARTED FOR ANY REASON
const INSTANCES_COUNT = 1;
const API_URL = 'http://localhost:$PORT/acs/';
/* This file is called by genieacs-cwmp, so need to set FLM_WEB_PORT in
 environment.genieacs.json or in shell environment with the same value
 that is in environment.config.json */
const FLASHMAN_PORT = (process.env.FLM_WEB_PORT || 8000);

const request = require('request');

const getFieldType = function(masterKey, key, model) {
  switch (masterKey+'-'+key) {
    case 'wifi2-channel':
    case 'wifi5-channel':
    case 'mesh2-channel':
    case 'mesh5-channel':
    case 'stun-port':
    case 'common-interval':
      if (model == 'AC10') {
        return 'xsd:string';
      } else {
        return 'xsd:unsignedInt';
      }
    case 'wifi2-enable':
    case 'wifi5-enable':
    case 'wifi2-auto':
    case 'wifi5-auto':
    case 'mesh2-enable':
    case 'mesh5-enable':
    case 'mesh2-auto':
    case 'mesh5-auto':
    case 'mesh2-advertise':
    case 'mesh5-advertise':
    case 'common-stun_enable':
      if (model == 'AC10') {
        return 'xsd:string';
      } else {
        return 'xsd:boolean';
      }
    case 'wifi2-band':
    case 'wifi5-band':
    case 'mesh2-band':
    case 'mesh5-band':
      if (model === 'EG8145X6' || model === 'HG8121H') {
        return 'xsd:unsignedInt';
      } else {
        return 'xsd:string';
      }
    default:
      return 'xsd:string';
  }
};

const convertSubnetIntToMask = function(mask) {
  if (mask === 24) {
    return '255.255.255.0';
  } else if (mask === 25) {
    return '255.255.255.128';
  } else if (mask === 26) {
    return '255.255.255.192';
  }
  return '';
};

const convertWifiMode = function(mode, oui, model) {
  let ouiModelStr = model;
  switch (mode) {
    case '11g':
      if (
        ouiModelStr === 'HG9' ||
        ouiModelStr === 'DM986-414' ||
        ouiModelStr === 'P20'
      ) {
        return 'g';
      } else if (ouiModelStr === 'HG8245Q2') return '11bg';
      else if (['WS7001-40', 'WS7100-30', 'WS5200-21', 'WS5200-40'].includes(
                                                                 ouiModelStr)) {
        return 'b/g';
      } else if (ouiModelStr === 'AC10') return 'bg';
      else if (ouiModelStr === 'EC220-G5' ||
               ouiModelStr === 'EMG3524-T10A'
      ) {
        return 'gn';
      } else if (
        ouiModelStr === 'IGD' ||
        ouiModelStr === 'FW323DAC' ||
        ouiModelStr === 'F670L' ||
        ouiModelStr === 'F680' ||
        ouiModelStr === 'F660' ||
        ouiModelStr === 'ZT199' ||
        ouiModelStr === 'G-140W-C' ||
        ouiModelStr === 'G-140W-CS' ||
        ouiModelStr === 'G-140W-UD' ||
        ouiModelStr === 'G-2425G-A' ||
        ouiModelStr === 'ST-1001-FL' ||
        ouiModelStr === 'GWR-1200AC'
      ) {
        return 'b,g';
      } else if (
        ouiModelStr === 'GONUAC001' ||
        ouiModelStr === 'GONUAC002' ||
        ouiModelStr === 'P20'
      ) {
        return 'bg';
      } else if (ouiModelStr === 'DIR-842' || ouiModelStr === 'DIR-841') {
        return 'g-only';
      } else return '11bg';
    case '11n':
      if (ouiModelStr === 'HG8245Q2') return '11bgn';
      else if (['WS7001-40', 'WS7100-30', 'WS5200-21', 'WS5200-40'].includes(
                                                                 ouiModelStr)) {
        return 'b/g/n';
      } else if (ouiModelStr === 'HG9') return 'gn';
      else if (
        ouiModelStr === 'AC10' ||
        ouiModelStr === 'DM986-414') {
        return 'bgn';
      } else if (
        ouiModelStr === 'EC220-G5' ||
        ouiModelStr === 'EMG3524-T10A'
      ) {
        return 'n';
      } else if (
        ouiModelStr === 'IGD' ||
        ouiModelStr === 'FW323DAC' ||
        ouiModelStr === 'F670L' ||
        ouiModelStr === 'F660' ||
        ouiModelStr === 'F680' ||
        ouiModelStr === 'ZT199' ||
        ouiModelStr === 'G-140W-C' ||
        ouiModelStr === 'G-140W-CS' ||
        ouiModelStr === 'G-140W-UD' ||
        ouiModelStr === 'DIR-842' ||
        ouiModelStr === 'DIR-841' ||
        ouiModelStr === 'G-2425G-A' ||
        ouiModelStr === 'ST-1001-FL' ||
        ouiModelStr === 'GWR-1200AC'
      ) {
        return 'b,g,n';
      } else if (
        ouiModelStr === 'GONUAC001' ||
        ouiModelStr === 'GONUAC002' ||
        ouiModelStr === 'P20'
      ) {
        return 'bgn';
      } else return '11bgn';
    case '11na':
      if (ouiModelStr === 'IGD' || ouiModelStr === 'FW323DAC') return 'a,n';
      else if (ouiModelStr === 'HG8245Q2') return '11na';
      else if (['WS7001-40', 'WS7100-30', 'WS5200-21', 'WS5200-40'].includes(
                                                                 ouiModelStr)) {
        return 'a/n';
      } else if (ouiModelStr === 'F670L') return 'a,n';
      else if (ouiModelStr === 'F660') return 'a,n';
      else if (ouiModelStr === 'F680') return 'a,n';
      else if (ouiModelStr === 'ZT199') return 'a,n';
      else if (ouiModelStr === 'ST-1001-FL') return 'a,n';
      else if (ouiModelStr === 'HG9' || ouiModelStr === 'DM986-414') return 'n';
      else if (ouiModelStr === 'AC10') return 'an+ac';
      else if (ouiModelStr === 'EC220-G5') return 'nac';
      else if (ouiModelStr === 'EMG3524-T10A') return 'n';
      else if (
        ouiModelStr === 'G-140W-C' ||
        ouiModelStr === 'G-140W-CS' ||
        ouiModelStr === 'G-140W-UD' ||
        ouiModelStr === 'GWR-1200AC'
      ) {
        return 'a,n';
      } else if (ouiModelStr === 'GONUAC001' || ouiModelStr === 'GONUAC002') {
        return 'an';
      } else if (ouiModelStr === 'DIR-842' || ouiModelStr === 'DIR-841') {
        return 'a,n';
      } else if (ouiModelStr === 'G-2425G-A') {
        return 'a,n,ac';
      } else return '11na';
    case '11ac':
      if (ouiModelStr === 'IGD' || ouiModelStr === 'FW323DAC') return 'ac,n,a';
      else if (ouiModelStr === 'HG8245Q2') return '11ac';
      else if (['WS7001-40', 'WS7100-30', 'WS5200-21', 'WS5200-40'].includes(
                                                                 ouiModelStr)) {
        return 'a/n/ac';
      } else if (ouiModelStr === 'HG9') return 'gn';
      else if (ouiModelStr === 'AC10') return 'an+ac';
      else if (ouiModelStr === 'EC220-G5' ||
               ouiModelStr === 'EMG3524-T10A'
      ) {
        return 'ac';
      } else if (
        ouiModelStr === 'F670L' ||
        ouiModelStr === 'F660' ||
        ouiModelStr === 'F680' ||
        ouiModelStr === 'ZT199' ||
        ouiModelStr === 'G-140W-C' ||
        ouiModelStr === 'G-140W-CS' ||
        ouiModelStr === 'G-140W-UD' ||
        ouiModelStr === 'G-2425G-A' ||
        ouiModelStr === 'ST-1001-FL' ||
        ouiModelStr === 'GWR-1200AC'
      ) {
        return 'a,n,ac';
      } else if (
        ouiModelStr === 'GONUAC001' ||
        ouiModelStr === 'GONUAC002' ||
        ouiModelStr === 'DM986-414') {
        return 'anac';
      } else if (ouiModelStr === 'DIR-842' || ouiModelStr === 'DIR-841') {
        return 'ac,a,n';
      } else return '11ac';
    case '11ax':
      if (ouiModelStr === 'WS7001-40' || ouiModelStr === 'WS7100-30') {
        return 'a/n/ac/ax';
      }
      return '11ax';
    default:
      return '';
  }
};

const convertWifiBand = function(band, model, is5ghz=false) {
  if ((model === 'G-2425G-A') && !is5ghz) {
    return '20MHz';
  }
  switch (band) {
    case 'HT20':
    case 'VHT20':
      if (model === 'AC10') return '0';
      if (model === 'EG8145X6' || model === 'HG8121H') return '1';
      if (model === 'ST-1001-FL') return '20Mhz';
      if (model === 'EC220-G5') return '20M';
      return '20MHz';
    case 'HT40':
    case 'VHT40':
      if (model === 'AC10') return '1';
      if (model === 'EG8145X6' || model === 'HG8121H') return '2';
      if (model === 'ST-1001-FL') return '40Mhz';
      if (model === 'DIR-842' || model === 'DIR-841') return '20/40MHz';
      if (model === 'EC220-G5') return '40M';
      return '40MHz';
    case 'VHT80':
      if (model === 'AC10' || model === 'EG8145X6') return '3';
      if (model === 'ST-1001-FL') return '80Mhz';
      if (model === 'DIR-842' || model === 'DIR-841') return '20/40/80MHz';
      if (model === 'EC220-G5') return '80M';
      return '80MHz';
    case 'auto':
      if (model === 'DIR-842' || model === 'DIR-841') {
        return (is5ghz) ? '20/40/80MHz' : '20/40MHz Coexistence';
      } else if (
        model === 'BEACON 1 HA-020W-B' ||
        model === 'ST-1001-FL' ||
        model === 'EC220-G5'
      ) {
        return 'Auto';
      } else if (model === 'AC10') {
        return '2';
      } else if (model === 'G-2425G-A') {
        return '80MHz';
      }
      if (model === 'HG8121H') return '0';
      if (model === 'EG8145X6') return (is5ghz) ? '3' : '0';
      return 'auto';
    default:
      return '';
  }
};

const convertField = function(masterKey, key, oui, model, value) {
  let result = {value: null, type: getFieldType(masterKey, key, model)};
  switch (masterKey+'-'+key) {
    case 'lan-subnet_mask':
      result.value = convertSubnetIntToMask(value); // convert to ip subnet
      break;
    case 'wifi2-enable':
    case 'wifi5-enable':
    case 'mesh2-enable':
    case 'mesh5-enable':
    case 'mesh2-advertise':
    case 'mesh5-advertise':
      if (model == 'AC10') {
        result.value = (value > 0) ? '1' : '0';
      } else if (['G-140W-C', 'G-140W-CS', 'G-140W-UD'].includes(model)) {
        result.value = (value > 0) ? 'TRUE' : 'FALSE';
      } else {
        result.value = (value > 0) ? true : false; // convert to boolean
      }
      break;
    case 'common-interval':
    case 'wifi2-channel':
    case 'wifi5-channel':
    case 'mesh2-channel':
    case 'mesh5-channel':
      result.value = parseInt(value); // convert to integer
      break;
    case 'wifi2-mode':
    case 'wifi5-mode':
    case 'mesh2-mode':
    case 'mesh5-mode':
      result.value = convertWifiMode(value, oui, model); // convert to TR-069
      break;
    case 'wifi2-band':
    case 'mesh2-band':
      result.value = convertWifiBand(value, model); // convert to TR-069
      break;
    case 'wifi5-band':
    case 'mesh5-band':
      // convert to TR-069 format
      result.value = convertWifiBand(value, model, true); // convert to TR-069
      break;
    default:
      result.value = value; // no transformation necessary
  }
  return result;
};

const getDefaultFields = function() {
  return {
    common: {
      mac: 'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.MACAddress',
      model: 'InternetGatewayDevice.DeviceInfo.ModelName',
      version: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
      ip: 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
      acs_url: 'InternetGatewayDevice.ManagementServer.URL',
      interval: 'InternetGatewayDevice.ManagementServer.PeriodicInformInterval',
    },
    wan: {
      pppoe_enable: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Enable',
      pppoe_user: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Username',
      pppoe_pass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Password',
      rate: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.MaxBitRate',
      duplex: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.DuplexMode',
      wan_ip: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.1.ExternalIPAddress',
      wan_ip_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.ExternalIPAddress',
      uptime: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.1.Uptime',
      uptime_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Uptime',
      mtu: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.MaxMTUSize',
      mtu_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.MaxMRUSize',
      recv_bytes: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.Stats.BytesReceived',
      sent_bytes: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.Stats.BytesSent',
      port_mapping_entries_dhcp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.PortMappingNumberOfEntries',
      port_mapping_entries_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.PortMappingNumberOfEntries',
    },
    port_mapping_dhcp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.'+
      '*.WANIPConnection.*.PortMapping',
    port_mapping_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.'+
      '*.WANPPPConnection.*.PortMapping',
    /* The port_mapping_(values|fields) is a auxiliary sub object to dispatch
      setParameterValues task in genie. Its works on the settings below:
        First array element - Field on tr-069 xml spec;
        Second array element - Default value or field in port_mapping
          definition of models/device.js that carry the value;
        Third array element - The xml data type specification; */
    port_mapping_fields: {
      external_port_start: ['ExternalPort', 'external_port_start',
        'xsd:unsignedInt'],
      internal_port_start: ['InternalPort', 'internal_port_start',
        'xsd:unsignedInt'],
      client: ['InternalClient', 'ip', 'xsd:string'],
    },
    port_mapping_values: {
      enable: ['PortMappingEnabled', true, 'xsd:boolean'],
      lease: ['PortMappingLeaseDuration', 0, 'xsd:unsignedInt'],
      // hardcoded for every device
      protocol: ['PortMappingProtocol', '', 'xsd:string'],
      description: ['PortMappingDescription', '', 'xsd:string'],
      remote_host: ['RemoteHost', '0.0.0.0', 'xsd:string'],
    },
    lan: {
      router_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPInterface.1.IPInterfaceIPAddress',
      subnet_mask: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPInterface.1.IPInterfaceSubnetMask',
      lease_min_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MinAddress',
      lease_max_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MaxAddress',
      ip_routers: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPRouters',
      dns_servers: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.DNSServers',
    },
    wifi2: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType',
      band: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BandWidth',
    },
    wifi5: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Enable',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BeaconType',
      band: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BandWidth',
    },
    mesh2: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable',
      advertise: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSIDAdvertisementEnabled',
      encryption: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.WPAEncryptionModes',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.BeaconType',
    },
    mesh5: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Enable',
      advertise: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.SSIDAdvertisementEnabled',
      encryption: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.WPAEncryptionModes',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.BeaconType',
    },
    log: 'InternetGatewayDevice.DeviceInfo.DeviceLog',
    devices: {
      hosts: 'InternetGatewayDevice.LANDevice.1.Hosts',
      hosts_template: 'InternetGatewayDevice.LANDevice.1.Hosts.Host',
      host_mac: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress',
      host_name: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName',
      host_ip: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress',
      host_layer2: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.Layer2Interface',
      associated: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice',
      assoc_total: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.TotalAssociations',
      assoc_mac: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceMACAddress',
    },
    diagnostics: {
      ping: {
        root: 'InternetGatewayDevice.IPPingDiagnostics',
        diag_state: 'InternetGatewayDevice.IPPingDiagnostics.DiagnosticsState',
        failure_count: 'InternetGatewayDevice.IPPingDiagnostics.FailureCount',
        success_count: 'InternetGatewayDevice.IPPingDiagnostics.SuccessCount',
        host: 'InternetGatewayDevice.IPPingDiagnostics.Host',
        num_of_rep: 'InternetGatewayDevice.IPPingDiagnostics.NumberOfRepetitions',
        avg_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.AverageResponseTime',
        max_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.MaximumResponseTime',
        min_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.MinimumResponseTime',
        timeout: 'InternetGatewayDevice.IPPingDiagnostics.Timeout',
      },
      speedtest: {
        root: 'InternetGatewayDevice.DownloadDiagnostics',
        diag_state: 'InternetGatewayDevice.DownloadDiagnostics.DiagnosticsState',
        num_of_conn: 'InternetGatewayDevice.DownloadDiagnostics.NumberOfConnections',
        download_url: 'InternetGatewayDevice.DownloadDiagnostics.DownloadURL',
        bgn_time: 'InternetGatewayDevice.DownloadDiagnostics.BOMTime',
        end_time: 'InternetGatewayDevice.DownloadDiagnostics.EOMTime',
        test_bytes_rec: 'InternetGatewayDevice.DownloadDiagnostics.TestBytesReceived',
        down_transports: 'InternetGatewayDevice.DownloadDiagnostics.DownloadTransports',
        full_load_bytes_rec: 'InternetGatewayDevice.DownloadDiagnostics.TestBytesReceivedUnderFullLoading',
        full_load_period: 'InternetGatewayDevice.DownloadDiagnostics.PeriodOfFullLoading',
      },
    },
  };
};

const getTPLinkFields = function(model) {
  let fields = getDefaultFields();
  if (model === 'Archer C6') {
    fields.common.mac = 'InternetGatewayDevice.LANDevice.1.'+
      'LANHostConfigManagement.MACAddress';
  }
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/5/g, '2');
  fields.wifi5.bssid = fields.wifi5.bssid.replace(/5/g, '2');
  fields.wifi5.password = fields.wifi5.password.replace(/5/g, '2');
  fields.wifi5.channel = fields.wifi5.channel.replace(/5/g, '2');
  fields.wifi5.auto = fields.wifi5.auto.replace(/5/g, '2');
  fields.wifi5.mode = fields.wifi5.mode.replace(/5/g, '2');
  fields.wifi5.enable = fields.wifi5.enable.replace(/5/g, '2');
  fields.wifi5.beacon_type = fields.wifi5.beacon_type.replace(/5/g, '2');
  fields.wifi5.band = fields.wifi5.band.replace(/5/g, '2');
  if (model === 'EC220-G5') {
    fields.common.web_admin_password = 'InternetGatewayDevice.X_TP_UserCfg.UserPwd';
    fields.wifi2.password = fields.wifi2.password
      .replace(/KeyPassphrase/g, 'X_TP_PreSharedKey');
    fields.wifi5.password = fields.wifi5.password
      .replace(/KeyPassphrase/g, 'X_TP_PreSharedKey');
    fields.wifi2.band = fields.wifi2.band
      .replace(/BandWidth/g, 'X_TP_Bandwidth');
    fields.wifi5.band = fields.wifi5.band
      .replace(/BandWidth/g, 'X_TP_Bandwidth');
    fields.port_mapping_fields.external_port_end =
    ['X_TP_ExternalPortEnd', 'external_port_end', 'xsd:unsignedInt'];
    fields.port_mapping_fields.internal_port_end =
    ['X_TP_InternalPortEnd', 'internal_port_end', 'xsd:unsignedInt'];
    fields.port_mapping_values.description[0] = 'ServiceName';
    fields.port_mapping_values.protocol[1] = 'TCP or UDP';
    delete fields.port_mapping_values.remote_host;
    delete fields.port_mapping_values.lease;
    // is needless to set this parameter
    delete fields.lan.dns_servers;
    fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1'+
      '.WLANConfiguration.*.AssociatedDevice.*.X_TP_StaSignalStrength';
    fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1'+
      '.WLANConfiguration.*.AssociatedDevice.*.X_TP_StaStandard';
    fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1'+
      '.WLANConfiguration.*.AssociatedDevice.*.X_TP_StaConnectionSpeed';
  } else {
    fields.wifi2.password = fields.wifi2.password
      .replace(/KeyPassphrase/g, 'X_TP_Password');
    fields.wifi5.password = fields.wifi5.password
      .replace(/KeyPassphrase/g, 'X_TP_Password');
    fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
      'WANCommonInterfaceConfig.TotalBytesReceived';
    fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
      'WANCommonInterfaceConfig.TotalBytesSent';
  }
  return fields;
};

const getHuaweiFields = function(model, modelName) {
  let fields = getDefaultFields();
  if (['HG8245Q2', 'EG8145V5', 'HG8121H', 'EG8145X6'].includes(model)) {
    fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.UserName';
    fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.Password';
    fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.Stats.BytesReceived';
    fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.Stats.BytesSent';
    fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower';
    fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower';
    fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_HW_VLAN';
    fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_RSSI';
    fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_SNR';
    fields.port_mapping_fields.internal_port_end = ['X_HW_InternalEndPort', 'internal_port_end', 'xsd:unsignedInt'];
    fields.port_mapping_fields.external_port_end = ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
    delete fields.port_mapping_values.remote_host;
    fields.port_mapping_values.protocol[1] = 'TCP/UDP';
    fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey');
    fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey');
    fields.mesh2.password = fields.mesh2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey');
    fields.mesh5.password = fields.mesh5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey');
    fields.mesh5.ssid = fields.mesh5.ssid.replace(/6/g, '3');
    fields.mesh5.bssid = fields.mesh5.bssid.replace(/6/g, '3');
    fields.mesh5.password = fields.mesh5.password.replace(/6/g, '3');
    fields.mesh5.channel = fields.mesh5.channel.replace(/6/g, '3');
    fields.mesh5.auto = fields.mesh5.auto.replace(/6/g, '3');
    fields.mesh5.mode = fields.mesh5.mode.replace(/6/g, '3');
    fields.mesh5.enable = fields.mesh5.enable.replace(/6/g, '3');
    fields.mesh5.advertise = fields.mesh5.advertise.replace(/6/g, '3');
    fields.mesh5.encryption = fields.mesh5.encryption.replace(/6/g, '3');
    fields.mesh5.beacon_type = fields.mesh5.beacon_type.replace(/6/g, '3');
    fields.mesh2.rates = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.BasicDataTransmitRates';
    fields.mesh2.radio_info = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.LowerLayers';
    fields.mesh5.rates = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.BasicDataTransmitRates';
    fields.mesh5.radio_info = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.LowerLayers';
    if (model === 'HG8121H' || model == 'EG8145X6') {
      fields.wifi2.band = fields.wifi2.band.replace(/BandWidth/g, 'X_HW_HT20');
      fields.wifi5.band = fields.wifi5.band.replace(/BandWidth/g, 'X_HW_HT20');
    }
    if (model === 'HG8121H') {
      // This model can not do number of connections on speedtest
      delete fields.diagnostics.speedtest.num_of_conn;
    }
  } else if (model === 'Huawei') {
    fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
    fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
    fields.wifi5.ssid = fields.wifi5.ssid.replace(/5/g, '2');
    fields.wifi5.bssid = fields.wifi5.bssid.replace(/5/g, '2');
    fields.wifi5.password = fields.wifi5.password.replace(/5/g, '2');
    fields.wifi5.channel = fields.wifi5.channel.replace(/5/g, '2');
    fields.wifi5.auto = fields.wifi5.auto.replace(/5/g, '2');
    fields.wifi5.mode = fields.wifi5.mode.replace(/5/g, '2');
    fields.wifi5.enable = fields.wifi5.enable.replace(/5/g, '2');
    fields.wifi5.beacon_type = fields.wifi5.beacon_type.replace(/5/g, '2');
    fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
    fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
    fields.mesh2.ssid = fields.mesh5.ssid.replace(/6/g, '3');
    fields.mesh5.ssid = fields.mesh5.ssid.replace(/6/g, '4');
    fields.mesh2.bssid = fields.mesh5.bssid.replace(/6/g, '3');
    fields.mesh5.bssid = fields.mesh5.bssid.replace(/6/g, '4');
    fields.mesh2.password = fields.mesh5.password.replace(/6/g, '3');
    fields.mesh5.password = fields.mesh5.password.replace(/6/g, '4');
    fields.mesh2.channel = fields.mesh5.channel.replace(/6/g, '3');
    fields.mesh5.channel = fields.mesh5.channel.replace(/6/g, '4');
    fields.mesh2.auto = fields.mesh5.auto.replace(/6/g, '3');
    fields.mesh5.auto = fields.mesh5.auto.replace(/6/g, '4');
    fields.mesh2.mode = fields.mesh5.mode.replace(/6/g, '3');
    fields.mesh5.mode = fields.mesh5.mode.replace(/6/g, '4');
    fields.mesh2.enable = fields.mesh5.enable.replace(/6/g, '3');
    fields.mesh5.enable = fields.mesh5.enable.replace(/6/g, '4');
    fields.mesh2.advertise = fields.mesh5.advertise.replace(/6/g, '3');
    fields.mesh5.advertise = fields.mesh5.advertise.replace(/6/g, '4');
    fields.mesh2.encryption = fields.mesh5.encryption.replace(/6/g, '3');
    fields.mesh5.encryption = fields.mesh5.encryption.replace(/6/g, '4');
    fields.mesh2.beacon_type = fields.mesh5.beacon_type.replace(/6/g, '3');
    fields.mesh5.beacon_type = fields.mesh5.beacon_type.replace(/6/g, '4');
    fields.mesh2.password = fields.mesh2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
    fields.mesh5.password = fields.mesh5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
    if (modelName === 'WS7001-40' || modelName === 'WS7100-30') {
      fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceRssi';
      delete fields.wan.port_mapping_entries_dhcp;
      delete fields.wan.port_mapping_entries_ppp;
      fields.port_mapping_dhcp = 'InternetGatewayDevice.Services.X_HUAWEI_PortForwarding';
      fields.port_mapping_ppp = 'InternetGatewayDevice.Services.X_HUAWEI_PortForwarding';
      fields.port_mapping_values.protocol[1] = 'TCP/UDP';
      fields.port_mapping_values.remote_host = ['RemoteHost', '', 'xsd:string'];
      fields.port_mapping_fields.internal_port_end = ['InternalPortEndRange', 'internal_port_end', 'xsd:unsignedInt'];
      fields.port_mapping_fields.external_port_end = ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
      delete fields.port_mapping_values.lease;
    }
  }
  return fields;
};

const getPhyHomeFields = function(model, modelName) {
  let fields = getDefaultFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower';
  return fields;
};

const getZTEFields = function(model) {
  let fields = getDefaultFields();
  switch (model) {
    case 'ZXHN H198A V3.0': // Multilaser ZTE RE914
    case 'ZXHN%20H198A%20V3%2E0': // URI encoded
      fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.X_ZTE-COM_AdminAccount.Username';
      fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.X_ZTE-COM_AdminAccount.Password';
      fields.devices.associated = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice';
      fields.devices.associated_5 = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.AssociatedDevice';
      fields.port_mapping_fields.internal_port_end = ['X_ZTE-COM_InternalPortEndRange', 'internal_port_start', 'xsd:unsignedInt'];
      fields.port_mapping_values.protocol[1] = 'BOTH';
      fields.common.stun_enable =
        'InternetGatewayDevice.ManagementServer.STUNEnable';
      fields.stun = {};
      fields.stun.address =
        'InternetGatewayDevice.ManagementServer.STUNServerAddress';
      fields.stun.port =
        'InternetGatewayDevice.ManagementServer.STUNServerPort';
      fields.common.stun_udp_conn_req_addr =
      'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
      fields.access_control = {};
      fields.access_control.wifi2 = fields.wifi2.ssid.replace(/SSID/g, 'X_ZTE-COM_AccessControl');
      fields.access_control.wifi5 = fields.wifi5.ssid.replace(/SSID/g, 'X_ZTE-COM_AccessControl');
      break;
    case 'ZXHN H199A':
    case 'ZXHN%20H199A': // URI encoded
      fields.common.web_admin_username = 'InternetGatewayDevice.User.1.Username';
      fields.common.web_admin_password = 'InternetGatewayDevice.User.1.Password';
      fields.port_mapping_fields.internal_port_end = ['X_ZTE-COM_InternalPortEndRange', 'internal_port_start', 'xsd:unsignedInt'];
      fields.port_mapping_values.protocol[1] = 'BOTH';
      fields.common.stun_enable =
        'InternetGatewayDevice.ManagementServer.STUNEnable';
      fields.stun = {};
      fields.stun.address =
        'InternetGatewayDevice.ManagementServer.STUNServerAddress';
      fields.stun.port =
        'InternetGatewayDevice.ManagementServer.STUNServerPort';
      fields.common.stun_udp_conn_req_addr =
      'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
      fields.access_control = {};
      fields.access_control.wifi2 = fields.wifi2.ssid.replace(/SSID/g, 'X_ZTE-COM_AccessControl');
      fields.access_control.wifi5 = fields.wifi5.ssid.replace(/SSID/g, 'X_ZTE-COM_AccessControl');
      fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceRssi';
      fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_RxRate';
      break;
    case 'ZT199':
      fields.wan.wan_ip = fields.wan.wan_ip
        .replace(/1.ExternalIPAddress/, '*.ExternalIPAddress');
      fields.wan.wan_ip_ppp = fields.wan.wan_ip_ppp
        .replace(/1.ExternalIPAddress/, '*.ExternalIPAddress');
      // fields.wan.uptime = fields.wan.uptime.replace(/1.Uptime/, '*.Uptime');
      fields.wan.uptime_ppp = fields.wan.uptime_ppp.replace(/1.Uptime/, '*.Uptime');
      fields.wifi2.band = fields.wifi2.band.replace(/BandWidth/g, 'X_ZTE-COM_BandWidth');
      fields.wifi5.band = fields.wifi5.band.replace(/BandWidth/g, 'X_ZTE-COM_BandWidth');
      fields.common.web_admin_username = 'InternetGatewayDevice.User.1.Username';
      fields.common.web_admin_password = 'InternetGatewayDevice.User.1.Password';
      fields.port_mapping_fields.internal_port_end = ['X_ZTE-COM_InternalPortEndRange', 'internal_port_end', 'xsd:unsignedInt'];
      fields.port_mapping_values.protocol[1] = 'BOTH';
      fields.port_mapping_values.description[0] = 'X_ZTE-COM_Name';
      fields.port_mapping_values.other_description = ['PortMappingDescription',
        '', 'xsd:string'];
      fields.port_mapping_values.zte_remote_host_end = [
        'X_ZTE-COM_RemoteHostEndRange', '0.0.0.0', 'xsd:string'];
      fields.common.stun_enable =
        'InternetGatewayDevice.ManagementServer.STUNEnable';
      fields.stun = {};
      fields.stun.address =
        'InternetGatewayDevice.ManagementServer.STUNServerAddress';
      fields.stun.port =
        'InternetGatewayDevice.ManagementServer.STUNServerPort';
      fields.common.stun_udp_conn_req_addr =
      'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
      fields.access_control = {};
      fields.access_control.wifi2 = fields.wifi2.ssid.replace(/SSID/g, 'X_ZTE-COM_AccessControl');
      fields.access_control.wifi5 = fields.wifi5.ssid.replace(/SSID/g, 'X_ZTE-COM_AccessControl');
      break;
    case 'F660': // Multilaser ZTE F660
    case 'F670L': // Multilaser ZTE F670L
    case 'F680': // Multilaser ZTE F680
      fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.X_ZTE-COM_WebUserInfo.AdminName';
      fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.X_ZTE-COM_WebUserInfo.AdminPassword';
      fields.wan.recv_bytes = fields.wan.recv_bytes.replace(/WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig');
      fields.wan.sent_bytes = fields.wan.sent_bytes.replace(/WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig');
      fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_ZTE-COM_VLANID';
      fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_RSSI';
      fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_SNR';
      fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
      fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower';
      fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXPower';
      fields.port_mapping_values.protocol[1] = 'TCP AND UDP';
      fields.access_control = {};
      fields.access_control.wifi2 = fields.wifi2.ssid.replace(/SSID/g, 'X_ZTE-COM_AccessControl');
      fields.access_control.wifi5 = fields.wifi5.ssid.replace(/SSID/g, 'X_ZTE-COM_AccessControl');
      break;
  }
  fields.port_mapping_fields.external_port_end = ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
  fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.mesh2.password = fields.mesh2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.mesh5.password = fields.mesh5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  return fields;
};

const getDatacomFields = function(model) {
  let fields = getDefaultFields();
  switch (model) {
    case 'DM985-424':
    case 'DM985%2D424':
      fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
      fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
      fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower';
      fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower';
      fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.InterfaceType';
      fields.port_mapping_values.protocol[1] = 'BOTH';
      fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Password';
      delete fields.port_mapping_fields.external_port_end;
      break;
  }
  return fields;
};

const getNokiaFields = function(model) {
  let fields = getDefaultFields();
  switch (model) {
    case 'BEACON HA-020W-B':
    case 'BEACON 1 HA-020W-B':
    case 'BEACON%20HA%2D020W%2DB':
    case 'G-2425G-A':
    case 'G%2D2425G%2DA': // URI encoded
      fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_ALU_COM_ChannelBandWidthExtend';
      fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
      fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.X_ALU_COM_ChannelBandWidthExtend';
      fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
      fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.RSSI';
      fields.common.web_admin_username = 'InternetGatewayDevice.X_Authentication.WebAccount.UserName';
      fields.common.web_admin_password = 'InternetGatewayDevice.X_Authentication.WebAccount.Password';
      fields.port_mapping_values.protocol[1] = 'TCPorUDP';
      fields.port_mapping_fields.external_port_end = ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
      fields.port_mapping_values.remote_host =
         ['RemoteHost', '', 'xsd:string'];
      fields.port_mapping_fields.internal_port_end = ['X_ASB_COM_InternalPortEnd', 'internal_port_end', 'xsd:unsignedInt'];
      break;
    case 'G-140W-C':
    case 'G%2D140W%2DC':
    case 'G-140W-CS':
    case 'G%2D140W%2DCS':
    case 'G-140W-UD':
    case 'G%2D140W%2DUD':
      fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.X_CMCC_TeleComAccount.Username';
      fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.X_CMCC_TeleComAccount.Password';
      fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
      fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
      fields.mesh2.password = fields.mesh2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
      fields.mesh5.password = fields.mesh5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
      fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_CMCC_GponInterfaceConfig.RXPower';
      fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_CMCC_GponInterfaceConfig.TXPower';
      fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_CMCC_VLANIDMark';
      fields.wan.mtu = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.InterfaceMtu';
      fields.wan.mtu_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.InterfaceMtu';
      break;
    default:
      break;
  }
  return fields;
};

const getNokiaG2425Fields = function(model) {
  let fields = getNokiaFields(model);
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.X_ALU_OntOpticalParam.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.X_ALU_OntOpticalParam.TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  return fields;
};

const getGreatekFields = function(model) {
  let fields = getDefaultFields();
  for (let [key, value] of Object.entries(fields.wifi2)) {
    fields.wifi2[key] =
      value.replace(/WLANConfiguration.1/g, 'WLANConfiguration.2');
  }
  for (let [key, value] of Object.entries(fields.wifi5)) {
    fields.wifi5[key] =
      value.replace(/WLANConfiguration.5/g, 'WLANConfiguration.1');
  }
  for (let [key, value] of Object.entries(fields.mesh2)) {
    fields.mesh2[key] =
      value.replace(/WLANConfiguration.2/g, 'WLANConfiguration.4');
  }
  for (let [key, value] of Object.entries(fields.mesh5)) {
    fields.mesh5[key] =
      value.replace(/WLANConfiguration.6/g, 'WLANConfiguration.3');
  }
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh2.password = fields.mesh2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh5.password = fields.mesh5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  // This model can not do number of connections on speedtest
  delete fields.diagnostics.speedtest.num_of_conn;
  // Port forwarding fields
  fields.port_mapping_fields.external_port_end =
    ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
  fields.port_mapping_values.protocol =
    ['PortMappingProtocol', 'TCPandUDP', 'xsd:string'];
  // STUN fields
  fields.common.stun_enable =
    'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.stun = {};
  fields.stun.address =
    'InternetGatewayDevice.ManagementServer.STUNServerAddress';
  fields.stun.port =
    'InternetGatewayDevice.ManagementServer.STUNServerPort';
  fields.common.stun_udp_conn_req_addr =
  'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
  return fields;
};

const getStavixFields = function(model) {
  let fields = getDefaultFields();
  switch (model) {
    case 'GONUAC001':
    case 'GONUAC002':
      /* Removed due to high json payload in cwmp request from provision.js.
      This field make the json request in syncDeviceData too big,
      around 97kB of payload in pppoe and 116kb of payload in ipoe/dhcp.
      The default limit is 100KB. In the large scale perspective of CPE
      administration, its easily could consume up to 100MB/min of bandwidth
      fields.common.greatek_config = 'InternetGatewayDevice.DeviceConfig.
      ConfigFile'; */
      fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_RTK_WANGponLinkConfig.VLANIDMark';
      fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.WLAN_RSSI';
      break;
    case 'xPON':
    case '121AC':
      fields.common.alt_uid = fields.common.mac;
      fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_ITBS_VlanMuxID';
      fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientSignalStrength';
      fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientMode';
      break;
    case 'DM986-414':
    case 'DM986%2D414':
      fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
      fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.X_WebUserInfo.UserPassword';
      fields.port_mapping_fields.external_port_end =
        ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
      fields.port_mapping_values.protocol =
        ['PortMappingProtocol', 'TCPandUDP', 'xsd:string'];
      break;
    case 'MP_G421R':
      break;
  }
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.TXPower';
  fields.wifi2.ssid = fields.wifi5.ssid.replace(/5/g, '6');
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/5/g, '1');
  fields.wifi2.bssid = fields.wifi5.bssid.replace(/5/g, '6');
  fields.wifi5.bssid = fields.wifi5.bssid.replace(/5/g, '1');
  fields.wifi2.password = fields.wifi5.password.replace(/5/g, '6');
  fields.wifi5.password = fields.wifi5.password.replace(/5/g, '1');
  fields.wifi2.channel = fields.wifi5.channel.replace(/5/g, '6');
  fields.wifi5.channel = fields.wifi5.channel.replace(/5/g, '1');
  fields.wifi2.auto = fields.wifi5.auto.replace(/5/g, '6');
  fields.wifi5.auto = fields.wifi5.auto.replace(/5/g, '1');
  fields.wifi2.mode = fields.wifi5.mode.replace(/5/g, '6');
  fields.wifi5.mode = fields.wifi5.mode.replace(/5/g, '1');
  fields.wifi2.enable = fields.wifi5.enable.replace(/5/g, '6');
  fields.wifi5.enable = fields.wifi5.enable.replace(/5/g, '1');
  fields.wifi2.band = fields.wifi5.band.replace(/5/g, '6');
  fields.wifi5.band = fields.wifi5.band.replace(/5/g, '1');
  fields.wifi2.beacon_type = fields.wifi5.beacon_type.replace(/5/g, '6');
  fields.wifi5.beacon_type = fields.wifi5.beacon_type.replace(/5/g, '1');
  fields.mesh2.ssid = fields.mesh5.ssid.replace(/6/g, '7');
  fields.mesh5.ssid = fields.mesh5.ssid.replace(/6/g, '2');
  fields.mesh2.bssid = fields.mesh5.bssid.replace(/6/g, '7');
  fields.mesh5.bssid = fields.mesh5.bssid.replace(/6/g, '2');
  fields.mesh2.password = fields.mesh5.password.replace(/6/g, '7');
  fields.mesh5.password = fields.mesh5.password.replace(/6/g, '2');
  fields.mesh2.channel = fields.mesh5.channel.replace(/6/g, '7');
  fields.mesh5.channel = fields.mesh5.channel.replace(/6/g, '2');
  fields.mesh2.auto = fields.mesh5.auto.replace(/6/g, '7');
  fields.mesh5.auto = fields.mesh5.auto.replace(/6/g, '2');
  fields.mesh2.mode = fields.mesh5.mode.replace(/6/g, '7');
  fields.mesh5.mode = fields.mesh5.mode.replace(/6/g, '2');
  fields.mesh2.enable = fields.mesh5.enable.replace(/6/g, '7');
  fields.mesh5.enable = fields.mesh5.enable.replace(/6/g, '2');
  fields.mesh2.advertise = fields.mesh5.advertise.replace(/6/g, '7');
  fields.mesh5.advertise = fields.mesh5.advertise.replace(/6/g, '2');
  fields.mesh2.encryption = fields.mesh5.encryption.replace(/6/g, '7');
  fields.mesh5.encryption = fields.mesh5.encryption.replace(/6/g, '2');
  fields.mesh2.beacon_type = fields.mesh5.beacon_type.replace(/6/g, '7');
  fields.mesh5.beacon_type = fields.mesh5.beacon_type.replace(/6/g, '2');
  return fields;
};

const getHg9Fields = function() {
  let fields = getStavixFields();
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.1.X_TDTC_VLAN';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'WANGponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'WANGponInterfaceConfig.TXPower';
  delete fields.wifi2.band;
  delete fields.wifi5.band;
  delete fields.mesh2.band;
  delete fields.mesh5.band;
  return fields;
};

const getFastWirelessFields = function() {
  let fields = getDefaultFields();
  fields.common.alt_uid = fields.common.mac;
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_rxpower_epon = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_EponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.pon_txpower_epon = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_EponInterfaceConfig.TXPower';
  fields.wifi2.ssid = fields.wifi5.ssid;
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/5/g, '1');
  fields.wifi2.bssid = fields.wifi5.bssid;
  fields.wifi5.bssid = fields.wifi5.bssid.replace(/5/g, '1');
  fields.wifi2.password = fields.wifi5.password;
  fields.wifi5.password = fields.wifi5.password.replace(/5/g, '1');
  fields.wifi2.channel = fields.wifi5.channel;
  fields.wifi5.channel = fields.wifi5.channel.replace(/5/g, '1');
  fields.wifi2.auto = fields.wifi5.auto;
  fields.wifi5.auto = fields.wifi5.auto.replace(/5/g, '1');
  fields.wifi2.mode = fields.wifi5.mode;
  fields.wifi5.mode = fields.wifi5.mode.replace(/5/g, '1');
  fields.wifi2.enable = fields.wifi5.enable;
  fields.wifi5.enable = fields.wifi5.enable.replace(/5/g, '1');
  fields.wifi2.band = fields.wifi5.band;
  fields.wifi5.band = fields.wifi5.band.replace(/5/g, '1');
  fields.wifi2.beacon_type = fields.wifi5.beacon_type;
  fields.wifi5.beacon_type = fields.wifi5.beacon_type.replace(/5/g, '1');
  /*
  fields.mesh2.ssid = fields.mesh5.ssid.replace(/6/g, '7');
  fields.mesh5.ssid = fields.mesh5.ssid.replace(/6/g, '2');
  fields.mesh2.bssid = fields.mesh5.bssid.replace(/6/g, '7');
  fields.mesh5.bssid = fields.mesh5.bssid.replace(/6/g, '2');
  fields.mesh2.password = fields.mesh5.password.replace(/6/g, '7');
  fields.mesh5.password = fields.mesh5.password.replace(/6/g, '2');
  fields.mesh2.channel = fields.mesh5.channel.replace(/6/g, '7');
  fields.mesh5.channel = fields.mesh5.channel.replace(/6/g, '2');
  fields.mesh2.auto = fields.mesh5.auto.replace(/6/g, '7');
  fields.mesh5.auto = fields.mesh5.auto.replace(/6/g, '2');
  fields.mesh2.mode = fields.mesh5.mode.replace(/6/g, '7');
  fields.mesh5.mode = fields.mesh5.mode.replace(/6/g, '2');
  fields.mesh2.enable = fields.mesh5.enable.replace(/6/g, '7');
  fields.mesh5.enable = fields.mesh5.enable.replace(/6/g, '2');
  fields.mesh2.advertise = fields.mesh5.advertise.replace(/6/g, '7');
  fields.mesh5.advertise = fields.mesh5.advertise.replace(/6/g, '2');
  fields.mesh2.encryption = fields.mesh5.encryption.replace(/6/g, '7');
  fields.mesh5.encryption = fields.mesh5.encryption.replace(/6/g, '2');
  fields.mesh2.beacon_type = fields.mesh5.beacon_type.replace(/6/g, '7');
  fields.mesh5.beacon_type = fields.mesh5.beacon_type.replace(/6/g, '2');
  */
  return fields;
};

const getDLinkFields = function(modelName) {
  let fields = getDefaultFields();
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/5/g, '3');
  fields.wifi5.bssid = fields.wifi5.bssid.replace(/5/g, '3');
  fields.wifi5.password = fields.wifi5.password.replace(/5/g, '3');
  fields.wifi5.channel = fields.wifi5.channel.replace(/5/g, '3');
  fields.wifi5.auto = fields.wifi5.auto.replace(/5/g, '3');
  fields.wifi5.mode = fields.wifi5.mode.replace(/5/g, '3');
  fields.wifi5.enable = fields.wifi5.enable.replace(/5/g, '3');
  fields.wifi5.band = fields.wifi5.band.replace(/5/g, '3');
  fields.wifi5.beacon_type = fields.wifi5.beacon_type.replace(/5/g, '3');
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_DLINK_OperatingChannelBandwidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.X_DLINK_OperatingChannelBandwidth';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_DLINK_RSSI';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  if (modelName == 'DIR-841') {
    fields.common.alt_uid = 'DeviceID.SerialNumber';
    fields.wan.wan_ip = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.ExternalIPAddress';
    fields.wan.uptime = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.Uptime';
  }
  return fields;
};

const getTendaFields = function() {
  let fields = getDefaultFields();
  fields.common.alt_uid = fields.common.mac;
  fields.common.model = 'InternetGatewayDevice.DeviceInfo.ProductClass';
  fields.stun = {};
  fields.common.stun_enable =
    'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.stun.address =
    'InternetGatewayDevice.ManagementServer.STUNServerAddress';
  fields.stun.port =
    'InternetGatewayDevice.ManagementServer.STUNServerPort';
  fields.common.stun_udp_conn_req_addr =
  'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
  fields.lan.subnet_mask = 'InternetGatewayDevice.LANDevice.1'+
    '.LANHostConfigManagement.SubnetMask';
  fields.lan.enable_config = 'InternetGatewayDevice.LANDevice.1.'+
    'LANHostConfigManagement.DHCPServerConfigurable';

  fields.port_mapping_fields.external_port_start =
   ['ExternalPort', 'external_port_start', 'xsd:string'];
  fields.port_mapping_fields.external_port_end =
   ['ExternalPortEndRange', 'external_port_end', 'xsd:string'];
  fields.port_mapping_fields.internal_port_start =
   ['InternalPort', 'internal_port_start', 'xsd:string'];
  fields.port_mapping_fields.client =
   ['InternalClient', 'ip', 'xsd:string'];
  fields.port_mapping_values.enable =
   ['PortMappingEnabled', '1', 'xsd:string'];
  fields.port_mapping_values.lease =
   ['PortMappingLeaseDuration', '0', 'xsd:string'];
  fields.port_mapping_values.protocol =
   ['PortMappingProtocol', 'TCP AND UDP', 'xsd:string'];
  fields.port_mapping_values.description =
   ['PortMappingDescription', '0', 'xsd:string'];
  fields.port_mapping_values.remote_host =
   ['RemoteHost', '0', 'xsd:string'];
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/5/g, '2');
  fields.wifi5.bssid = fields.wifi5.bssid.replace(/5/g, '2');
  fields.wifi5.password = fields.wifi5.password.replace(/5/g, '2');
  fields.wifi5.channel = fields.wifi5.channel.replace(/5/g, '2');
  fields.wifi5.auto = fields.wifi5.auto.replace(/5/g, '2');
  fields.wifi5.mode = fields.wifi5.mode.replace(/5/g, '2');
  fields.wifi5.enable = fields.wifi5.enable.replace(/5/g, '2');
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration'+
    '.1.X_CT-COM_ChannelWidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration'+
    '.2.X_CT-COM_ChannelWidth';
  fields.wifi5.beacon_type = fields.wifi5.beacon_type.replace(/5/g, '2');

  fields.devices.associated = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.1.AssociatedDevice';
  fields.devices.associated_5 = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.2.AssociatedDevice';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1'+
  '.WLANConfiguration.*.AssociatedDevice.*.X_CT-COM_RSSI';
  fields.devices.alt_host_name = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.*.AssociatedDevice.*.X_CT-COM_DhcpName';
  fields.mesh2 = {};
  fields.mesh5 = {};
  return fields;
};

const getHurakallFields = function() {
  let fields = getDefaultFields();
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.stun = {};
  fields.stun.address = 'InternetGatewayDevice.ManagementServer.STUNServerAddress';
  fields.stun.port = 'InternetGatewayDevice.ManagementServer.STUNServerPort';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Password';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  // fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_RSSI';
  // fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_SNR';
  // fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower';
  fields.port_mapping_values.protocol[1] = 'TCP AND UDP';
  fields.port_mapping_fields.external_port_end = ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
  fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.mesh2.password = fields.mesh2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.mesh5.password = fields.mesh5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  return fields;
};

const getZyxelFields = function() {
  let fields = getDefaultFields();
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.stun = {};
  fields.stun.address = 'InternetGatewayDevice.ManagementServer.STUNServerAddress';
  fields.stun.port = 'InternetGatewayDevice.ManagementServer.STUNServerPort';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
  fields.common.web_admin_username = 'InternetGatewayDevice.X_5067F0_Ext.LoginPrivilegeMgmt.1.UserName';
  fields.common.web_admin_password = 'InternetGatewayDevice.X_5067F0_Ext.LoginPrivilegeMgmt.1.Password';
  fields.wan.rate = 'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.4.Stats.X_5067F0_MaxBitRate';
  fields.wan.duplex = 'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.4.Stats.X_5067F0_DuplexMode';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Stats.EthernetBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Stats.EthernetBytesSent';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.SignalStrength';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  fields.port_mapping_values.protocol[1] = 'TCP/UDP';
  fields.port_mapping_values.remote_host = ['RemoteHost', '', 'xsd:string'];
  fields.port_mapping_values.description = ['PortMappingDescription', 'User Define', 'xsd:string'];
  fields.port_mapping_fields.external_port_end = ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
  fields.wifi2.password = fields.wifi2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.wifi5.password = fields.wifi5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.mesh2.password = fields.mesh2.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.mesh5.password = fields.mesh5.password.replace(/KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  return fields;
};

const getModelFieldsFromDevice = function(device) {
  let splitAcsID = device.acs_id.split('-');
  let oui = splitAcsID[0];
  let model = splitAcsID.slice(1, splitAcsID.length-1).join('-');
  let modelName = device.model;
  let firmwareVersion = device.version;
  return getModelFields(oui, model, modelName, firmwareVersion);
};

const getModelFields = function(oui, model, modelName, firmwareVersion) {
  let message = 'Unknown error';
  let fields = {};
  const unknownModel = {
    success: false,
    message: 'Unknown Model',
    fields: getDefaultFields(),
  };
  switch (model) {
    case 'HG8245Q2': // Huawei HG8245Q2
    case 'EG8145V5': // Huawei EG8145V5
    case 'HG8121H': // Huawei HG8121H
    case 'EG8145X6': // Huawei EG8145X6
      message = '';
      fields = getHuaweiFields(model, modelName);
      break;
    case 'Huawei':
      switch (modelName) {
        case 'WS5200-21': // Huawei WS5200 v2
        case 'WS5200-40': // Huawei WS5200 v3
          message = '';
          fields = getHuaweiFields(model, modelName);
          break;
        case 'WS7001-40': // Huawei AX2
        case 'WS7100-30': // Huawei AX3
          message = '';
          fields = getHuaweiFields(model, modelName);
          break;
        default:
          return unknownModel;
      }
      break;
    case 'ZXHN H199A': // Multilaser ZTE RE914
    case 'ZXHN H198A V3.0': // Multilaser ZTE RE914
    case 'ZXHN%20H198A%20V3%2E0': // URI encoded
    case 'ZXHN%20H199A': // URI encoded
    case 'F660': // Multilaser ZTE F660
    case 'F670L': // Multilaser ZTE F670L
    case 'F680': // Multilaser ZTE F680
    case 'ZT199': // Multilaser ZT199 Space Series
      message = '';
      fields = getZTEFields(model);
      break;
    case 'G-140W-C': // Nokia G-140W-C
    case 'G%2D140W%2DC': // URI encoded
    case 'G-140W-CS': // Nokia G-140W-CS
    case 'G%2D140W%2DCS': // URI encoded
    case 'G-140W-UD': // Nokia G-140W-UD
    case 'G%2D140W%2DUD': // URI encoded
    case 'BEACON HA-020W-B':
    case 'BEACON 1 HA-020W-B':
    case 'BEACON%20HA%2D020W%2DB': // URI encoded
      message = '';
      fields = getNokiaFields(model);
      break;
    case 'G-2425G-A':
    case 'G%2D2425G%2DA': // URI encoded
      message = '';
      fields = getNokiaG2425Fields(model);
      break;
    case 'MP_G421R': // Unee Stavix G412R
    case 'xPON': // Intelbras WiFiber (is a Stavix clone)
    case '121AC': // Intelbras WiFiber (is a Stavix clone)
    case 'GONUAC001': // Greatek Stavix G421R
    case 'GONUAC002': // Greatek Stavix G421R
    case 'DM986-414': // Datacom Stavix DM986-414
    case 'DM986%2D414':
      message = '';
      fields = getStavixFields(model);
      break;
    case 'HG9':
      message = '';
      fields = getHg9Fields();
      break;
    case 'HG6245D': // Fiberhome AN5506-04-CG
      message = '';
      fields = getDefaultFields();
      break;
    case 'EMG3524-T10A': // Zyxel
    case 'EMG3524%2DT10A': // URI encoded
      message = '';
      fields = getZyxelFields();
      break;
    case 'FW323DAC':
      message = '';
      fields = getFastWirelessFields();
      break;
    case 'DM985-424':
    case 'DM985%2D424':
      message = '';
      fields = getDatacomFields(model);
      break;
    case 'IGD':
      switch (modelName) {
        case 'IGD': // FastWireless FW323DAC
          message = '';
          fields = getFastWirelessFields();
          break;
        case 'EC220-G5': // TP-Link EC220-5G
        case 'Archer C6': // TP-Link Archer C6 v3.2
          message = '';
          fields = getTPLinkFields(modelName);
          break;
        case 'GWR-1200AC':
          message = '';
          fields = getGreatekFields(modelName);
          break;
        default:
          return unknownModel;
      }
      break;
    case 'Router':
      switch (modelName) {
        case 'DIR-842':
        case 'DIR-841':
        case 'DIR-615':
          message = '';
          fields = getDLinkFields(modelName);
          break;
        default:
          return unknownModel;
      }
      break;
    case 'AC10':
      message = '';
      fields = getTendaFields();
      break;
    case 'CDTSNAND128H':
      message = '';
      fields = getHurakallFields();
      break;
    case 'P20':
      message = '';
      fields = getPhyHomeFields(model);
      break;
    default:
      return unknownModel;
  }
  return {
    success: true,
    message: message,
    fields: fields,
  };
};

const getBeaconTypeByModel = function(model) {
  let ret = '';
  switch (model) {
    case 'G-140W-C': // Nokia G-140W-C
    case 'G%2D140W%2DC': // URI encoded
    case 'G-140W-CS': // Nokia G-140W-CS
    case 'G%2D140W%2DCS': // URI encoded
    case 'G-140W-UD': // Nokia G-140W-UD
    case 'G%2D140W%2DUD': // URI encoded
      ret = 'WPA/WPA2';
      break;
    case 'GONUAC001': // Greatek Stavix G421R
    case 'GONUAC002': // Greatek Stavix G421R
    case 'HG9': // Tenda HG9
      ret = 'WPA2';
      break;
    case 'F660': // Multilaser ZTE F660
    case 'F670L': // Multilaser ZTE F670L
    case 'F680': // Multilaser ZTE F680
    case 'ST-1001-FL': // Hurakall ST-1001-FL
    case 'HG8245Q2': // Huawei HG8245Q2
    case 'EG8145V5': // Huawei EG8145V5
    case 'HG8121H': // Huawei HG8121H
    case 'EG8145X6': // Huawei EG8145X6
    case 'AC10': // Tenda AC10
      ret = 'WPAand11i';
      break;
    default:
      ret = '11i';
      break;
  }
  return ret;
};

const getDeviceFields = async function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.oui || !params.model) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  let flashRes = await sendFlashmanRequest('device/inform', params);
  if (!flashRes['success'] ||
      Object.prototype.hasOwnProperty.call(flashRes, 'measure')) {
    return callback(null, flashRes);
  }
  let fieldsResult = getModelFields(
    params.oui, params.model, params.modelName, params.firmwareVersion,
  );
  if (!fieldsResult['success']) {
    return callback(null, fieldsResult);
  }
  return callback(null, {
    success: true,
    fields: fieldsResult.fields,
    measure: flashRes.data.measure,
  });
};

const computeFlashmanUrl = function(shareLoad=true) {
  let url = API_URL;
  let numInstances = INSTANCES_COUNT;
  if (shareLoad && numInstances > 1) {
    // More than 1 instance - share load between instances 1 and N-1
    // We ignore instance 0 for the same reason we ignore it for router syn
    // Instance 0 will be at port FLASHMAN_PORT, instance i will be at
    // FLASHMAN_PORT+i
    let target = Math.floor(Math.random()*(numInstances-1)) + FLASHMAN_PORT + 1;
    url = url.replace('$PORT', target.toString());
  } else {
    // Only 1 instance - force on instance 0
    url = url.replace('$PORT', FLASHMAN_PORT.toString());
  }
  return url;
};

const sendFlashmanRequest = function(route, params, shareLoad=true) {
  return new Promise((resolve, reject)=>{
    let url = computeFlashmanUrl(shareLoad);
    request({
      url: url + route,
      method: 'POST',
      json: params,
    },
    function(error, response, body) {
      if (error) {
        return resolve({
          success: false,
          message: 'Error contacting Flashman',
        });
      }
      if (response.statusCode === 200) {
        if (body.success) {
          return resolve({success: true, data: body});
        } else if (body.message) {
          return resolve({
            success: false,
            message: body.message,
          });
        } else {
          return resolve({
            success: false,
            message: (body.message) ? body.message : 'Flashman internal error',
          });
        }
      } else {
        return resolve({
          success: false,
          message: (body.message) ? body.message : 'Error in Flashman request',
        });
      }
    });
  });
};

const syncDeviceData = async function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.data || !params.acs_id) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  let result = await sendFlashmanRequest('device/syn', params);
  callback(null, result);
};

const syncDeviceDiagnostics = async function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.acs_id) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  let result = await sendFlashmanRequest('receive/diagnostic', params, false);
  callback(null, result);
};

exports.convertField = convertField;
exports.getModelFields = getModelFields;
exports.getModelFieldsFromDevice = getModelFieldsFromDevice;
exports.getBeaconTypeByModel = getBeaconTypeByModel;
exports.getDeviceFields = getDeviceFields;
exports.syncDeviceData = syncDeviceData;
exports.convertWifiMode = convertWifiMode;
exports.syncDeviceDiagnostics = syncDeviceDiagnostics;
