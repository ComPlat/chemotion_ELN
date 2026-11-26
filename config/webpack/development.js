process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { merge } = require('shakapacker');
const webpackConfig = require('./base');
const developmentConfig = {
  // eval-source-map wraps each module in eval() with an inline source map,
  // giving Chrome a webpack-internal:// script context per module. This lets
  // the DevTools Scope/Stack panel correctly associate paused frames with
  // source positions. External source maps (cheap-module-source-map default)
  // can lose that association across multiple bundles, showing "Not paused".
  devtool: 'eval-source-map',
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
  devServer: {
    client: {
      overlay: {
        errors: true,
        warnings: true,
        // Benign browser notice raised when a ResizeObserver callback (e.g.
        // reactflow measuring a node whose image just loaded) causes another
        // resize in the same frame. It is not an exception, but the overlay
        // reports it as an "Uncaught runtime error".
        runtimeErrors: (error) => !/ResizeObserver loop/.test(error?.message),
      },
    },
  },
  target: 'web',
  watchOptions: {
    ignored: /node_modules/, // Ignore node_modules directory
    poll: 1000, // Optional: Use polling with a delay of 1 second
  },
};

module.exports = merge(webpackConfig, developmentConfig);
