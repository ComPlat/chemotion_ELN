#!/usr/bin/env bash
set -euo pipefail

### setup routines for VM clones

user=production
DIR=/var/www/chemotion_ELN

home=/home/$user

current_network_interface=$(ip addr | grep '[0-9]: e' |   awk '{print $2}' | grep -Eo "[a-z0-9]*")


### comment any line below to not run the corresponding task
S00='correct network interface name'
S10='regenerate ssh host keys'
S20='reset production secret key'
S30='reset production DB password'
S40='restart application'
##################################################

#########utils##############
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


###### Scripts starts here #####
################################

# set network interface 
if [ "${S00:-}" ]; then
  sharpi "$S00"
  echo current_network_interface

  red "you current network interface seems to be named: $current_network_interface. Do you want to update your network configuration ? [y/n]" &&\
  read x
  if [[ "$x" == "y" ]]; then
    sudo sed -i.bak "s/ens160/$current_network_interface/" /etc/cloud/cloud.cfg.d/50-curtin-networking.cfg
    sudo sed -i.bak "s/ens160/$current_network_interface/" /etc/netplan/50-cloud-init.yaml
    sudo netplan apply
  else
    yellow 'skip'
  fi
fi

# regenerate ssh host keys
if [ "${S10:-}" ]; then
  sharpi "$S10"
  rm -v /etc/ssh/ssh_host_*
  dpkg-reconfigure openssh-server
  systemctl restart ssh
fi

# reset production secret key
if [ "${S20:-}" ]; then
  sharpi "$S20"
  pwd=$DIR/shared
  sed -i.bak "s/SECRET_KEY_BASE='.*'/SECRET_KEY_BASE='$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | sha512sum -b | sed 's/ .*//')' /" $pwd/.env
  sed -i.bak "s/SECRET_KEY_BASE: '.*'/SECRET_KEY_BASE: '$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | sha512sum -b | sed 's/ .*//')' /" $pwd/.env
fi


# reset production DB password
if [ "${S30:-}" ]; then
  sharpi "$S30"
  pw=$(openssl rand -base64 8 | sed 's~/~~g')
  sudo -u postgres psql -c "ALTER USER chemotion_prod PASSWORD '$pw';"
  pwd=$DIR/shared
  sed -i.bak "s/DB_PW='.*'/DB_PW='$pw' /" $pwd/.env
  sed -i.bak "s/DB_PW: '.*'/DB_PW: '$pw' /" $pwd/.env
fi


# restart application
if [ "${S40:-}" ]; then
  sharpi "$S40"
  directory=$DIR/current
  ## restart app
  echo "restart chemotion_ELN web application"
  sudo -H -u $user bash -c  "touch $directory/tmp/restart.txt"
  ## restart delayed jobs
  echo "restart chemotion_ELN background jobs"
  sudo -H -u production bash -c ". $home/boot-ELN.sh"
fi

sharpi "done"
