#!/bin/bash

if command -v yarn; then
    echo '>>> yarn is installed -> continue'
else
    echo '>>> Missing yarn. Installing...'
    npm install -g yarn
fi

echo '>>> Installing JS packages...'
yarn install

echo "=========================================================================================================="
echo "THIS WILL FAIL UNTIL THE RUBY GEMS ARE INSTALLED BY run-ruby-dev.sh. JUST TRY AGAIN AFTER INSTALLING THEM."
echo "=========================================================================================================="
./bin/shakapacker-dev-server
