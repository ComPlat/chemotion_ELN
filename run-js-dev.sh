#!/bin/bash

## check yarn installation and install nodejs packages
## assume nodejs is installed (through ./run-ruby-dev.sh)
./prepare-nodejspkg.sh

echo "=========================================================================================================="
echo "THIS WILL FAIL UNTIL THE RUBY GEMS ARE INSTALLED BY run-ruby-dev.sh. JUST TRY AGAIN AFTER INSTALLING THEM."
echo "=========================================================================================================="
./bin/shakapacker-dev-server
