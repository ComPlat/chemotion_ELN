#!/bin/bash

if command -v yarn; then
    echo '>>> yarn is installed -> continue'
else
    echo '>>> Missing yarn. Installing...'
    npm install -g yarn
fi

echo '>>> Installing JS packages...'
yarn install

# if NODE_PATH is set, add --modules-folder option to .yarnrc and create a symlink to the node_modules folder
if [ -z "$NODE_PATH" ]; then
    echo ">>> NODE_PATH is not set"
else
    echo ">>> NODE_PATH is set to $NODE_PATH"
#    echo ">>> Adding --modules-folder option to .yarnrc"
#    echo -e "--modules-folder $NODE_PATH" > .yarnrc
# create a symlink unless it already exists
    [ -L "${HOME}/app/node_modules" ] || ln -s  "${NODE_PATH}/" "${HOME}/app/node_modules" && bash package_postinstall.sh
fi


echo "=========================================================================================================="
echo "THIS WILL FAIL UNTIL THE RUBY GEMS ARE INSTALLED BY run-ruby-dev.sh. JUST TRY AGAIN AFTER INSTALLING THEM."
echo "=========================================================================================================="
./bin/shakapacker-dev-server