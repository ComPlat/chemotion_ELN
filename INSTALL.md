# Basic Setup
* Copy `config/database.yml.example` to `config/database.yml` and enter your database connection information.
* Copy `config/storage.yml.example` to `config/storage.yml` and enter your database connection information.
* Copy `.ruby-gemset.example` to `.ruby-gemset`.
* Copy `.ruby-version.example` to `.ruby-version`. (Skip this step if you want to use Docker)
* Reload directory to create rvm gemset.

## nokogiri
if there are errors with nokogiri compilation with new xcode7:
`gem install nokogiri -- --with-xml2-include=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX10.11.sdk/usr/include/libxml2 --use-system-libraries`

## openbabel
* Require
  1. CMake (the `cmake` package in Ubuntu)
  2. Eigen (the `libeigen2-dev` or `libeigen3-dev` package in Ubuntu)
  3. Swig (the `swig`package in Ubuntu)
  4. libxml2 (the `libxml2-dev` package in Ubuntu)

* openbabel will be automatically installed through `bundle install`

## rmagick
* `brew install imagemagick gs` for OSX
* `apt-get install libmagickcore-dev libmagickwand-dev` for linux
* if installing the rmagick gem fails you may try: `IM_PREFIX=$(brew list imagemagick 2>&1 | grep -E 'identify$' | sed 's/bin\/identify$//g') PKG_CONFIG_PATH=${IM_PREFIX}lib/pkgconfig/ C_INCLUDE_PATH=${IM_PREFIX}include/ImageMagick*/ gem install rmagick` (OSX only)

## inkscape
* `sudo apt-get install inkscape` for Linux
* For Mac OSX, you need to install XQuartz before inkscape: `brew install Caskroom/cask/xquartz`, and `brew install homebrew/gui/inkscape`.

## Dataset previews
* `brew install imagemagick mplayer` for OSX
* `sudo apt-get -y install imagemagick mplayer` for Linux

## Application Setup
* Execute `bundle install`.
* Execute `rake db:reset` (this creates and seeds the database).

## Environment variables

Production

* `cp .env.production{.example,}  # optionally enter SFTP credentials`

## Configure Data Collection

* copy the config example file and edit the entries

* create device entries and configure their profiles

`cp db/datacollectors.yml.example db/datacollectors.yml`


# Deployment notes

The search feature uses the Postgres extension pg_trgm (http://www.postgresql.org/docs/9.3/static/pgtrgm.html). For the first installation on the production machine you have to install the `postgres-contrib` package in order to enable Postgres extensions.
Just restart Postgres after installing the package.

If you like to reset the database (after `cap production deploy`) you have to execute the following commands (under the assumption your production database is called `chemotion`)

* `RAILS_ENV=production bundle exec rake db:drop db:create`
* `sudo -u postgres psql -d chemotion -c "CREATE EXTENSION pg_trgm;"`
* `RAILS_ENV=production bundle exec rake db:migrate db:seed`

# JS Setup & Testing

* Install `nvm`: `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash` (see https://github.com/creationix/nvm#installation)
  or for OSX: `brew install nvm && echo "source $(brew --prefix nvm)/nvm.sh" >> ~/.profile`
* Execute `nvm install` nvm will automatically use node 0.10.40 (in order to work with current jest-version)
* Execute `npm install -g npm@3.10.8`
* Execute `npm install`.

# Mailing in Development Environment

Run `rake jobs:work` for asynchronous handling of email notifications. Run `mailcatcher` in your console and go to `localhost:1080` to see all sent mails.

# Icon Font

* put new icons as SVG files (e.g. '<ICON_NAME>.svg') in `app/assets/images/svg_icons`
* run `rake icons:compile`

Icons are now available as css classes: '.icon-<ICON_NAME'

## FontCustom Dependencies

* `brew install fontforge --with-python`
* `brew install eot-utils`

# Docker setup
This is a setup for a 'pseudo' production stage using passenger and aimed for user testing.
(For the development environment, change 'RAILS_ENV' to 'development' in docker-compose.yml)
**Make sure you have finished the BASIC SETUP FIRST**

1. Build the image from Dockerfile `docker-compose build` or pull the image: `docker-compose pull`
2. Initialize database FIRST:
  * `docker-compose run app bundle exec rake db:create`
  * `docker-compose run app bundle exec rake db:migrate`
  * `docker-compose run app bundle exec rake db:seed` (optional). A "seed"
    user will be inserted into the db with the information as below: template.moderator@eln.edu - password: "@eln.edu"
  * `docker-compose run app rake ketcherails:import:common_templates` (optional)
3. Precompile assets: `docker-compose run app bundle exec rake assets:precompile`
4. To start the server: `docker-compose up` or start server and detach: `docker-compose up -d`

* Start interactive shell with docker: `docker-compose run app /bin/bash`
* NOTE: In this Docker image, we disabled the email verification progress

* To enable email confirmation, uncomment ":confirmable" at line 5 of `app/models/user.rb`, stop the `docker-compose` by `docker-compose stop` and start `docker-compose`.
