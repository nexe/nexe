import gyp from './gyp'
import nexePatches from './third-party-main'
import buildFixes from './build-fixes'
import cli from './disable-node-cli'
import flags from './flags'
import ico from './ico'
import rc from './node-rc'
import { NexeCompiler } from '../compiler'

const patches = [gyp, nexePatches, buildFixes, cli, flags, ico, rc]

export default patches
