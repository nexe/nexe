#!/usr/bin/env bash
set -e

export NVS_HOME="$HOME/.nvs"
git clone --depth=1 https://github.com/jasongin/nvs "$NVS_HOME"
. "$NVS_HOME/nvs.sh" install
nvs add lts && nvs link lts nvs use default
node -v
npm -v
npm i
