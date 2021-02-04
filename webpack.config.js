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
    './public/javascripts/show_upgrade_schedule_actions.js',
    './public/javascripts/update_device.js',
    './public/javascripts/table_anim.js',
    './node_modules/jquery-highlight/jquery.highlight.js',
    './node_modules/pako/dist/pako.js',
    './node_modules/moment/min/moment.min.js',
    './node_modules/tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4.min.js',
    './node_modules/bs-stepper/dist/js/bs-stepper.min.js',
    './node_modules/apexcharts/dist/apexcharts.min.js',
    './node_modules/tags-input/tags-input.js',
    './/node_modules/socket.io-client/dist/socket.io.js',
    ],
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'bin'),
  },
  module: {
    rules: [
    /* {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },*/
    ],
  },
  /* resolve: {
    fallback: {
      'util': require.resolve('util/'),
      'path-browserify': require.resolve('path-browserify/'),
      'stream-browserify': require.resolve('stream-browserify/'),
      'assert': require.resolve('assert/'),
    },
  },*/
};
