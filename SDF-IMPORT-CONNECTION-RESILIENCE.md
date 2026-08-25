# SDF import: surviving a dropped PostgreSQL connection

Branch `sdf-import-connection-resilience`, on top of the CAS-only import work
(PR [ComPlat/chemotion_ELN#3340](https://github.com/ComPlat/chemotion_ELN/pull/3340)).

Reported symptom: one dropped PG connection during an SDF import takes down the whole delayed_job
fleet permanently, and the failure is reported to the user as "Import Samples Completed". The two
in-scope fixes are implemented and verified end to end against a real killed backend.

Three closed reports name the same organometallic stress file, and all three fixes are confirmed
present on this branch, so this is a new failure mode rather than a regression: a `NoMethodError` in
`Molecule#get_lcss`, an OpenBabel SVG hang (whose report already records "hangs the delayed_job
worker until the container is OOM-killed"), and a `PG::UniqueViolation` in
`Molecule.find_or_create_by_molfile`.

The PubChem Fault handling that was originally written up here has moved to its own branch,
`pubchem-fault-handling`, which is independent of this one and of the CAS-only PR. See
`PUBCHEM-FAULT-HANDLING.md` there.

---

## Problem 1 — a DB connection held idle across long native work

**Scope item 1** of the ticket.

- The SDF importer checks out one ActiveRecord connection and keeps it while OpenBabel runs
  natively. Measured on `alex_clark_structures.sdf` (6,355 organometallic records): the
  canonical-SMILES writer alone reaches **12.06 s on a single record**, and the whole
  `molecule_info_from_molfiles` call covers a batch of 50 — minutes of wall clock with no SQL in
  between.
- `PubchemLookupJob` does the same across HTTP: ~21 s between consecutive statements, on one
  connection held for the job's 54-minute budget. A real trace measured **0.31 s of SQL in a 63.9 s
  window — idle 99.5 % of the time.**
- ActiveRecord only re-verifies a connection when it is checked **out** of the pool
  (`ConnectionPool#checkout` → `checkout_and_verify` → `verify!` → `reconnect!`). A connection held
  for the whole job never passes that gate again, so once the server hangs up — idle reaper, NAT,
  pgbouncer `server_idle_timeout`, or the OOM killer taking a backend — the first query afterwards
  raises `PG::ConnectionBad`, **and so does every query after that**.
- That is why the user saw `PQsocket() can't get socket descriptor` rather than
  `PQconsumeInput() server closed the connection unexpectedly`: `PQsocket()` is libpq's *secondary*
  error, what you get when the connection object is already dead and you use it again. The import
  inherited an already-dead connection; it did not break it.

### The fix

Release the connection immediately **before** each long native or network call, so the next query
re-checks-out and reconnects transparently. Four sites:

- `lib/import/import_sdf.rb:278` — before `molecule_info_from_molfile` in the raw-data branch of
  `#create_samples`.
- `lib/import/import_sdf.rb:312` — before `resolve_molecule_for_row` in the rows branch of
  `#create_samples`. The transaction that follows wraps **only** the DB writes, so nothing is ever
  released mid-transaction.
- `lib/import/import_sdf.rb:536` — before the batch `molecule_info_from_molfiles` call in
  `#find_or_create_by_molfiles`. **This is the one the first pass at the fix missed, and it is the
  load-bearing one** — see the A/B table below. It is also the longest exposure window in the whole
  import: one call, fifty records, each up to `CANONICAL_SMILES_TIMEOUT_SECONDS`.
- `app/jobs/pubchem_lookup_job.rb:242` — in `#throttle`, called before every PubChem round trip.

Supporting change (also from the ticket's own investigation comment): OpenBabel's canonical-SMILES writer
is now bounded by `Chemotion::ForkedTimeout`, `CANONICAL_SMILES_TIMEOUT_SECONDS = 20`
(`OPENBABEL_CANONICAL_SMILES_TIMEOUT_SECONDS`), at `lib/chemotion/open_babel_service.rb:37`. It was
the only native seam with no bound at all. This shrinks the worst idle window from 12 s to the
timeout as well as being the performance fix.

### Why the per-record rescue was not enough

`#find_or_create_by_molfiles` already rescues `StandardError` per record and returns `nil`. That
does not help: the connection is never re-verified, so **every remaining record fails too**, and
the import ends with zero samples and no visible cause. Containment does not substitute for
recovery.

---

## Problem 2 — a per-row rescue inside one transaction, with no savepoint

**Scope item 2** of the ticket.

- The old code rescued per-row `StandardError` *inside* the single transaction opened for the whole
  file. Once any statement failed at PG level the transaction was poisoned, every later row raised
  `PG::InFailedSqlTransaction`, and the run ended in a wholesale abort and rollback — one bad row
  costing the entire file.
- The codebase already documents this hazard and its remedy at `app/models/molecule.rb:141-142,159`.

### The fix

- Each row is now its own top-level `ActiveRecord::Base.transaction(requires_new: true)`
  (`lib/import/import_sdf.rb:285` and `:321`), so a row-level failure rolls back only that row.
- No earlier row's connection or locks are held across a later row's native work.
- The spreadsheet path gets the same treatment: per-row savepoints inside per-batch transactions in
  `lib/import/import_samples.rb`.

---

## How to verify: `main` vs. this branch

This branch carries only what ships to production plus the specs that pin it. The reproduction
harness, the organometallic stress file and the resource-limited compose overlay live on the
companion branch `sdf-import-connection-resilience-harness`, which is branched from this one. Check it out to
run the commands below.

`test_data/sdf_import/verify_626_fix.rb` runs the same three checks on any branch. It kills PG
backends from a second libpq connection — standing in for an idle reaper, a NAT timeout, a
pgbouncer `server_idle_timeout`, or the OOM killer — from inside `Chemotion::OpenBabelService`,
i.e. exactly during the native window.

### Setup (once)

```bash
# Repository root, with the dev stack up.
cd test_data/sdf_import && gunzip -k alex_clark_structures.sdf.gz && cd -

# Isolated DB so the run cannot touch dev data, and so the killer only ever
# terminates the runner's own backends.
docker exec -w /home/ubuntu/app chemotion_eln-app-1 bash -lc '
  psql -h postgres -U postgres -d postgres -c "DROP DATABASE IF EXISTS chemotion_stress626"
  psql -h postgres -U postgres -d postgres -c "CREATE DATABASE chemotion_stress626"
  psql -h postgres -U postgres -d chemotion_stress626 -q -v ON_ERROR_STOP=1 -f db/structure.sql'
```

### Run on this branch

```bash
docker exec -w /home/ubuntu/app chemotion_eln-app-1 bash -lc '
  export DATABASE_URL=postgres://postgres@postgres:5432/chemotion_stress626 RAILS_ENV=development
  RECORDS=40 KILL_AT=1 bundle exec rails runner test_data/sdf_import/verify_626_fix.rb'
```

### Run on `main`

```bash
git worktree add --detach tmp/main-wt origin/main
cp test_data/sdf_import/verify_626_fix.rb tmp/main-wt/test_data/sdf_import/
ln -s /home/ubuntu/app/test_data/sdf_import/alex_clark_structures.sdf \
      tmp/main-wt/test_data/sdf_import/alex_clark_structures.sdf
# config/*.yml are gitignored, so the worktree needs them copied in
for f in config/database.yml config/shrine.yml config/storage.yml config/radar.yml \
         config/datacollectors.yml config/structure_editors.yml config/ui_components.yml \
         config/user_props.yml; do cp "$f" "tmp/main-wt/$f"; done

docker exec -w /home/ubuntu/app/tmp/main-wt chemotion_eln-app-1 bash -lc '
  export DATABASE_URL=postgres://postgres@postgres:5432/chemotion_stress626_main RAILS_ENV=development
  RECORDS=40 KILL_AT=1 bundle exec rails runner test_data/sdf_import/verify_626_fix.rb'
```

### Measured result

Backend terminated during the first native OpenBabel call, 40 records offered:

| tree | samples created | escaped exception |
| --- | --- | --- |
| `origin/main` (381f04eac) | **0 / 40** | `PG::ConnectionBad: PQsocket() can't get socket descriptor` |
| this branch, phase-1 release reverted | **0 / 40** | `PG::ConnectionBad: PQsocket() can't get socket descriptor` |
| this branch as it stands | **40 / 40** | none |

Baseline with no kill is 40/40 on every tree, so the difference is the dropped connection and
nothing else. `PQsocket() can't get socket descriptor` is verbatim the string the user saw on stage.

The middle row is the point worth keeping: the `#create_samples` releases alone did **not** fix
the bug — the import still died exactly as in production. `lib/import/import_sdf.rb:536` is what
closes it.

At scale, with the kill landing mid-import (`RECORDS=300 KILL_AT=4`, i.e. during the second
batch, after rows have already been written):

| | baseline | backend killed mid-import |
| --- | --- | --- |
| samples created | 300 / 300 | **300 / 300** |
| molecule entries kept | 300 / 300 | 300 / 300 |
| escaped exception | none | none |
| wall clock | 142.5 s | 149.3 s |

So the recovery is not just "the first record survives" — the import runs to completion and loses
nothing, at a cost of ~5 % wall clock.

**Caution:** the harness terminates every backend on its own database. Do not point it at
`chemotion_test` while the spec suite is running — it will produce spurious
`PG::ConnectionBad` failures in unrelated specs. Two `spec/models` failures during this work were
exactly that, and both pass in isolation.

The script's Check 1 proves the underlying mechanism independently of any import code, and prints
the same result on every branch:

```
connection HELD open    : died: ActiveRecord::StatementInvalid
connection RELEASED     : survived
```

### Regression specs

Two specs pin the behaviour so CI protects it. Both were confirmed to fail when the corresponding
release is removed (`got: [:openbabel]` / `got: [:resolve, :release]`):

- `spec/lib/import/import_sdf_spec.rb:123` — release happens **before** the per-row resolve, and the
  transaction nesting depth is unchanged at every release, so it can never start being called
  mid-transaction. Depth is asserted against whatever RSpec's transactional fixtures already hold
  open, so the spec is harness-independent.
- `spec/lib/import/import_sdf_spec.rb:238` — release happens **before** the batch OpenBabel call.

```bash
docker exec -w /home/ubuntu/app -e RAILS_ENV=test chemotion_eln-app-1 \
  bash -lc 'bundle exec rspec spec/lib/import/import_sdf_spec.rb'
```

---

## Full suite

Chunked per top-level directory (a single `rspec spec` OOMs, see below), seed 4242, against the
repaired test database:

| dir | examples | failures | | dir | examples | failures |
| --- | --- | --- | --- | --- | --- | --- |
| api | 1223 | 23 | | graphql | 77 | 0 |
| models | 614 | 2 → **0** | | controllers | 19 | 0 |
| lib | 970 | 7 | | policies | 61 | 0 |
| usecases | 201 | 0 | | mailers | 4 | 0 |
| db | 85 | 0 | | pdfs | 2 | 0 |
| services | 38 | 0 | | modules | 4 | 0 |
| jobs | 80 | 0 | | config | 5 | 0 |
| concerns | 35 | 0 | | clients | 0 | 0 |

Classified against `origin/main` in a worktree, same seed, same postgres:

- **4 real regressions** — the CAS prefetch, below. `sample_api_spec.rb` is 69/0 on main and 69/4
  here.
- **7 in `spec/lib/datacollector`** — `Validation failed: Datacollector key name No key file found`.
  Identical 7 failures on main. Missing SSH key fixture, environmental.
- **19 across `converter_api`, `search_api`, `collection_share_api`, `admin_device_api`,
  `admin_api`** — re-running those five files gives **15 failures on main and 15 on this branch**,
  i.e. no difference. External converter service plus a few order-dependent cases.
- **2 in `spec/models` and the `spec/graphql` `before(:suite)` deadlock** — self-inflicted: the
  connection-kill harness was running against the same postgres at the time. Both pass in isolation
  (`spec/models/report_spec.rb` + `person_spec.rb`: 14/0; `spec/graphql`: 77/0).

RuboCop: `lib/import/import_sdf.rb` carries 20 pre-existing offences. Diffing the offence set with
and without the change added here gives an empty set — **0 introduced**.
`spec/lib/import/import_sdf_spec.rb`: 0 offences.

---

## Environment notes

- **The test database was stale.** `config/environments/test.rb` sets `schema_format = :sql`, so
  `maintain_test_schema!` loads the **gitignored** `db/structure.sql`. The local copy predated five
  tables (`element_variations`, `protein_sequence_modifications`, `elements_wellplates`,
  `info_support_links`, `notify_messages`) and the `generate_notifications()` function, and loading
  it *removed* them from `chemotion_test` on every run — 165 failures in `spec/api` alone, all
  environmental. Regenerated from the dev database and reloaded; `chemotion_test` now carries 114
  tables and all 451 migrations. Anyone hitting mass `PG::UndefinedTable` failures should do the
  same before believing a suite result.
- **The app container OOMs on the full suite.** `docker-compose.dev-resource-limited.yml` (on the
  harness branch) caps
  `app` at 1.5 GB; `bundle exec rspec spec` dies with rc=137 (`OOMKilled=true`) partway through, and
  even `spec/lib/import` alone exceeds it. Either run per-directory or raise the cap:
  `docker update --memory 6g --memory-swap 6g chemotion_eln-app-1`. Raise it *before* starting a
  run — lowering it under a live rails process kills the container, not just the process.
- The resource-limited stack reproduces *an* OOM, but not the one in the ticket: the observed kill is of the Ruby
  test process, not a postgres backend. The verification script reproduces the actual failure mode
  deterministically instead, which is why it does not depend on
  [ComPlat/chemotion_ELN#3422](https://github.com/ComPlat/chemotion_ELN/pull/3422).

---

## The H4 CAS prefetch — regression found, then fixed

While verifying, `spec/api/chemotion/sample_api_spec.rb` was **69/0 on `origin/main` and 69/4
here**, all `WebMock::NetConnectNotAllowedError` on
`GET pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/277-10-1/...`. Cause: the H4 fix had removed
`next if structure?(row)` from `#prefetch_cas_molecules`, so **every** CAS-bearing row did a PubChem
lookup, whether or not its structure resolved. The fixture row carries both a `canonical_smiles` and
a `cas`, so on main it never touched the network and here it did. Re-adding that one line returned
the file to 69/0 — that was the whole cause.

It has since been fixed properly, by gating on whether the structure actually resolves
(`lib/import/import_samples.rb:625`):

```ruby
next unless cas?(row) && !structure_resolves?(row, index)
```

`sample_api_spec.rb` is back to 0 failures. H4 stays closed: a row whose structure fails to parse
still gets its CAS warmed outside any transaction.

**One cost left.** `#structure_resolves?` calls `resolve_structure` and throws the result away, and
`resolve_structure` is not memoized — so every CAS-bearing row now does the OpenBabel work **twice**,
once to decide and once at write time. On the organometallics in this ticket, where the
canonical-SMILES writer alone reaches 12 s, that is the same ~2x doubling the ticket already documents for
the SDF path. A per-index memo of the `[molecule, molfile]` pair removes it and lets `write_row`
consume the prefetch's own result:

```ruby
def resolve_structure(row, index)
  @resolved_structures ||= {}
  return @resolved_structures[index] if @resolved_structures.key?(index)
  @resolved_structures[index] = extract_molfile_and_molecule(row, index)
  ...
```

## Still open

Documented in the ticket as the rest of the chain, deliberately out of scope, and not addressed
here:

- **Fleet shutdown on one worker death** — `bin/delayed_job:43-69` stops *every* pool when one
  worker's pidfile goes stale, then exits without restarting. Out of scope by maintainer decision.
  Until that changes, one dropped connection anywhere still ends the fleet, and the connection fixes
  above only reduce how often that gets triggered.
- **Reconnect on reserve failure** — `Delayed::Backend::Base#recover_from` is a literal no-op, and
  `config/database.yml` sets no `reaping_frequency`, `idle_timeout` or `checkout_timeout`. A
  `Delayed::Worker.lifecycle` hook calling `verify!`, or a `reaping_frequency`, would make the
  worker self-heal instead of dying after 10 failed reserves (~50 s).
- **The misleading toast** — `app/jobs/import_samples_job.rb:39` interpolates the raw exception into
  the user-facing message, and it is delivered on the `'Import Samples Completed'` channel at
  `level: 'info'`. There is no `IMPORT_SAMPLES_FAIL` counterpart to `COLLECTION_ZIP_FAIL`. The right
  pattern already exists at `lib/import/import_samples.rb:707-726` (fixed sentence in `:message`,
  raw text in `:error`) and in `ImportCollectionsJob`.
- **Pool name mismatch to confirm on stage** — the observed argument is `--pool=import-samples`
  (hyphen) while the job declares `queue_as :import_samples` (underscore,
  `app/jobs/import_samples_job.rb:6`). If stage's `DELAYED_JOB_ARGS` really says `import-samples`,
  that worker polls a queue nothing is enqueued to. The pool definitions are not in the repo.
- **The server-side trigger is still unidentified.** Workstream A ruled out a postgres crash
  (6,355 records inserted through the real RDKit trigger: 6,355 rows, 772 graceful NULLs, zero
  errors, zero backend crashes). Idle-reaping and OOM remain. On dev postgres every relevant timeout
  is disabled, so if reaping is the trigger on stage the reaper is a firewall, NAT or pgbouncer in
  the path — not postgres. The stage settings and the 12:31–12:33 UTC postgres log still decide it.
  The fixes above are exposure reduction against an unconfirmed trigger, and they are correct
  regardless of which candidate it turns out to be.
