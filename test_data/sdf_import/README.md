# SDF import connection-drop reproduction data

This directory contains test files and scripts for reproducing the SDF import connection drop.

## Files

- `sdf_import/` - SDF import test files and reproduction scripts
  - `alex_clark_structures.sdf.gz` (download required)
  - `reproduce_connection_drop.sh` - Manual reproduction guide
  - `download_test_files.sh` - Script to download test files

## Setup

1. Download test files:
   ```bash
   cd test_data/sdf_import
   ./download_test_files.sh
   ```

2. Start resource-limited environment:
   ```bash
   docker compose -f docker-compose.dev.yml -f docker-compose.dev-resource-limited.yml up -d
   ```

3. Follow reproduction steps in `sdf_import/reproduce_connection_drop.sh`

## Test Files

This directory contains test files for reproducing the connection drop:
"SDF import: one dropped PG connection takes down the whole delayed_job fleet permanently"

### Source Files

Download from IUPAC InChI test suite:
- alex_clark_structures.sdf.gz: https://github.com/IUPAC-InChI/InChI/blob/dev/INCHI-1-TEST/tests/test_executable/data/alex_clark_structures.sdf.gz
- organometallic_structures_CCDC.sdf.gz
- organometallic_structures_pubchem.sdf.gz

### File Characteristics (alex_clark_structures.sdf)

- Size: ~21 MB compressed
- Records: 6,355 organometallic structures
- Average: 33 atoms per structure
- Largest: 166 atoms / 178 bonds
- Element census: Heavy in transition metals (Cu, Ru, As, Fe, Ni, Pd, etc.)

This is a metals stress-test file that has triggered 4 prior incidents:
- NoMethodError in Molecule#get_lcss (race condition)
- SDF import hangs (OpenBabel SVG rendering timeout)
- PG::UniqueViolation (molecule find-or-create race)
- PG::ConnectionBad (this one - a dropped connection takes down the whole worker fleet)

## Reproduction Steps

1. Download test files to this directory
2. Start dev environment with resource limits (see docker-compose.dev.yml modifications)
3. Upload the SDF file through the Chemotion UI
4. Monitor delayed_job worker logs for connection failures
5. Observe fleet-wide shutdown when one worker loses DB connection

## Expected Behavior

When a PG connection drops during PubchemLookupJob execution:
1. Worker fails to reserve jobs after ~50 seconds (10 failed reserves @ 5s intervals)
2. bin/delayed_job supervisor detects dead worker
3. ALL workers are stopped (not just the failed one)
4. Supervisor exits without restarting
5. User sees "Import Samples Completed" with error message

## Defect status on this branch

- [x] A DB connection is held idle across long native/HTTP work (FIXED)
- [x] Per-row rescue uses savepoints (FIXED)
- [ ] No reconnection mechanism in delayed_job (out of scope)
- [ ] Reserve loop bounded then dies (delayed_job gem behaviour)
- [ ] bin/delayed_job kills entire fleet (out of scope by maintainer decision)
- [ ] Failure reported as "Completed" to user (out of scope)

See `REPRODUCTION_GUIDE.md` for the deterministic reproduction and the details. The fixes
live on `sdf-import-connection-resilience`; this branch adds the reproduction
material on top of them and is not meant to be merged.
