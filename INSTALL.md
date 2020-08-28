# Installing a production ready server

## On a Ubuntu server

copy the installation script on a ubuntu server 18.04 (could work with another deb)

```
curl -o chemotion_ELN_install.sh -L https://git.scc.kit.edu/complat/chemotion_ELN_server/raw/development/scripts/install_production_bionic.sh
```

or, for Ubuntu 20.04:

```
curl -o chemotion_ELN_install.sh -L https://git.scc.kit.edu/complat/chemotion_ELN_server/raw/development/scripts/install_production_focal.sh
```


Check the variables at the beginning of the file, but also check the whole script to see what it is doing.

**TLDR**: the script will ...

* install OS package dependencies
* install passenger
* create a new user
* install ruby and nodejs for the user
* create a postgresql DB
* copy the chemotion_ELN code and prepare basic config files
* do a capistrano app deploy
* config nginx (NB: no ssl set) and UFW

When ready, make the script executable and run it as a non-root user (but in the sudo group):

```
chmod 700 chemotion_ELN_install.sh

sudo ./chemotion_ELN_install.sh
```

After reboot the application should be up and running at the ip of the machine (http://...)
An admin account should have been created (email: eln-admin@kit.edu, pw: PleaseChangeYourPassword)

To update the application code for such an installation, use the update script:

```
curl -o chemotion_ELN_update.sh -L https://git.scc.kit.edu/complat/chemotion_ELN_server/raw/development/scripts/update_production_bionic.sh
```

or, if using focal:

```
curl -o chemotion_ELN_update.sh -L https://git.scc.kit.edu/complat/chemotion_ELN_server/raw/development/scripts/update_production_focal.sh
```


If needed, edit the file  (change the variables or comments out parts to disable), then

```
chmod 700 chemotion_ELN_update.sh`

sudo ./chemotion_ELN_update.sh
```



## Using Docker

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


# Basic Development Setup

* Copy `config/database.yml.example` to `config/database.yml` and enter your database connection information.
* Copy `config/storage.yml.example` to `config/storage.yml` and enter your database connection information.
* Copy `.ruby-gemset.example` to `.ruby-gemset`.
* Copy `.ruby-version.example` to `.ruby-version`. (Skip this step if you want to use Docker)
* Reload directory to create rvm gemset.

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


## Deployment notes

If you like to reset the database, you have to execute the following commands (under the assumption your production database is called `chemotion`)

```
sudo -u postgres psql -d chemotion -c 'DROP SCHEMA public CASCADE;CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;'
```

or alternatively, drop and recreate DB using rake task:
```
RAILS_ENV=production bundle exec rake db:drop db:create
```

then, create DB extensions:
```
sudo -u postgres psql -d chemotion -c 'CREATE EXTENSION IF NOT EXISTS "pg_trgm"; CREATE EXTENSION IF NOT EXISTS "hstore";  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

and run DB migrations:
```
RAILS_ENV=production bundle exec rake db:migrate db:seed
```


## JS Setup & Testing

* Install `nvm`: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/0.34.0/install.sh | bash` (see https://github.com/nvm-sh/nvm#installation)
  or for OSX: `brew install nvm && echo "source $(brew --prefix nvm)/nvm.sh" >> ~/.profile`
* Execute `nvm install 10.15.3`
* Execute `npm install -g npm@6.11.3`
* Execute `npm install`.

## Mailing in Development Environment

Run `rake jobs:work` for asynchronous handling of email notifications. Run `mailcatcher` in your console and go to `localhost:1080` to see all sent mails.

## Icon Font

* put new icons as SVG files (e.g. '<ICON_NAME>.svg') in `app/assets/images/svg_icons`
* run `rake icons:compile`

Icons are now available as css classes: '.icon-<ICON_NAME'


# OS Dependencies

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

## FontCustom Dependencies

* `brew install fontforge --with-python`
* `brew install eot-utils`
