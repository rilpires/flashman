let DeviceVersion = {};

const versionRegex = /^[0-9]+\.[0-9]+\.[0-9A-Za-b]+$/;

const devVersionRegex = /^[0-9]+\.[0-9]+\.[0-9A-Za-b]+-[0-9]+-.*$/;

const speedTestCompatibleModels = {
  'ACTIONRF1200V1': 100,
  'ACTIONRG1200V1': 200,
  'ARCHERC2V1': 300,
  'ARCHERC5V4': 300,
  'ARCHERC20V1': 100,
  'ARCHERC20V4': 100,
  'ARCHERC20V5': 100,
  'ARCHERC20V5PRESET': 100,
  'ARCHERC50V3': 100,
  'ARCHERC50V4': 100,
  'ARCHERC60V2': 100,
  'ARCHERC60V3': 100,
  'ARCHERC6V2US': 200,
  'ARCHERC7V5': 300,
  'COVR-C1200A1': 200,
  'DIR-819A1': 100,
  'DIR-815D1': 100,
  'DWR-116A1': 100,
  'DWR-116A2': 100,
  'DWR-116A3': 100,
  'EMG1702-T10AA1': 100,
  'EC220-G5V2': 300,
  'GWR1200ACV1': 200,
  'GWR1200ACV2': 200,
  'GF1200V1': 200,
  'MAXLINKAC1200GV1': 200,
  'NCLOUD': 100,
  'RE708V1': 200,
  'TL-MR3020V1': 100,
  'TL-WDR3500V1': 100,
  'TL-WDR3600V1': 150,
  'TL-WDR4300V1': 150,
  'TL-WR2543N/NDV1': 120,
  'TL-WR740N/NDV4': 100,
  'TL-WR740NDV4': 100,
  'TL-WR740N/NDV5': 100,
  'TL-WR740NDV5': 100,
  'TL-WR740N/NDV6': 100,
  'TL-WR740NDV6': 100,
  'TL-WR741N/NDV4': 100,
  'TL-WR741NDV4': 100,
  'TL-WR741N/NDV5': 100,
  'TL-WR741NDV5': 100,
  'TL-WR840NV4': 100,
  'TL-WR840NV5': 100,
  'TL-WR840NV6': 100,
  'TL-WR840NV62': 100,
  'TL-WR840NV5PRESET': 100,
  'TL-WR840NV6PRESET': 100,
  'TL-WR841N/NDV7': 100,
  'TL-WR841NDV7': 100,
  'TL-WR841N/NDV8': 100,
  'TL-WR841NDV8': 100,
  'TL-WR842N/NDV3': 100,
  'TL-WR842NDV3': 100,
  'TL-WR849NV4': 100,
  'TL-WR849NV5': 100,
  'TL-WR849NV6': 100,
  'TL-WR849NV62': 100,
  'TL-WR940NV4': 100,
  'TL-WR940NV5': 100,
  'TL-WR940NV6': 100,
  'TL-WR949NV6': 100,
  'TL-WR845NV3': 100,
  'TL-WR845NV4': 100,
  'W5-1200FV1': 100,
};

const meshCompatibleModels = [
  'ARCHERC2V1',
  'ARCHERC5V4',
  'ARCHERC20V1',
  'ARCHERC20V4',
  'ARCHERC20V5',
  'ARCHERC20V5PRESET',
  'ARCHERC50V3',
  'ARCHERC50V4',
  'ARCHERC60V2',
  'ARCHERC60V3',
  'ARCHERC6V2US',
  'ARCHERC7V5',
  'DIR-819A1',
  'COVR-C1200A1',
  'EMG1702-T10AA1',
  'EC220-G5V2',
  'TL-WDR3500V1',
  'TL-WDR3600V1',
  'TL-WDR4300V1',
];

const wpsNotCompatible = [
  'TL-MR3020V1',
  'TL-WR840NV5',
  'TL-WR840NV6',
  'TL-WR840NV62',
  'TL-WR840NV6PRESET',
  'TL-WR849NV5',
  'TL-WR849NV6',
  'TL-WR849NV62',
  'TL-WR845NV4',
];

const lanPorts = {
  'EC220-G5V2': 3,
  'TL-MR3020V1': 0,
  'COVR-C1200A1': 1,
  'GWR1200ACV1': 3,
  'GWR1200ACV2': 3,
  'ACTIONRF1200V1': 3,
  'GF1200V1': 3,
  'W5-1200FV1': 3,
  'MAXLINKAC1200GV1': 3,
};

const portForwardTr069CompatibleModels = [
 'F670L',
 'ZXHN H198A V3.0',
];

