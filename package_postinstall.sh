#!/usr/bin/env bash

## package.json postinstall script

set -euo pipefail

YEL='\033[0;33m'
NOC='\033[0m'
yellow() {
  printf "${YEL}${1:-}${NOC}\n"
}


## ag-grid css
src5=$(node -e 'console.log(require.resolve("ag-grid-community/styles/ag-grid.css"))')
dest5=$(dirname $src5)

# for each css file in the parent directory, run a sed command

for file in ${dest5}/*.{css,scss}; do
  yellow "Processing $file"
   sed -i -E "s~min\(var\(([^)]+)\), var\(([^)]+)\) \* var\(([^)]+)\)~min\(var\(\1\), calc\(var\(\2\) * var\(\3\)\)~g" $file
   sed -i "s~ min(~ Min(~" $file
done

yellow "Done fixing css."

# move svgedit to public folder
yellow "Adding symbolic link to svg editor in public folder"

node_modules_folder="$(node -e 'const p = require.resolve("@svgedit/svgcanvas"); console.log(p.slice(0, p.indexOf("@svgedit/svgcanvas")))')"
rm -f ./public/svgedit && ln -s "$node_modules_folder"/svgedit/dist/editor ./public/svgedit

yellow "Finished adding symbolic link to svg editor in public folder"

# move molviewer to public folder
yellow "Adding symbolic link to jsmol in public folder"
node_modules_folder="$(node -e 'const p = require.resolve("react"); console.log(p.slice(0, p.indexOf("react")))')"
rm -rf ./public/jsmol && ln -s "$node_modules_folder"react-molviewer/dist/jsmol ./public/jsmol
yellow "Finished adding symbolic link to jsmol in public folder"


# copy pdfjs worker to public folder
node_modules_folder_pdfjs="$(node -e 'const p = require.resolve("pdfjs-dist/build/pdf.worker.mjs"); console.log(p.slice(0, p.indexOf("pdf.worker.mjs")))')"
rm -f ./public/pdf.worker.min.*js && ln -s "$node_modules_folder_pdfjs"pdf.worker.min.mjs ./public/pdf.worker.min.mjs
yellow "Finished adding symbolic link to pdf worker in public folder"

# d3js source files
src_d3=(
  "@complat/react-spectra-editor/dist/components/common/draw.js"
  "@complat/react-spectra-editor/dist/components/d3_line/line_focus.js"
  "@complat/react-spectra-editor/dist/components/d3_multi/multi_focus.js"
  "@complat/react-spectra-editor/dist/components/d3_rect/rect_focus.js"
  "@complat/react-spectra-editor/dist/helpers/brush.js"
  "@complat/react-spectra-editor/dist/helpers/compass.js"
  "@complat/react-spectra-editor/dist/helpers/init.js"
  "@complat/react-spectra-editor/dist/helpers/zoom.js"
  "@complat/react-svg-file-zoom-pan/dist/components/zoomable.js"
  "@complat/react-svg-file-zoom-pan/dist/components/svg_wrapper.js"
)

# Rewrite import for d3.js
for src_file in "${src_d3[@]}"; do
  src=$(node -e "console.log(require.resolve('$src_file'))")
  yellow "Rewriting import for d3.js in $src"
  sed -i "s~const d3 = require('d3');~import('d3').then(d3 => {~" "$src"
  if ! tail -n1 "$src" | grep -q "});"; then
    echo -e "\n});" >> "$src"
  fi
  yellow "Done rewriting import for d3.js in $src"
done
