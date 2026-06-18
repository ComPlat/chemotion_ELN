const webpack = require('webpack');
const path = require('path');

module.exports = {
  resolve: {
    extensions: ['.json', '...'],
    alias: {
      process: 'process/browser',
      react: path.resolve(__dirname, '../../', 'node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../', 'node_modules/react-dom'),
    },
    fallback: {
      util: require.resolve('util/'),
      querystring: require.resolve('querystring-es3'),
      stream: false,
      'process/browser': require.resolve('process/browser'),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.version': JSON.stringify(process.version),
      'process.env.SENTRY_FRONTEND_DSN': JSON.stringify(
        process.env.SENTRY_FRONTEND_DSN
      ),
      'process.env.SENTRY_FRONTEND_SAMPLE_RATE': JSON.stringify(
        process.env.SENTRY_FRONTEND_SAMPLE_RATE
      ),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.md$/,
        use: 'raw-loader',
      },
    ],
  },
};
