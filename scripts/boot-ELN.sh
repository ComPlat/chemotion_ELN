#!/usr/bin/env bash

directory=/var/www/chemotion_ELN/current
port=4000
ruby_version=2.6.6


if [ -d "$directory" ]; then
  ruby_version_file=$directory/.ruby-version
  ruby_gemset_file=$directory/.ruby-gemset
  if [ -f "$ruby_version_file" ]; then
    ruby_version="$(head -n 1 $ruby_version_file)"
  fi
  if [ -f "$ruby_gemset_file" ]; then
    ruby_gemset="$(head -n 1 $ruby_gemset_file)"
  fi
  version_gemset="ruby-$ruby_version"
  if [[ ! -z "$ruby_gemset" ]]; then
    version_gemset="$version_gemset@$ruby_gemset"
  fi

  cd $directory

  # start passenger daemon
  . $HOME/.profile; source ~/.nvm/nvm.sh && $HOME/.rvm/gems/$version_gemset/wrappers/ruby /usr/bin/passenger start -e production  --daemonize --address 127.0.0.1 --port $port

  # start backgorund worker 
  source $HOME/.rvm/environments/$version_gemset && RAILS_ENV=production bundle exec bin/delayed_job stop && RAILS_ENV=production bundle exec bin/delayed_job start

  # start ketcher background service 
  if [ -f "$directory/lib/node_service/nodeService.js" ]; then
    source $HOME/.nvm/nvm.sh &&  nvm use $node_version
    nohup node $directory/lib/node_service/nodeService.js production >> $directory/log/node.log 2>&1 &
  fi
fi

