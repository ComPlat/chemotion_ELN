process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const { merge } = require('shakapacker');
const webpackConfig = require('./base');
const developmentConfig = {
  devServer: {
    port: '3035',
    host: '0.0.0.0',
    compress: true,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  target: 'web',
  plugins: [
    new ReactRefreshWebpackPlugin()
  ],
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

module.exports = merge(webpackConfig, developmentConfig)