const portForwardTr069CompatibleVersions = {
 'V1.1.20P1T18': {
  simpleSymmetric: true,
  simpleAsymmetric: true,
  rangeSymmetric: false,
  rangeAsymmetric: false,
 },
 'V1.1.20P1T4': {
  simpleSymmetric: true,
  simpleAsymmetric: true,
  rangeSymmetric: false,
  rangeAsymmetric: false,
 },
 'V1.1.20P3N3': {
  simpleSymmetric: true,
  simpleAsymmetric: true,
  rangeSymmetric: false,
  rangeAsymmetric: false,
 },
 'V3.0.0C5_MUL': {
  simpleSymmetric: true,
  simpleAsymmetric: true,
  rangeSymmetric: true,
  rangeAsymmetric: false,
 },
 'V3.0.0C6_MUL': {
  simpleSymmetric: true,
  simpleAsymmetric: true,
  rangeSymmetric: true,
  rangeAsymmetric: false,
 },
};

const ponSignalTr069CompatibleModels = [
 'F670L',
 'GONUAC001',
 'G-140W-C',
 'HG8245Q2',
];

/*
openwrt~v18.06.8-ANLIX~ar71xx~tl-wdr3500-v1~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr740n-v4~diffconfig (lshift=1, inverted=0, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr740n-v5~diffconfig (lshift=1, inverted=0, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr741nd-v4~diffconfig (lshift=1, inverted=0, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr841-v7~diffconfig (lshift=1, inverted=0, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr841-v8~diffconfig (lshift=1, inverted=0, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr841-v9~diffconfig (lshift=1, inverted=0, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr940n-v4~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr940n-v5~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr940n-v6~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v18.06.8-ANLIX~ar71xx~tl-wr949n-v6~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v18.06.8-ANLIX~realtek~gwr-300n-v1~diffconfig (lshift=0, inverted=0, vlan=0)
openwrt~v18.06.8-ANLIX~realtek~re172-v1~diffconfig (lshift=0, inverted=0, vlan=0)
openwrt~v19.07.5-ANLIX~ar71xx~tl-wr740n-v6~diffconfig (lshift=1, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ath79~archer-c60-v2~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v19.07.5-ANLIX~ath79~archer-c60-v3~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v19.07.5-ANLIX~ath79~archer-c6-v2-us~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ath79~archer-c7-v5~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ath79~covr-c1200-a1~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ath79~tl-mr3020-v1~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ath79~tl-wdr3600-v1~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ath79~tl-wdr4300-v1~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ath79~tl-wr2543-v1~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ath79~tl-wr842n-v3~diffconfig (lshift=1, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~archer-c20-v4~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~archer-c20-v5~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~archer-c20-v5preset~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~archer-c2-v1~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~archer-c50-v3~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~archer-c50-v4~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~archer-c5-v4~diffconfig (lshift=0, inverted=1, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~dir-819-a1~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~dl-dwr116-a3~diffconfig (lshift=0, inverted=0, vlan=0)
openwrt~v19.07.5-ANLIX~ramips~ec220-g5-v2~diffconfig (lshift=0, inverted=1, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~emg1702-t10a-a1~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr840n-v4~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr840n-v5~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr840n-v5preset~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr840n-v62~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr840n-v6~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr840n-v6preset~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr845n-v3~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr845n-v4~diffconfig (lshift=0, inverted=1, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr849n-v4~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr849n-v5~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr849n-v62~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tl-wr849n-v6~diffconfig (lshift=0, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~ramips~tplink_c20-v1~diffconfig (lshift=2, inverted=0, vlan=1)
openwrt~v19.07.5-ANLIX~realtek~actionrf1200-v1~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v19.07.5-ANLIX~realtek~actionrg1200-v1~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v19.07.5-ANLIX~realtek~gf1200-v1~diffconfig (lshift=0, inverted=1, vlan=0)
openwrt~v19.07.5-ANLIX~realtek~gwr1200ac-v1~diffconfig (lshift=0, inverted=0, vlan=0)
openwrt~v19.07.5-ANLIX~realtek~gwr1200ac-v2~diffconfig (lshift=0, inverted=0, vlan=0)
openwrt~v19.07.5-ANLIX~realtek~maxlinkac1200g-v1~diffconfig (lshift=0, inverted=0, vlan=0)
openwrt~v19.07.5-ANLIX~realtek~re708-v1~diffconfig (lshift=0, inverted=0, vlan=0)
openwrt~v19.07.5-ANLIX~realtek~w51200f-v1~diffconfig (lshift=0, inverted=0, vlan=0)
*/
const dictDevices = {
  'DWR116A3': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'W51200FV1': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ACTIONRF1200V1': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ACTIONRG1200V1': {
    'vlan_support': false,
    'lan_ports': [2, 1, 0], // inverted
    'wan_port': 3,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC2V1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 31,
  },
  'ARCHERC5V4': {
    'vlan_support': true,
    'lan_ports': [3, 2, 1, 0], // inverted
    'wan_port': 4,
    'cpu_port': 5,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
  },
  'ARCHERC20V1': {
    'vlan_support': false,
    'lan_ports': [3, 4, 1, 2], // 2 lshifts
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC20V4': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC20V5': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC20V5PRESET': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC50V3': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC50V4': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC60V2': {
    'vlan_support': false, // even though it's in openwrt 19 it splits wan/lan into different interfaces
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC60V3': {
    'vlan_support': false, // even though it's in openwrt 19 it splits wan/lan into different interfaces
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'ARCHERC6V2US': {
    'vlan_support': true,
    'lan_ports': [2, 3, 4, 5],
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
  },
  'ARCHERC7V5': {
    'vlan_support': true,
    'lan_ports': [2, 3, 4, 5],
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
  },
  'COVR-C1200A1': {
    'vlan_support': true,
    'lan_ports': [2],
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
  },
  'DIR-819A1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
  },
  'DIR-815D1': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'DWR-116A1': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'DWR-116A2': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'DWR-116A3': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'EMG1702-T10AA1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
  },
  'EC220-G5V2': {
    'vlan_support': true,
    'lan_ports': [2, 1, 0], // inverted
    'wan_port': 3,
    'cpu_port': 5,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
  },
  'GWR1200ACV1': {
    'vlan_support': false,
   'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'GWR1200ACV2': {
    'vlan_support': false,
   'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'GWR300NV1': {
    'vlan_support': false,
   'lan_ports': [0, 1, 2, 3],
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'GF1200V1': {
    'vlan_support': false,
   'lan_ports': [3, 2, 1], // inverted
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'MAXLINKAC1200GV1': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'NCLOUD': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'RE708V1': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'RE172V1': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-MR3020V1': {
    'vlan_support': false, // even though it's in openwrt 19 it doesn't have lan ports
    'lan_ports': [],
    'wan_port': 0,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WDR3500V1': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WDR3600V1': {
    'vlan_support': true,
    'lan_ports': [2, 3, 4, 5],
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
  },
  'TL-WDR4300V1': {
    'vlan_support': true,
    'lan_ports': [2, 3, 4, 5],
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
  },
  'TL-WR2543N/NDV1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 9,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 31,
  },
  'TL-WR740N/NDV4': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR740NDV4': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR740N/NDV5': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR740NDV5': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR740N/NDV6': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // wan/lan into different interfaces
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR740NDV6': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // wan/lan into different interfaces
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR741N/NDV4': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1],
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR741NDV4': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR741N/NDV5': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1],
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR741NDV5': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1],
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR840NV4': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR840NV5': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR840NV6': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR840NV62': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR840NV5PRESET': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR840NV6PRESET': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR841N/NDV7': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 0,
    'cpu_port': 1,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR841NDV7': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR841N/NDV8': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR841NDV8': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR842N/NDV3': {
    'vlan_support': false, // even though it's in openwrt 19 it splits lan/wan into different interfaces
    'lan_ports': [4, 3, 2, 1], // lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR842NDV3': {
    'vlan_support': false, // even though it's in openwrt 19 it splits lan/wan into different interfaces
    'lan_ports': [4, 3, 2, 1], // 1 lshift
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR849NV4': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR849NV5': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR849NV6': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR849NV62': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR940NV4': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR940NV5': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR940NV6': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR949NV6': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR845NV3': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'TL-WR845NV4': { //
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
  },
  'W5-1200FV1': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  },
};

