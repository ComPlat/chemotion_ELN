#!/bin/bash
service postgresql start
source /root/.nvm/nvm.sh
source /usr/local/rvm/scripts/rvm
rvm use 2.3.1
bundle exec rails s -b 0.0.0.0

