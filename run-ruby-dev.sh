#!/bin/bash

./prepare-ruby-dev.sh

# Run migrations
echo "Running database migrations..."
bundle exec rails db:migrate RAILS_ENV=development

bundle exec rails s -p 3000 -b 0.0.0.0
