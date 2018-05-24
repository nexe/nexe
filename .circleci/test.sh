#1/usr/bin/env bash

export NVS_HOME="$HOME/.nvs"
. "$NVS_HOME/nvs.sh" install

set -e -x

nvs link lts
nvs use default


yarn run asset-compile
