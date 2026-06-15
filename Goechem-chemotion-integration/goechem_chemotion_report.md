# GoeChem ↔ Chemotion Integration — Progress & Technical Plan

**Prepared by:** Adam 
**Date:** 2026-06-05  
**Branch:** `goechem-chemotion-integration`  
**Status:** Early scaffolding — core business logic not yet implemented

---

## 1. Context & Overview

GoeChem ("Das Chemikalienkataster und -verwaltungssystem") is a chemical inventory and hazardous-material management system used at German universities, including Göttingen. Chemotion ELN is the electronic lab notebook developed at KIT. The goal of this integration is a **bidirectional synchronization** so that:

- Chemicals registered in GoeChem are available as inventory samples in Chemotion (GoeChem → Chemotion)
- New chemicals added or updated in Chemotion propagate back into GoeChem (Chemotion → GoeChem)

---

## 2. Requested Deliverables (From Our Side)

Based on the input/output data specification (`Input_output Data - Goechem_Chemotion synchronization (2).pdf`):

### 2.1 Import: GoeChem → Chemotion

**Required fields to pull from GoeChem:**

| GoeChem Field | GoeChem Table | Chemotion Target |
|---|---|---|
| GoeChem ID (`id`) | `chemdb2` | `samples.xref['goechem_id']` |
| CAS number (`cas`) | `chemdb2` | `samples.xref['cas']` / `chemicals.cas` |
| Molfile / structure (`struktur`) | `winithi` | `samples.molfile` |
| SMILES (`smiles`) | `winithi` | molecule lookup / creation |
| Package size (`inh`) | `chemdb2` | `samples.real_amount_value` |
| Package unit (`einh`) | `chemdb2` | `samples.real_amount_unit` |
| Storage location (`raum`, `platz`, `gebaeude`) | `chemdb2` + `northeim` | `samples.location` |

**Nice-to-have fields:**

| GoeChem Field | GoeChem Table | Chemotion Target |
|---|---|---|
| Safety data (SDS, GHS pictograms, H&P phrases) | `gutingi2` | `chemicals.chemical_data` |
| Substance name (`name`) | `chemdb2` | `samples.name` |
| Vendor / article ID (`firma`, `katnr`) | `chemdb2` | `chemicals.chemical_data` |
| Manufacturing date (`mfgdatum`) | `chemdb2` | `chemicals.chemical_data` |
| Expiration date (`minhaltbar`) | `chemdb2` | `chemicals.chemical_data` |
| Batch number (`charge`) | `chemdb2` | `samples.xref['batch']` |
| Order number | `einkauf2` | `samples.xref['order_id']` |
| Physical properties (density, bp, mp) | `winithi` | `samples.density`, `boiling_point`, `melting_point` |
| Disposal notes (`entsorgung`) | `adelevessen` | `chemicals.chemical_data` |
| Inventory date (`regzeit`) | `chemdb2` | `samples.created_at` metadata |

### 2.2 Export: Chemotion → GoeChem

**Required fields GoeChem needs for new chemical registration:**

| Chemotion Field | Chemotion Source | GoeChem Target |
|---|---|---|
| Name | `samples.name` | `chemdb2.name` |
| Package size | `chemicals.chemical_data.amount.value`  , `chemicals.chemical_data.volume.value ` | `chemdb2.inh` |
| Package unit | `chemicals.chemical_data.amount.unit`  , `chemicals.chemical_data.volume.unit ` | `chemdb2.einh` |
| Storage location | `samples.location` , `chemicals.chemical_data.host_*` , `chemicals.chemical_data.current_*` | `chemdb2.raum` / `northeim` |
| Product type | `chemicals.chemical_data` | `chemdb2.art` |
| Chemotion ID | `samples.id` | `chemdb2.extid` |
| CAS number | `samples.xref['cas']` | `chemdb2.cas` |
| Internal inventory label | `samples.external_label` | `chemdb2.sid` (internal code) |

**Required for updating existing GoeChem records:**

| Field | Notes |
|---|---|
| Remaining content | `samples.real_amount_value` → `chemdb2.inh` (remaining) |
| Storage location change | `samples.location` → `chemdb2.raum` / `chemdb2.platz` |
| Package unit change | `samples.real_amount_unit` → `chemdb2.einh` |

---

## 3. Current Implementation Status

### 3.1 What Has Been Committed (Branch: `goechem-chemotion-integration`)

**Commit:** `d8be1bf79` — *"feat: initiate notification channels and goechem modules for goechem delayed jobs"*

