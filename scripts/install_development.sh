#!/usr/bin/env bash

## This is a script to install a development ready environment for chemotion_ELN
## on a Ubuntu 18.04 or 20.04 machine
## should be edited accordingly

set -euo pipefail

############################################
############# VARIABLES ####################

REPO='https://github.com/ComPlat/chemotion_ELN.git'
BRANCH=development
TMP_REPO_DIR="/tmp/${BRANCH}.git"

## user account name (to be created or to be used)
PROD=chemotion
## PROD HOME set in part 3
# PROD_HOME=$(eval echo "~$PROD")

## RUBY
RUBY_VERSION=2.6.6 # 2.5 recommended for bionic
BUNDLER_VERSION=1.17.3

## NODEJS
NVM_VERSION='v0.35.3'
NODE_VERSION=12.21.0
NPM_VERSION=7.6.2

APP_NAME=chemotion_ELN # used for naming directories and files

## TMP DIR (has to be acccesible to install and PROD user)
TMP_DIR=/tmp/${APP_NAME}_stage

## INSTALLATION DIRECTORY: final destination of the application
PROD_DIR=/home/$PROD/chemotion_ELN


## POSTGRESQL DB
DB_ROLE=${APP_NAME,,}_dev # lowercase name
DB_NAME=${APP_NAME,,}_dev # lowercase name
DB_TEST=${APP_NAME,,}_test # lowercase name
# DB_PW=$(openssl rand -base64 8 | sed 's~/~~g')
DB_PW=chemotion
DB_HOST=localhost
DB_PORT=5432

NCPU=$(grep -c ^processor /proc/cpuinfo)

## Pandoc version https://github.com/jgm/pandoc/releases
PANDOC_VERSION=2.10.1

############################################
######### INSTALLATION PARTS TO RUN  #######
############################################

### comment out any line below (PART_....) to skip the corresponding installation part#########

PART_0='update OS'
PART_1='deb dependencies installation'
PART_1_1='deb specific dep version'
PART_3='create a ubuntu user'
PART_4='rvm and ruby installation'
PART_5='nvm and npm installation'
PART_6='prepare postgresql DB'
PART_7='prepare production app directories and config'
PART_8='prepare first deploy and deploy application code'
PART_81='seed common ketcher templates'
PART_82='seed common reagents'
PART_85='move tmp_dir'
PART_9='log-rotation'

############################################
############################################
#### INSTALLATION SCRIPT STARTS HERE #######
############################################
############################################

## supported Distribution Version  
. /etc/os-release
V18='bionic'
V20='focal'
V10='buster'
# if [ "$VERSION_CODENAME" = "$V18" ]; then
#   RUBY_VERSION=2.5.8  
# fi


GRE='\033[0;32m'
YEL='\033[0;33m'
RED='\033[0;31m'
BLU='\033[0;36m'
NOC='\033[0m'

SECONDS=0
elapsed_time(){
  duration=$SECONDS
  printf "${BLU}%03d:%02d${NOC}"  $(($duration / 60)) $(($duration % 60))
}


red() {
  printf "$(elapsed_time) ${RED}${1:-}${NOC}\n"
}

yellow() {
  printf "$(elapsed_time) ${YEL}${1:-}${NOC}\n"
}

green() {
  printf "$(elapsed_time) ${GRE}${1:-}${NOC}\n"
}

sharpi() {
  green "##########################################"
  yellow "${1:-}"
  green "##########################################"
}

rm_tmp() {
  yellow 'removing tmp files..'
  sudo rm -rf $TMP_DIR
}

rm_tmp_repo() {
  yellow 'removing tmp repo..'
  sudo rm -rf $TMP_REPO_DIR
}

trap "rm_tmp; rm_tmp_repo; red 'An error has occured'" ERR

if  [ "$VERSION_CODENAME" = "$V10" ] || [ "$VERSION_CODENAME" = "$V18" ] || [ "$VERSION_CODENAME" = "$V20" ]; then
  sharpi "Running installation for $PRETTY_NAME "
else 
  error "The installation for your distribution ($PRETTY_NAME) has not been tested"
fi




############################################
############################################
sharpi 'PART 0'
description="updating OS"
############################################

if [ "${PART_0:-}" ]; then
  sharpi "$description"
  sudo apt -y update && sudo apt upgrade && sudo apt autoremove
  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 1'
description="installing debian dependencies"
############################################

