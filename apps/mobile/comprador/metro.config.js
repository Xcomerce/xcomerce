const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]
// Evita EBUSY no Windows ao varrer o junction do outro app mobile no monorepo
config.resolver.blockList = [
  /[\\/]apps[\\/]mobile[\\/]fornecedor[\\/].*/,
  /[\\/]node_modules[\\/]fornecedor[\\/].*/,
]

module.exports = withNativeWind(config, { input: './global.css' })