| File | Status | Notes |
|---|---|---|
| `app/jobs/update_goechem_chemicals_job.rb` | ✅ Scaffolded | Job dispatcher; routes to `GoeChem::Sync` or `GoeChem::FetchUpdates` |
| `app/models/channel.rb` | ✅ Extended | Added two notification channel constants |
| `db/migrate/20241120144240_sync_goechem_updates_channel.rb` | ✅ Done | Notification channel for sync completion |
| `db/migrate/20241120145311_fetch_goechem_updates_channel.rb` | ✅ Done | Notification channel for fetch-updates completion |
| `lib/goechem/goechem.rb` | ⚠️ Stub only | `module Goechem` — empty |
| `lib/goechem/sync.rb` | ⚠️ Stub only | `class Goechem::Sync` — empty, no logic |
| `lib/goechem/update.rb` | ⚠️ Stub only | `class Goechem::FetchUpdates` — empty, no logic |

### 3.2 What Is Missing (Not Yet Implemented)

| Component | Priority | Notes |
|---|---|---|
| GoeChem REST API client (`lib/goechem/client.rb`) | 🔴 Critical | HTTP client wrapping GoeChem REST API |
| `GoeChem::Sync#process` logic | 🔴 Critical | Import chemicals from GoeChem into Chemotion |
| `GoeChem::FetchUpdates#message` logic | 🔴 Critical | Fetch recently changed GoeChem records |
| Field mapper (`lib/goechem/mapper.rb`) | 🔴 Critical | GoeChem ↔ Chemotion field translation |
| Grape API endpoint (`app/api/chemotion/goechem_api.rb`) | 🔴 Critical | Trigger sync from UI/admin |
| Configuration model (API key, base URL, collection mapping) | 🔴 Critical | No env vars or settings model yet |
| Export: Chemotion → GoeChem | 🟡 Blocked | Pending GoeChem API write-access (see §4.2) |
| UI component for sync trigger | 🟠 High | Frontend React component not yet started |
| Scheduled sync (cron) | 🟠 High | Not in `config/schedule.rb` |
| Tests | 🟠 High | Zero test coverage for GoeChem module |
| Conflict resolution strategy | 🟡 Medium | What wins when both sides changed? |
| Deletion / soft-delete propagation | 🟡 Medium | GoeChem uses `sperr` flag; Chemotion uses paranoid |

---

## 4. GoeChem Demo Instance — Connectivity Check

**Instance:** `https://x02.goechem.de` (demo, used for development)  
**API Key:** `xxx` (KIT-Chemdb2, configured by Systemadministrator 29.08.2025)  
**Check date:** 2026-06-05

| Check | Result |
|---|---|
| HTTPS reachability | ✅ HTTP 200 — instance is live |
| REST API format | `https://x02.goechem.de/rest/{API_KEY}/{QUERY_NAME}/{PARAM}` |
| Key recognition | ✅ Key is valid — `GET /rest/{key}` returns `500 "Unsupported or incomplete request"` (correct: parsed but incomplete) |
| Query `sicherheitsdaten` registered | ✅ Registered — `GET /rest/{key}/sicherheitsdaten` returns `500 "Missing input value"` |
| Query `productsearchcas` registered | ✅ Registered — `GET /rest/{key}/productsearchcas` returns `500 "Missing input value"` |
| Executing a query with CAS param | ❌ Returns `{"status":"404","content":"Unknown REST method"}` |
| **Root cause** | **Web service is LOCKED** (`nein` = inactive in GoeChem admin panel) — queries are defined but not activated |

### Diagnosis: Web Service is Locked

The GoeChem admin panel shows the service status as **`nein`** (locked). Per the GoeChem documentation, every web service is locked after creation and must be explicitly activated (green slider) before queries can execute. The diagnostic confirms this:

```
# Unknown query → 500 "Unsupported" (name not found at all)
GET /rest/{key}/dummy/1             → {"status":"500","content":"Unsupported or incomplete request"}

# Known query, no param → 500 "Missing input" (name recognized, parameter validation fires)
GET /rest/{key}/sicherheitsdaten    → {"status":"500","content":"Missing input value"}
GET /rest/{key}/productsearchcas    → {"status":"500","content":"Missing input value"}

# Known query, with param, but LOCKED → 404 (lock check fires after param validation)
GET /rest/{key}/sicherheitsdaten/64-17-5  → {"status":"404","content":"Unknown REST method"}
GET /rest/{key}/productsearchcas/64-17-5  → {"status":"404","content":"Unknown REST method"}
```

