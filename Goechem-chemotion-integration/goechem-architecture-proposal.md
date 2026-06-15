# GoeChem–Chemotion Integration: Architecture Proposal
**Data Granularity Mismatch & Parent-Child Mapping Design**

Author: Architecture Review (AI4Chemotion / KIT)
Date: 2026-06-08
Branch: `goechem-chemotion-integration`

---

## 1. Executive Summary

GoeChem tracks chemical inventory at the **batch/order level** — N identical bottles from a single purchase share one record with one `id`. Chemotion tracks inventory at the **container level** — each physical bottle is a separate `Sample`. This mismatch is the single largest design decision in the integration.

This document evaluates three candidate architectures and recommends **Option B: ancestry-based parent-child mapping using Chemotion's existing `Sample` tree mechanism**. No new database table is required. The existing `ancestry` column (already indexed and backed by the `has_ancestry` gem) is exactly the right primitive.

---

## 2. The Core Problem

### GoeChem data model (batch-level)

```
GoeChem record id=42:
  name:  Acetonitrile
  cas:   75-05-8
  cont:  500        ← individual container size
  inh:   1750       ← total REMAINING amount across all bottles
  einh:  ML
  ...
```

If a lab ordered 5 × 500 mL bottles and has consumed 750 mL total, GoeChem stores `inh=1750`, not per-bottle consumption. There is no GoeChem field that directly tells you "3 full bottles + 1 partially used + 1 empty"; that granularity lives only in the physical lab.

### Chemotion data model (container-level)

```
Sample A:  Acetonitrile, real_amount_value=500, real_amount_unit='ml'   ← bottle 1 (full)
Sample B:  Acetonitrile, real_amount_value=500, real_amount_unit='ml'   ← bottle 2 (full)
Sample C:  Acetonitrile, real_amount_value=500, real_amount_unit='ml'   ← bottle 3 (full)
Sample D:  Acetonitrile, real_amount_value=250, real_amount_unit='ml'   ← bottle 4 (partially used)
Sample E:  Acetonitrile, real_amount_value=0,   real_amount_unit='ml'   ← bottle 5 (empty)
```

Total: 1750 ml — matching GoeChem's `inh`.

### The implication

Any flat 1-to-1 mapping (one GoeChem record → one Chemotion Sample) **loses bottle-level granularity** and makes usage tracking meaningless. Conversely, any design that creates N child Samples needs a clear owner: where does the "this group of bottles comes from GoeChem batch #42" fact live?

---

## 3. Current State (Flat Mapping)

The existing `GoeChem::Sync` class (`lib/goechem/sync.rb`) implements a **1-to-1 flat mapping**:

- Each GoeChem row → one Chemotion `Sample` (created or updated)
- `xref['goechem_id']` stores the GoeChem batch ID on the sample
- `real_amount_value` / `real_amount_unit` stores GoeChem's aggregate `inh`/`einh`

This is usable as a Phase 1 baseline (it works and creates records), but it has fundamental limitations:

| Limitation | Impact |
|---|---|
| One Sample represents 5 bottles | Lab cannot track per-bottle usage |
| `real_amount_value` is the batch total | Meaningless for a single physical container |
| No path to bottle-level write-back | Can only push total, not bottle states |
| Depletion of bottle 3 is invisible | Chemotion shows "1750 ml" forever unless manually edited |
| Splitting sample in UI creates a child | Child inherits GoeChem ID — ambiguous |

---

## 4. Candidate Architectures

### Option A — 1-to-1 Flat Mapping (Status Quo)

Keep one Sample per GoeChem record. Users manually edit `real_amount_value` as they consume.

**Pros:**
- Already implemented, zero additional work
- Simple mental model

**Cons:**
- Wrong granularity — a Sample represents 5 bottles, not 1
- Amount field is meaningless (aggregate vs per-container)
- No structured path to bottle-level tracking
- Write-back sends aggregate, not actual lab state
- When user manually "splits" the sample in Chemotion UI, the child gets `goechem_id` duplicated — two samples claim ownership of the same GoeChem record

