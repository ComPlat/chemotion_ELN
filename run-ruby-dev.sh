#!/bin/bash

./prepare-ruby-dev.sh

echo "Starting the Rails server..."
bundle exec rails s -p 3000 -b 0.0.0.0