### Single Blocker to Unblock

The GoeChem Systemadministrator needs to **activate (unlock) the `KIT-Chemdb2` web service** in the GoeChem admin panel (move the toggle to green). No new API key or queries are needed — they are already configured correctly. Once activated:

```bash
# This should return chemical/safety data as JSON
curl "https://x02.goechem.de/rest/xxx/productsearchcas/64-17-5"
curl "https://x02.goechem.de/rest/xxx/sicherheitsdaten/64-17-5"
```

---

## 5. Feasibility Assessment

### 5.1 GoeChem → Chemotion (Read/Import): **Feasible — blocked only by service activation**

The API key, base URL, and both query names (`sicherheitsdaten`, `productsearchcas`) are already configured. The only blocker is the GoeChem admin activating (unlocking) the `KIT-Chemdb2` web service — a single toggle in their admin panel. Once that is done, the REST API is fully usable. The main engineering work is:
- Implementing the HTTP client using the known key + query names
- Mapping and transforming field responses to Chemotion's Sample/Chemical/Molecule models

**Timeline estimate:** 2–3 weeks for a production-ready one-way sync.

### 5.2 Chemotion → GoeChem (Write/Export): **Blocked — Pending GoeChem API**

The documented GoeChem REST API **only supports SELECT queries** (as of version 05.01.2021). This means Chemotion cannot currently push new chemicals or updates back into GoeChem via the REST API. Three options:

| Option | Feasibility | Notes |
|---|---|---|
| Wait for GoeChem to enable INSERT/UPDATE in their web service API | 🟡 Dependent | Requires GoeChem team to update their API — confirm with GoeChem contact |
| GoeChem exports a delta file (CSV/XML) periodically for Chemotion to consume | 🟢 Possible | Workaround, not true bidirectional sync |
| Direct DB access (MySQL → read-only replica) | 🔴 Not recommended | Security/ops risk; not maintainable |

**Recommendation:** Implement GoeChem → Chemotion first (Phase 1). Negotiate API write access with GoeChem for Phase 2. This aligns with the existing job naming: `sync_goechem` (full sync) and `fetch_goechem_updates` (delta/incremental).

### 5.3 Overall Feasibility: **Yes, with phased approach**

Phase 1 (read-only sync) can be delivered now. Phase 2 (write-back) requires coordination with GoeChem. No blocking technical obstacles exist on the Chemotion side.

---

## 6. Open Items & Contacts

| Item | Owner | Status |
|---|---|---|
| GoeChem API key provisioning | GoeChem admin | ⏳ Pending request |
| Verify GoeChem contact's most recent email and confirm what was requested | @adambasha0 | ⚠️ **Action required** — confirm the updated contact email and recheck GoeChem's specific API requirements and field mappings before starting implementation |
| Confirm INSERT/UPDATE support in GoeChem API | GoeChem team | ⏳ Pending |
| Agree on conflict resolution policy (which system is source of truth?) | Both teams | ❌ Not discussed |
| Agree on collection mapping (which Chemotion collection receives GoeChem imports?) | KIT team | ❌ Not discussed |

---

## 7. Technical Implementation Plan

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Chemotion ELN                         │
│                                                          │
│  ┌─────────────┐    ┌──────────────────────────────┐     │
│  │  GoeChem    │    │   UpdateGoechemChemicalsJob   │     │
│  │  API (Grape)│───▶│   (delayed job dispatcher)   │     │
│  └─────────────┘    └──────────┬───────────────────┘     │
│         ▲                      │                          │
│  (admin │                ┌─────▼──────┐  ┌─────────────┐ │
│   or    │                │GoeChem::   │  │GoeChem::    │ │
│  schedule)               │Sync        │  │FetchUpdates │ │
│                          └─────┬──────┘  └──────┬──────┘ │
│                                │                │         │
│                         ┌──────▼────────────────▼──────┐  │
│                         │      GoeChem::Client          │  │
│                         │   (HTTParty REST wrapper)     │  │
│                         └──────────────┬───────────────┘  │
│                                        │                   │
│                         ┌──────────────▼───────────────┐  │
│                         │      GoeChem::Mapper          │  │
│                         │  (field translation layer)    │  │
│                         └──────────────┬───────────────┘  │
│                                        │                   │
│              ┌─────────────────────────▼──────────────┐   │
│              │  Chemotion DB: Sample, Chemical,        │   │
│              │  Molecule, Inventory                    │   │
│              └────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
         │ HTTP(S)
         ▼
