# Basic Setup
* Copy `config/database.yml.example` to `config/database.yml` and enter your database connection information.
* Copy `.ruby-gemset.example` to `.ruby-gemset`.
* Copy `.ruby-version.example` to `.ruby-version`.
* Reload directory to create rvm gemset.

## openbabel
* `brew install cmake` for OSX
* install openbabel as described in its [documentation](https://github.com/cubuslab/openbabel/blob/master/INSTALL)

## rmagick
* `brew install imagemagick gs` for OSX
* `apt-get install libmagickcore-dev libmagickwand-dev` for linux
* if installing the rmagick gem fails you may try: `IM_PREFIX=$(brew list imagemagick 2>&1 | grep -E 'identify$' | sed 's/bin\/identify$//g') PKG_CONFIG_PATH=${IM_PREFIX}lib/pkgconfig/ C_INCLUDE_PATH=${IM_PREFIX}include/ImageMagick*/ gem install rmagick` (OSX only)

## Application Setup
* Execute `bundle install`.
* Execute `rake db:reset` (this creates and seeds the database).

# Deployment notes

The search feature uses the Postgres extension pg_trgm (http://www.postgresql.org/docs/9.3/static/pgtrgm.html). For the first installation on the production machine you have to install the `postgres-contrib` package in order to enable Postgres extensions.
Just restart Postgres after installing the package.

If you like to reset the database (after `cap production deploy`) you have to execute the following commands (under the assumption your production database is called `chemotion`)

* `RAILS_ENV=production bundle exec rake db:drop db:create`
* `sudo -u postgres psql -d chemotion -c "CREATE EXTENSION pg_trgm;"`
* `RAILS_ENV=production bundle exec rake db:migrate db:seed`

# JS Setup & Testing

* Install `nvm`: `brew install nvm && echo "source $(brew --prefix nvm)/nvm.sh" >> ~/.profile`
* Copy `.nvmrc.example` to `.nvmrc`.
* Execute `nvm install` nvm will automatically use node 0.10.40 (in order to work with current jest-version)
* Execute `npm install`.

# Available Seeds

Currently 3 users are seeded with respective email `test@ninjaconcept.com`, `hattori@ninjaconcept.com`, `momochi@ninjaconcept.com`, and password `ninjaconcept` (for all 3 the same).

# Mailing in Development Environment

Run `rake jobs:work` for asynchronous handling of email notifications. Run `mailcatcher` in your console and go to `localhost:1080` to see all sent mails.

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

# Icon Font

* put new icons as SVG files (e.g. '<ICON_NAME>.svg') in `app/assets/images/svg_icons`
* run `rake icons:compile`

Icons are now available as css classes: '.icon-<ICON_NAME'

## FontCustom Dependencies

* `brew install fontforge --with-python`
* `brew install eot-utils`
