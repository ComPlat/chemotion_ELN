#!/bin/bash

# adjust config files for chemotion
cp public/welcome-message-sample.md public/welcome-message.md
cp config/datacollectors.yml.example config/datacollectors.yml
cp config/storage.yml.example config/storage.yml
cp config/database.yml.example config/database.yml
sed -i 's/host: .*/host: db/g' config/database.yml

set -o xtrace

yarn install --network-timeout 1000000000

[[ -f .devcontainer/scripts/dbinit.sh ]] && (
	bash .devcontainer/scripts/dbinit.sh
)

bundle install

bundle exec rake db:create
bundle exec rake db:migrate
bundle exec rake db:seed
