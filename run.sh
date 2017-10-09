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
rm -f tmp/pids/server.pid
if [ "$RAILS_ENV" = "production" ]
then
  bundle exec passenger start -b 0.0.0.0 --max-pool-size 5
else
  bundle exec rails s -b 0.0.0.0
fi

