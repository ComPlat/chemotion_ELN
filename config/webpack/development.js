process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const webpackConfig = require('./base')

const { merge } = require('@rails/webpacker')

if(process.env.DEVTOOL){
    const debugConfig = {
        devtool: process.env.DEVTOOL
    }
    module.exports = merge(webpackConfig, debugConfig)
}
else{
    module.exports = webpackConfig
}
