#!/bin/bash

# Prepare and update the application environment for Ruby/Nodejs development

# asdf-vm installation with ruby and nodejs plugins
export ASDF_BRANCH=v0.18.0
echo '>>> checking asdf installation'
./prepare-asdf.sh

# nodejs installation
./prepare-nodejs.sh

# nodejs packages (yarn install) — done here so node_modules is fully populated
# before any runtime container (app, webpacker) starts. Avoids the chicken/egg
# where the app booted before webpacker had installed packages.
./prepare-nodejspkg.sh

# default config for rails app
./prepare-config.sh

# ruby gems installation
./prepare-rubygems.sh

# prepare rails server
rm -f tmp/pids/server.pid

# prepare rails database
./prepare-db.sh