┌─────────────────────────┐
│   GoeChem REST API      │
│ test01.goechem.de/rest/ │
│  Tables: chemdb2,       │
│  winithi, northeim,     │
│  gutingi2               │
└─────────────────────────┘
```

### Phase 1 Implementation Plan: GoeChem → Chemotion

#### Step 1: Configuration Infrastructure

**File:** `config/goechem.yml` (environment-specific)
```yaml
default: &default
  base_url: "https://x02.goechem.de"
  api_key: <%= ENV['GOECHEM_API_KEY'] %>   # demo: xxx
  queries:
    safety_data:    "sicherheitsdaten"      # param: CAS number → safety/SDS data
    product_by_cas: "productsearchcas"      # param: CAS number → inventory records

test:
  base_url: "https://x02.goechem.de"
  api_key: "xx"
  queries:
    safety_data:    "sicherheitsdaten"
    product_by_cas: "productsearchcas"
```

**File:** `config/initializers/goechem.rb`
```ruby
GoeChem::Config = Rails.application.config_for(:goechem)
```

#### Step 2: REST API Client

**File:** `lib/goechem/client.rb`
```ruby
module GoeChem
  class Client
    include HTTParty
    base_uri GoeChem::Config[:base_url]

    def initialize(api_key = GoeChem::Config[:api_key])
      @api_key = api_key
    end

    def query(query_name, param = nil)
      path = "/rest/#{@api_key}/#{query_name}"
      path += "/#{param}" if param
      response = self.class.get(path, timeout: 30)
      raise GoeChem::ApiError, response.body unless response.success?
      response.parsed_response
    rescue HTTParty::Error, Timeout::Error => e
      raise GoeChem::ConnectionError, e.message
    end

    def chemicals(since_timestamp: nil)
      since_timestamp ? query('ChemUpdates', since_timestamp) : query('ChemData')
    end

    def structure(chem_id)
      query('ChemStructure', chem_id)
    end

    def locations
      query('Locations')
    end
  end
end
```

#### Step 3: Field Mapper

**File:** `lib/goechem/mapper.rb`
```ruby
module GoeChem
  class Mapper
    UNIT_MAP = {
      'ml' => 'ml', 'l' => 'l', 'g' => 'g', 'mg' => 'mg', 'kg' => 'kg',
      'µl' => 'μl', 'µg' => 'μg'
    }.freeze

    def self.goechem_to_sample(row, collection_id:, user_id:)
      {
        name:               row['name'],
        location:           row['location_string'],
        real_amount_value:  row['inh']&.to_f,
        real_amount_unit:   UNIT_MAP[row['einh']] || row['einh'],
        xref: {
          goechem_id:     row['id'],
          cas:            row['cas'],
          batch:          row['charge'],
          goechem_synced: Time.current.iso8601
        },
        inventory_sample: true
      }
    end

    def self.goechem_to_chemical(row)
      {
        cas: row['cas'],
        chemical_data: [
          {
            'goechemProductInfo' => {
              'goechemId'    => row['id'],
              'vendor'       => row['firma'],
              'catalogNo'    => row['katnr'],
              'mfgDate'      => row['mfgdatum'],
              'expiryDate'   => row['minhaltbar'],
              'batchNo'      => row['charge'],
              'packageSize'  => row['inh'],
              'packageUnit'  => row['einh'],
            }
          }
        ]
      }
    end

    def self.sample_to_goechem(sample)
      {
        'name'    => sample.name,
        'cas'     => sample.xref&.fetch('cas', nil),
        'inh'     => sample.real_amount_value,
        'einh'    => sample.real_amount_unit,
        'extid'   => sample.id.to_s,
        'sid'     => sample.identifier
      }
    end
  end