**Verdict: Acceptable only as a temporary Phase 1 scaffold. Do not design other features on top of this.**

---

### Option B — Ancestry Parent-Child Mapping (Recommended)

One GoeChem record → **one "Container Group" parent Sample** (the GoeChem anchor) + **N child Samples** (physical bottles), using Chemotion's existing `ancestry` mechanism.

```
Parent Sample (inventory_sample: true, no physical reality)
  xref['goechem_id'] = "42"
  xref['goechem_batch_size'] = 500
  xref['goechem_batch_unit'] = "ml"
  real_amount_value: nil (parent is a logical group, not a container)
  short_label: "GC-001"
  ancestry: "/"         ← root node

  └── Child Sample 1 (bottle 1)
        xref['goechem_id'] = "42"       ← same batch
        xref['bottle_index'] = 1
        real_amount_value: 500
        real_amount_unit: "ml"
        short_label: "GC-001-1"
        ancestry: "/parent_id/"

  └── Child Sample 2 (bottle 2)
        short_label: "GC-001-2"
        real_amount_value: 500
        ...

  └── Child Sample N (last bottle, partially consumed)
        short_label: "GC-001-N"
        real_amount_value: 250
        ...
```

**How the existing `ancestry` mechanism works in Chemotion:**

```ruby
# app/models/sample.rb
has_ancestry orphan_strategy: :adopt   # uses 'ancestry' string column

# ancestry values:
#   parent:  "/"
#   child:   "/42/"     (where 42 is parent.id)
#   grandchild: "/42/99/"
```

The `create_subsample` method already does this correctly — it calls `subsample.parent = self`, sets the ancestry path, inherits the molecule, mirrors the collection assignment, and generates a hierarchical `short_label`.

**Pros:**
- Zero new models or tables — `ancestry` column already exists and is indexed
- `create_subsample` already implements the full parent→child lifecycle
- Chemotion UI already renders child samples under their parent
- Short label hierarchy is automatic ("GC-001", "GC-001-1", "GC-001-2")
- Write-back: sum children amounts → single API update, clean and correct
- Users can add bottles by clicking "split" in the UI (standard Chemotion workflow)
- When GoeChem `inh` changes (batch delivered more stock), sync creates new children
- `orphan_strategy: :adopt` means deleting parent re-roots children — safe against accidental deletion

**Cons:**
- More complex sync logic than flat 1-to-1
- Need to determine N at import time (see Section 5.2 below)
- Parent Sample is a logical placeholder — must be styled/marked in UI to prevent confusion
- Incremental sync must distinguish "parent xref changed" from "child state changed"

**Verdict: Correct architecture. Implement in Phase 2.**

---

### Option C — Dedicated `goechem_batches` Table

Create a new join table `goechem_batches` (goechem_id, parent_sample_id, synced_at, batch_size, batch_unit) that is separate from the sample tree.

**Pros:**
- Explicit, no overloading of `xref`
- Could store GoeChem-specific metadata without polluting Sample

**Cons:**
- Adds a new table and model for a relationship `ancestry` already handles
- Every query that needs GoeChem context now requires an extra join
- Breaks the existing Chemotion model of "everything is a Sample tree"
- More migration work, more foreign keys, more maintenance surface
- The `xref` JSONB on Sample was designed for exactly this kind of cross-reference storage

**Verdict: Over-engineered. Rejected.**

---

## 5. Recommended Architecture: Option B in Detail

### 5.1 Sync Strategy

```
GoeChem API response (row)
        │
        ▼
find_container_group(goechem_id)
        │
   ┌────┴─────────┐
   │ found        │ not found
   ▼              ▼
update_parent   create_parent_sample
   │                    │
   ▼                    ▼
reconcile_children  create_initial_bottles(row)
```

**`create_parent_sample(row)`** — Creates the anchor:

