#1/usr/bin/env bash
set -e -x

export NVS_HOME="$HOME/.nvs"
. "$NVS_HOME/nvs.sh" install
nvs link lts
nvs use default

yarn run asset-compile
