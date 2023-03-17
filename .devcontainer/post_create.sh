#!/bin/bash

# install dependencies
bundle update --bundler # update the bundler version in Gemfile.lock to the installed version
yarn install

# set up database
bundle exec rake db:setup

# link svg editor to public folder
ln -s ~/node_modules/svgedit/dist/editor ~/app/public/svgedit

