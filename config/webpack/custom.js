const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      "process.version": JSON.stringify(process.version)
    }),
  ],
}