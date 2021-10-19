#!/usr/bin/env bash
  
## package.json postinstall script

set -euo pipefail

src1=$(node -e 'console.log(require.resolve("@citation-js/core/lib-mjs/util/fetchFile.js"))')
src2=$(node -e 'console.log(require.resolve("@citation-js/core/lib-mjs/index.js"))') 
src3=$(node -e 'console.log(require.resolve("@citation-js/plugin-bibtex/lib-mjs/input/constants.js"))')
src4=$(node -e 'console.log(require.resolve("@citation-js/plugin-wikidata/lib-mjs/entity.js"))')

[[ -e "$src1" && -e "$src2" && -e "$src3" && -e "$src4" ]] || exit 1

YEL='\033[0;33m'
NOC='\033[0m'
yellow() {
  printf "${YEL}${1:-}${NOC}\n"
}

yellow "rewrite import for citation.js in:"

yellow "$src1"
sed -i "s~import { version } from '../../package.json';~import pkg from '../../package.json';const version = pkg.version;~" $src1
yellow "$src2"
sed -i "s~import { version } from '../package.json';~import pkg from '../package.json';const version = pkg.version;~" $src2
yellow "$src3"
sed -i "s~export { diacritics, commands } from './unicode.json';~import unicode from './unicode.json';export const diacritics = unicode.diacritics;export const commands = unicode.commands;~" $src3
yellow "$src4"
sed -i "s~import { props, ignoredProps } from './props';~import wikiprops from './props';const { props, ignoredProps } = wikiprops  ;~" $src4
yellow "Done fixing import."
