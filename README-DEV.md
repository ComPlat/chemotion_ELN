## Prepare installation

**in config/ create**
- datacollectors.yml
- database.yml
- storage.yml

**write temporary in run-ruby-dev.sh**
- rake db:create
- rake db:schema:load

## Installation

docker-compose -f docker-compose.dev.yml up
