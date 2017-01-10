#!/bin/bash
source /usr/local/nvm/nvm.sh

bundle check || bundle install

set -e

host="$1"
shift

until psql -h "$host" -U "postgres" -c '\l'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up"

echo "Starting rails server"
bundle exec rails s -b 0.0.0.0

