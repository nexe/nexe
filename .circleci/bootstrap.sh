#!/usr/bin/env bash

echo "setting up node to use latest lts"
curl -L https://git.io/n-install | bash

if ! yarn --version >/dev/null; then
  npm install -g yarn
fi

echo "using yarn $(yarn --version)"
npm install -g ts-node
npm install -g typescript