if [ "${PART_1:-}" ]; then
  sharpi "$description"
  # sudo add-apt-repository -y  ppa:inkscape.dev/stable
  sudo apt-get -y update
  sudo apt-get -y install ca-certificates apt-transport-https git curl dirmngr gnupg gnupg2 \
    autoconf automake bison libffi-dev libgdbm-dev libncurses5-dev openssh-server \
    g++ swig cmake libeigen3-dev \
    gconf-service libgconf-2-4 \
    libxslt-dev libxml2-dev \
    libyaml-dev sqlite3 libgmp-dev libreadline-dev libssl-dev \
    postgresql postgresql-client postgresql-contrib libpq-dev \
    imagemagick libmagic-dev libmagickcore-dev libmagickwand-dev \
    libsass-dev \
    libnspr4 libnss3 libpango1.0-0 libxss1  \
    tzdata python-dev libsqlite3-dev libboost-all-dev p7zip-full \
    ufw ranger htop \
    inkscape pandoc \
    xfonts-cyrillic xfonts-100dpi xfonts-75dpi xfonts-base xfonts-scalable \
    fonts-crosextra-caladea fonts-crosextra-carlito \
    fonts-dejavu fonts-dejavu-core fonts-dejavu-extra fonts-liberation2 fonts-liberation \
    fonts-linuxlibertine fonts-noto-core fonts-noto-extra fonts-noto-ui-core \
    fonts-opensymbol fonts-sil-gentium fonts-sil-gentium-basic \
    --fix-missing

  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 1.1'
description="installing specific version of debian dependencies"
############################################

if [ "${PART_1_1:-}" ]; then
  sharpi "$description"

  ## Pandoc
  pandoc_ver="pandoc-${PANDOC_VERSION}-1-amd64.deb"
  yellow "Pandoc version ${PANDOC_VERSION}"
  yellow "downloading Pandoc ${pandoc_ver}\n"
  curl -o /tmp/${pandoc_ver} -L https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/${pandoc_ver}
  yellow "installing Pandoc ${pandoc_ver}\n"
  sudo dpkg -i /tmp/${pandoc_ver}
  green "done installing Pandoc ${PANDOC_VERSION}"

  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 3'
description="creating production user $PROD"
############################################

if [ "${PART_3:-}" ]; then
  sharpi "$description"
  if id -u $PROD > /dev/null 2>&1; then
    yellow "user $PROD already exists"
  else
    yellow "creating user '$PROD' with home directory"
    sudo useradd -m $PROD
    echo $PROD:$(openssl rand -base64 8) | sudo chpasswd
    sudo usermod -s /bin/bash $PROD
  fi
  green "done $description\n"
else
  yellow "skip $description\n"
fi
PROD_HOME=$(eval echo "~$PROD")

############################################
############################################
sharpi 'PART 4'
description="installing rvm and ruby $RUBY_VERSION"
############################################

if [ "${PART_4:-}" ]; then
  sharpi "$description"
  if sudo -H -u $PROD bash -c 'gpg --keyserver hkp://pool.sks-keyservers.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB' ; then
    green 'gpg key installed'
  else
    sudo -H -u $PROD bash -c 'gpg2 --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB'
  fi
  sudo -H -u $PROD bash -c "curl -sSL https://get.rvm.io | bash -s stable --ruby=$RUBY_VERSION --auto-dotfiles"
  sudo -H -u $PROD bash -c "source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && gem install bundler -v $BUNDLER_VERSION "
  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 5'
description="installing nvm and node $NODE_VERSION"
############################################

if [ "${PART_5:-}" ]; then
  sharpi "$description"
  sudo -H -u $PROD bash -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh | bash"
  sudo -H -u $PROD bash -c "source ~/.nvm/nvm.sh &&  nvm install $NODE_VERSION"
  sudo -H -u $PROD bash -c "source ~/.nvm/nvm.sh &&  nvm use $NODE_VERSION && npm install -g npm@$NPM_VERSION"
  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 6'
description="Prepare postgresql DB"
############################################

if [ "${PART_6:-}" ]; then
  sharpi "$description"

  sudo -u postgres psql -c " CREATE ROLE $DB_ROLE LOGIN CREATEDB NOSUPERUSER PASSWORD '$DB_PW';" ||\
   yellow "ROLE $DB_ROLE already exists and will be used!"

 sudo -u postgres psql -c " CREATE DATABASE $DB_NAME OWNER $DB_ROLE;" ||\
   { red "DATABASE $DB_NAME already exists! Press s to skip this part if you want to use the existing DB (default), press r to reset this DB (all existing data will be lost), or a to abort. [s/r/a]?" &&\
   read x && { [[ "$x" == "a" ]] && yellow "aborting" && rm_tmp && exit; } ||\
   { [[ "$x" == "r" ]] && { sudo -u postgres psql -c " DROP DATABASE $DB_NAME;" || yellow "DB could not be DROPPED, press any key to continue with the existing DB" && read x; } } ||\
   yellow "skip create DB and continue with existing DB"; }

  sudo -u postgres psql -d $DB_NAME -c ' CREATE EXTENSION IF NOT EXISTS "pg_trgm"; CREATE EXTENSION IF NOT EXISTS "hstore";  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

  ## DB for testing
  sudo -u postgres psql -c " CREATE DATABASE $DB_TEST OWNER $DB_ROLE;" || yellow 'Test DB exists.' 
  sudo -u postgres psql -d $DB_TEST -c ' CREATE EXTENSION IF NOT EXISTS "pg_trgm"; CREATE EXTENSION IF NOT EXISTS "hstore";  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

  

  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
