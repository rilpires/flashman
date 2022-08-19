const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    login: [
      './public/src/common.index.js',
    ],
    error: [
      './public/src/common.index.js',
    ],
    profile: [
      './public/src/common.index.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/profile_actions.js',
    ],
    changepassword: [
      './public/src/common.index.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/changepassword_actions.js',
    ],
    firmware: [
      './public/src/common.index.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/firmware_actions.js',
    ],
    showroles: [
      './public/src/common.index.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/showroles_actions.js',
    ],
    showusercertificates: [
      './public/src/common.index.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/showusercertificates_actions.js',
    ],
    showusers: [
      './public/src/common.index.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/showusers_actions.js',
    ],
    showvlanprofiles: [
      './public/src/common.index.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/showvlanprofiles_actions.js',
    ],
    vlanprofile: [
      './public/src/common.index.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/vlanprofile_actions.js',
    ],
    settings: [
      './public/src/common.index.js',
      './public/javascripts/settings_actions.js',
      './public/javascripts/factory_credentials.js',
      './public/javascripts/default_ping_hosts_config.js',
    ],
    index: [
      './public/src/common.index.js',
      './public/javascripts/session_storage.js',
      './public/javascripts/upgrade_flashman.js',
      './public/javascripts/device_validator.js',
      './public/javascripts/new_device.js',
      './public/javascripts/edit_device.js',
      './public/javascripts/edit_device_firewall.js',
      './public/javascripts/port_forward_tr069.js',
      './public/javascripts/show_devices_logs_actions.js',
      './public/javascripts/show_ping_test_actions.js',
      './public/javascripts/show_speed_test_actions.js',
      './public/javascripts/show_wan_bytes_actions.js',
      './public/javascripts/show_lan_devices_actions.js',
      './public/javascripts/show_site_survey_actions.js',
      './public/javascripts/show_upgrade_schedule_actions.js',
      './public/javascripts/show_data_collecting_actions.js',
      './public/javascripts/show_pon_signal_actions.js',
      './public/javascripts/show_vlan_actions.js',
      './public/javascripts/show_wan_info.js',
      './public/javascripts/show_lan_info.js',
      './public/javascripts/update_device.js',
      './public/javascripts/table_anim.js',
    ],
  },
  output: {
    filename: '[name].bundle.js',
    path: __dirname + '/public/dist',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsm)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg|png|jpe?g|gif)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/',
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'images/',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery',
      'window.$': 'jquery',
      'window.jQuery': 'jquery',
      'moment': 'moment',
      'bsCustomFileInput': 'bs-custom-file-input',
      'swal': 'sweetalert2',
      'i18next': 'i18next',
      'i18next-http-backend': 'i18next-http-backend',
    }),
    new CopyPlugin({
      patterns: [
        {from: 'public/locales', to: 'locales'},
      ],
    }),
  ],
};
