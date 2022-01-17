const webpack = require('webpack');

module.exports = {
  resolve: {
    extensions: ['.json', '...'],
    fallback: {
      util: require.resolve('util/'),
      querystring: require.resolve('querystring-es3'),
      stream: false
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.version': JSON.stringify(process.version)
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
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
