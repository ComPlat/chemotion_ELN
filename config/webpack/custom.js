const webpack = require('webpack');

module.exports = {
  resolve: {
    extensions: ['.json', '...'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.version': JSON.stringify(process.version)
    }),
  ],
  module: {
    rules: [
      {
        test: /\.md$/,
        use: 'raw-loader'
      }
    ]
  }
};
