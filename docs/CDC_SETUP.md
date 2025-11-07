# Change Data Capture (CDC) Setup with Sequin

This document describes the Change Data Capture infrastructure for real-time data synchronization and search indexing.

## Architecture Overview

```
┌───────────────────────────────┐
│   PostgreSQL Master DB        │
│  - Logical replication (WAL)  │
│  - Tables: containers,        │
│    analyses, etc.             │
└───────────────┬───────────────┘
                │ WAL stream
                ▼
┌───────────────────────────────┐
│      Sequin CDC Engine        │
│  - Subscribes to publication  │
│  - Captures INSERT/UPDATE/    │
│    DELETE operations          │
│  - Maintains delivery state   │
└───────────────┬───────────────┘
                │ JSON events
                ▼
┌───────────────────────────────┐
│   Data Sinks (Future)         │
│  - OpenSearch                 │
│  - Webhooks                   │
│  - Message queues             │
└───────────────────────────────┘
```

## Components

### 1. PostgreSQL with Logical Replication

**Configuration** (in `docker-compose.dev.yml`):
```yaml
postgres:
  command: >
    postgres
    -c wal_level=logical
    -c max_replication_slots=4
    -c max_wal_senders=4
```

**What it does:**
- Enables Write-Ahead Log (WAL) at logical level
- Allows up to 4 replication slots
- Supports up to 4 concurrent WAL sender processes

### 2. Sequin CDC Service

**Port:** 7376 (default)
**UI:** http://localhost:7376

**Features:**
- Real-time change capture from PostgreSQL
- Exactly-once delivery guarantees
- Built-in backfill for historical data
- REST API for managing streams
- Web UI for monitoring

### 3. Redis

**Purpose:** State management for Sequin
- Tracks consumer offsets
- Manages delivery confirmations
- Caches configuration

## Setup Instructions

### Initial Setup

1. **Start the services:**
   ```bash
   docker compose -f docker-compose.dev.yml --env-file .dockerenv up -d
   ```

2. **Run the migration:**
   ```bash
   docker compose -f docker-compose.dev.yml --env-file .dockerenv exec app bundle exec rake db:migrate
   ```

3. **Verify the publication:**
   ```bash
   docker compose -f docker-compose.dev.yml --env-file .dockerenv exec postgres psql -U postgres chemotion_development -c "SELECT * FROM pg_publication_tables WHERE pubname = 'sequin_cdc_publication';"
   ```

   Expected output:
   ```
    pubname             | schemaname | tablename
   ---------------------+------------+-----------
    sequin_cdc_publication | public     | containers
    sequin_cdc_publication | public     | analyses
   ```

4. **Check Sequin UI:**
   - Open http://localhost:7376
   - Verify connection to PostgreSQL
   - Check that the publication is detected

### Verify CDC is Working

1. **Make a database change:**
   ```ruby
   # In Rails console
   Container.first.update(name: "Test CDC")
   ```

2. **Check Sequin captured the event:**
   - Go to Sequin UI → Streams
   - You should see the event captured

## Monitored Tables

Currently tracking changes for:
- `containers` - Container data and metadata
- `analyses` - Analysis records

To add more tables, modify the migration:
```ruby
CREATE PUBLICATION sequin_cdc_publication FOR TABLE 
  containers,
  analyses,
  your_new_table  -- Add here
WITH (publish = 'insert,update,delete');
```

## Configuration

### Environment Variables

In `.dockerenv`:
```bash
# Sequin Web UI port
HOST_PORT_SEQUIN=7376

# Named volumes
VOLUME_NAME_SEQUIN=chemotion_eln_sequin_data
VOLUME_NAME_REDIS=chemotion_eln_redis_data
```

### Replication Slot

- **Name:** `sequin_slot`
- **Plugin:** `pgoutput` (native PostgreSQL logical replication)
- **Purpose:** Ensures no changes are lost even if Sequin is down

Check slot status:
```sql
SELECT slot_name, plugin, active, restart_lsn 
FROM pg_replication_slots 
WHERE slot_name = 'sequin_slot';
```

## Troubleshooting

### Sequin can't connect to PostgreSQL

**Check:**
1. PostgreSQL is healthy: `docker compose ps postgres`
2. Publication exists: `SELECT * FROM pg_publication WHERE pubname = 'sequin_cdc_publication';`
3. Network connectivity: Sequin should be on the same Docker network

### No events appearing in Sequin

**Check:**
1. Tables are in the publication: `SELECT * FROM pg_publication_tables;`
2. Replication slot is active: `SELECT * FROM pg_replication_slots;`
3. Make a test change to the database

### Replication slot lag growing

This means Sequin isn't consuming events fast enough.

**Check:**
```sql
SELECT slot_name, 
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots
WHERE slot_name = 'sequin_slot';
```

**Solutions:**
- Check Sequin logs: `docker compose logs sequin`
- Ensure Redis is healthy
- Check sink endpoints are responding

### Cleanup (Development Only)

To reset CDC infrastructure:

```bash
# Stop services
docker compose -f docker-compose.dev.yml down

# Remove volumes
docker volume rm chemotion_eln_sequin_data chemotion_eln_redis_data

# Drop publication and slot (in PostgreSQL)
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres chemotion_development -c "SELECT pg_drop_replication_slot('sequin_slot');"
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres chemotion_development -c "DROP PUBLICATION sequin_cdc_publication;"
```

## Next Steps

1. **Add OpenSearch** - Full-text search indexing
2. **Configure Sinks** - Set up Sequin to push to OpenSearch
3. **Add Transformations** - Enrich data before indexing
4. **Monitoring** - Set up alerts for replication lag

## References

- [Sequin Documentation](https://sequinstream.com/docs)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [pgoutput Plugin](https://www.postgresql.org/docs/current/logicaldecoding-output-plugin.html)