```ruby
def create_parent_sample(row)
  sample = Sample.new(
    name:             row['name'].to_s.strip,
    inventory_sample: true,
    created_by:       @chemotion_user.id,
    user_id:          @chemotion_user.id,
    melting_point:    GoeChem::Mapper.parse_temperature_range_public(row['smp']),
    xref: {
      'goechem_id'         => row['id'].to_s,
      'goechem_cid'        => row['cid'],
      'goechem_batch_size' => row['cont'],
      'goechem_batch_unit' => GoeChem::Mapper::UNIT_MAP.fetch(row['einh'].to_s.strip, nil),
      'goechem_synced'     => Time.current.iso8601,
      'goechem_is_group'   => true,   ← sentinel: this is a logical container group, not a bottle
    }
  )
  attach_molecule(sample, row)
  sample.save!
  CollectionsSample.find_or_create_by!(collection_id: @collection_id, sample_id: sample.id)
  sample
end
```

**`create_initial_bottles(parent, row)`** — Creates N child Samples from the GoeChem batch. Each child gets both `real_amount_value` (Sample list display) and a `Chemical` record with the correct `amount`/`volume`/`status` (Chemical tab display):

```ruby
def create_initial_bottles(parent, row)
  n_bottles, per_bottle_amount = infer_bottle_count(row)
  unit = GoeChem::Mapper::UNIT_MAP.fetch(row['einh'].to_s.strip, nil)

  n_bottles.times do |i|
    bottle = parent.create_subsample(@chemotion_user, [@collection_id])
    bottle.assign_attributes(
      real_amount_value: per_bottle_amount,
      real_amount_unit:  unit,
      xref: bottle.xref.merge(
        'goechem_id'     => row['id'].to_s,
        'bottle_index'   => i + 1,
        'goechem_synced' => Time.current.iso8601,
      )
    )
    bottle.save!

    # Populate Chemical tab fields using the per-bottle amount
    bottle_row = row.merge('inh' => per_bottle_amount)
    chemical_attrs = GoeChem::Mapper.to_chemical_attrs(bottle_row)
    chemical = Chemical.find_or_initialize_by(sample_id: bottle.id)
    chemical.assign_attributes(chemical_attrs)
    chemical.save!
  end
end
```

After this, each bottle's Chemical tab shows:
- **Amount** `500 ml` (or **Volume** `500 ml` for liquids) — the per-bottle quantity
- **Status** `Available`
- **GoeChem product info** — vendor, batch no, safety phrases, etc.

### 5.2 Inferring Bottle Count N

GoeChem does not have a dedicated "number of units" field in the `CHEMIKALIENBESTAND` response as currently documented. The count is implicitly encoded:

| Field | Meaning |
|---|---|
| `cont` | Container size (per bottle), e.g. `500` |
| `inh` | Remaining total across all containers, e.g. `1750` |
| `einh` | Unit (both for cont and inh), e.g. `ML` |

**Conservative rule (recommended):**

```
if cont > 0 and inh > 0 and same unit:
  full_bottles = floor(inh / cont)          → 3 full bottles
  remainder    = inh % cont                 → 250 ml remainder
  if remainder > 0:
    create full_bottles children at cont each
    create 1 child at remainder              → partial bottle
  else:
    create full_bottles children at cont each
else:
  create 1 child at inh (fallback — can't infer)
```

This maximizes granularity from available data. It is an approximation — if 2 of 5 bottles are fully consumed and gone from the lab, GoeChem's `inh` still correctly gives 1750 ml remaining, and we correctly reconstruct 3+1 bottles. However, we cannot recover the fact that there *were* 5 original bottles and 2 are gone — that history is lost in GoeChem's aggregate model.

**This is not a bug in the integration — it is a fundamental limitation of GoeChem's data model.** Document it clearly in user-facing sync notes.

**Ask Daniel Frank / GoeChem team:** Does the API expose an `anzahl` (quantity) field in any query variant? If yes, use it directly as N.

### 5.3 Reconciling Children on Incremental Sync

