const path = require('path');
// const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'web',
  mode: 'development',
  // externals: [nodeExternals()],
  entry: {
    index: ['./public/javascripts/device_validator.js',
    './public/javascripts/new_device.js',
    './public/javascripts/edit_device.js',
    './public/javascripts/edit_device_firewall.js',
    './public/javascripts/show_devices_logs_actions.js',
    './public/javascripts/show_ping_test_actions.js',
    './public/javascripts/show_speed_test_actions.js',
    './public/javascripts/show_wan_bytes_actions.js',
    './public/javascripts/show_lan_devices_actions.js',
    './public/javascripts/show_site_survey_actions.js',
    './public/javascripts/table_anim.js',
    './public/javascripts/show_upgrade_schedule_actions.js',
    './public/javascripts/update_device.js',
    ],
    changepassword: [
    './public/javascripts/changepassword_actions.js',
    ],
    firmware: [
    './public/javascripts/firmware_actions.js',
    ],
    profile: [
    './public/javascripts/profile_actions.js',
    ],
    showroles: [
    './public/javascripts/showroles_actions.js',
    ],
    showusercertificates: [
    './public/javascripts/showusercertificates_actions.js',
    ],
    showusers: [
    './public/javascripts/showusers_actions.js',
    ],
    layout: [
    './public/javascripts/common_actions.js',
    './public/javascripts/upgrade_flashman.js',
    ],
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'bin'),
  },
  module: {
    rules: [
     {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      'util': require.resolve('util/'),
      'path-browserify': require.resolve('path-browserify/'),
      'stream-browserify': require.resolve('stream-browserify/'),
      'assert': require.resolve('assert/'),
    },
  },
};
