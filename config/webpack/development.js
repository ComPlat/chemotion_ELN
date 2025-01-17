process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const { merge } = require('shakapacker');
const webpackConfig = require('./base');
const developmentConfig = {
  /*
    devServer: {
    port: '3035',
    host: 'localhost',
    compress: true,
    hot: true,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  */
  target: 'web',
  plugins: [
    new ReactRefreshWebpackPlugin()
  ],
  watchOptions: {
    ignored: /node_modules/, // Ignore node_modules directory
    poll: 1000, // Optional: Use polling with a delay of 1 second
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('babel-loader'),
            options: {
              plugins: [
                require.resolve('react-refresh/babel')
              ]
            }
          }
        ]
      }
    ]
  }
};

module.exports = merge(webpackConfig, developmentConfig);
