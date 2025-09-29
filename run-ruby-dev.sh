#!/bin/bash

./prepare-rubygems.sh

bundle exec rails s -p 3000 -b 0.0.0.0
