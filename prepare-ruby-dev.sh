#!/bin/bash
export ASDF_BRANCH=v0.13.1

# if asdf is not installed -> install
if command -v asdf ; then
    echo '>>> asdf is already installed -> continue'
else
    echo '>>> Missing asdf. Installing...'
    git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch $ASDF_BRANCH
fi

# install all tools as defined by .tool-versions
echo '>>> Installing tool versions'
asdf install

# install bundler if not present and then install all gems as defined by GEMFILE
echo '>>> checking bundler installation'
BUNDLER_VERSION=$(sed -n '/BUNDLED WITH/{n;p;}' "Gemfile.lock" | tr -d '[:space:]')
gem install bundler -v $BUNDLER_VERSION

echo '>>> Installing gems'
bundle install

rm -f tmp/pids/server.pid

if [ "$( psql -h postgres -U postgres -XtAc "SELECT 1 FROM pg_database WHERE datname='chemotion_dev'" )" = '1' ]
then
    echo "================================================"
    echo "Database already exists, skipping Database setup"
    echo "================================================"
else
    echo "================================================"
    echo "Database does not exist, running 'rake db:setup'"
    echo "================================================"
    bundle exec rake db:setup
fi
