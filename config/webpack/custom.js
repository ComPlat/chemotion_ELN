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
  },

  // https://webpack.js.org/plugins/split-chunks-plugin/#optimizationsplitchunks
  // TODO move 2 test.js?
  // optimization: {
  //   runtimeChunk: true,
  //   removeAvailableModules: false,
  //   removeEmptyChunks: true,
  //   splitChunks:  
  //   {
  //   chunks: 'all',
  //   minSize: 20000,
  //   maxSize: 244000,
  //   // minRemainingSize: 0,
  //   // minChunks: 1,
  //   // maxAsyncRequests: 30,
  //   // maxInitialRequests: 30,
  //   // enforceSizeThreshold: 50000,
  //   // cacheGroups: {
  //   //   defaultVendors: {
  //   //     test: /[\\/]node_modules[\\/]/,
  //   //     priority: -10,
  //   //     reuseExistingChunk: true,
  //   //   },
  //   //   default: {
  //   //     minChunks: 2,
  //   //     priority: -20,
  //   //     reuseExistingChunk: true,
  //   //   },
  //   // },
  // },
  // },
  // output: {
  //   pathinfo: false,
  // },
  // T
  // devtool: 'source-map'
  // devtool: false // good for test
};
