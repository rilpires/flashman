const basicCPEModel = require('./base-model');

const basic098CPEModel = Object.assign({}, basicCPEModel);

basic098CPEModel.getModelFields = function() {
  return {
    common: {
      mac: 'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.'+
        'MACAddress',
      model: 'InternetGatewayDevice.DeviceInfo.ModelName',
      version: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      hw_version: 'InternetGatewayDevice.DeviceInfo.HardwareVersion',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
      ip: 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
      acs_url: 'InternetGatewayDevice.ManagementServer.URL',
      interval: 'InternetGatewayDevice.ManagementServer.PeriodicInformInterval',
      // These should only be added whenever they exist, for legacy reasons:
      // web_admin_username: 'InternetGatewayDevice.User.1.Username',
      // web_admin_password: 'InternetGatewayDevice.User.1.Password',
      // stun_enable: 'InternetGatewayDevice.ManagementServer.STUNEnable',
      // stun_udp_conn_req_addr: 'InternetGatewayDevice.ManagementServer.' +
      //   'UDPConnectionRequestAddress',
      // alt_uid: 'InternetGatewayDevice.LANDevice.1.' +
      //   'LANEthernetInterfaceConfig.1.MACAddress',
    },
    wan: {
      // PPPoE
      pppoe_enable: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.Enable',
      pppoe_status: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANPPPConnection.*.ConnectionStatus',
      pppoe_user: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.Username',
      pppoe_pass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.Password',

      // DHCP
      dhcp_enable: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANIPConnection.*.Enable',
      dhcp_status: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANIPConnection.*.ConnectionStatus',

      // Mode
      rate: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.'+
        'MaxBitRate',
      duplex: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.'+
        'DuplexMode',

      // WAN IP
      wan_ip: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANIPConnection.*.ExternalIPAddress',
      wan_ip_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.ExternalIPAddress',

      // WAN MAC address
      wan_mac: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANIPConnection.*.MACAddress',
      wan_mac_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANPPPConnection.*.MACAddress',

      // IPv4 Mask
      // mask_ipv4: '',
      // mask_ipv4_ppp: '',

      // Remote Address
      // remote_address: '',
      remote_address_ppp: 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.*.WANPPPConnection.*.RemoteIPAddress',

      // Remote Mac
      // remote_mac: '',
      // remote_mac_ppp: '',

      // Default Gateway
      default_gateway: 'InternetGatewayDevice.WANDevice.1' +
        '.WANConnectionDevice.*.WANIPConnection.*.DefaultGateway',
      default_gateway_ppp: 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.*.WANPPPConnection.*.DefaultGateway',

      // DNS Server
      dns_servers: 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.*.WANIPConnection.*.DNSServers',
      dns_servers_ppp: 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.*.WANPPPConnection.*.DNSServers',

      // Uptime
      uptime: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANIPConnection.*.Uptime',
      uptime_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.Uptime',

      // MTU
      mtu: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANIPConnection.*.MaxMTUSize',
      mtu_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.MaxMRUSize',

      // Bytes
      recv_bytes: 'InternetGatewayDevice.WANDevice.1.'+
        'WANEthernetInterfaceConfig.Stats.BytesReceived',
      sent_bytes: 'InternetGatewayDevice.WANDevice.1.'+
        'WANEthernetInterfaceConfig.Stats.BytesSent',

      // Port Mapping
      port_mapping_entries_dhcp: 'InternetGatewayDevice.WANDevice.1.'+
        'WANConnectionDevice.*.WANIPConnection.*.PortMappingNumberOfEntries',
      port_mapping_entries_ppp: 'InternetGatewayDevice.WANDevice.1.'+
        'WANConnectionDevice.*.WANPPPConnection.*.PortMappingNumberOfEntries',
      // These should only be added whenever they exist, for legacy reasons:
      // vlan: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
      //   'GponLinkConfig.VLANIDMark',
      // vlan_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
      //   'GponLinkConfig.VLANIDMark',
      // pon_rxpower: 'InternetGatewayDevice.WANDevice.1.'+
      //   'GponInterfaceConfig.RXPower',
      // pon_txpower: 'InternetGatewayDevice.WANDevice.1.'+
      //   'GponInterfaceConfig.TXPower',
      // pon_rxpower_epon: 'InternetGatewayDevice.WANDevice.1.'+
      //   'EponInterfaceConfig.RXPower',
      // pon_txpower_epon: 'InternetGatewayDevice.WANDevice.1.'+
      //   'EponInterfaceConfig.TXPower',
    },
    port_mapping_dhcp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.'+
      '*.WANIPConnection.*.PortMapping',
    port_mapping_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.'+
      '*.WANPPPConnection.*.PortMapping',
    // The port_mapping_(values|fields) is a auxiliary sub object to dispatch
    // setParameterValues task in genie. Its works on the settings below:
    // First array element - Field on tr-069 xml spec;
    // Second array element - Default value or field in port_mapping
    // definition of models/device.js that carry the value;
    // Third array element - The xml data type specification;
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
      protocol: ['PortMappingProtocol', '',
        'xsd:string'],
      description: ['PortMappingDescription', '', 'xsd:string'],
      remote_host: ['RemoteHost', '0.0.0.0', 'xsd:string'],
    },
    lan: {
      config_enable: 'InternetGatewayDevice.LANDevice.1.' +
        'LANHostConfigManagement.IPInterface.1.Enable',
      router_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.'+
        'IPInterface.1.IPInterfaceIPAddress',
      subnet_mask: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.'+
        'IPInterface.1.IPInterfaceSubnetMask',
      lease_min_ip: 'InternetGatewayDevice.LANDevice.1.'+
        'LANHostConfigManagement.MinAddress',
      lease_max_ip: 'InternetGatewayDevice.LANDevice.1.'+
        'LANHostConfigManagement.MaxAddress',
      ip_routers: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.'+
        'IPRouters',
      dns_servers: 'InternetGatewayDevice.LANDevice.1.'+
        'LANHostConfigManagement.DNSServers',
    },
    ipv6: {
      // These fields are solely for helping creating support for routers with
      // IPv6 that contains those proprietary fields, as those fields does not
      // belong to TR-069 documentation.

      // address: '',
      // address_ppp: '',

      // mask: '',
      // mask_ppp: '',

      // default_gateway: '',
      // default_gateway_ppp: '',

      // prefix_delegation_address: '',
      // prefix_delegation_address_ppp: '',

      // prefix_delegation_mask: '',
      // prefix_delegation_mask_ppp: '',

      // prefix_delegation_local_address: '',
      // prefix_delegation_local_address_ppp: '',
    },
    wifi2: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
        'KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
        'AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
        'BeaconType',
      band: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BandWidth',
    },
    wifi5: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.'+
        'KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.'+
        'AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Enable',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.'+
        'BeaconType',
      band: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BandWidth',
    },
    mesh2: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable',
      advertise: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'SSIDAdvertisementEnabled',
      encryption: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'WPAEncryptionModes',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'BeaconType',
    },
    mesh5: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Enable',
      advertise: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'SSIDAdvertisementEnabled',
      encryption: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'WPAEncryptionModes',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'BeaconType',
    },
    log: 'InternetGatewayDevice.DeviceInfo.DeviceLog',
    stun: {
      address: 'InternetGatewayDevice.ManagementServer.STUNServerAddress',
      port: 'InternetGatewayDevice.ManagementServer.STUNServerPort',
    },
    access_control: {
      mac: 'InternetGatewayDevice.Firewall.MacFilterService',
      wifi2: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
        'AccessControl',
      wifi5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.' +
        'AccessControl',
    },
    devices: {
      hosts: 'InternetGatewayDevice.LANDevice.1.Hosts',
      hosts_template: 'InternetGatewayDevice.LANDevice.1.Hosts.Host',
      host_mac: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress',
      host_name: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName',
      host_ip: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress',
      host_layer2: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.'+
        'Layer2Interface',
      host_active: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.Active',
      host_rssi: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.' +
        'AssociatedDevice.*.SignalStrength',
      host_snr: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.' +
        'AssociatedDevice.*.SignalNoiseRatio',
      host_cable_rate: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.'+
        'NegotiatedRate',
      host_rate: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.' +
        'AssociatedDevice.*.LastDataTransmitRate',
      associated: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.' +
        'AssociatedDevice',
      assoc_mac: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.'+
        'AssociatedDevice.*.AssociatedDeviceMACAddress',
    },
    diagnostics: {
      ping: {
        root: 'InternetGatewayDevice.IPPingDiagnostics',
        diag_state: 'InternetGatewayDevice.IPPingDiagnostics.DiagnosticsState',
        failure_count: 'InternetGatewayDevice.IPPingDiagnostics.FailureCount',
        success_count: 'InternetGatewayDevice.IPPingDiagnostics.SuccessCount',
        host: 'InternetGatewayDevice.IPPingDiagnostics.Host',
        interface: 'InternetGatewayDevice.IPPingDiagnostics.Interface',
        num_of_rep: 'InternetGatewayDevice.IPPingDiagnostics.'+
          'NumberOfRepetitions',
        avg_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.'+
          'AverageResponseTime',
        max_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.'+
          'MaximumResponseTime',
        min_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.'+
          'MinimumResponseTime',
        timeout: 'InternetGatewayDevice.IPPingDiagnostics.Timeout',
      },
      speedtest: {
        root: 'InternetGatewayDevice.DownloadDiagnostics',
        diag_state: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'DiagnosticsState',
        num_of_conn: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'NumberOfConnections',
        download_url: 'InternetGatewayDevice.DownloadDiagnostics.DownloadURL',
        bgn_time: 'InternetGatewayDevice.DownloadDiagnostics.BOMTime',
        end_time: 'InternetGatewayDevice.DownloadDiagnostics.EOMTime',
        test_bytes_rec: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'TestBytesReceived',
        down_transports: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'DownloadTransports',
        full_load_bytes_rec: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'TestBytesReceivedUnderFullLoading',
        full_load_period: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'PeriodOfFullLoading',
        interface: 'InternetGatewayDevice.DownloadDiagnostics.Interface',
      },
      // Traceroute
      // ip_version:
      //   this field is rarely present as an option to set IPv4 or IPv6.
      //   We only want IPv4, so don't bother filling this fields when the
      //   default value is already as '4' or 'IPv4', something like that.
      //   For now, this field sets the field as 'IPv4'(string), when present.
      // protocol:
      //   We prefer ICMP over UDP (most likely the default). If this field is
      //   present, we set it to 'ICMP'(string).
      traceroute: {
        root: 'InternetGatewayDevice.TraceRouteDiagnostics',
        diag_state: 'DiagnosticsState',
        interface: 'Interface',
        target: 'Host',
        tries_per_hop: 'NumberOfTries',
        timeout: 'Timeout',
        data_block_size: 'DataBlockSize',
        diff_serv: 'DSCP',
        max_hop_count: 'MaxHopCount',
        response_time: 'ResponseTime',
        number_of_hops: 'RouteHopsNumberOfEntries',
        protocol: '',
        ip_version: '',
        hops_root: 'RouteHops',
        hop_host: 'HopHost',
        hop_ip_address: 'HopHostAddress',
        hop_error_code: 'HopErrorCode',
        hop_rtt_times: 'HopRTTimes',
      },
      sitesurvey: {
        // Some of these fields have no defaults, as they are vendor-specific
        root: '',
        diag_state: 'DiagnosticsState',
        result: 'Result',
        mac: 'BSSID',
        ssid: 'SSID',
        channel: 'Channel',
        signal: 'RSSI',
        band: 'BandWidth',
        mode: 'Standard',
      },
      statistics: {
        cpu_usage: 'InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage',
        memory_free: 'InternetGatewayDevice.DeviceInfo.MemoryStatus.Free',
        memory_total: 'InternetGatewayDevice.DeviceInfo.MemoryStatus.Total',
        memory_usage: '', // Some routers come with only the percentage in this
                          // field, instead of both free and total memory
      },
    },
  };
};

module.exports = basic098CPEModel;
