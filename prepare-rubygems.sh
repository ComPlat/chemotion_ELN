#!/bin/bash
# install bundler if not present and then install all gems as defined by GEMFILE
echo '>>> checking bundler installation'
BUNDLER_VERSION=$(sed -n '/BUNDLED WITH/{n;p;}' "Gemfile.lock" | tr -d '[:space:]')
gem install bundler -v $BUNDLER_VERSION

echo '>>> Unset bundle config'
bundle config set without ''

echo '>>> Installing gems'
bundle install

