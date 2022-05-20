#!/bin/bash

gem install bundler -v 1.17.3 && bundle install

rm -f tmp/pids/server.pid
bundle exec rails s -p 3000 -b 0.0.0.0
