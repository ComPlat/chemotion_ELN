# SDF import connection-drop reproduction guide

## Issue Summary

**Title:** SDF import: one dropped PG connection takes down the whole delayed_job fleet
permanently, and the failure is reported as "Import Samples Completed"

**Status:** reproduced deterministically and fixed for the two in-scope defects (1 and 6 below).
The rest of the chain is documented in the ticket and deliberately left out of scope.

See `SDF-IMPORT-CONNECTION-RESILIENCE.md` in the repository root for the full write-up and the measured before/after
numbers.

**Branch layout.** The fixes themselves are on `sdf-import-connection-resilience`,
which carries only production code and the specs that pin it. This branch is that one plus the
reproduction material: the harness, the stress data and the compose overlay. Nothing here is meant
to be merged.

---

## Reproduction that actually works: `verify_connection_resilience.rb`

The docker-compose overlay below reproduces *an* OOM, but not this one: the process it kills is
the Ruby test process, not a postgres backend. Use `verify_connection_resilience.rb` instead. It kills postgres
backends from a second libpq connection - standing in for an idle reaper, a NAT timeout, a
pgbouncer `server_idle_timeout` or the OOM killer - from inside `Chemotion::OpenBabelService`,
i.e. exactly during the native window the import holds its connection across.

```bash
# Once: unpack the stress file and create an isolated database.
cd test_data/sdf_import && gunzip -k alex_clark_structures.sdf.gz && cd -

docker exec -w /home/ubuntu/app chemotion_eln-app-1 bash -lc '
  psql -h postgres -U postgres -d postgres -c "DROP DATABASE IF EXISTS chemotion_stress_import"
  psql -h postgres -U postgres -d postgres -c "CREATE DATABASE chemotion_stress_import"
  psql -h postgres -U postgres -d chemotion_stress_import -q -v ON_ERROR_STOP=1 -f db/structure.sql'

# Run it.
docker exec -w /home/ubuntu/app chemotion_eln-app-1 bash -lc '
  export DATABASE_URL=postgres://postgres@postgres:5432/chemotion_stress_import RAILS_ENV=development
  RECORDS=40 KILL_AT=1 bundle exec rails runner test_data/sdf_import/verify_connection_resilience.rb'
```

Measured with the backend terminated during the first native OpenBabel call, 40 records offered:
`origin/main` imports 0/40 and raises `PG::ConnectionBad: PQsocket() can't get socket descriptor`;
this branch imports 40/40 with no escaped exception.

**Caution:** the harness terminates every backend on its own database. Do not point it at
`chemotion_test` while the spec suite is running, or unrelated specs fail spuriously.

---

## Manual reproduction through the UI (indicative only)

```bash
cd test_data/sdf_import && ./download_test_files.sh && cd -

docker compose -f docker-compose.dev.yml -f docker-compose.dev-resource-limited.yml up -d
docker compose -f docker-compose.dev.yml -f docker-compose.dev-resource-limited.yml \
  logs -f delayed_job_worker
```

Then import `alex_clark_structures.sdf.gz` at http://localhost:3000 through
Collection -> Import Samples. The overlay adds `mem_limit` and `idle_session_timeout=30s` to
postgres and splits `delayed_job` into its own service, which is what makes defect 4 observable at
all. It does not reliably reproduce the dropped connection itself.

---

## The six defects

| # | Defect | Status | Location |
|---|--------|--------|----------|
| 1 | A DB connection is held idle across long native/HTTP work | FIXED | `app/jobs/pubchem_lookup_job.rb:242`, `lib/import/import_sdf.rb:278,312,536` |
| 2 | No reconnection mechanism on reserve failure | present, out of scope | `config/database.yml` (no `reaping_frequency`/`idle_timeout`), no `Delayed::Plugin` |
| 3 | Reserve loop is bounded, then the worker dies | present, gem behaviour | delayed_job gem `worker.rb` |
| 4 | One dead worker stops the entire fleet | present, out of scope by maintainer decision | `bin/delayed_job:43-70` |
| 5 | Failure reported to the user as "Completed" | present, out of scope | `app/jobs/import_samples_job.rb:31`, `app/models/channel.rb:39` |
| 6 | Per-row rescue inside one transaction, no savepoint | FIXED | `lib/import/import_sdf.rb:285,321` |

