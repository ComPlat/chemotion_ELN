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
# assume default database configuration
DATABASE_NAME=${DATABASE_NAME:-chemotion_dev}
DATABASE_USER=${DATABASE_USER:-postgres}
DATABASE_HOST=${DATABASE_HOST:-postgres}
DATABASE_PORT=${DATABASE_PORT:-5432}

# check if yq is installed
# if yq is installed parse config/database.yml file for the actual values
# if yq is not installed, then keep the set values default values
if command -v yq &> /dev/null
then
  DATABASE_NAME=$(yq -r .development.database config/database.yml)
  DATABASE_USER=$(yq -r .development.username config/database.yml)
  DATABASE_HOST=$(yq -r .development.host config/database.yml)
  DATABASE_PORT=$(yq -r .development.port config/database.yml)
fi
echo "DATABASE_NAME: $DATABASE_NAME"
echo "DATABASE_USER: $DATABASE_USER"
echo "DATABASE_HOST: $DATABASE_HOST"
echo "DATABASE_PORT: $DATABASE_PORT"

# check if the database for the given environment configuration exists
db_exists=$( psql -h $DATABASE_HOST -U $DATABASE_USER -p $DATABASE_PORT -XtAc "SELECT 1 FROM pg_database WHERE datname='$DATABASE_NAME'" )
echo "Database exists: $db_exists"
if [ "$db_exists" = '1' ]
then
  echo "==================================================="
  echo "Database already exists, skipping Database creation"
  echo "==================================================="
  if [ "$RAKE_DB_MIGRATE" = "always" ]
  then
    echo "================================================"
    echo "Running 'rake db:migrate'"
    echo "================================================"
      bundle exec rake db:migrate
  fi
else
  # if RAKE_DB_MIGRATE is set to always or once, run rake db:setup
  if [ "$RAKE_DB_MIGRATE" = "always" ] || [ "$RAKE_DB_MIGRATE" = "once" ]
  then
    echo "================================================"
    echo "Database does not exist"
    echo "running 'rake db:create/migrate/seed'"
    echo "================================================"
    bundle exec rake db:create
    bundle exec rake db:migrate
    bundle exec rake db:seed
  else
    echo "================================================"
    echo "Database does not exist, running 'rake db:setup'"
    echo "================================================"
    bundle exec rake db:setup
  fi
fi


