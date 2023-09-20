#!/usr/bin/env bash

## package.json postinstall script

set -euo pipefail

## ag-grid css
src5=$(node -e 'console.log(require.resolve("ag-grid-community/styles/ag-grid.css"))')
src6=$(node -e 'console.log(require.resolve("ag-grid-community/styles/ag-grid-no-native-widgets.css"))')


YEL='\033[0;33m'
NOC='\033[0m'
yellow() {
  printf "${YEL}${1:-}${NOC}\n"
}



yellow "$src5"
sed -i "s~height: min~height: Min~" $src5
sed -i "s~height: min~height: Min~" $src6
yellow "Done fixing css."




# move svgedit to public folder
yellow "Adding symbolic link to svg editor in public folder"

node_modules_folder="$(node -e 'const p = require.resolve("@svgedit/svgcanvas"); console.log(p.slice(0, p.indexOf("@svgedit/svgcanvas")))')"
rm -f ./public/svgedit && ln -s "$node_modules_folder"/svgedit/dist/editor ./public/svgedit

yellow "Finished adding symbolic link to svg editor in public folder"