When `fetch_goechem_updates` fires and finds a changed `regzeit` on a GoeChem record:

```
1. Fetch parent by xref['goechem_id']
2. Sum children real_amount_value (where deleted_at IS NULL)
3. Compare sum to new row['inh']
4. Determine delta: Δ = new_inh - current_sum
5a. If Δ > 0 (stock increased — delivery arrived):
      Create new child bottle(s) with amount = Δ
      (or one bottle of exactly Δ if Δ < cont, a partial)
5b. If Δ < 0 (consumption recorded in GoeChem):
      Do NOT auto-delete Chemotion samples — user may have re-measured
      Instead: flag parent xref['goechem_pending_delta'] = Δ
               notify user via Chemotion notification system to reconcile manually
5c. If Δ == 0:
      Update metadata (location, safety phrases) on parent; no child changes
```

The key constraint: **never auto-delete or auto-reduce a Chemotion child sample based on a GoeChem change**, because Chemotion is the source of truth for bottle-level measurements.

### 5.4 Write-Back (Phase 2 — when GoeChem INSERT/UPDATE is confirmed)

The trigger watches for changes to the Chemical tab's canonical fields (`chemical_data`) or to `real_amount_value` (which mirrors them):

```ruby
# app/models/sample.rb (or a concern)
after_save :enqueue_goechem_writeback, if: :should_sync_to_goechem?

def should_sync_to_goechem?
  parent&.xref&.dig('goechem_is_group') &&
    (saved_change_to_real_amount_value? || saved_change_to_attribute?(:chemical))
end

def enqueue_goechem_writeback
  GoechemWritebackJob.set(wait: 30.seconds).perform_later(parent.id)
end
```

The job aggregates `chemical_data[0]['volume']` (liquid) or `chemical_data[0]['amount']` (solid) — the same fields the Chemical tab displays — so what the user sees is exactly what gets pushed to GoeChem:

```ruby
# app/jobs/goechem_writeback_job.rb
class GoechemWritebackJob < ApplicationJob
  queue_as :sync_goechem

  def perform(parent_sample_id)
    parent = Sample.find_by(id: parent_sample_id)
    return unless parent&.xref&.dig('goechem_is_group')

    unit  = parent.xref['goechem_batch_unit']
    field = GoeChem::Mapper::LIQUID_UNITS.include?(unit) ? 'volume' : 'amount'

    new_total = parent.children.alive.joins(:chemical).sum(
      "COALESCE((chemicals.chemical_data->0->>'#{field}')::jsonb->>'value', '0')::float"
    )

    GoeChem::Client.new.update_amount(
      goechem_id:  parent.xref['goechem_id'],
      amount:      new_total,
      unit:        unit,
      goechem_uid: parent.xref['goechem_user_id'],
    )
  rescue GoeChem::ApiError, GoeChem::ConnectionError => e
    Rails.logger.warn "[GoechemWritebackJob] #{e.message} — will retry on next scheduled sync"
  end
end
```

The 30-second `wait` acts as a debounce — if a user records consumption on 5 bottles in quick succession, only one API call fires. `samples.real_amount_value` is kept in sync with `chemical_data` during mapping and serves as a fast fallback if Chemical join is unavailable.

---

## 6. Chemical Data Field Mapping

The `Chemical` model holds a `chemical_data` JSONB column (1:1 with `sample_id`). Chemotion's Chemical tab reads `chemical_data[0]` and expects these top-level keys:

```json
{
  "amount":  { "value": 5.0,  "unit": "mg" },
  "volume":  { "value": 8.0,  "unit": "ml" },
  "status":  "Available",
  "goechemProductInfo": { ... }
}
```

- **`amount`** — solid/weight quantity. Rendered by the Chemical tab as "Amount" with unit options g/mg/kg/pcs.
- **`volume`** — liquid quantity. Rendered as "Volume" with unit options ml/l.
- **`status`** — availability label. Standard values: `"Available"`, `"Insufficient"`, `"Empty"`.
- Both `amount` and `volume` can coexist in a single Chemical (e.g., a mixture with known mass *and* volume).

