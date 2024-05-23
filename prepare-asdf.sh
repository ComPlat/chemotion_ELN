#!/bin/bash

# Prepare asdf-vm for use with Ruby and Nodejs:
# install or update asdf-vm and plugins
# install Ruby and Nodejs as set in .tool-versions

# set ASDF_BRANCH unless it's already set
export ASDF_BRANCH=${ASDF_BRANCH:-v0.14.0}
export ASDF_DIR=${ASDF_DIR:-$HOME/.asdf}

# if asdf is not installed -> install
if command -v asdf ; then
    echo '>>> asdf is already installed -> check if update needed'
    # If version mismatch -> update:
    # Note that `asdf version` is of the form vM.m.p-{shortcommithash} while ASDF_BRANCH is vM.m.p
    # `asdf update` will install the latest stable (could be > ASDF_BRANCH)
    if [ "$(asdf version | cut -d'-' -f1)" != "$ASDF_BRANCH" ]; then
	echo '>>> asdf version mismatch -> update'
	asdf update
    fi
else
    echo '>>> Missing asdf. Installing...'
    git clone https://github.com/asdf-vm/asdf.git $ASDF_DIR --branch $ASDF_BRANCH
fi

# if asdf plugins are not installed -> install
if asdf plugin list | grep -Fxq 'ruby'; then
    echo '>>> Ruby plugin for asdf is installed -> updating'
    # plugin update to get latest list of availabe versions
    asdf plugin-update ruby
else
    echo '>>> Missing ruby plugin for asdf. Installing...'
    asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git
fi

if asdf plugin list | grep -Fxq 'nodejs'; then
    echo '>>> Nodejs plugin for asdf is installed -> updating'
    # plugin update to get latest list of availabe versions
    asdf plugin-update nodejs
else
    echo '>>> Missing nodejs plugin for asdf. Installing...'
    asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
fi

# install all tools as defined by .tool-versions
echo '>>> Installing tool versions'
asdf install

