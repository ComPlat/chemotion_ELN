#!/bin/bash

if [ ! -x yarn ]
then
  npm install -g yarn
fi
asdf global nodejs 18.17.1
yarn install

echo "THIS WILL FAIL UNTIL THE RUBY GEMS ARE INSTALLED BY run-ruby-dev.sh. JUST TRY AGAIN AFTER INSTALLING THEM."
./bin/webpack-dev-server