const versionCompare = function(foo, bar) {
  // Returns like C strcmp: 0 if equal, -1 if foo < bar, 1 if foo > bar
  let fooVer = foo.split('.').map((val) => {
   return parseInt(val);
  });
  let barVer = bar.split('.').map((val) => {
   return parseInt(val);
  });
  for (let i = 0; i < fooVer.length; i++) {
    if (fooVer[i] < barVer[i]) return -1;
    if (fooVer[i] > barVer[i]) return 1;
  }
  return 0;
};

const grantViewLogs = function(version) {
  // Enabled in all supported versions
  return true;
};

const grantResetDevices = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.10.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortForward = function(version, model) {
  if (portForwardTr069CompatibleModels.includes(model) &&
    portForwardTr069CompatibleVersions[version] !== undefined) {
    // Compatible TR-069 CPE
    return true;
  } else {
    if (version.match(versionRegex)) {
      // Oficial Flashbox firmware
      return (versionCompare(version, '0.10.0') >= 0);
    } else if (version.match(devVersionRegex)) {
      // Development version, enable everything by default
      return true;
    } else {
      // Unknown device and or version
      return false;
    }
  }
};

const grantPortForwardAsym = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortOpenIpv6 = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.15.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifi5ghz = function(version, is5ghzCapable) {
  if (version.match(versionRegex)) {
    return (is5ghzCapable && (versionCompare(version, '0.13.0') >= 0));
  } else {
    // Development version, enable everything by default
    return is5ghzCapable;
  }
};

