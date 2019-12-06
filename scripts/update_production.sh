#!/usr/bin/env bash

## This is a script to update a production chemotion_ELN server

set -euo pipefail

############################################
############# VARIABLES ####################

## CHEMOTION ELN GIT REPOSITORY
REPO='https://git.scc.kit.edu/complat/chemotion_ELN_server'
BRANCH=development

## user account name (to be created or to be used)
PROD=production
PROD_HOME=$(eval echo "~$PROD")

## RUBY
RUBY_VERSION=2.5.6
BUNDLER_VERSION=1.17.3

## NODEJS
NVM_VERSION='v0.34.0'
NODE_VERSION=10.15.3
NPM_VERSION=6.11.3

## TMP DIR (has to be acccesible to install and PROD user)
TMP_DIR=/tmp/chemotion_stage

## INSTALLATION DIRECTORY

PROD_DIR=/var/www/chemotion_ELN
## APPLICATION PORT
PORT=4001

## POSTGRESQL DB
DB_ROLE=chemotion_prod
DB_NAME=chemotion_prod
DB_PW=$(openssl rand -base64 8 | sed 's~/~~g')
DB_HOST=localhost
DB_PORT=5432

NCPU=$(grep -c ^processor /proc/cpuinfo)

## uncomment next line to run a backup (copy will be saved in PROD_DIR/shared/backup/deploy)
DEPLOY_BACKUP="before 'deploy:migrate', 'deploy:backup'"





############################################
######### INSTALLATION PARTS  ##############
############################################

### comment line out to skip a part#########

PART_0='update OS'

PART_4='update rvm and ruby'
PART_5='update nvm and npm'
PART_8='prepare first deploy and deploy application code'
#PART_81='seed common reagents/templates'
#PART_82='seed common reagents (~ 1h)'


############################################
############################################
#### INSTALLATION SCRIPT STARTS HERE #######
############################################
############################################

GRE='\033[0;32m'
YEL='\033[0;33m'
RED='\033[0;31m'
NOC='\033[0m'

red() {
  printf "${RED}${1:-}${NOC}\n"
}

yellow() {
  printf "${YEL}${1:-}${NOC}\n"
}

green() {
  printf "${GRE}${1:-}${NOC}\n"
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

trap "rm_tmp; red 'An error has occured'" ERR


############################################
############################################
sharpi 'PART 0'
description="updating OS"
############################################

if [ "${PART_0:-}" ]; then
  sharpi "$description"
  sudo apt update && sudo apt upgrade && sudo apt autoremove
  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################

############################################
############################################
sharpi 'PART 4'
description="installing rvm and ruby $RUBY_VERSION"
############################################

if [ "${PART_4:-}" ]; then
  sharpi "$description"
  sudo -H -u $PROD bash -c 'gpg2 --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB'
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
sharpi 'PART 8'
description="preparing first deploy and deploying"
############################################

if [ "${PART_8:-}" ]; then
  sharpi "$description"
  yellow "Clone remote code\n"

  sudo -H -u $PROD bash -c "git clone --branch $BRANCH --depth 1 $REPO $TMP_DIR"
  sudo -H -u $PROD bash -c "cd $TMP_DIR &&  echo $RUBY_VERSION > .ruby-version"
  sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && bundle config build.nokogiri --use-system-libraries"
  # sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && bundle install --jobs $NCPU --path $PROD_HOME/shared/bundle"
  yellow "Installing ruby gems\n"
  sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && bundle install --jobs $NCPU "
  sharpi "prepare ssh keys"
  ## TODO check default directories for authorized_keys
  # grep AuthorizedKeysFile /etc/ssh/sshd_config
  # sudo -H -u $PROD bash -c  'rm -v $PROD_HOME/.ssh/known_hosts $PROD_HOME/.ssh/id_rsa $PROD_HOME/.ssh/id_rsa.pub'


  sudo -H -u $PROD bash -c  "ssh-keygen -t rsa -N '' -f $PROD_HOME/.ssh/id_rsa" || echo ' using existing keys'
  # TODO do not concat authorized_key if already present
  # TODO pass cat $PROD_HOME/.ssh/id_rsa.pub o VAR
  # TODO check iff $PROD_HOME/.ssh/authorized_keys has VAR
  #
  sudo -H -u $PROD bash -c  "cat $PROD_HOME/.ssh/id_rsa.pub | tee -a $PROD_HOME/.ssh/authorized_keys"
  sudo -H -u $PROD bash -c  "cat $PROD_HOME/.ssh/id_rsa.pub | tee -a $PROD_HOME/.ssh/authorized_keys"


  sharpi "prepare config"

  read -d '' deploy_config <<CONFIG || true
user = '$PROD'
set :repo_url, '$REPO'
set :branch, '$BRANCH'
$DEPLOY_BACKUP
server 'localhost', user: user, roles: %w{app web db}
puts %w(publickey)
set :ssh_options, { forward_agent: true, auth_methods: %w(publickey) }
#set :pty, false
set :linked_files, fetch(:linked_files, []).push(
  '.ruby-version' #, '.ruby-gemset'
  #'Gemfile.plugin'
)
set :deploy_to, '$PROD_DIR'
set :user, user
set :bundle_path, nil
#set :bundle_without, %w{}.join(' ')
set :bundle_flags, '--frozen --deployment ' #--quiet
set :log_file, 'log/cap-server_local.log'
CONFIG

  echo "$deploy_config" | sudo tee $TMP_DIR/config/deploy/local_deploy.rb
  sudo chown $PROD:$PROD $TMP_DIR/config/deploy/local_deploy.rb

  sharpi 'starting capistrano deploy task'
  sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && cap local_deploy deploy"

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
  sudo -H -u $PROD bash -c "$src && cd $PROD_DIR/current && RAILS_ENV=production bundle exec rake ketcherails:import:common_templates"
  sudo rm -rf /var/www/chemotion_ELN/current/public/images/ketcherails/icons/original/*
  sudo -H -u $PROD bash -c "$src && cd $PROD_DIR/current && RAILS_ENV=production bundle exec rails r 'MakeKetcherailsSprites.perform_now'"
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
  sudo -H -u $PROD bash -c "$src && cd $PROD_DIR/current && RAILS_ENV=production bundle exec rake data:ver_20180205000000_reagent_seeds"
  green "done $description\n"
else
  yellow "skip $description\n"
fi
