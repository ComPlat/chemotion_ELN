# CDC Quick Start Guide

## What Was Added

### 1. PostgreSQL Logical Replication
- **File:** `docker-compose.dev.yml`
- **Change:** Added WAL configuration to postgres service
- **Purpose:** Enable Change Data Capture at database level

### 2. Database Migration
- **File:** `db/migrate/20251104150850_enable_logical_replication_and_publication.rb`
- **Creates:**
  - Publication: `sequin_cdc_publication` (tracks containers, analyses tables)
  - Replication slot: `sequin_slot`

### 3. Sequin CDC Service
- **File:** `docker-compose.dev.yml`
- **Service:** `sequin`
- **UI:** http://localhost:7376
- **Purpose:** Capture and stream database changes

### 4. Redis
- **File:** `docker-compose.dev.yml`
- **Service:** `redis`
- **Purpose:** State management for Sequin

## Quick Test (5 minutes)

```bash
# 1. Start everything
docker compose -f docker-compose.dev.yml --env-file .dockerenv up -d

# 2. Run migration
docker compose -f docker-compose.dev.yml --env-file .dockerenv exec app bundle exec rake db:migrate

# 3. Verify publication
docker compose -f docker-compose.dev.yml --env-file .dockerenv exec postgres \
  psql -U postgres chemotion_development \
  -c "SELECT * FROM pg_publication_tables WHERE pubname = 'sequin_cdc_publication';"

# 4. Open Sequin UI
open http://localhost:7376

# 5. Make a test change
docker compose -f docker-compose.dev.yml --env-file .dockerenv exec app \
  bundle exec rails runner "Container.first.update(name: 'CDC Test')"

# 6. Check Sequin UI for the captured event
```

## What's Next?

**Phase 2: Add OpenSearch** (1-2 hours)
- See `docs/OPENSEARCH_SETUP.md` (to be created)
- Add OpenSearch container
- Configure index mappings
- Set up Sequin → OpenSearch sink

**Phase 3: Data Transformation** (optional)
- Add LLM processing layer
- Extract entities and metadata
- Generate embeddings

## Files Modified

```
docker-compose.dev.yml                          # Added sequin, redis services + postgres config
db/migrate/20251104150850_*.rb                 # Publication and replication slot
.dockerenv.example                               # New environment variables
docs/CDC_SETUP.md                               # Full documentation
docs/CDC_QUICKSTART.md                          # This file
```

## Rollback

If you need to disable CDC:

```bash
# Rollback migration
docker compose -f docker-compose.dev.yml --env-file .dockerenv exec app \
  bundle exec rake db:rollback STEP=1

# Remove services from docker-compose.dev.yml:
# - sequin
# - redis
# And restore original postgres command
```
