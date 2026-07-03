#!/bin/bash

## Gems and node packages are installed by the `setup` service
## (prepare-ruby-dev.sh) which this container waits on, so the dev server can
## start directly. bin/shakapacker-dev-server is a bundler binstub.
./bin/shakapacker-dev-server
