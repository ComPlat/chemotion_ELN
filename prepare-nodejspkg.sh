#!/bin/bash

# update npm
npm install -g npm

echo '>>> checking yarn installation'
if [ -x "$(command -v yarn)" ]; then
  yarn_version=$(yarn --version)
else
yarn_version='not installed'
fi

yarn_version_required=$(jq -r '.dependencies.yarn' package.json)
echo $yarn_version_required
echo ">>> checking for yarn update: required ${yarn_version_required} - current ${yarn_version}"

# if no required version, install latest classic
if [ "$yarn_version_required" == "null" ]; then
  echo '>>> installing yarn classic'
  npm install -g yarn
else
  npm install -g yarn@$yarn_version_required
fi

echo '>>> Installing JS packages...'
yarn install --production=false

