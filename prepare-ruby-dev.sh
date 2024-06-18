#!/bin/bash

# Prepare and update the application environment for Ruby/Nodejs development

# asdf-vm installation with ruby and nodejs plugins
export ASDF_BRANCH=v0.14.0
echo '>>> checking asdf installation'
./prepare-asdf.sh

# check nodejs version as set in package.json: install if mismatch, and correct .tool-versions'
echo '>>> check nodejs version as set in package.json: install if mismatch, and correct .tool-versions'
./prepare-nodejs.sh

# ruby gems installation
./prepare-rubygems.sh

# node packages installation
./prepare-nodejspkg.sh

# prepare rails server
rm -f tmp/pids/server.pid

if [ "$( psql -h postgres -U postgres -XtAc "SELECT 1 FROM pg_database WHERE datname='chemotion_dev'" )" = '1' ]
then
    echo "================================================"
    echo "Database already exists, skipping Database setup"
    echo "================================================"
else
    echo "================================================"
    echo "Database does not exist, running 'rake db:setup'"
    echo "================================================"
    bundle exec rake db:setup
fi


