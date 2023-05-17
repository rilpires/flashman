const basicCPEModel = require('./base-model');

const basic181CPEModel = Object.assign({}, basicCPEModel);

basic181CPEModel.getModelFields = function() {
  return {
    common: {
      mac: 'Device.Ethernet.Interface.1.MACAddress',
      model: 'Device.DeviceInfo.ModelName',
      version: 'Device.DeviceInfo.SoftwareVersion',
      hw_version: 'Device.DeviceInfo.HardwareVersion',
      uptime: 'Device.DeviceInfo.UpTime',
      ip: 'Device.ManagementServer.ConnectionRequestURL',
      acs_url: 'Device.ManagementServer.URL',
      interval: 'Device.ManagementServer.PeriodicInformInterval',
      // These should only be added whenever they exist, for legacy reasons:
      // web_admin_password: 'Device.Users.User.2.Password',
      // stun_enable: 'Device.ManagementServer.STUNEnable',
      // stun_udp_conn_req_addr: 'Device.ManagementServer.' +
      //   'UDPConnectionRequestAddress',
      // alt_uid: 'Device.Ethernet.Interface.1.MACAddress',
    },
    wan: {
      // PPPoE
      pppoe_enable: 'Device.PPP.Interface.*.Enable',
      pppoe_status: 'Device.PPP.Interface.*.Status',
      pppoe_user: 'Device.PPP.Interface.*.Username',
      pppoe_pass: 'Device.PPP.Interface.*.Password',

      // DHCP
      dhcp_enable: 'Device.IP.Interface.*.Enable',
      dhcp_status: 'Device.IP.Interface.*.Status',

      // Mode
      rate: 'Device.Ethernet.Interface.*.MaxBitRate',
      duplex: 'Device.Ethernet.Interface.*.DuplexMode',

      // WAN IP
      wan_ip: 'Device.IP.Interface.*.IPv4Address.*.IPAddress',
      wan_ip_ppp: 'Device.IP.Interface.*.IPv4Address.*.IPAddress',

      // WAN MAC address
      wan_mac: 'Device.Ethernet.Interface.*.MACAddress',
      wan_mac_ppp: 'Device.Ethernet.Interface.*.MACAddress',

      // IPv4 Mask
      // mask_ipv4: '',
      // mask_ipv4_ppp: '',

      // Remote Address
      // remote_address: '',
      remote_address_ppp: 'Device.PPP.Interface.*.IPCP.RemoteIPAddress',

      // Remote Mac
      // remote_mac: '',
      // remote_mac_ppp: '',

      // Default Gateway
      default_gateway: 'Device.Routing.Router.1.IPv4Forwarding.*.' +
        'GatewayIPAddress',
      default_gateway_ppp: 'Device.Routing.Router.1.IPv4Forwarding.*.' +
        'GatewayIPAddress',

      // DNS Server
      dns_servers: 'Device.DHCPv4.Client.*.DNSServers',
      dns_servers_ppp: 'Device.DHCPv4.Client.*.DNSServers',

      // Uptime
      // uptime: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
      //   'WANIPConnection.*.Uptime',
      // uptime_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
      //   'WANPPPConnection.*.Uptime',

      // MTU
      mtu: 'Device.IP.Interface.*.MaxMTUSize',
      mtu_ppp: 'Device.IP.Interface.*.MaxMTUSize',

      // Bytes
      recv_bytes: 'Device.IP.Interface.*.Stats.BytesSent',
      sent_bytes: 'Device.IP.Interface.*.Stats.BytesReceived',

      // Port Mapping
      port_mapping_entries_dhcp: 'Device.NAT.PortMappingNumberOfEntries',
      port_mapping_entries_ppp: 'Device.NAT.PortMappingNumberOfEntries',

      // These should only be added whenever they exist, for legacy reasons:
      // vlan: 'Device.Ethernet.VLANTermination.*.VLANID',
      // vlan_ppp: 'Device.Ethernet.VLANTermination.*.VLANID',
      // pon_rxpower: '',
      // pon_txpower: '',
      // pon_rxpower_epon: '',
      // pon_txpower_epon: '',
    },
    port_mapping_dhcp: 'Device.NAT.PortMapping',
    port_mapping_ppp: 'Device.NAT.PortMapping',
    port_mapping_fields_interface_root: 'Device.IP.Interface',
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
      enable: ['Enable', true, 'xsd:boolean'],
      lease: ['LeaseDuration', 0, 'xsd:unsignedInt'],
      protocol: ['Protocol', '', 'xsd:string'],
      description: ['Alias', '', 'xsd:string'],
      remote_host: ['RemoteHost', '0.0.0.0', 'xsd:string'],
    },
    lan: {
      config_enable: 'Device.DHCPv4.Server.Pool.1.Enable',
      router_ip: 'Device.IP.Interface.1.IPv4Address.1.IPAddress',
      subnet_mask: 'Device.DHCPv4.Server.Pool.1.SubnetMask',
      lease_min_ip: 'Device.DHCPv4.Server.Pool.1.MinAddress',
      lease_max_ip: 'Device.DHCPv4.Server.Pool.1.MaxAddress',
      ip_routers: 'Device.DHCPv4.Server.Pool.1.IPRouters',
      dns_servers: 'Device.DHCPv4.Server.Pool.1.DNSServers',
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
      ssid: 'Device.WiFi.SSID.1.SSID',
      bssid: 'Device.WiFi.SSID.1.BSSID',
      password: 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
      channel: 'Device.WiFi.Radio.1.Channel',
      auto: 'Device.WiFi.Radio.1.AutoChannelEnable',
      mode: 'Device.WiFi.Radio.1.OperatingStandards',
      enable: 'Device.WiFi.SSID.1.Enable',
      band: 'Device.WiFi.Radio.1.OperatingChannelBandwidth',
    },
    wifi5: {
      ssid: 'Device.WiFi.SSID.3.SSID',
      bssid: 'Device.WiFi.SSID.3.BSSID',
      password: 'Device.WiFi.AccessPoint.3.Security.KeyPassphrase',
      channel: 'Device.WiFi.Radio.1.Channel',
      auto: 'Device.WiFi.Radio.2.AutoChannelEnable',
      mode: 'Device.WiFi.Radio.2.OperatingStandards',
      enable: 'Device.WiFi.SSID.3.Enable',
      band: 'Device.WiFi.Radio.2.OperatingChannelBandwidth',
    },
    // mesh2: {},
    // mesh5: {},
    log: 'Device.DeviceInfo.DeviceLog',
    stun: {
      address: 'Device.ManagementServer.STUNServerAddress',
      port: 'Device.ManagementServer.STUNServerPort',
    },
    // access_control: {
    //   mac: '',
    //   wifi2: '',
    //   wifi5: '',
    // },
    devices: {
      hosts: 'Device.Hosts',
      hosts_template: 'Device.Hosts.Host',
      host_mac: 'Device.Hosts.Host.*.PhysAddress',
      host_name: 'Device.Hosts.Host.*.HostName',
      host_ip: 'Device.Hosts.Host.*.IPAddress',
      host_layer2: 'Device.LANDevice.1.Hosts.Host.*.Layer2Interface',
      associated: 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.' +
        'AssociatedDevice',
      assoc_mac: 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.' +
        'AssociatedDevice.*.MACAddress',
      host_active: 'Device.Hosts.Host.*.Active',
      host_rssi: 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.' +
        'AssociatedDevice.*.SignalStrength',
      host_snr: '',
      host_cable_rate: '',
      host_rate: '',
      rate: 'Device.WiFi.AccessPoint.1.AssociatedDevice.*.LastDataUplinkRate',
    },
    diagnostics: {
      ping: {
        root: 'Device.IP.Diagnostics.IPPing',
        diag_state: 'Device.IP.Diagnostics.IPPing.DiagnosticsState',
        failure_count: 'Device.IP.Diagnostics.IPPing.FailureCount',
        success_count: 'Device.IP.Diagnostics.IPPing.SuccessCount',
        host: 'Device.IP.Diagnostics.IPPing.Host',
        interface: 'Device.IP.Diagnostics.IPPing.Interface',
        num_of_rep: 'Device.IP.Diagnostics.IPPing.NumberOfRepetitions',
        avg_resp_time: 'Device.IP.Diagnostics.IPPing.AverageResponseTime',
        max_resp_time: 'Device.IP.Diagnostics.IPPing.MaximumResponseTime',
        min_resp_time: 'Device.IP.Diagnostics.IPPing.MinimumResponseTime',
        timeout: 'Device.IP.Diagnostics.IPPing.Timeout',
      },
      speedtest: {
        root: 'Device.IP.Diagnostics.DownloadDiagnostics',
        diag_state: 'Device.IP.Diagnostics.DownloadDiagnostics.DiagnosticsState',
        num_of_conn: 'Device.IP.Diagnostics.DownloadDiagnostics.NumberOfConnections',
        download_url: 'Device.IP.Diagnostics.DownloadDiagnostics.DownloadURL',
        bgn_time: 'Device.IP.Diagnostics.DownloadDiagnostics.BOMTime',
        end_time: 'Device.IP.Diagnostics.DownloadDiagnostics.EOMTime',
        test_bytes_rec: 'Device.IP.Diagnostics.DownloadDiagnostics.TestBytesReceived',
        down_transports: 'Device.IP.Diagnostics.DownloadDiagnostics.DownloadTransports',
        full_load_bytes_rec: 'Device.IP.Diagnostics.DownloadDiagnostics.'+
          'TestBytesReceivedUnderFullLoading',
        full_load_period: 'Device.IP.Diagnostics.DownloadDiagnostics.PeriodOfFullLoading',
        interface: 'Device.IP.Diagnostics.DownloadDiagnostics.Interface',
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
        root: 'Device.TraceRouteDiagnostics',
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
        cpu_usage: 'Device.DeviceInfo.ProcessStatus.CPUUsage',
        memory_free: 'Device.DeviceInfo.MemoryStatus.Free',
        memory_total: 'Device.DeviceInfo.MemoryStatus.Total',
        memory_usage: '',
      },
    },
  };
};

module.exports = basic181CPEModel;
