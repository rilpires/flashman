/**
 * This file includes API V3 routes.
 * @namespace routes/api/v3
 */


const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();

const authController = require('../../controllers/auth');
const apiController = require('../../controllers/api/v3');


// Enable CORS to all V3 routes as it is necessary for Swagger to send commands.
router.use((_request, response, next) => {
  // Set the headers
  response.header('Access-Control-Allow-Origin', '*');
  response.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Authorization, Accept',
  );

  next();
});


/**
 * This function is necessary to allow getting header parameters when all
 * endpoints need authentication due to `CORS` issues.
 */
router.options('/*', function(_request, response) {
  response.sendStatus(200);
});


// Ensure that the user has access to API routes in this file.
router.use(
  authController.ensureAPIAccess,
);
router.use(
  authController.ensurePermission('grantAPIAccess'),
);


// Schema Components
/**
 * @openapi
 *  components:
 *    schemas:
 *      'Get Device - 200 Response - Success':
 *        description: This is the default response if the user has permission
 *          to send commands through this API and the server could find the
 *          device.
 *        type: object
 *        properties:
 *          success:
 *            type: boolean
 *            description: This field will be always true if could find the
 *              device.
 *            example: true
 *
 *          message:
 *            type: string
 *            description: The error message will be always 'OK' if could find
 *              the device.
 *            example: 'OK'
 *
 *          device:
 *            type: object
 *            description: The device information.
 *            properties:
 *              _id:
 *                type: string
 *                description: The MAC address of the device.
 *                example: 'AA:BB:CC:DD:EE:FF'
 *
 *              resources_usage:
 *                type: object
 *                description: The CPU and Memory usage of the device.
 *                properties:
 *                  cpu_usage:
 *                    type: integer
 *                    description: The CPU usage in percentage.
 *                    example: 57
 *
 *                  memory_usage:
 *                    type: integer
 *                    description: The Memory usage in percentage.
 *                    example: 34
 *
 *              version:
 *                type: string
 *                description: The firmware version.
 *                example: '0.35.3'
 *
 *              wifi_state:
 *                type: integer
 *                description: |
 *                  If the 2.4GHz Wi-Fi is turned on or not as
 *                  following:
 *                    + 0 - turned off;
 *                    + 1 - turned on.
 *                example: 1
 *
 *              wifi_hidden:
 *                type: integer
 *                description: |
 *                  If the 2.4GHz Wi-Fi is hidden or not as
 *                  following:
 *                    + 0 - not hidden;
 *                    + 1 - hidden.
 *                example: 0
 *
 *              wifi_power:
 *                type: integer
 *                description: The 2.4GHz Wi-Fi power.
 *                example: 100
 *
 *              wifi_is_5ghz_capable:
 *                type: boolean
 *                description: |
 *                  If the router supports 5GHz Wi-Fi as following:
 *                    + ```false``` - does not support 5GHz;
 *                    + ```true``` - supports 5GHz.
 *                example: true
 *
 *              wifi_state_5ghz:
 *                type: integer
 *                description: |
 *                  If the 5GHz Wi-Fi is turned on or not as
 *                  following:
 *                    + 0 - turned off;
 *                    + 1 - turned on.
 *                example: 1
 *
 *              wifi_hidden_5ghz:
 *                type: integer
 *                description: |
 *                  If the 5GHz Wi-Fi is hidden or not as
 *                  following:
 *                    + 0 - not hidden;
 *                    + 1 - hidden.
 *                example: 0
 *
 *              wifi_power_5ghz:
 *                type: integer
 *                description: The 5GHz Wi-Fi power.
 *                example: 100
 *
 *              mesh_mode:
 *                type: integer
 *                description: |
 *                  The mode of the mesh as following:
 *                  + 0 - Disabled mesh;
 *                  + 1 - Cable only;
 *                  + 2 - Wi-Fi 2.4Ghz as backhaul;
 *                  + 3 - Wi-Fi 5Ghz as backhaul;
 *                  + 4 - Use both Wi-Fi.
 *                example: 0
 *
 *              mesh_master:
 *                type: string
 *                description: The MAC address of the mesh master. This
 *                  field is ```null``` if the router is the master.
 *                example: 'AB:CD:EF:AB:CD:EF'
 *
 *              mesh_father:
 *                type: string
 *                description: The MAC address of the CPE that this
 *                  router is connected to. Only valid if this router is
 *                  connected to another CPE in mesh mode.
 *                example: 'BB:CC:DD:EE:FF:AA'
 *
 *              bridge_mode_enabled:
 *                type: boolean
 *                description: |
 *                  If the router's switch is in bridge as following:
 *                    + ```false``` - the router is not in bridge mode;
 *                    + ```true``` - the router is in bridge mode.
 *                example: false
 *
 *              bridge_mode_switch_disable:
 *                type: boolean
 *                description: |
 *                  If the router's switch is enable or not as following:
 *                    + ```false``` - the router cannot send or receive packets
 *                      in LAN;
 *                    + ```true``` - the router can send or receive packets in
 *                      LAN.
 *                example: false
 *
 *              wan_ipv4_mask:
 *                type: integer
 *                description: The IPv4 mask of the WAN.
 *                example: 24
 *
 *              wan_ipv6_mask:
 *                type: integer
 *                description: The IPv6 mask of the WAN.
 *                example: 64
 *
 *              ipv6_enabled:
 *                type: integer
 *                description: |
 *                  If the router has the IPv6 enabled or not as
 *                  following:
 *                    + 0 - disabled;
 *                    + 1 - enabled;
 *                    + 2 - unknown (old firmwares state).
 *                example: 1
 *
 *              sys_up_time:
 *                type: integer
 *                description: |
 *                  The amount of time in seconds since the device booted.
 *                example: 874
 *
 *              wan_up_time:
 *                type: integer
 *                description: |
 *                  The amount of time in seconds since the device connected to
 *                  the network.
 *                example: 832
 *
 *              latitude:
 *                type: number
 *                description: |
 *                  The latitude position of the device. The default value if it
 *                  is not setted is 0.
 *                example: 0
 *
 *              longitude:
 *                type: number
 *                description: |
 *                  The longitude position of the device. The default value if
 *                  it is not setted is 0.
 *                example: 0
 *
 *              wps_is_active:
 *                type: boolean
 *                description: |
 *                  If the WPS setting is on or off as following:
 *                    + ```false``` - WPS is not active;
 *                    + ```true``` - WPS is active.
 *                example: false
 *
 *              wps_last_connected_mac:
 *                type: string
 *                description: |
 *                  The last MAC address that connected to this device through
 *                  WPS.
 *                example: 'AB:CD:EF:AB:CD:EF'
 *
 *              serial_tr069:
 *                type: string
 *                description: |
 *                  The serial of the router informed by the device through
 *                  TR-069.
 *                example: 'ABC012345DEFG'
 *
 *              custom_inform_interval:
 *                type: integer
 *                description: |
 *                  The interval in seconds that the device will send periodic
 *                  informs.
 *                example: 300
 *
 *              model:
 *                type: string
 *                description: |
 *                  The model of the device.
 *                example: 'WS5200-40'
 *
 *              hw_version:
 *                type: string
 *                description: |
 *                  The hardware version of the device.
 *                example: 'VER.A'
 *
 *              installed_release:
 *                type: string
 *                description: |
 *                  The installed firmware release of the device.
 *                example: '2.0.0.505(C947)'
 *
 *              connection_type:
 *                type: string
 *                description: |
 *                  The typ of connection with the network. It has 2 possible
 *                  values:
 *                    + dhcp - The connection is through DHCP;
 *                    + pppoe - The connection is through PPPoE.
 *                example: 'pppoe'
 *
 *              wan_mtu:
 *                type: integer
 *                description: |
 *                  The MTU value in WAN.
 *                example: 1492
 *
 *              wifi_ssid:
 *                type: string
 *                description: |
 *                  The SSID of the 2.4GHz wireless network.
 *                example: 'Anlix-WS5200-V3'
 *
 *              wifi_bssid:
 *                type: string
 *                description: |
 *                  The MAC address of the 2.4GHz wireless network.
 *                example: 'AA:BB:CC:DD:EE:F1'
 *
 *              wifi_channel:
 *                type: string
 *                description: |
 *                  The channel of the 2.4GHz wireless network. It can be the
 *                  real number as string or the name 'auto' that express that
 *                  the router will automatically try to get the best channel to
 *                  use.
 *                example: 'auto'
 *
 *              wifi_mode:
 *                type: string
 *                description: |
 *                  The mode of the 2.4GHz wireless network. It can be as
 *                  following:
 *                    + 11g - 802.11g mode;
 *                    + 11n - 802.11n mode.
 *                example: '11n'
 *
 *              wifi_ssid_5ghz:
 *                type: string
 *                description: |
 *                  The SSID of the 5GHz wireless network.
 *                example: 'Anlix-WS5200-V3-5G'
 *
 *              wifi_bssid_5ghz:
 *                type: string
 *                description: |
 *                  The MAC address of the 5GHz wireless network.
 *                example: 'AA:BB:CC:DD:EE:F2'
 *
 *              wifi_channel_5ghz:
 *                type: string
 *                description: |
 *                  The channel of the 5GHz wireless network. It can be the
 *                  real number as string or the name 'auto' that express that
 *                  the router will automatically try to get the best channel to
 *                  use.
 *                example: 'auto'
 *
 *              wifi_mode_5ghz:
 *                type: string
 *                description: |
 *                  The mode of the 5GHz wireless network. It can be as
 *                  following:
 *                    + 11g - 802.11g mode;
 *                    + 11na - 802.11na mode;
 *                    + 11ac - 802.11ac mode;
 *                    + 11ax - 802.11ax mode;
 *                example: '11ac'
 *
 *              lan_subnet:
 *                type: string
 *                description: |
 *                  The subnet IP of the LAN.
 *                example: '192.168.4.1'
 *
 *              lan_netmask:
 *                type: integer
 *                description: |
 *                  The mask of the subnet of LAN.
 *                example: 24
 *
 *              ip:
 *                type: string
 *                description: |
 *                  The IPv4 or IPv6 address that the Flashman uses to connect
 *                  to the device.
 *                example: '203.100.72.123'
 *
 *              created_at:
 *                type: date
 *                description: |
 *                  The time the device was added to Flashman as
 *                  YYYY:MM:DDTHH:MM:SS.UUUZ, where:
 *                    + YYYY - Year;
 *                    + MM - Month;
 *                    + DD - Day;
 *                    + T - Separator;
 *                    + HH - Hour;
 *                    + MM - Minutes;
 *                    + SS - Seconds;
 *                    + UUU - Miliseconds;
 *                    + Z - UTC format.
 *                example: '2023-01-30T15:14:29.453Z'
 *
 *              last_contact:
 *                type: date
 *                description: |
 *                  The last time the device contacted Flashman as the format
 *                  YYYY:MM:DDTHH:MM:SS.UUUZ, where:
 *                    + YYYY - Year;
 *                    + MM - Month;
 *                    + DD - Day;
 *                    + T - Separator;
 *                    + HH - Hour;
 *                    + MM - Minutes;
 *                    + SS - Seconds;
 *                    + UUU - Miliseconds;
 *                    + Z - UTC format.
 *                example: '2023-01-31T15:14:29.453Z'
 *
 *              last_tr069_sync:
 *                type: date
 *                description: |
 *                  The last time the device made the sync with Flashman as the
 *                  format YYYY:MM:DDTHH:MM:SS.UUUZ, where:
 *                    + YYYY - Year;
 *                    + MM - Month;
 *                    + DD - Day;
 *                    + T - Separator;
 *                    + HH - Hour;
 *                    + MM - Minutes;
 *                    + SS - Seconds;
 *                    + UUU - Miliseconds;
 *                    + Z - UTC format.
 *                example: '2023-01-31T10:14:29.453Z'
 *
 *              isSsidPrefixEnabled:
 *                type: boolean
 *                description: |
 *                  If the SSID prefix is enabled or not as following:
 *                    + ```false``` - The SSID prefix is not enabled;
 *                    + ```true``` - The SSID prefix is enabled.
 *                example: false
 *
 *              vlan:
 *                type: array
 *                description: |
 *                  An array of vlan objects that describes all vlans mapped in
 *                  the device.
 *                items:
 *                  type: object
 *                  description: The vlan mapping entry that tells which ports
 *                    are using which vlan ID's.
 *                  properties:
 *                    _id:
 *                      type: string
 *                      description: The identification of this mapping.
 *                      example: '62c88a9422d8372b34e88537'
 *
 *                    port:
 *                      type: integer
 *                      description: The router port that is mapped to a vlan
 *                        ID.
 *                      example: 2
 *
 *                    vlan_id:
 *                      type: integer
 *                      description: The vlan ID that the port is mapped to.
 *                      example: 10
 *
 *              external_reference:
 *                type: object
 *                description: |
 *                  An user defined parameter that can be used to find the
 *                  device in an easier manner.
 *                properties:
 *                  data:
 *                    type: string
 *                    description: The user defined name, CPF or CNPJ.
 *                    example: 'maria router'
 *
 *                  kind:
 *                    type: string
 *                    description: The type of the data field, if it is CPF,
 *                      CNPJ or Other type.
 *                    example: 'Other'
 *
 *              last_contact_daily:
 *                type: date
 *                description: |
 *                  The last daily contact the device made with Flashman as the
 *                  format YYYY:MM:DDTHH:MM:SS.UUUZ, where:
 *                    + YYYY - Year;
 *                    + MM - Month;
 *                    + DD - Day;
 *                    + T - Separator;
 *                    + HH - Hour;
 *                    + MM - Minutes;
 *                    + SS - Seconds;
 *                    + UUU - Miliseconds;
 *                    + Z - UTC format.
 *                example: '2023-01-30T10:14:29.453Z'
 *
 *              wifi_last_channel:
 *                type: string
 *                description: |
 *                  The last know channel of the 2.4GHz wireless network the
 *                  device was on. This field will differ from `wifi_channel`
 *                  only if `wifi_channel` is in `auto`.
 *                example: '6'
 *
 *              wifi_last_channel_5ghz:
 *                type: string
 *                description: |
 *                  The last know channel of the 5GHz wireless network the
 *                  device was on. This field will differ from
 *                  `wifi_channel_5ghz` only if `wifi_channel_5ghz` is in
 *                  `auto`.
 *                example: '149'
 *
 *              pppoe_user:
 *                type: string
 *                description: |
 *                  The PPPoE username.
 *                example: 'pppoe123'
 *
 *              wan_bssid:
 *                type: string
 *                description: |
 *                  The MAC address of the WAN.
 *                example: 'AA:BB:CC:DD:EE:F3'
 *
 *              wan_ip:
 *                type: string
 *                description: |
 *                  The WAN IPv4 address of the device.
 *                example: '203.100.72.124'
 *
 *              wan_ipv6:
 *                type: string
 *                description: |
 *                  The WAN IPv6 address of the device.
 *                example: '2804:3e0:0:52ca::1029'
 *
 *              is_license_active:
 *                type: boolean
 *                description: |
 *                  If the device's license is active or not:
 *                    + ```false``` - license is not active;
 *                    + ```true``` - license is active.
 *                example: true
 *
 *              wifi_password:
 *                type: string
 *                description: |
 *                  The password of the 2.4GHz wireless network.
 *                example: 'SuperSecretPassword123'
 *
 *              wifi_password_5ghz:
 *                type: string
 *                description: |
 *                  The password of the 5GHz wireless network.
 *                example: 'SuperSecretPassword321'
 *
 *              wifi_band:
 *                type: string
 *                description: |
 *                  The bandwidth of the 2.4GHz wireless network. The following
 *                  values are valid:
 *                    + HT20 - High Throughput 20 MHz;
 *                    + HT40 - High Throughput 40 MHz;
 *                    + auto - automatic bandwidth selection.
 *                example: 'HT20'
 *
 *              wifi_last_band:
 *                type: string
 *                description: |
 *                  The last know bandwidth, in MHz, of the 2.4GHz wireless
 *                  network. This value will only differ from `wifi_band` if
 *                  `wifi_band` is `auto`.
 *                example: '20'
 *
 *              wifi_band_5ghz:
 *                type: string
 *                description: |
 *                  The bandwidth of the 5GHz wireless network. The following
 *                  values are valid:
 *                    + VHT20 - Very High Throughput 20 MHz;
 *                    + VHT40 - Very High Throughput 40 MHz;
 *                    + VHT80 - Very High Throughput 80 MHz;
 *                    + auto - automatic bandwidth selection.
 *                example: 'VHT80'
 *
 *              wifi_last_band_5ghz:
 *                type: string
 *                description: |
 *                  The last know bandwidth, in MHz, of the 5GHz wireless
 *                  network. This value will only differ from `wifi_band` if
 *                  `wifi_band` is `auto`.
 *                example: '80'
 *
 *              wan_negociated_speed:
 *                type: string
 *                description: |
 *                  The speed negotiated in WAN. It can be one of those values:
 *                    + 100 - 100 Mbps;
 *                    + 1000 - 1000 Mbps.
 *                example: '100'
 *
 *              wan_negociated_duplex:
 *                type: string
 *                description: |
 *                  The duplex negotiated in WAN. It can be one of those values:
 *                    + half - half duplex;
 *                    + full - full duplex.
 *                example: '100'
 *
 *              bridge_mode_ip:
 *                type: string
 *                description: |
 *                  The fixed WAN IP address used when in bridge mode, if it was
 *                  configured by the user.
 *                example: '192.168.3.103'
 *
 *              bridge_mode_gateway:
 *                type: string
 *                description: |
 *                  The fixed default gateway used when in bridge mode, if it
 *                  was configured by the user.
 *                example: '192.168.3.1'
 *
 *              bridge_mode_dns:
 *                type: string
 *                description: |
 *                  The fixed DNS server address used when in bridge mode, if it
 *                  was configured by the user.
 *                example: '8.8.8.8'
 *
 *              default_gateway_v4:
 *                type: string
 *                description: |
 *                  The default gateway used by the router in IPv4.
 *                example: '192.168.3.1'
 *
 *              default_gateway_v6:
 *                type: string
 *                description: |
 *                  The default gateway used by the router in IPv6.
 *                example: 'fe80::f0:1e8'
 *
 *              dns_server:
 *                type: string
 *                description: |
 *                  The DNS server that the device is using to communicate with
 *                  the internet.
 *                example: '8.8.8.8'
 *
 *              pppoe_ip:
 *                type: string
 *                description: |
 *                  The IP address of the PPPoE server.
 *                example: '208.100.74.1'
 *
 *              pppoe_mac:
 *                type: string
 *                description: |
 *                  The MAC address of the PPPoE server.
 *                example: 'BB:CC:DD:EE:FF:AA'
 *
 *              prefix_delegation_addr:
 *                type: string
 *                description: |
 *                  The prefix delegation address delivered to the router.
 *                example: 'fc00:dead:c0de:a00::'
 *
 *              prefix_delegation_mask:
 *                type: string
 *                description: |
 *                  The prefix delegation mask delivered to the router.
 *                example: '64'
 *
 *              prefix_delegation_local:
 *                type: string
 *                description: |
 *                  The prefix delegation address that the router got for it.
 *                example: 'fc00:dead:c0de:a00::1'
 *
 *              ntp_status:
 *                type: string
 *                description: |
 *                  The NTP time status.
 *                example: '0.000105'
 *
 *
 *      'Get Device - 200 Response - Device Not Found':
 *        type: object
 *        description: This response is returned when all parameters are right
 *          but could not find the device.
 *        properties:
 *          success:
 *            type: boolean
 *            description: This field will be always false in this kind of
 *              response.
 *            example: false
 *
 *          message:
 *            type: string
 *            description: Could not find the device error message.
 *            example: 'No Device Found'
 *
 *          device:
 *            type: object
 *            description: The device will be an empty object in this type of
 *              response.
 *            example: {}
 *
 *
 *      'Get Device - 403 Response - Forbidden':
 *        type: object
 *        description: This response is returned when the user that tried this
 *          route does not have API access. It can be configured in Flashman
 *          permissions or use a user login that has API access.
 *        properties:
 *          'type':
 *            type: string
 *            description: This field will be always danger in this kind of
 *              error.
 *            example: danger
 *
 *          message:
 *            type: string
 *            description: Permission denied error message.
 *            example: 'Permission denied (xxxx)'
 *
 *
 *      'Get Device - 500 Response - Request Error':
 *        type: object
 *        description: This response is returned when the request did not came
 *          in a properly setted format. It might be due to a missing parameter
 *          that did not came in the URL.
 *        properties:
 *          success:
 *            type: boolean
 *            description: This field will be always false in this kind of
 *              error.
 *            example: false
 *
 *          message:
 *            type: string
 *            description: Request error message.
 *            example: 'Request error (xxxx)'
 *
 *          device:
 *            type: object
 *            description: The device will be an empty object in this type of
 *              error.
 *            example: {}
 *
 *
 *      'Get Device - 500 Response - Field Error':
 *        type: object
 *        description: This response is returned when the request did not came
 *          with the URL parameter needed for this route. Be sure to specify the
 *          device parameter to get the information from.
 *        properties:
 *          success:
 *            type: boolean
 *            description: This field will be always false in this kind of
 *              error.
 *            example: false
 *
 *          message:
 *            type: string
 *            description: Field error message.
 *            example: 'Field not found (xxxx)'
 *
 *          device:
 *            type: object
 *            description: The device will be an empty object in this type of
 *              error.
 *            example: {}
 *
 *
 *      'Get Device - 500 Response - Field Validity Error':
 *        type: object
 *        description: This response is returned when the parameter passed is
 *          not the expected pattern for this kind of the parameter. The error
 *          message will describe the problem that occurred and how to solve it.
 *        properties:
 *          success:
 *            type: boolean
 *            description: This field will be always false in this kind of
 *              error.
 *            example: false
 *
 *          message:
 *            type: string
 *            description: The field validity error message. It will depend on
 *              the input and on type of the parameter passed.
 *            example: 'This field cannot be longer than xx characters'
 *
 *          device:
 *            type: object
 *            description: The device will be an empty object in this type of
 *              error.
 *            example: {}
 *
 *
 *      'Get Device - 500 Response - Database Error':
 *        type: object
 *        description: This response is returned when the server could not
 *          access the database or the database returned an error.
 *        properties:
 *          success:
 *            type: boolean
 *            description: This field will be always false in this kind of
 *              error.
 *            example: false
 *
 *          message:
 *            type: string
 *            description: Database error message.
 *            example: 'Error accessing database (xxxx)'
 *
 *          device:
 *            type: object
 *            description: The device will be an empty object in this type of
 *              error.
 *            example: {}
 */

