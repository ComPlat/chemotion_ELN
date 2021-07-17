#!/usr/bin/env bash

## This is a script to de-install a development ready environment for chemotion_ELN interactively
## on a Ubuntu 18.04 or 20.04 machine
## should be edited accordingly
## references:
## 

set -euo pipefail

############################################
############# VARIABLES #################### 

# used for naming directories and files
APP_NAME=chemotion_ELN 

# user account name (to remove and be removed)
PROD=production

## INSTALLATION DIRECTORY if install production was used
PROD_DIR=/var/www/${APP_NAME}
## INSTALLATION DIRECTORY if install development was used
#PROD_DIR=/home/$PROD/chemotion_ELN

PROD_HOME=$(eval echo "~$PROD")

DB_DEV=chemotion_dev
DB_TEST=chemotion_test
#DB_PROD=chemotion_prod
DB_ROLE_DEV=chemotion_dev
DB_ROLE_TEST=chemotion_test
#DB_ROLE_PROD=chemotion_prod

# libraries, packages etc.
RUBY_VERSION=2.6.6
NVM_DIR=${PROD_HOME}/.nvm

############################################
###### DE-INSTALLATION PARTS TO RUN  #######
############################################

### comment out any line below (PART_....) to skip the corresponding installation part#########
#PART_4='soft remove rvm ruby version'
#PART_4a='hard remove rvm'
PART_5='uninstalling nvm'
#PART_6='reset postgresql database'
PART_6a='purge postgresql system installation'
PART_7='remove production app directories'
PART_Z='remove user'

############################################
############################################
#### DE-INSTALLATION SCRIPT STARTS HERE #######
############################################
############################################

## supported Distribution Version  
. /etc/os-release
V18='bionic'
V20='focal'
V10='buster'

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

#trap "rm_tmp; rm_tmp_repo; red 'An error has occured'" ERR

if  [ "$VERSION_CODENAME" = "$V10" ] || [ "$VERSION_CODENAME" = "$V18" ] || [ "$VERSION_CODENAME" = "$V20" ]; then
  sharpi "Running de-installation for $PRETTY_NAME "
else 
  error "The de-installation for your distribution ($PRETTY_NAME) has not been tested"
fi

############################################
############################################
sharpi 'PART 4'
description="soft remove specific rvm ruby" #TODO
############################################

if [ "${PART_4:-}" ]; then
  sharpi "$description"
  # only remove specific ruby version
  sudo -H -u $PROD bash -c "source ~/.rvm/scripts/rvm && rvm remove $RUBY_VERSION"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 4a'
description="hard remove rvm"
############################################

if [ "${PART_4a:-}" ]; then
  sharpi "$description"
  # remove the rvm/ directory and all the rubies built within it
  sudo -H -u $PROD bash -c "source ~/.rvm/scripts/rvm && rvm implode"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 5'
description="uninstalling nvm"
############################################

if [ "${PART_5:-}" ]; then
  sharpi "$description"
  if [ "${NVM_DIR:-}" ]; then
    sudo -H -u $PROD bash -c "rm -rf $NVM_DIR"
    green "done $description\n"
  fi
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 6'
description="Drop postgresql databases and roles"
############################################

if [ "${PART_6:-}" ]; then
  sharpi "$description"

  # reset db
  sudo -u postgres psql -d $DB_DEV -c 'DROP SCHEMA public CASCADE;CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;'
  sudo -u postgres psql -d $DB_TEST -c 'DROP SCHEMA public CASCADE;CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;'

  # rm databases
  sudo -u postgres psql -d $DB_DEV -c 'DROP DATABASE IF EXISTS $DB_DEV'
  sudo -u postgres psql -d $DB_DEV -c 'DROP DATABASE IF EXISTS $DB_TEST'

  # rm roles
  sudo -u postgres psql -d $DB_DEV -c 'DROP ROLE IF EXISTS DB_ROLE_DEV'
  sudo -u postgres psql -d $DB_DEV -c 'DROP ROLE IF EXISTS DB_ROLE_TEST'

  # rm extensions
  # DROP EXTENSION  IF EXISTS ...

  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART 6a'
description="Purge system postgresql"
############################################
if [ "${PART_6a:-}" ]; then
  sharpi "$description"
  sudo apt-get --purge remove -y postgresql postgresql-client postgresql-contrib libpq-dev \
  # depending on the installation it's necessary to purge more specific packages, e. g.:
  # postgresql-13 postgresql-client-13 postgresql-client-common postgresql-common
  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
###########################################
sharpi 'PART 7'
description="Remove production directories"
############################################

if [ "${PART_7:-}" ]; then
  sharpi "$description"
  sudo rm -rf ${PROD_DIR}
  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
sharpi 'PART Z'
description="remove user $PROD"
############################################

if [ "${PART_Z:-}" ]; then
  sharpi "$description"

  #   yellow "removing user '$PROD' with home directory"
  sudo deluser --remove-home $PROD
  #   echo $PROD:$(openssl rand -base64 8) | sudo chpasswd
  #   sudo usermod -s /bin/bash $PROD 
  green "done $description\n"
else
  yellow "skip $description\n"
fi