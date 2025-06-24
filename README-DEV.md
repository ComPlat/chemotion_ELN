## Prepare installation

**in config/ create**
- datacollectors.yml
- database.yml
- storage.yml
- indigo_service.yml (if indigo service is required)

**write temporary in run-ruby-dev.sh**
- rake db:create
- rake db:schema:load

## Installation

docker-compose -f docker-compose.dev.yml up

OR

docker-compose -f docker-compose.dev.yml up postgres app webpacker

## Working inside app container

docker exec -it chemotion_eln-app-1 /bin/bash
