import gyp from './gyp'
import bootNexe from './third-party-main'
import buildFixes from './build-fixes'
import cli from './disable-node-cli'
import flags from './flags'
import ico from './ico'
import rc from './node-rc'
import snapshot from './snapshot'
import options from './options'

const patches = [gyp, bootNexe, buildFixes, cli, flags, ico, rc, snapshot, options]

export default patches
