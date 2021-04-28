# Installing a production ready server

## On a Ubuntu server

Server requirement: the installation can fail if not enough memory is available. A minimum of 3GB memory is recommended.

copy the installation script on a ubuntu server 18.04 or 20.04 (also works with debian buster)

```
curl -o chemotion_ELN_install.sh -L https://git.scc.kit.edu/complat/chemotion_ELN_server/raw/development/scripts/install_production.sh
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
curl -o chemotion_ELN_update.sh -L https://git.scc.kit.edu/complat/chemotion_ELN_server/raw/development/scripts/update_production.sh
```


If needed, edit the file  (change the variables or comments out parts to disable), then

```
chmod 700 chemotion_ELN_update.sh 

sudo ./chemotion_ELN_update.sh
```

## Using Windows Subsytem for Linux 2

The instalation script works with Ubuntu 20 under WSL2.

NB: 

- openssh-server should be reinstalled.
- services (postgres, nginx) needs to be started manually.
- UFW should not be used and disabled.



## Using Docker

see online ![docs](https://www.chemotion.net/chemotionsaurus/docs/eln/docker_installation)



# Basic Development Setup

## Ubuntu native or under WSL-2

See the scripts/install_development.sh for guidance or run it. Application should be all set up and ready to run. 

When using WLS-2:
-  postgres service needs to be started (```sudo service postgresql start ```)
-  you may want to move the application code somewhere to /mnt/... 
-  bind the WSL ip address  when starting the rails s (`rails s -b ip.ad.dr.ess`)


## Application Setup Notes

* config/database.yml and config/storage.yml are needed to start the application.
* Copy `.ruby-version.example` to `.ruby-version`. (Skip this step if you want to use Docker)
* Environment variables: see the corresponding .env files


### Resetting the db:
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

* Install `nvm`: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/0.35.0/install.sh | bash` (see https://github.com/nvm-sh/nvm#installation)
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
