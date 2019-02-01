const devConfig = require('./webpack.dev')
const prodConfig = require('./webpack.production')

module.exports = env => {
  if (env && env.prod) {
    return prodConfig
  }

  return devConfig
}
