#!/bin/bash
export ASDF_BRANCH=v0.13.1

# if asdf is not installed -> install
if command -v asdf ; then
    echo '>>> asdf is already installed -> continue'
else
    echo '>>> Missing asdf. Installing...'
    git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch $ASDF_BRANCH
fi

# if asdf plugins are not installed -> install
if asdf plugin list | grep -Fxq 'ruby'; then
    echo '>>> Ruby plugin for asdf is installed -> continue'
else
    echo '>>> Missing ruby plugin for asdf. Installing...'
    asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git
fi

if asdf plugin list | grep -Fxq 'nodejs'; then
    echo '>>> Nodejs plugin for asdf is installed -> continue'
else
    echo '>>> Missing nodejs plugin for asdf. Installing...'
    asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
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
