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
};
