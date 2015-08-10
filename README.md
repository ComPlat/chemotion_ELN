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

Currently 3 users are seeded with respective email `test@ninjaconcept.com`, `hattori@ninjaconcept.com`, `momochi@ninjaconcept.com`, and password `ninjaconcept` (for all 3 the same).

# API (v1)

## Collections

* Get serialized, unshared collection roots for current user

  `/api/v1/collections/roots`

* Get serialized, shared collection roots for current user

  `/api/v1/collections/shared_roots`

* Get serialized samples by collection id

  `/api/v1/collections/:collection_id/samples`

* Get serialized sample by id

  `/api/v1/samples/:id`
