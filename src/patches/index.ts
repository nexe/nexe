import bootNexe from './third-party-main'
import cli from './disable-node-cli'
import flags from './flags'

const patches = [bootNexe, cli, flags]

export default patches
