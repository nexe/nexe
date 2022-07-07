import bootNexe from './third-party-main.js'
import cli from './disable-node-cli.js'
import flags from './flags.js'

const patches = [bootNexe, cli, flags]

export default patches
