#!/bin/bash
source /usr/local/nvm/nvm.sh

bundle check || bundle install

echo "Starting rails server"
bundle exec rails s -b 0.0.0.0