// Responses Components
/**
 *
 *
 * @openapi
 *  components:
 *    responses:
 *      200:
 *        description: The first device found that matches the field passed as
 *          URL parameter or an empty device with success false as it could
 *          not find the device.
 *        content:
 *          application/json:
 *            schema:
 *              oneOf:
 *                - $ref: '#/components/schemas/Get Device - 200 Response -
 *                    Success'
 *                - $ref: '#/components/schemas/Get Device - 200 Response -
 *                    Device Not Found'
 *
 *      401:
 *        description: Authentication information is missing or invalid. Send
 *          the correct user and password as basic auth.
 *
 *      403:
 *        description: The user authentication used in this request does not
 *          access to API routes.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Get Device - 403 Response -
 *                Forbidden'
 *
 *      500:
 *        description: An internal error happenned. It can be caused by the
 *          missing URL parameter, an invalid request or if could not read
 *          the database.
 *        content:
 *          application/json:
 *            schema:
 *              oneOf:
 *                - $ref: '#/components/schemas/Get Device - 500 Response -
 *                    Request Error'
 *                - $ref: '#/components/schemas/Get Device - 500 Response -
 *                    Field Error'
 *                - $ref: '#/components/schemas/Get Device - 500 Response -
 *                    Field Validity Error'
 *                - $ref: '#/components/schemas/Get Device - 500 Response -
 *                    Database Error'
 */


