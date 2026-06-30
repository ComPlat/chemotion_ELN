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

## SDS prompt helper (AI4Chemotion start)

Use `prompt.sh` from the repository root to fetch SDS JSON and build a chat payload:

```bash
export KI_TOOLBOX_API_KEY="<your_api_key>"
bash prompt.sh --sds-id 12345
```

To directly call the chat endpoint after payload creation:

```bash
bash prompt.sh --sds-id 12345 --send
```

The script includes curl connection/read timeouts and retries to avoid hanging requests.
