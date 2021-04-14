#!/usr/bin/env bash

## This is a script to update a production chemotion_ELN server

set -euo pipefail

############################################
############# VARIABLES ####################

## CHEMOTION ELN GIT REPOSITORY
REPO='https://git.scc.kit.edu/complat/chemotion_ELN_server'
BRANCH=development
TMP_REPO_DIR="/tmp/${BRANCH}.git"

## user account name (to be created or to be used)
PROD=production
PROD_HOME=$(eval echo "~$PROD")

## RUBY
RUBY_VERSION=2.6.6
BUNDLER_VERSION=1.17.3

## NODEJS
NVM_VERSION='v0.35.3'
NODE_VERSION=14.16.0
NPM_VERSION=7.6.2

## default naming of directories and files
APP_NAME=chemotion_ELN 

## TMP DIR (has to be acccesible to install and PROD user)
TMP_DIR=/tmp/${APP_NAME}_stage
deploy_conf_example=$TMP_DIR/config/deploy/server.rb.example

## INSTALLATION DIRECTORY
PROD_DIR=/var/www/${APP_NAME}

## APPLICATION PORT
PORT=4001

## NGINX config filename at /etc/nginx/sites-available/
NGINX_CONF=${APP_NAME,,}_prod_no_ssl
NGINX_CONF=chemotion_prod_no_ssl

NCPU=$(grep -c ^processor /proc/cpuinfo)

## Pandoc version https://github.com/jgm/pandoc/releases
PANDOC_VERSION=2.10.1

############################################
######### UPDATE PARTS TO RUN ##############
############################################

### comment out any line below (PART_....) to skip the corresponding installation part#########

PART_0='update OS'
PART_1='deb dependencies installation'
PART_1_1='deb specific dep version'
PART_4='update rvm and ruby'
PART_5='update nvm and npm'
PART_8='prepare first deploy and deploy application code'
#PART_81='seed common ketcher templates'
#PART_82='seed common reagents' 


############################################
############################################
#### INSTALLATION SCRIPT STARTS HERE #######
############################################
############################################

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

  # update RUBY_VERSION in application directory
  sudo -H -u $PROD bash -c "echo $RUBY_VERSION | tee $PROD_DIR/shared/.ruby-version"

  # update RUBY_VERSION in boot script
  sudo sed -i.bak "s/ruby_version=.*/ruby_version=$RUBY_VERSION /" $PROD_HOME/boot-ELN.sh

  # update RUBY_VERSION in NGINX config
  ##  vide infra

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

  rm_tmp
  rm_tmp_repo

  sudo -H -u $PROD bash -c "git clone --branch $BRANCH --bare $REPO $TMP_REPO_DIR"
  sudo -H -u $PROD bash -c "git clone --branch $BRANCH --depth 1 $TMP_REPO_DIR $TMP_DIR"
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
  localkey=$(sudo cat $PROD_HOME/.ssh/id_rsa.pub)
  sudo -H -u $PROD bash -c  "if [ -z \"\$(grep \"$localkey\" $PROD_HOME/.ssh/authorized_keys )\" ]; then echo $localkey | tee -a $PROD_HOME/.ssh/authorized_keys; fi;"

  sharpi "prepare config"
  
  local_deploy_conf=$TMP_DIR/config/deploy/local_deploy.rb
  sudo cp $deploy_conf_example $local_deploy_conf
  sed -i "s/user =.*/user ='$PROD'/" $local_deploy_conf
  sed -i "s/server_addr =.*/server_addr = 'localhost'/" $local_deploy_conf
  sed -i "s~set :repo_url,.*~set :repo_url, 'file://$TMP_REPO_DIR'~" $local_deploy_conf
  sed -i "s/set :branch,.*/set :branch, '$BRANCH'/" $local_deploy_conf
  sed -i "s/set :npm_version,.*/set :npm_version, '$NPM_VERSION'/" $local_deploy_conf
  sed -i "s~set :deploy_to,.*~set :deploy_to, '$PROD_DIR'~" $local_deploy_conf

  sudo chown $PROD:$PROD $local_deploy_conf

  sharpi 'starting capistrano deploy task'
  sudo -H -u $PROD bash -c "cd $TMP_DIR && source ~/.rvm/scripts/rvm && rvm use $RUBY_VERSION && cap local_deploy deploy --"

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
  sudo rm -rf $PROD_DIR/current/public/images/ketcherails/icons/original/*
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
  sudo -H -u $PROD bash -c "$src && cd $PROD_DIR/current && RAILS_ENV=production bundle exec rake db:seed"
  green "done $description\n"
else
  yellow "skip $description\n"
fi


###########################################
###########################################
sharpi 'PART 4'
description="upd nginx config with new ruby version"
###########################################
if [ "${PART_4:-}" ]; then

  # update RUBY_VERSION in NGINX config
  sudo sed -i.bak "s~ *passenger_ruby .*~        passenger_ruby $PROD_HOME/.rvm/wrappers/ruby-$RUBY_VERSION/ruby;~" /etc/nginx/sites-available/$NGINX_CONF

  sharpi "test nginx config"
  sudo nginx -t -c /etc/nginx/nginx.conf
  sharpi "restart nginx"
  sudo systemctl restart nginx
  green "done $description\n"
else
  yellow "skip $description\n"
fi


############################################
############################################
sharpi
green 'Update completed.';
sharpi
