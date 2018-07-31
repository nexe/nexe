#!/usr/bin/env bash

export NVS_HOME="$HOME/.nvs"
. "$NVS_HOME/nvs.sh" install && nvs link lts && nvs use default

set -e -x

yarn run asset-compile
