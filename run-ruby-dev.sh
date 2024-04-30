#!/bin/bash

./prepare-ruby-dev.sh

bundle exec rails s -p 3000 -b 0.0.0.0