###########################################
sharpi 'PART 7'
description="Preparing production directories and configuration files"
############################################

if [ "${PART_7:-}" ]; then
  sharpi "$description"

  pwd=$TMP_DIR

  git clone --branch $BRANCH --depth 1 $REPO $TMP_DIR
  \cp -u $TMP_DIR/config/storage.yml.example $pwd/config/storage.yml
  \cp -u $TMP_DIR/config/user_props.yml.example $pwd/config/user_props.yml

  echo $RUBY_VERSION | sudo tee $pwd/.ruby-version

  sudo -u postgres psql -c "ALTER USER $DB_ROLE PASSWORD '$DB_PW';"


echo | sudo tee $pwd/config/database.yml <<EOL || true
development:
  adapter: postgresql
  encoding: unicode
  database: $DB_NAME
  pool: 5
  username: $DB_ROLE
  password: $DB_PW
  host: $DB_HOST
  port: $DB_PORT

test:
  adapter: postgresql
  encoding: unicode
  database: $DB_TEST
  pool: 5
  username: $DB_ROLE
  password: $DB_PW
  host: $DB_HOST
  port: $DB_PORT


EOL

# SET storage config

# Change Ownership and Permissions
  sudo chmod 600 $TMP_DIR/config/*.yml
  sudo chown $PROD:$PROD -R $TMP_DIR
  
  src='source ~/.nvm/nvm.sh && source ~/.rvm/scripts/rvm '

  sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && bundle config build.nokogiri --use-system-libraries"
  # sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && bundle install --jobs $NCPU --path $PROD_HOME/shared/bundle"
  yellow "Installing ruby gems\n"
  sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && bundle install --jobs $NCPU "
  yellow "Installing npm packages\n"
  sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.nvm/nvm.sh &&  nvm use $NODE_VERSION  && npm install "
  yellow "Run DB migrations\n"
  sudo -H -u $PROD bash -c "$src && cd $TMP_DIR &&  bundle exec rake db:migrate"

  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 8.1'
description="seeding ketcher common_templates"
############################################
if [ "${PART_81:-}" ]; then
  sharpi "$description"
  src='source ~/.nvm/nvm.sh && source ~/.rvm/scripts/rvm '
  sudo -H -u $PROD bash -c "$src && cd $TMP_DIR && RAILS_ENV=development bundle exec rake ketcherails:import:common_templates"
  sudo rm -rf $TMP_DIR/public/images/ketcherails/icons/original/*
  sudo -H -u $PROD bash -c "$src && cd $TMP_DIR && RAILS_ENV=development bundle exec rails r 'MakeKetcherailsSprites.perform_now'"
  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 8.2'
description="seeding common reagents "
############################################
if [ "${PART_82:-}" ]; then
  sharpi "$description"
  src='source ~/.nvm/nvm.sh && source ~/.rvm/scripts/rvm '
  sudo -H -u $PROD bash -c "$src && cd $TMP_DIR && RAILS_ENV=development bundle exec rake db:seed"
  green "done $description\n"
else
  yellow "skip $description\n"
fi
############################################
############################################
sharpi 'PART 8.5'
description="move application dir "
############################################
if [ "${PART_85:-}" ]; then
  sharpi "$description"

  sudo mv $TMP_DIR $PROD_DIR
  sudo chown $PROD:$PROD -R $PROD_DIR

  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 9'
descripton="log rotation"
############################################

if [ "${PART_9:-}" ]; then

sharpi "setting logrotate conf /etc/logrotate.d/${APP_NAME}"
  echo | sudo tee /etc/logrotate.d/$APP_NAME <<LOGR || true
$TMP_DIR/log/*.log {
  weekly
  missingok
  rotate 8
  compress
  delaycompress
  notifempty
  copytruncate
}

LOGR

  green "done $description\n"
else
  yellow "skip $description\n"
fi




############################################
############################################
sharpi
yellow 'Installation completed. '
sharpi