Defect 1 is fixed by releasing the connection immediately before each long native or network call,
so the next query re-checks-out and reconnects transparently. Defect 6 is fixed by making each row
its own top-level `transaction(requires_new: true)`. The canonical-SMILES writer is now also
bounded by `Chemotion::OpenBabelService::CANONICAL_SMILES_TIMEOUT_SECONDS`, which shrinks the worst
idle window from a measured 12.06 s to the timeout.

Two regression specs pin the releases: `spec/lib/import/import_sdf_spec.rb` asserts the release
happens before the per-row resolve and before the batch OpenBabel call, at unchanged transaction
nesting depth.

---

## Failure signature in the logs

```
12:32:01 [Worker(delayed_job.0 ...)] Error while reserving job:
         PG::ConnectionBad: PQconsumeInput() server closed the connection unexpectedly
12:32:06 ... Error while reserving job: PG::ConnectionBad: PQsocket() can't get socket descriptor
12:32:11 ... (repeats every 5 s)
12:32:48  Delayed Job worker .../tmp/pids/delayed_job.0.pid 176 HAS stopped.
          Stopping all workers ( ["--pool=import-samples", "--pool=*:2"])
exiting
```

`PQsocket() can't get socket descriptor` is libpq's *secondary* error: what you get when the
connection object is already dead and you use it again. The import inherited an already-dead
connection, it did not break it.

The user still sees the "Import Samples Completed" heading at `level: 'info'` with the raw
exception interpolated into the message (defect 5, unfixed).

---

## Root cause chain

1. A job holds one checked-out connection across seconds to minutes of work with no SQL in
   between: OpenBabel native calls in the SDF importer, HTTP round trips in `PubchemLookupJob`.
2. Something in the path closes that idle connection. Candidates: an idle reaper, a firewall or
   NAT timeout, pgbouncer `server_idle_timeout`, or the OOM killer taking a backend. **Which one
   fires on stage is still unidentified**; on dev postgres every relevant timeout is disabled.
3. ActiveRecord only re-verifies a connection when it is checked *out* of the pool, so a
   connection held for the whole job never passes that gate again. Every query from then on raises
   `PG::ConnectionBad`.
4. The worker fails ~10 reserves at 5 s intervals, raises `FatalBackendError` and exits.
5. `bin/delayed_job` sees the stale pidfile, stops *every* pool and exits without restarting.
6. `ImportSamplesJob` reports the resulting exception under an "Import Samples Completed" heading.

The fixes here address steps 1 and 3. They are exposure reduction against an unconfirmed trigger,
and are correct regardless of which candidate step 2 turns out to be. Until defect 4 is addressed,
one dropped connection anywhere still ends the fleet.

---

## Remaining work (not in this branch)

- **Reconnect on reserve failure.** `Delayed::Backend::Base#recover_from` is a no-op and
  `config/database.yml` sets no `reaping_frequency`, `idle_timeout` or `checkout_timeout`. A
  `Delayed::Worker.lifecycle` hook calling `verify!` would let the worker self-heal.
- **Fleet shutdown.** Restart only the dead worker, or exit non-zero and let an external
  supervisor restart it.
- **The misleading toast.** `app/jobs/import_samples_job.rb:31` interpolates the raw exception into
  the user-facing message on the `'Import Samples Completed'` channel at `level: 'info'`. There is
  no `IMPORT_SAMPLES_FAIL` counterpart to `COLLECTION_ZIP_FAIL`. The right pattern already exists
  at `lib/import/import_samples.rb` (fixed sentence in `:message`, raw text in `:error`) and in
  `ImportCollectionsJob`.
- **Pool name mismatch.** The observed argument is `--pool=import-samples` while the job declares
  `queue_as :import_samples`. If stage really passes the hyphenated form, that worker polls a queue
  nothing is enqueued to. The pool definitions are not in this repository.

---

## Related issues

Prior art on the same stress file, all closed and all confirmed present on this branch, so this is a
new failure mode and not a regression:

- `NoMethodError` in `Molecule#get_lcss`
- OpenBabel SVG hang, whose report already records "hangs the delayed_job worker until the container
  is OOM-killed"
- `PG::UniqueViolation` in `Molecule.find_or_create_by_molfile`

Related reports cover Ketcher/InChI metal-organic handling, worker OOM plus crash-retry storms, and
slow DB queries.

---

## Files in this directory

- `verify_connection_resilience.rb` - the deterministic verification harness described above
- `download_test_files.sh` - downloads the organometallic SDF stress files
- `reproduce_connection_drop.sh` - step-by-step manual reproduction
- `README.md` - what the test files are and where they come from

The SDF files themselves are not committed; run `download_test_files.sh` to fetch them.
