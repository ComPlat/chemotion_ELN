#!/usr/bin/env bash

## This is a script to install a production ready chemotion_ELN server
## with NGINX/PASSENGER/RAILS/POSTGRESQL on a Ubuntu 18.04 or 20.04 machine
## Could work on another debian but passenger install (part 2)
## should be edited accordingly

set -euo pipefail

############################################
############# VARIABLES ####################

REPO='https://git.scc.kit.edu/complat/chemotion_ELN_server'
BRANCH='development'
TMP_REPO_DIR="/tmp/${BRANCH}.git"

## user account name (to be created or to be used)
PROD=production
## PROD HOME set in part 3
# PROD_HOME=$(eval echo "~$PROD")

## RUBY
RUBY_VERSION=2.6.6 # 2.5 recommended for bionic
BUNDLER_VERSION=1.17.3

## NODEJS
NVM_VERSION='v0.35.3'
NODE_VERSION=14.16.0
NPM_VERSION=7.6.2

APP_NAME=chemotion_ELN # used for naming directories and files

## TMP DIR (has to be acccesible to install and PROD user)
TMP_DIR=/tmp/${APP_NAME}_stage
deploy_conf_example=$TMP_DIR/config/deploy/server.rb.example

## INSTALLATION DIRECTORY
PROD_DIR=/var/www/${APP_NAME}

## APPLICATION PORT
PORT=4001

## NGINX config filename
NGINX_CONF=${APP_NAME,,}_nossl

## POSTGRESQL DB
DB_ROLE=${APP_NAME,,}_prod # lowercase name
DB_NAME=${APP_NAME,,}_prod # lowercase name
DB_PW=$(openssl rand -base64 8 | sed 's~/~~g')
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
PART_2='nginx and phusionpassenger installation'
PART_3='create a ubuntu user'
PART_4='rvm and ruby installation'
PART_5='nvm and npm installation'
PART_6='prepare postgresql DB'
PART_7='prepare production app directories and config'
PART_71='reset DB pw'
PART_8='prepare first deploy and deploy application code'
PART_81='seed common ketcher templates'
PART_82='seed common reagents'
PART_9='prepare boot start and log rotation'
PART_10='configure UFW'
PART_11='configure NGINX'


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
sharpi 'PART 2'
description='installing nginx and  passenger'
############################################

if [ "${PART_2:-}" ]; then
  sharpi "$description"
  ## https://www.phusionpassenger.com/library/install/nginx/install/oss/$VERSION_CODENAME/

  # sudo apt-get install -y dirmngr gnupg
  sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 561F9B9CAC40B2F7
  sudo apt-get install -y nginx apt-transport-https ca-certificates
  sudo sh -c "echo deb https://oss-binaries.phusionpassenger.com/apt/passenger $VERSION_CODENAME main > /etc/apt/sources.list.d/passenger.list"
  sudo apt-get update
  sudo apt-get install -y libnginx-mod-http-passenger
  if [ ! -f /etc/nginx/modules-enabled/50-mod-http-passenger.conf ]; then
    sudo ln -s /usr/share/nginx/modules-available/mod-http-passenger.load /etc/nginx/modules-enabled/50-mod-http-passenger.conf
  fi

  sudo ls /etc/nginx/conf.d/mod-http-passenger.conf

  sudo /usr/bin/passenger-config validate-install
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

  pwd=$PROD_DIR/shared
  sudo mkdir -p  $PROD_DIR/releases $PROD_DIR/repo \
    $pwd/backup/deploy_backup $pwd/backup/weekly_backup \
    $pwd/config $pwd/log $pwd/node_modules \
    $pwd/public \
    $pwd/tmp/pids $pwd/tmp/cache $pwd/tmp/sockets $pwd/tmp/uploads

  echo $RUBY_VERSION | sudo tee $pwd/.ruby-version
  echo "SECRET_KEY_BASE='$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | sha512sum -b | sed 's/ .*//')'" | sudo tee $pwd/.env >/dev/null

echo | sudo tee -a $pwd/.env <<EOL || true
DB_NAME='$DB_NAME'
DB_ROLE='$DB_ROLE'
DB_PW='$DB_PW'
DB_HOST='$DB_HOST'
DB_PORT=$DB_PORT
EOL

  git clone --branch $BRANCH --depth 1 $REPO $TMP_DIR
  \cp -ru $TMP_DIR/public/images $PROD_DIR/shared/public/.
  \cp -u $TMP_DIR/config/storage.yml.example $pwd/config/storage.yml
  \cp -u $TMP_DIR/config/secrets.yml $pwd/config/secrets.yml
  \cp -u $TMP_DIR/config/user_props.yml.example $pwd/config/user_props.yml

  rm_tmp
  rm_tmp_repo

echo | sudo tee $pwd/config/database.yml <<EOL || true
production:
  adapter: postgresql
  encoding: unicode
  database: <%=ENV['DB_NAME']%>
  pool: 5
  username: <%=ENV['DB_ROLE']%>
  password: <%=ENV['DB_PW']%>
  host: <%=ENV['DB_HOST']%>
  port: <%=ENV['DB_PORT']%>
EOL