const grantWifiBand = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiBandAuto = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.29.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiPowerHiddenIpv6 = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.28.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiState = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.23.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPingTest = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanEdit = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanGwEdit = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.23.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanDevices = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSiteSurvey = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.29.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantUpnp = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.21.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSpeedTest = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !(model in speedTestCompatibleModels)) {
      // Unspecified model or model is not compatible with feature
      return false;
    }
    return (versionCompare(version, '0.24.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSpeedTestLimit = function(version, model) {
  if (grantSpeedTest(version, model)) {
    return speedTestCompatibleModels[model];
  }
  return 0;
};

const grantOpmode = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantVlanSupport = function(version, model) {
  let ret = { // default return value
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  };

  if (dictDevices[model] !== undefined) {
    ret = dictDevices[model];
  }
  if (version.match(versionRegex)) {
    if (versionCompare(version, '0.31.0') >= 0) {
      return ret['vlan_support'];
    } else {
      return false;
    }
  } else {
    // Development version, enable everything by default
    return ret['vlan_support'];
  }
};

const grantWanBytesSupport = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPonSignalSupport = function(version, model) {
  if (ponSignalTr069CompatibleModels.includes(model)) {
    // Compatible TR-069 ONU
    return true;
  } else {
    return false;
  }
};

const grantMeshMode = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !meshCompatibleModels.includes(model)) {
      // Unspecified model or model is not compatible with feature
      return false;
    }
    return (versionCompare(version, '0.27.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantUpdateAck = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.27.0') >= 0);
  } else {
    // Development version, no way to know version so disable by default
    return false;
  }
};

const grantWpsFunction = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || wpsNotCompatible.includes(model)) {
      // Unspecified model or model is not compatible with feature
      return false;
    }
    return (versionCompare(version, '0.28.0') >= 0);
  } else {
    // Development version, no way to know version so disable by default
    return true;
  }
};

DeviceVersion.findByVersion = function(version, is5ghzCapable, model) {
  let result = {};
  result.grantViewLogs = grantViewLogs(version);
  result.grantResetDevices = grantResetDevices(version);
  result.grantPortForward = grantPortForward(version, model);
  result.grantPortForwardAsym = grantPortForwardAsym(version);
  result.grantPortOpenIpv6 = grantPortOpenIpv6(version);
  result.grantWifi5ghz = grantWifi5ghz(version, is5ghzCapable);
  result.grantWifiBand = grantWifiBand(version);
  result.grantWifiBandAuto = grantWifiBandAuto(version);
  result.grantWifiState = grantWifiState(version);
  result.grantWifiPowerHiddenIpv6Box = grantWifiPowerHiddenIpv6(version);
  result.grantPingTest = grantPingTest(version);
  result.grantLanEdit = grantLanEdit(version);
  result.grantLanGwEdit = grantLanGwEdit(version);
  result.grantLanDevices = grantLanDevices(version);
  result.grantSiteSurvey = grantSiteSurvey(version);
  result.grantUpnp = grantUpnp(version);
  result.grantSpeedTest = grantSpeedTest(version, model);
  result.grantSpeedTestLimit = grantSpeedTestLimit(version, model);
  result.grantOpmode = grantOpmode(version);
  result.grantVlanSupport = grantVlanSupport(version, model);
  result.grantWanBytesSupport = grantWanBytesSupport(version);
  result.grantPonSignalSupport = grantPonSignalSupport(version, model);
  result.grantMeshMode = grantMeshMode(version, model);
  result.grantUpdateAck = grantUpdateAck(version);
  result.grantWpsFunction = grantWpsFunction(version, model);
  return result;
};


DeviceVersion.getPortsQuantity = function(model) {
  // to check the list of supported devices and the quantity of ports
  let ret = 4;
  // The default quantity of ports is 4, as checked
  if (model in lanPorts) {
    ret = lanPorts[model];
  }
  return ret;
};

DeviceVersion.getDeviceInfo = function(model) {
  let ret = { // default return value
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
  };

  if (dictDevices[model] !== undefined) {
    ret = dictDevices[model];
  }

  return ret;
};

DeviceVersion.getVlanCompatible = function() {
  let vlanCompatible = Object.fromEntries(
    Object.entries(dictDevices).filter(([k, device]) => device.vlan_support));
  return Object.keys(vlanCompatible);
};

DeviceVersion.getPortForwardTr069Compatibility = function(version) {
  return portForwardTr069CompatibleVersions[version];
};

module.exports = DeviceVersion;
