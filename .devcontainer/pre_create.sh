#!/bin/bash

# set the .env for the root directory
# that will be used for the app and worker services
# - use .env if it exists
# - otherwise use .env.example if it exists
# - otherwise create an empty .env file
if [ -f .env ]; then
  echo ".env already exists"
else
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    echo "No .env.example file found"
    touch .env
  fi
fi

# set the devcontainer/.env to be used by the devcontainer docker-compose
# in order - the last one wins
# - use .dockerenv if it exists
# - otherwise use .dockerenv.example
# - append the contents of .env
# - append the contents of .env.development (this should be removed and kept for the service)

if [ -f .dockerenv ]; then
  echo "Using .dockerenv to create .devcontainer/.env"
  cp .dockerenv .devcontainer/.env
elif [ -f ./.dockerenv.example ]; then
  echo "Using .dockerenv.example to create .devcontainer/.env"
  cp .dockerenv.example .devcontainer/.env
else
  echo "Neither .dockerenv nor .dockerenv.example found. Exiting."
  exit 1
fi

if [ -f .env ]; then
  echo "Appending .env contents to .devcontainer/.env"
  cat .env >> .devcontainer/.env
else
  echo "No .env file found in the current directory."
fi

cat .env.development >> .devcontainer/.env

echo ".devcontainer/.env created successfully."

# make copies of the docker-compose and Dockerfile for the devcontainer
cp docker-compose.dev.yml .devcontainer/docker-compose.dev.yml
cp Dockerfile.chemotion-dev .devcontainer/Dockerfile.chemotion-dev

# prebuild base image
docker build -f Dockerfile.chemotion-dev --target chemotion_dev_base -t chemotion_eln_dev .
