import { NexeCompiler } from '../compiler';

export default async function options(compiler: NexeCompiler, next: () => Promise<void>) {
  const nodeOptions = compiler.options.nodeOptions;
  if (!nodeOptions.length) {
    return next();
  }

  const find = '#if !defined(NODE_WITHOUT_NODE_OPTIONS)';
  const code = `do {
    std::string node_options = ${JSON.stringify(nodeOptions.join(' '))};
    std::vector<std::string> env_argv = ParseNodeOptionsEnvVar(node_options, errors);
    if (!errors->empty()) return 9;
    env_argv.insert(env_argv.begin(), argv->at(0));
    const int exit_code = ProcessGlobalArgs(&env_argv, nullptr, errors, kAllowedInEnvironment);
    if (exit_code != 0) return exit_code;
  } while(0);
  
  ${find}
  `;

  await compiler.replaceInFileAsync('src/node.cc', find, code);

  return next();
}