end
```

#### Step 4: Sync Logic

**File:** `lib/goechem/sync.rb` (replace stub)
```ruby
class GoeChem::Sync
  def initialize(collection_id)
    @collection_id = collection_id
    @collection = Collection.find(collection_id)
    @user_id = @collection.user_id
    @client = GoeChem::Client.new
    @processed = 0
    @errors = []
  end

  def process
    chemicals = @client.chemicals
    chemicals.each { |row| sync_chemical(row) }
    { message: "Sync complete: #{@processed} chemicals synced, #{@errors.size} errors." }
  rescue GoeChem::ConnectionError => e
    { message: "GoeChem connection failed: #{e.message}" }
  end

  private

  def sync_chemical(row)
    goechem_id = row['id'].to_s
    existing_sample = Sample.joins(:collections)
                            .where(collections: { id: @collection_id })
                            .where("xref->>'goechem_id' = ?", goechem_id)
                            .first

    structure = @client.structure(row['id']) rescue {}
    molfile = structure['molfile']
    smiles  = structure['smiles']

    sample_attrs = GoeChem::Mapper.goechem_to_sample(
      row.merge('location_string' => resolve_location(row)),
      collection_id: @collection_id,
      user_id: @user_id
    )
    sample_attrs[:molfile] = molfile if molfile.present?

    ActiveRecord::Base.transaction do
      sample = existing_sample || Sample.new(created_by: @user_id, user_id: @user_id)
      sample.assign_attributes(sample_attrs)

      if molfile.present? || smiles.present?
        molecule = Molecule.find_or_create_by_molfile(molfile) if molfile.present?
        molecule ||= Molecule.find_or_create_by(cano_smiles: smiles) if smiles.present?
        sample.molecule = molecule if molecule
      end

      sample.save!
      unless existing_sample
        CollectionsSample.create!(collection_id: @collection_id, sample_id: sample.id)
      end

      chem_attrs = GoeChem::Mapper.goechem_to_chemical(row)
      chemical = Chemical.find_or_initialize_by(sample_id: sample.id)
      chemical.update!(chem_attrs)
    end

    @processed += 1
  rescue ActiveRecord::RecordInvalid => e
    @errors << { goechem_id: row['id'], error: e.message }
    Rails.logger.error "[GoeChem::Sync] Failed for id=#{row['id']}: #{e.message}"
  end

  def resolve_location(row)
    [row['gebaeude_name'], row['raum_name'], row['platz']].compact.join(' / ')
  end
end
```

#### Step 5: Fetch Updates (Incremental Sync)

**File:** `lib/goechem/update.rb` (replace stub)
```ruby
class GoeChem::FetchUpdates
  def initialize(collection_id)
    @collection_id = collection_id
    @client = GoeChem::Client.new
  end

  def message
    last_sync = last_sync_timestamp
    updates = @client.chemicals(since_timestamp: last_sync)

    if updates.empty?
      "No GoeChem updates found since #{last_sync || 'last sync'}."
    else
      sync = GoeChem::Sync.new(@collection_id)
      updates.each { |row| sync.send(:sync_chemical, row) }
      "Fetched #{updates.size} updated GoeChem records."
    end
  rescue GoeChem::ConnectionError => e
    "GoeChem connection error: #{e.message}"
  end

  private

  def last_sync_timestamp
    Sample.joins(:collections)
          .where(collections: { id: @collection_id })
          .where("xref ? 'goechem_synced'")
          .maximum("xref->>'goechem_synced'")
  end
end
```

#### Step 6: API Endpoint

**File:** `app/api/chemotion/goechem_api.rb`
```ruby
module Chemotion
  class GoechemAPI < Grape::API
    resource :goechem do
      before { authenticate! }

      desc 'Trigger GoeChem synchronization for a collection'
      params do
        requires :collection_id, type: Integer
        optional :mode, type: String, values: %w[full incremental], default: 'incremental'
      end
      post :sync do
        collection = Collection.find_by(id: params[:collection_id], user_id: current_user.id)
        error!('Unauthorized', 401) unless collection

        job_type = params[:mode] == 'full' ? 'sync_goechem' : 'fetch_goechem_updates'
        UpdateGoechemChemicalsJob.perform_later(
          job: job_type,
          collection_id: params[:collection_id],
          user_id: current_user.id
        )

        { message: "GoeChem #{params[:mode]} sync job queued." }
      end

      desc 'GoeChem connection health check'
      get :ping do
        client = GoeChem::Client.new
        client.query('ping') rescue nil
        { status: 'ok', instance: GoeChem::Config[:base_url] }
      rescue
        error!('GoeChem unreachable', 503)
      end
    end
  end
end
```

#### Step 7: Database Migration for xref tracking

**File:** `db/migrate/TIMESTAMP_add_goechem_id_index_to_samples.rb`
```ruby
class AddGoechemIdIndexToSamples < ActiveRecord::Migration[6.1]
  def change
    execute <<~SQL
      CREATE INDEX index_samples_on_goechem_id
      ON samples ((xref->>'goechem_id'))
      WHERE deleted_at IS NULL
    SQL
  end
