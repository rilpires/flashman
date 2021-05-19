const webpack = require('webpack');

module.exports = {
  target: 'web',
  mode: 'development',
  entry: {
    flashman: ['./public/javascripts/device_validator.js',
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
    './public/javascripts/changepassword_actions.js',
    './public/javascripts/firmware_actions.js',
    './public/javascripts/profile_actions.js',
    './public/javascripts/showroles_actions.js',
    './public/javascripts/showusercertificates_actions.js',
    './public/javascripts/showusers_actions.js',
    './public/javascripts/common_actions.js',
    './public/javascripts/upgrade_flashman.js',
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
      $: 'jquery',
      jQuery: 'jquery',
    }),
  ],
  devtool: 'source-map',
};
