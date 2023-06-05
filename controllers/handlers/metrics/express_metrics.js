const promBundle = require('express-prom-bundle');

const metricsPath = process.env.FLM_PROM_METRICS_PATH || '/metrics';

// This is a middleware that collects metrics on HTTP API usage, like
// request count and duration.

module.exports = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  metricsPath: metricsPath,
  metricType: 'summary',
  percentiles: [],
  ageBuckets: 10,
  maxAgeSeconds: 3600,
  pruneAgedBuckets: true,

  // This is a very important config. We want to unify metrics on a given
  // route if they are different just on device id, in example. So here
  // we include rules for every route which uses id or undesirable
  // values on path.
  normalizePath: [
    // data_collecting.js
    ['^/.*/parameters', '/<CPE_ID>/parameters'],

    // device_list.js
    [
      '^/devicelist/retryupdate/.*/.*',
      '/devicelist/retryupdate/<CPE_ID>/<RELEASE>',
    ],
    [
      '^/devicelist/command/.*/.*',
      '/devicelist/command/<CPE_ID>/<COMMAND>',
    ],
    ['^/devicelist/update/.*/.*', '/devicelist/update/<CPE_ID>/<RELEASE>'],
    ['^/devicelist/factoryreset/.*', '/devicelist/factoryreset/<CPE_ID>'],
    ['^/devicelist/update/.*', '/devicelist/update/<CPE_ID>'],
    ['^/devicelist/uifirstlog/.*', '/devicelist/uifirstlog/<CPE_ID>'],
    ['^/devicelist/uilastlog/.*', '/devicelist/uilastlog/<CPE_ID>'],
    ['^/devicelist/uiportforward/.*', '/devicelist/uiportforward/<CPE_ID>'],
    ['^/devicelist/speedtest/.*', '/devicelist/speedtest/<CPE_ID>'],
    ['^/devicelist/pinghostslist/.*', '/devicelist/pinghostslist/<CPE_ID>'],
    ['^/devicelist/landnsserverslist/.*',
      '/devicelist/landnsserverslist/<CPE_ID>'],
    ['^/devicelist/landevices/.*', '/devicelist/landevices/<CPE_ID>'],
    ['^/devicelist/sitesurvey/.*', '/devicelist/sitesurvey/<CPE_ID>'],
    ['^/devicelist/uiupdate/.*', '/devicelist/uiupdate/<CPE_ID>'],
    ['^/devicelist/waninfo/.*', '/devicelist/waninfo/<CPE_ID>'],
    ['^/devicelist/laninfo/.*', '/devicelist/laninfo/<CPE_ID>'],

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

    // API - v3
    // Search
    [
      '^/api/v3/device/search$',
      '^/api/v3/device/search',
    ],
    // Genie
    [
      '^/api/v3/device/mac/.*/genie/raw/task$',
      '^/api/v3/device/mac/<CPE_ID>/genie/raw/task',
    ],
    [
      '^/api/v3/device/mac/.*/genie/raw/collection$',
      '^/api/v3/device/mac/<CPE_ID>/genie/raw/collection',
    ],
    // Commands
    [
      '^/api/v3/device/.*/.*/.*/.*/.*$',
      '^/api/v3/device/<COMMAND>/<COMMAND_VALUE>/<SUB_COMMAND>/' +
      '<SUB_PARAMETER>/<SUB_PARAMETER_VALUE>',
    ],
    [
      '^/api/v3/device/.*/.*/.*$',
      '^/api/v3/device/<COMMAND>/<COMMAND_VALUE>/<SUBCOMMAND>',
    ],
    [
      '^/api/v3/device/.*/.*$',
      '^/api/v3/device/<COMMAND>/<COMMAND_VALUE>',
    ],
  ],
});
