# SDF import connection resilience - short version

Full detail in [SDF-IMPORT-CONNECTION-RESILIENCE.md](SDF-IMPORT-CONNECTION-RESILIENCE.md). The PubChem Fault handling that used to be part of this work is on its own branch, `pubchem-fault-handling`.

## One dropped DB connection killed the whole import
- The importer held a database connection while OpenBabel ran for up to 12 s per record. If anything closed that idle connection, every later query failed, the import ended with zero samples, and the user was told "Import Samples Completed".
- **Fix:** release the connection before each long native or HTTP call, so the next query reconnects by itself, and bound the canonical-SMILES writer with a 20 s timeout.
- **Measured:** with a backend killed mid-import, `main` imports 0/40 records, this branch imports 40/40.

## One bad row aborted the whole file
- Per-row rescues sat inside a single file-wide transaction, so the first database error poisoned it and every later row failed too.
- **Fix:** each row is now its own transaction, so a bad row costs only that row.

## Still open, by maintainer decision
- One worker's death still stops the whole delayed_job fleet, and a failed import is still reported under an "Import Samples Completed" heading. Both are documented in the ticket and out of scope here.
