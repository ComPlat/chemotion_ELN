#!/bin/bash

# install dependencies
bundle update --bundler # update the bundler version in Gemfile.lock to the installed version
bundle install
yarn install

# enable configuration files
cp public/welcome-message-sample.md public/welcome-message.md
cp config/datacollectors.yml.example config/datacollectors.yml
cp config/storage.yml.example config/storage.yml
cp config/database.yml.example config/database.yml
cp config/shrine_config.yml.example config/shrine_config.yml

# set up database
bundle exec rake db:setup
