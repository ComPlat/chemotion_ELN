#!/bin/bash
# Install the nodejs version specified in the package.json file using asdf
# Requires: jq, asdf asdf-nodjs to be installed. A package.json file should
# be present in the current directory
#
# export the required node version as REQUIRED_NODE_VERSION

set -e

echo '>>> check nodejs version as set in package.json: install if mismatch, and correct .tool-versions'
# Get the currently installed Node.js version using asdf
CURRENT_NODE_VERSION=$(asdf current nodejs 2>/dev/null | awk '{print $2}')

# Extract the required Node.js version from package.json
REQUIRED_NODE_VERSION=$(jq -r '.engines.node' package.json)

# Handle version ranges specified in package.json (e.g., "^18.19.1" or "~18.19.1")
# when minor version changes are allowed:
if [[ "$REQUIRED_NODE_VERSION" == ^* ]]; then
  nodeversion=$(echo ${REQUIRED_NODE_VERSION:1} |  cut -d '.' -f 1)
fi
# when patch version changes are allowed:
if [[ "$REQUIRED_NODE_VERSION" == ~* ]]; then
  nodeversion=$(echo ${REQUIRED_NODE_VERSION:1} |  cut -d '.' -f 1,2)
fi

# when required version has another syntax, try to extract numerical version:
# (NB < or > are not supported and version should be in format x.x.x)
if [ -z "$nodeversion" ]; then
  nodeversion=$(echo $REQUIRED_NODE_VERSION | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
fi

# find the latest version of the required version
REQUIRED_NODE_VERSION=$(asdf list all nodejs | grep -E "^$nodeversion" | tail -n1)

# Compare the versions
if [[ "$CURRENT_NODE_VERSION" == "$REQUIRED_NODE_VERSION" ]]; then
  echo "Node.js is already at the required version: $CURRENT_NODE_VERSION"
else
  echo "Node.js version mismatch. Current: $CURRENT_NODE_VERSION, Required: $REQUIRED_NODE_VERSION"
  echo "Installing required Node.js version..."
  asdf install nodejs $REQUIRED_NODE_VERSION
  asdf local nodejs $REQUIRED_NODE_VERSION
  asdf global nodejs $REQUIRED_NODE_VERSION
  echo "Node.js updated to version: $REQUIRED_NODE_VERSION"
  asdf reshim nodejs
fi
export REQUIRED_NODE_VERSION
echo $REQUIRED_NODE_VERSION