// Routes
/**
 * Get a device by it's PPPoE username. It's an API route to query the first
 * device that has the same PPPoE username as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} pppoeUsername - The PPPoE username of the device to be
 * returned.
 *
 * @return {Model} The first device that matched the `pppoeUsername`.
 *
 * @openapi
 *  /api/v3/device/pppoe-username/{pppoeUsername}:
 *    get:
 *      summary: Get a device by it's PPPoE username.
 *
 *      description: Query the first device that has the same PPPoE username
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: pppoeUsername
 *          schema:
 *            type: string
 *          required: true
 *          description: The PPPoE username of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/pppoe-username/:pppoeUsername',
  apiController.getDeviceByField,
);


/**
 * Get a device by it's MAC address. It's an API route to query the first
 * device that has the same MAC address as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} mac - The MAC address of the device to be returned.
 *
 * @return {Model} The first device that matched the `mac`.
 *
 * @openapi
 *  /api/v3/device/mac/{mac}:
 *    get:
 *      summary: Get a device by it's MAC address.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/mac/:mac',
  apiController.getDeviceByField,
);


/**
 * Get a device by it's TR069 Serial. It's an API route to query the first
 * device that has the same TR069 Serial as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} serialTR069 - The TR069 Serial of the device to be returned.
 *
 * @return {Model} The first device that matched the `serialTR069`.
 *
 * @openapi
 *  /api/v3/device/serial-tr069/{serialTR069}:
 *    get:
 *      summary: Get a device by it's TR069 Serial.
 *
 *      description: Query the first device that has the same TR069 Serial
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: serialTR069
 *          schema:
 *            type: string
 *          required: true
 *          description: The TR069 Serial of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/serial-tr069/:serialTR069',
  apiController.getDeviceByField,
);


/**
 * Get a device by it's External Reference. It's an API route to query the first
 * device that has the same External Reference as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} externalReferenceData - The External Reference of the
 * device to be returned.
 *
 * @return {Model} The first device that matched the `externalReferenceData`.
 *
 * @openapi
 *  /api/v3/device/external-reference-data/{externalReferenceData}:
 *    get:
 *      summary: Get a device by it's External Reference.
 *
 *      description: Query the first device that has the same External Reference
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: externalReferenceData
 *          schema:
 *            type: string
 *          required: true
 *          description: The External Reference of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/external-reference-data/:externalReferenceData',
  apiController.getDeviceByField,
);


/**
 * Get a device by it's WAN MAC address. It's an API route to query the first
 * device that has the same WAN MAC address as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} wanMac - The WAN MAC address of the device to be returned.
 *
 * @return {Model} The first device that matched the `wanMac`.
 *
 * @openapi
 *  /api/v3/device/wan-mac/{wanMac}:
 *    get:
 *      summary: Get a device by it's WAN MAC address.
 *
 *      description: Query the first device that has the same WAN MAC address
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: wanMac
 *          schema:
 *            type: string
 *          required: true
 *          description: The WAN MAC address of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/wan-mac/:wanMac',
  apiController.getDeviceByField,
);


/**
 * @exports routes/api/v3
 */
module.exports = router;
