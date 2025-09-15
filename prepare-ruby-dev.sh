#!/bin/bash

# Prepare and update the application environment for Ruby/Nodejs development

# asdf-vm installation with ruby and nodejs plugins
export ASDF_BRANCH=v0.18.0
echo '>>> checking asdf installation'
./prepare-asdf.sh

# nodejs installation
./prepare-nodejs.sh

# ruby gems installation
./prepare-rubygems.sh

# prepare rails server
rm -f tmp/pids/server.pid

# prepare rails database
./prepare-db.sh