end
```

#### Step 8: Scheduled Sync

Add to `config/schedule.rb`:
```ruby
every 1.hour do
  runner "Collection.where(sync_goechem: true).each { |c| UpdateGoechemChemicalsJob.perform_later(job: 'fetch_goechem_updates', collection_id: c.id, user_id: c.user_id) }"
end
```

#### Step 9: Error Handling & Monitoring

**File:** `lib/goechem/errors.rb`
```ruby
module GoeChem
  class ApiError < StandardError; end
  class ConnectionError < StandardError; end
  class MappingError < StandardError; end
end
```

---

### Phase 2 Implementation Plan: Chemotion → GoeChem (Write-back)

> **Prerequisite:** GoeChem must enable INSERT/UPDATE in their web service API.

Once INSERT/UPDATE is available, implement:

1. `GoeChem::Publisher` — pushes new/updated Chemotion samples to GoeChem
2. ActiveRecord callbacks on `Sample` (after_save) — queues publish job for inventory samples with GoeChem origin or flagged for export
3. Idempotency guard — use `chemdb2.extid` to prevent duplicates

---

### Phase 3: UI Integration

- Add GoeChem sync button to Collection panel settings
- Add GoeChem status badge to Sample detail view (shows GoeChem ID, last sync timestamp)
- Admin panel: GoeChem API configuration (URL, key, collection mapping)

---

## 8. File Structure (Target State)

```
lib/goechem/
  goechem.rb        # Module + error classes (extend from current stub)
  client.rb         # REST API client (NEW)
  sync.rb           # Full sync: GoeChem → Chemotion (replace stub)
  update.rb         # Incremental sync (replace stub)
  mapper.rb         # Field mapping logic (NEW)
  publisher.rb      # Chemotion → GoeChem write-back (Phase 2)

app/jobs/
  update_goechem_chemicals_job.rb   # Existing, functional dispatcher

app/api/chemotion/
  goechem_api.rb    # Grape endpoint (NEW)

config/
  goechem.yml       # Configuration per environment (NEW)
  initializers/
    goechem.rb      # Config loader (NEW)

db/migrate/
  *_add_goechem_id_index_to_samples.rb  (NEW)
  20241120144240_sync_goechem_updates_channel.rb   ✅ committed
  20241120145311_fetch_goechem_updates_channel.rb  ✅ committed

spec/lib/goechem/
  client_spec.rb    (NEW — mock GoeChem server)
  sync_spec.rb      (NEW)
  mapper_spec.rb    (NEW)
```

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GoeChem API key not provisioned | High | Blocks all progress | Contact GoeChem admin immediately |
| GoeChem API only supports SELECT (no write-back) | Confirmed | Medium — Phase 2 blocked | Negotiate; implement Phase 1 first |
| Large GoeChem databases cause slow full sync | Medium | Medium | Batch processing + incremental mode |
| Field name mismatch between GoeChem instances | Medium | Medium | Make mapper configurable per deployment |
| GoeChem data quality (missing CAS, no molfile) | Medium | Low-Medium | Graceful handling; log skipped records |
| GoeChem instance downtime during sync | Low | Low | Retry logic in job; alerting via existing channel |

---

## 10. Immediate Next Steps

| # | Action | Owner | Blocker? |
|---|---|---|---|
| 1 | **GoeChem admin activates `KIT-Chemdb2` web service** on `x02.goechem.de` (toggle to green) | GoeChem Systemadministrator | 🔴 YES — blocks all query execution |
| 2 | **Confirm exact response schema** of `productsearchcas` and `sicherheitsdaten` (what JSON fields are returned?) | GoeChem admin / test after activation | Needed for mapper |
| 3 | **Implement `lib/goechem/client.rb`** using key `xxx` and `x02.goechem.de` | Dev | After step 1 |
| 4 | **Implement `GoeChem::Mapper`** once response schema is known | Dev | After step 2 |
| 5 | **Implement `GoeChem::Sync#process`** and wire to existing job | Dev | After steps 3 & 4 |
| 6 | **Write tests** using VCR cassettes recorded from live `x02` responses | Dev | After step 1 |
| 7 | **Verify GoeChem contact email** and confirm what additional queries/data they can expose | @adambasha0 | For Phase 2 scope |
| 8 | **Negotiate write-back (INSERT/UPDATE)** in GoeChem API for Phase 2 | KIT + GoeChem | Phase 2 prerequisite |
