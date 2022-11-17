#!/bin/bash

cfg_dev() {
    # this should be in line with config/database.yml
    DB_HOST="db"
    DB_USER="postgres"
    DB_DATABASE="chemotion_dev"
    DB_ROLE=""
    DB_PW=""
}

cfg_test() {
    # this should be in line with config/database.yml
    DB_HOST="db"
    DB_USER="postgres"
    DB_DATABASE="chemotion_test"
    DB_ROLE=""
    DB_PW=""
}

createDB() {
    psql --host="${DB_HOST}" --username="${DB_USER}" -c "DROP DATABASE IF EXISTS ${DB_DATABASE};"
    psql --host="${DB_HOST}" --username="${DB_USER}" -c "
            CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";
            CREATE EXTENSION IF NOT EXISTS \"hstore\";
            CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
    psql --host="${DB_HOST}" --username="${DB_USER}" -c "CREATE DATABASE ${DB_DATABASE}"

}

cfg_dev && createDB
cfg_test && createDB