### GoeChem → Chemical field routing

`GoeChem::Mapper` routes GoeChem `inh`/`einh` to the correct Chemical field based on unit type:

| GoeChem `einh` | Normalized unit | Routes to Chemical field |
|---|---|---|
| `ML` | `ml` | `volume.value` / `volume.unit` |
| `L`  | `l`  | `volume.value` / `volume.unit` |
| `G`  | `g`  | `amount.value` / `amount.unit` |
| `MG` | `mg` | `amount.value` / `amount.unit` |
| `KG` | `kg` | `amount.value` / `amount.unit` |
| `ST` | `pcs`| `amount.value` / `amount.unit` |
| `-1` / `""` | `nil` | neither field set |

`status` is derived: `inh > 0` → `"Available"`, `inh == 0` → `"Empty"`.

### Full GoeChem → Chemotion field mapping

| GoeChem field | Chemotion target | Notes |
|---|---|---|
| `id` | `samples.xref['goechem_id']` | Batch identity anchor |
| `cid` | `samples.xref['goechem_cid']` | Compound ID |
| `name` | `samples.name` | |
| `cas` / `casnr` | `chemicals.cas` + `samples.xref['cas']` | Used for PubChem molecule lookup |
| `inh` + `einh` (liquid) | `samples.real_amount_value` + `real_amount_unit` AND `chemicals.chemical_data[0]['volume']` | Both kept in sync |
| `inh` + `einh` (solid) | `samples.real_amount_value` + `real_amount_unit` AND `chemicals.chemical_data[0]['amount']` | Both kept in sync |
| `inh > 0` | `chemicals.chemical_data[0]['status']` = `"Available"` | |
| `inh == 0` | `chemicals.chemical_data[0]['status']` = `"Empty"` | |
| `gebaeude`/`raum`/`platz` | `samples.location` | Formatted "Geb. X, Raum Y, Platz Z" |
| `smp` | `samples.melting_point` numrange | Mojibake-corrected |
| `firma` / `hersteller` | `chemical_data[0]['goechemProductInfo']['vendor'/'manufacturer']` | |
| `katnr` / `prodnr` | `chemical_data[0]['goechemProductInfo']['catalogNo'/'productNo']` | |
| `cont` | `chemical_data[0]['goechemProductInfo']['packageSize']` + `samples.xref['goechem_batch_size']` | Per-bottle size |
| `hhinweis` / `phinweis` | `chemical_data[0]['goechemProductInfo']['hPhrases'/'pPhrases']` | |
| `fp` | `chemical_data[0]['goechemProductInfo']['flashPoint']` | |
| `charge` | `chemical_data[0]['goechemProductInfo']['batchNo']` | |
| `regzeit` | `chemical_data[0]['goechemProductInfo']['registeredAt']` | Unix → ISO8601 |
| `struktur_b64` | — (ignored) | PNG not parseable as molfile; molecule fetched via PubChem by CAS |

### Write-back amount aggregation

When writing back to GoeChem, aggregate the correct Chemical field across all alive children:

```ruby
def aggregate_children_amount(parent_sample)
  unit = parent_sample.xref['goechem_batch_unit']
  if GoeChem::Mapper::LIQUID_UNITS.include?(unit)
    # sum chemical_data[0]['volume']['value'] for liquid batches
    parent_sample.children.alive
      .joins(:chemical)
      .sum("(chemicals.chemical_data->0->>'volume')::jsonb->>'value'")
      .to_f
  else
    # sum chemical_data[0]['amount']['value'] for solid/count batches
    parent_sample.children.alive
      .joins(:chemical)
      .sum("(chemicals.chemical_data->0->>'amount')::jsonb->>'value'")
      .to_f
  end
end
```

In practice, `samples.real_amount_value` mirrors these Chemical fields and can be used as a simpler aggregate source — but `chemical_data` is the authoritative UI-facing store.

---

