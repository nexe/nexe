#!/usr/bin/env bash

echo "setting up node to use latest lts"
npm install -g n
n lts

# Install latest yarn version
npm install -g yarn

echo "using yarn $(yarn --version)"
npm install -g ts-node
npm install -g typescript
