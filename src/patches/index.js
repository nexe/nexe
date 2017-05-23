import gyp from './gyp'
import nexePatches from './third-party-main'
import cli from './disable-node-cli'
import flags from './flags'
import ico from './ico'
import rc from './node-rc'

const patches = [
  gyp,
  (compiler, next) => compiler.setMainModule(compiler, next),
  nexePatches,
  cli,
  flags,
  ico,
  rc
]

export default patches