## 7. Schema Changes Required

The current `samples` table requires no DDL changes — `ancestry`, `xref`, `inventory_sample`, `real_amount_value`, `real_amount_unit` are all already present.

**One new index recommended:**

```ruby
# db/migrate/YYYYMMDD_add_goechem_index_to_samples.rb
add_index :samples,
  "(xref->>'goechem_id')",
  name: 'index_samples_on_xref_goechem_id',
  where: "deleted_at IS NULL AND xref ? 'goechem_id'",
  using: :btree
```

This makes `find_container_group(goechem_id)` O(log n) rather than a full-table JSON scan.

**`xref` key convention for this integration:**

| Key | Type | Present on | Description |
|---|---|---|---|
| `goechem_id` | String | Parent + Child | GoeChem batch ID |
| `goechem_cid` | String/Integer | Parent | GoeChem compound ID |
| `goechem_is_group` | Boolean | Parent only | Marks logical container group (not a bottle) |
| `goechem_batch_size` | Numeric | Parent | Per-bottle container size from GoeChem `cont` |
| `goechem_batch_unit` | String | Parent | Unit for batch_size |
| `goechem_synced` | ISO8601 | Parent + Child | Last sync timestamp |
| `goechem_user_id` | String | Parent | GoeChem user ID used for sync |
| `goechem_pending_delta` | Numeric | Parent | Set when GoeChem shows less than Chemotion sum; triggers user reconcile notification |
| `bottle_index` | Integer | Child only | Creation-order index within the batch |
| `cas` | String | Parent | CAS number (mirrors Chemical.cas for quick access) |

---

## 7. Migration Path: Flat → Parent-Child

The flat sync is already running on the branch. Migrating to parent-child without data loss:

```ruby
# lib/goechem/migrate_flat_to_hierarchy.rb
# One-time migration task, run as: rails goechem:migrate_flat_to_hierarchy
module GoeChem
  class MigrateFlatToHierarchy
    def run
      flat_samples = Sample
        .where("xref ? 'goechem_id' AND NOT (xref ? 'goechem_is_group') AND NOT (xref ? 'bottle_index')")
        .where("ancestry = '/' OR ancestry IS NULL")
        .where(deleted_at: nil)

      ActiveRecord::Base.transaction do
        flat_samples.each { |s| convert(s) }
      end
    end

    private

    def convert(flat_sample)
      # 1. Mark the existing sample as the parent group (no physical amount)
      flat_sample.update!(
        real_amount_value: nil,
        real_amount_unit:  nil,
        xref: flat_sample.xref.merge('goechem_is_group' => true,
                                      'goechem_batch_size' => flat_sample.xref['cont'],
                                      'goechem_batch_unit' => flat_sample.real_amount_unit)
      )

      # 2. Create one child bottle with the original amount (safe fallback)
      bottle = flat_sample.create_subsample(
        User.find(flat_sample.created_by),
        flat_sample.collections.pluck(:id)
      )
      bottle.update!(
        real_amount_value: flat_sample.xref['original_inh']&.to_f,
        real_amount_unit:  flat_sample.xref['goechem_batch_unit'],
        xref: bottle.xref.merge(
          'goechem_id'   => flat_sample.xref['goechem_id'],
          'bottle_index' => 1,
        )
      )
    end
  end
end
```

After migration, run `GoeChem::Sync#process` to re-fetch and reconcile amounts with live GoeChem data.

---

## 8. Pros & Cons Summary

| Criterion | Option A (Flat) | Option B (Ancestry) | Option C (New Table) |
|---|---|---|---|
| Models required | 0 | 0 | 1 new |
| Bottle-level tracking | No | Yes | Yes |
| Correct amount semantics | No | Yes | Yes |
| Write-back accuracy | Low (aggregate guess) | High (sum children) | High |
| UI compatibility | Full | Full (subsample renders natively) | Requires custom UI |
| Incremental sync complexity | Low | Medium | Medium-High |
| Migration from current state | None needed | Simple script | Complex (new FK) |
| Index efficiency | O(n) JSON scan | O(log n) with proposed index | O(log n) |
| Risk of orphaned records | Low | Low (`orphan_strategy: :adopt`) | Medium (FK) |

