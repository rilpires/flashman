const promBundle = require('express-prom-bundle');

const metricsPath = process.env.FLM_PROM_METRICS_PATH || '/metrics';

// This is a middleware that collects metrics on HTTP API usage, like
// request count and duration.

module.exports = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  metricsPath: metricsPath,

  // This is a very important config. We want to unify metrics on a given
  // route if they are different just on device id, in example. So here
  // we include rules for every route which uses id or undesirable
  // values on path.
  normalizePath: [
    // data_collecting.js
    ['^/.*/parameters', '/<CPE_ID>/parameters'],

    // device_list.js
    [
      '^/device_list/retryupdate/.*/.*',
      '/device_list/retryupdate/<CPE_ID>/<RELEASE>',
    ],
    [
      '^/device_list/command/.*/.*',
      '/device_list/command/<CPE_ID>/<COMMAND>',
    ],
    ['^/device_list/update/.*/.*', '/device_list/update/<CPE_ID>/<RELEASE>'],
    ['^/device_list/factoryreset/.*', '/device_list/factoryreset/<CPE_ID>'],
    ['^/device_list/update/.*', '/device_list/update/<CPE_ID>'],
    ['^/device_list/uifirstlog/.*', '/device_list/uifirstlog/<CPE_ID>'],
    ['^/device_list/uilastlog/.*', '/device_list/uilastlog/<CPE_ID>'],
    ['^/device_list/uiportforward/.*', '/device_list/uiportforward/<CPE_ID>'],
    ['^/device_list/speedtest/.*', '/device_list/speedtest/<CPE_ID>'],
    ['^/device_list/pinghostslist/.*', '/device_list/pinghostslist/<CPE_ID>'],
    ['^/device_list/landevices/.*', '/device_list/landevices/<CPE_ID>'],
    ['^/device_list/sitesurvey/.*', '/device_list/sitesurvey/<CPE_ID>'],
    ['^/device_list/uiupdate/.*', '/device_list/uiupdate/<CPE_ID>'],
    ['^/device_list/waninfo/.*', '/device_list/waninfo/<CPE_ID>'],
    ['^/device_list/laninfo/.*', '/device_list/laninfo/<CPE_ID>'],

    // user.js
    ['^/user/profile/.*', '/user/profile/<USER_ID>'],
    ['^/user/edit/.*', '/user/edit/<USER_ID>'],
    ['^/user/get/one/.*', '/user/get/one/<USER_ID>'],
    ['^/user/role/edit/.*', '/user/role/edit/<USER_ID>'],

    // v2
    [
      '^/api/v2/device/update/.*/.*',
      '/api/v2/device/update/<CPE_ID>/<RELEASE>',
    ],
    [
      '^/api/v2/device/command/.*/.*',
      '/api/v2/device/command/<CPE_ID>/<COMMAND>',
    ],
    ['^/api/v2/device/delete/.*', '/api/v2/device/delete/<CPE_ID>'],
    ['^/api/v2/device/update/.*', '/api/v2/device/update/<CPE_ID>'],
    ['^/api/v2/device/firstlog/.*', '/api/v2/device/firstlog/<CPE_ID>'],
    ['^/api/v2/device/lastlog/.*', '/api/v2/device/lastlog/<CPE_ID>'],
    ['^/api/v2/device/sync/.*', '/api/v2/device/sync/<CPE_ID>'],

    // vlan.js
    ['^/vlan/profile/.*', '/vlan/profile/<VLAN_ID>'],
    ['^/vlan/profile/edit/.*', '/vlan/profile/edit/<VLAN_ID>'],
    ['^/vlan/profile/check/.*', '/vlan/profile/check/<PROFILE_ID>'],
    ['^/vlan/fetch/.*', '/vlan/fetch/<DEVICE_ID>'],
    ['^/vlan/update/.*', '/vlan/update/<DEVICE_ID>'],
  ],
});
