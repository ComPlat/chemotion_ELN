#!/bin/bash

gem install bundler -v 2.1.4 && bundle install

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


bundle exec rails s -p 3000 -b 0.0.0.0
