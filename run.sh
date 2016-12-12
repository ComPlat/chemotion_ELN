#!/bin/bash
service postgresql start
source ~/.nvm/nvm.sh

bundle check || bundle install

if psql -lqt | cut -d \| -f 1 | grep -qw chemotion_dev; then
  echo "Development DB already exists"
else
  bundle exec rake db:setup
fi

bundle exec rails s -b 0.0.0.0