# SET storage config
echo | sudo tee $pwd/config/storage.yml <<EOL || true
production:
  :primary_store: 'local'
  :secondary_store: ''
  :stores:
    :tmp:
      :data_folder: 'tmp/uploads/production/'
      :thumbnail_folder: 'tmp/uploads/production'
    :local:
      :data_folder: 'uploads'
      :thumbnail_folder: 'uploads'
EOL

# Change Ownership and Permissions
  sudo chmod 600 $PROD_DIR/shared/config/*.yml
  sudo chmod 600 $PROD_DIR/shared/.env
  sudo chown $PROD:$PROD -R $PROD_DIR

  sharpi "Clone remote code and copy public images"

  green "done $description\n"
else
  yellow "skip $description\n"
fi

############################################
############################################
if [ "${PART_71:-}" ]; then
  descripton="RESET DB PASSWORD"
  sharpi "$description"
  sudo -u postgres psql -c "ALTER USER $DB_ROLE PASSWORD '$DB_PW';"
  sudo sed -i.bak "s/DB_PW='.*'/DB_PW='$DB_PW' /" $PROD_DIR/shared/.env
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

  sudo -H -u $PROD bash -c "git clone --branch $BRANCH --depth 2 --bare $REPO $TMP_REPO_DIR"
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

############################################
############################################
sharpi 'PART 9'
descripton="setting boot start and log rotation"
############################################

if [ "${PART_9:-}" ]; then
  sharpi "$description"
  sharpi 'prepare script to start app at boot'

  ## cp boot-ELN.sh example from source
  sudo cp $PROD_DIR/current/scripts/boot-ELN.sh $PROD_HOME/boot-ELN.sh
  ## update variables
  sed -i.bak "s~directory=.*~directory=$PROD_DIR/current~" $PROD_HOME/boot-ELN.sh
  sed -i.bak "s/port=.*/port=$PORT/" $PROD_HOME/boot-ELN.sh
  # sed -i.bak "0,/ruby_version=.*/{s//ruby_version=$RUBY_VERSION/}" $PROD_HOME/boot-ELN.sh


  sudo chmod 700  $PROD_HOME/boot-ELN.sh
  sudo chown $PROD:$PROD $PROD_HOME/boot-ELN.sh

  yellow "add to crontab for start at boot"
  boot_line="@reboot $PROD_HOME/boot-ELN.sh"
  if [[ -z $(sudo crontab -u $PROD -l) ]]; then
    echo "$boot_line" | sudo crontab -u $PROD -
  else
    if [[ -z $(sudo crontab -u $PROD -l | grep "$boot_line") ]]; then
      sudo crontab -u $PROD -l > /tmp/tmpcron && sed -i "1s~^~$boot_line\n~" /tmp/tmpcron && sudo crontab -u $PROD  /tmp/tmpcron
    fi
  fi

  yellow 'Do you want to start the application now? (y/n)' && read x && [[ "$x" == "y" ]] && sudo -H -u $PROD bash -c ". $PROD_HOME/boot-ELN.sh";

sharpi "setting logrotate conf /etc/logrotate.d/${APP_NAME}"
  echo | sudo tee /etc/logrotate.d/$APP_NAME <<LOGR || true
$PROD_DIR/shared/log/*.log {
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
sharpi 'PART 10'
description="configuring ufw"
############################################

## enable ufw
if [ "${PART_10:-}" ]; then
  sharpi "$description"
  sudo ufw enable
  sudo ufw allow ssh
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp

  green "done $description\n"
else
  yellow "skip $description\n"
fi


############################################
############################################
sharpi 'PART 11'
description="configuring nginx"
############################################

if [ "${PART_11:-}" ]; then
  sharpi "$description"
  read -d '' nginx_config_1 <<NGINXCONFIG || true
server {
        listen 80 ;
        listen [::]:80 ;

        passenger_enabled on;
        client_max_body_size 50m;
        passenger_ruby $PROD_HOME/.rvm/wrappers/ruby-$RUBY_VERSION/ruby;
        root $PROD_DIR/current/public;

        server_name _;
        # server_name www.my-eln.tld my-eln.tld;

        location / {
            proxy_pass http://127.0.0.1:$PORT;
            proxy_http_version 1.1;
NGINXCONFIG

  read -d '' nginx_config_2 <<"NGINXCONFIG" || true

            proxy_set_header Host $http_host;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_buffering off;
        }

}
NGINXCONFIG
  sharpi "create nginx config\n"


  echo "$nginx_config_1" | sudo tee /etc/nginx/sites-available/$NGINX_CONF
  echo "$nginx_config_2" | sudo tee -a /etc/nginx/sites-available/$NGINX_CONF

  if [ -f  /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
  fi
  if [ -f  /etc/nginx/sites-enabled/$NGINX_CONF ]; then
    sudo rm /etc/nginx/sites-enabled/$NGINX_CONF
  fi
  sudo ln -s /etc/nginx/sites-available/$NGINX_CONF /etc/nginx/sites-enabled/.
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
yellow 'Installation completed. Do you want to reboot now? (y/n)' && read x && [[ "$x" == "y" ]] && /sbin/reboot;
sharpi
green "Reboot to start the application if the installation is complete."
