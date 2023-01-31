#!/bin/bash

# install dependencies
bundle update --bundler # update the bundler version in Gemfile.lock to the installed version
bundle install
yarn install

# set up database
bundle exec rake db:setup

# move svg editor to public folder
mv ~/node_modules/svgedit/dist/editor ~/app/public/svgedit
