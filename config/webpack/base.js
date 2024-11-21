const { generateWebpackConfig, merge } = require('shakapacker')
const baseConfig = generateWebpackConfig();
const customConfig = require('./custom')

module.exports = merge(baseConfig, customConfig)
