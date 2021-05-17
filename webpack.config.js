const webpack = require('webpack');
const path = require('path');
module.exports = {
  target: 'web',
  mode: 'development',
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
    path: __dirname + '/bin',
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
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.s[ac]ss$/i,
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
      $: 'jquery',
      jQuery: 'jquery',
    }),
  ],
  devtool: 'source-map',
};
