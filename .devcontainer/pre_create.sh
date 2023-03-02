#!/bin/bash

# enable configuration files
cp .env.development .env
cp public/welcome-message-sample.md public/welcome-message.md
cp config/datacollectors.yml.example config/datacollectors.yml
cp config/storage.yml.example config/storage.yml
cp config/database.yml.example config/database.yml
cp config/shrine.yml.example config/shrine.yml
