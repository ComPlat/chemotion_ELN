#!/bin/bash

# install dependencies
bundle update --bundler # update the bundler version in Gemfile.lock to the installed version
yarn install

# set up database
bundle exec rake db:setup
