# Basic Setup
* Copy `config/database.yml.example` to `config/database.yml` and enter your database connection information.
* Copy `.ruby-gemset.example` to `.ruby-gemset`.
* Copy `.ruby-version.example` to `.ruby-version`.
* Reload directory to create rvm gemset.
* Execute `bundle install`.
* Execute `rake db:reset` (this creates and seeds the database).

# JS Setup & Testing

* Install `nvm`: `brew install nvm && echo "source $(brew --prefix nvm)/nvm.sh" >> ~/.profile`
* Copy `.nvmrc.example` to `.nvmrc`.
* Execute `nvm install` nvm will automatically use node 0.10.40 (in order to work with current jest-version)
* Execute `npm install`.
* Execute `npm test`.

# Available Seeds

A user is seeded with email `test@ninjaconcept.com` and password `ninjaconcept`.

# API (v1)

## Collections

* Get serialized collection roots

  `/api/v1/collections/roots`
