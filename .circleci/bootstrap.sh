#!/usr/bin/env bash

if ! yarn --version >/dev/null; then
  npm install -g yarn
fi

echo "using yarn $(yarn --version)"
npm install -g ts-node
npm install -g typescript
