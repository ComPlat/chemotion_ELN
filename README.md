# Basic Setup
* Copy `config/database.yml.example` to `config/database.yml` and enter your database connection information.
* Copy `.ruby-gemset.example` to `.ruby-gemset`.
* Copy `.ruby-version.example` to `.ruby-version`.
* Reload directory to create rvm gemset.
* Execute `bundle install`.
* Execute `rake db:reset` (this creates and seeds the database).

# JS Setup & Testing

* Install `nvm` from https://github.com/creationix/nvm.
* Execute `nvm install 0.10` (in order to work with jest).
* Switch to newly installed node version (`nvm use`) if not already happened.
* Execute `npm install`.
* Execute `npm test`.

# Available Seeds

A user is seeded with email `test@ninjaconcept.com` and password `ninjaconcept`.