---

## 9. Open Questions (Action Required)

| # | Question | Owner | Blocks |
|---|---|---|---|
| 1 | Does GoeChem `CHEMIKALIENBESTAND` expose an `anzahl` (bottle count) field? | Daniel Frank / GoeChem team | Section 5.2 |
| 2 | Is INSERT/UPDATE confirmed for Phase 2 write-back? | Daniel Frank | Section 5.4 |
| 3 | Which GoeChem `userid` has department-wide visibility for sync (not just personal)? | Daniel Frank | All sync |
| 4 | Should the Container Group parent be visible in the UI or hidden? | Adam Basha (UX decision) | Frontend work |
| 5 | On incremental sync — if a bottle is consumed in GoeChem, who reconciles in Chemotion? | Adam Basha (Policy) | Section 5.3 |

---

## 10. Decision and Next Steps

**Recommended decision: Adopt Option B (ancestry parent-child) for Phase 2.**

**Immediate next steps:**

1. **Confirm GoeChem `anzahl` field** with Daniel Frank (Question 1 above).
2. **Add partial index** on `xref->>'goechem_id'` (migration file in `db/migrate/`).
3. **Refactor `GoeChem::Sync#sync_row`** to branch on `xref['goechem_is_group']` vs bottle logic.
4. **Implement `infer_bottle_count(row)`** using `cont`/`inh` fallback from Section 5.2.
5. **Write VCR cassette tests** for `GoeChem::Sync` covering: new batch, update existing, Δ positive, Δ negative.
6. **Design UI decision**: whether Container Group parent is shown in inventory list or hidden with only children visible.

---

## Appendix A — Sample Ancestry Mechanics

The `ancestry` gem stores the full ancestor path as a delimited string:

```
Sample id=10: ancestry = "/"                → root
Sample id=20: ancestry = "/10/"             → child of 10
Sample id=30: ancestry = "/10/20/"          → grandchild
```

Relevant methods available on `Sample`:

```ruby
sample.parent           # immediate parent Sample
sample.children         # direct children (ActiveRecord relation)
sample.ancestors        # all ancestors
sample.descendants      # all descendants
sample.is_root?         # true if ancestry == "/"
sample.depth            # nesting level

# Container Group query:
Sample.where("xref->>'goechem_is_group' = 'true'").roots

# Bottles for a given GoeChem batch:
parent = Sample.find_by("xref->>'goechem_id' = ? AND xref->>'goechem_is_group' = 'true'", "42")
bottles = parent.children.alive  # alive = not soft-deleted
```

## Appendix B — Write-Back Debounce Pattern

If a user records consumption on 5 bottles in quick succession, the naive `after_save` fires 5 API calls. Debounce with:

```ruby
# app/jobs/goechem_writeback_job.rb
class GoechemWritebackJob < ApplicationJob
  queue_as :sync_goechem

  def perform(parent_sample_id)
    parent = Sample.find_by(id: parent_sample_id)
    return unless parent&.xref&.dig('goechem_is_group')

    total     = parent.children.alive.sum(:real_amount_value)
    unit      = parent.xref['goechem_batch_unit']
    uid       = parent.xref['goechem_user_id']
    goechem_id = parent.xref['goechem_id']

    GoeChem::Client.new.update_amount(goechem_id, total, unit, uid)
  end
end
```

Trigger with `GoechemWritebackJob.set(wait: 30.seconds).perform_later(parent.id)` — Rails deduplicates identical queued jobs in Sidekiq (with `sidekiq-unique-jobs` or equivalent).

---

*This document is internal to the GoeChem–Chemotion integration effort. It contains architectural recommendations based on the GoeChem demo API (x02.goechem.de) and Chemotion ELN schema as of 2026-06-08.*
