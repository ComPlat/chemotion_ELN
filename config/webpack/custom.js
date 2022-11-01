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
      'process.version': JSON.stringify(process.version),
      'process.env.SENTRY_FRONTENT_DSN': JSON.stringify(process.env.SENTRY_FRONTENT_DSN),
      'process.env.SENTRY_FRONTENT_SAMPLE_RATE': JSON.stringify(process.env.SENTRY_FRONTENT_SAMPLE_RATE)
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
