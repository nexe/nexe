#!/usr/bin/env bash
set -e

echo "setting up node to use latest lts"

export NVS_HOME="$HOME/.nvs"
git clone --depth=1 https://github.com/jasongin/nvs "$NVS_HOME"
. "$NVS_HOME/nvs.sh" install
nvs add lts
nvs link lts
nvs use default
echo "using node $(node --version)"

# Install latest yarn version
npm install -g yarn

echo "using yarn $(yarn --version)"

# Run yarn
yarn
