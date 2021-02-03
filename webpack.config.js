const path = require('path');

module.exports = {
  entry: './app.js',
  output: {
    filename: 'app.bundle.js',
    path: path.resolve(__dirname, 'bin'),
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
