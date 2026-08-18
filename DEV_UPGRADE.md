# DEV_UPGRADE.md

Gesamt-Zusammenfassung **aller** Ruby- und Rails-Upgrade-Schritte im Chemotion ELN —
Schritt für Schritt, mit jedem Issue und seiner Lösung. Konsolidiert aus den Einzel-Docs
(`DEV_RAILS_UPGRADE_3-0/3-1/3-2.md` = Ruby, `DEV_RAILS_UPGRADE_7-0/7-1/7-2.md` = Rails).
Branch `rails-upgrade-6-1-7-10`, Stand 2026-08.

## Upgrade-Leiter (verschachtelte Reihenfolge)

```
Ruby 2.7.8 → 3.0.7 ✅ → Ruby 3.1.7 ✅ → Rails 6.1.7.10 → 7.0.10 ✅ → Rails 7.1.6 ✅
   → Rails 7.2.3.2 ✅ → Ruby 3.2.11 ✅ → [Rails 8.0 🔮 Ausblick]
```

- **Grundprinzip (alle Schritte):** erst alle Vorarbeiten auf der alten Version (einzeln grün),
  dann der **eine** Versions-Bump, dann Framework-Defaults einzeln durchschalten. Nie mehrere
  Baustellen gleichzeitig.
- **Suite-Baseline konstant** über alle Schritte: **`2260 examples, 11 failures, 48 pending`**
  (Seed 57765) non-feature (der stabile Referenzwert) bzw. **`2303/54–56`** inkl. Feature/Browser-Env
  (43 Browser-Env, im Container nicht lauffähig). Die 11 sind
  environmental (3 rdkit + 1 admin_device-sftp + 7 datacollector-sftp), **keine Regressionen**.
- **Wichtige Korrektur zur ursprünglichen Reihenfolge:** Rails 7.2 verlangt nur Ruby ≥ 3.1.0 →
  **wurde auf Ruby 3.1.7 gefahren** (kein 3.2 nötig). Ruby 3.2.2+ wird erst für **Rails 8.0** gebraucht.
  → Ruby 3.2 bleibt aufgeschoben und ist jetzt Voraussetzung für Rails 8.

---

# TEIL A — RUBY-UPGRADES

## A1. Ruby 2.7.8 → 3.0.7  ✅ (angewandt & verifiziert)

Nur Zwischenschritt (3.0 selbst EOL), aber die **kwargs-Kosten** fallen exakt hier an. Rails 6.1.7.10
und labimotion (`>= 2.7`) unterstützen 3.0 → kein Dependency-Blocker.

**Schritte:** Static-Sweep der ganzen Ruby-Fläche → 3 harte Breaker fixen → kwargs-Pass unter
`RUBYOPT="-W:deprecated"` **vor** dem Version-Flip auf 0 treiben → `db:migrate:reset` unter
`-W:deprecated` prüfen → Pins setzen → alle Gems auf 3.0-ABI neu bauen → Boot + Full-Suite.

**Issues → Lösungen:**

| # | Issue | Fix (Datei) |
|---|---|---|
| A1 | `URI.escape` entfernt | `URI::DEFAULT_PARSER.escape(ds_filename)` (`attachment_api.rb:66`) |
| A2 | `URI.encode(smiles, charset)` entfernt (**die heikle** — SMILES) | `URI::DEFAULT_PARSER.escape(smiles, '[]/()+-.@#=\\')` (`lib/pub_chem.rb:87`). **KEIN** CGI.escape/ERB::Util (andere Charset → würde SMILES korrumpieren) |
| A3 | `ERB.new(str, safe_level, trim)` alt-positional entfernt | `ERB.new(template, trim_mode: '%<>')` (`lib/reporter/html/reaction_list.rb:43`) |
| §B | `Dir.glob`/`Dir[]` sortiert jetzt (Verhaltenswechsel, kein Crash) | 23 Stellen, ~20 order-neutral; 3 prüfen (`lib/chemotion/generate_file_hash_utils.rb:78`, `application.rb` autoload_paths, `bin/delayed_job` PID-Globs) → **keine Änderung nötig**; falls Order kritisch: `sort: false` |
| §C | **kwargs/Keyword-Trennung** (Haupt-Breaker, nicht grep-bar) | 7 Stellen, `**` am Call-Site: `sample.rb:495`, `molecule_api.rb:60`, `import_sdf.rb:289`, `message.rb:24`, `tagging.rb:50` (`**args`/`**babel_info`); `products_composer.rb:39` (echte kwargs, Klammern raus); 1 Spec |

**§D geprüft & clean (0 Treffer):** `File.exists?`/`Dir.exists?`, `Fixnum`/`Bignum`, `taint`-Familie,
`$SAFE`/`$KCODE`, `Random::DEFAULT`, `SortedSet`, entfernte stdlib-requires (webrick/xmlrpc/…).
**Später (nicht 3.0):** Psych 4 → Ruby 3.1.

**Pins:** `.tool-versions`/`Gemfile`/`Gemfile.lock` (RUBY VERSION) `2.7.8` → `3.0.7p220`.

**Verifikation:** Boot `Rails 6.1.7.10 / Ruby 3.0.7`; Full-Suite non-feature **`2260/11`** (identisch);
alle **307 Gems** bauen auf 3.0-ABI (inkl. native Chemistry-Gems openbabel/inchi/rinchi/semacode);
`db:migrate:reset` (431 Migrations) → **0 kwargs-Warnungen**.

**Deploy-TODO:** Base/Runner-Image auf 3.0.7 bauen+pushen, CI-Runner umstellen (Pins liegen nur im
laufenden Container — Rebuild ohne Image = Boot-Break).

## A2. Ruby 3.0 → 3.1.7  ✅ (angewandt & verifiziert)

**Einziger projekt-relevanter Breaker: Psych 4** (mit Ruby 3.1) — `YAML.load` wird **safe-by-default**
(nur Basistypen; `Symbol`/`Date`/Custom-Klassen → `Psych::DisallowedClass`). `unsafe_load` gibt's seit
Psych 3.3.2 (schon in 3.0.7) → bares `unsafe_load` ist der korrekte Fix (alle Fundstellen laden
vertrauenswürdige Daten).

**Issues → Lösungen:**

| # | Issue | Fix (Datei) |
|---|---|---|
| A1 | 🎯 Migration liest alt-serialisierte `reactions.temperature` (Symbol-Keys) → Psych-4-Break | `YAML.unsafe_load(tmp)` (`db/migrate/20171019102800…rb:10`) |
| A2 | Periodensystem-Daten | `YAML.unsafe_load File.read yml_path` (`lib/chemotion/periodic_table.rb:3`) |
| A3 | VERSION-Datei beim Boot | `YAML.unsafe_load_file('VERSION')` (`application.rb:20`) |
| A4 | Spec-Bootstrap-Fixture | `YAML.unsafe_load_file(...)` (`spec_helper.rb:18`) |
| A5 | Factory-Testdaten | `YAML.unsafe_load_file(...)` (`spec/factories/attributes_set.rb:28`) |
| **A6** | ❗ Migration `index_exists?`-Arity (kwargs-Trennung, **erst auf 3.1-Lauf sichtbar**) | 2. Positional ergänzen: `index_exists?(table_name, column_name, name: index_name)` (`db/migrate/20250701121906…rb:21`) |

**Bereits abgesichert:** `application.rb:92` `config.active_record.yaml_column_permitted_classes` deckt
die AR-seitige YAML-Deserialisierung (inkl. Delayed-Job-`handler`) → nur die 5 direkten `YAML.load` offen.
**Lehre:** `db:migrate:reset` am Ziel-Ruby auf **harte Aborts** prüfen, nicht nur kwargs-Warnungen (A6
wäre sonst durchgerutscht).

**Pins:** `3.0.7` → `3.1.7p261`. Erwartete `Gemfile.lock`-Änderung: `ffi` bekommt Plattform-Triple
(`…-linux-gnu`) — 3.1 änderte den Gem-Platform-String; kein Handlungsbedarf.

**Verifikation:** Boot `Rails 6.1.7.10 / Ruby 3.1.7 / Psych 4.0.4`; alle 431 Migrations grün;
Full-Suite non-feature **`2260/11`** (identisch); 307 Gems auf 3.1-ABI neu gebaut.

**Deploy-TODO:** Image auf 3.1.7 + CI. **Ausblick:** `nokogiri 1.15.7` (`< 3.3.dev`) läuft **nicht** auf
Ruby 3.3 → erst beim 3.3-Schritt auf ≥ 1.16 heben (für 3.0/3.1/3.2 ok).

## A3. Ruby 3.1 → 3.2  ⏸ AUFGESCHOBEN (statisch analysiert, nicht ausgeführt)

**Reihenfolge-Entscheid:** 3.2 nur wenn nötig; Rails 7.0/7.1/7.2 liefen alle auf 3.1.7. Ruby 3.2.2+
wird erst für **Rails 8.0** gebraucht → 3.2 ist der nächste Ruby-Schritt (vor Rails 8).

**Static-Befund:** fast keine Code-Arbeit.
- **§A harte 3.2-Removals — alle 0×:** `Random::DEFAULT`, `Object#=~`, `Dir/File.exists?`, taint-Familie,
  `Method#public?/protected?/private?`, `Fixnum`/`Bignum` → nichts zu tun.
- **§B Verhaltenswechsel — geprüft, unkritisch:** `Struct.new` kwargs (kein `Struct.new(key:)`-Call app-weit;
  `VesselStruct`/`MailDevice` positional); `=~` (41 Stellen alle `String#=~`, nur nil-Receiver ein Rest-Risiko);
  `Hash#shift` auf leerem Hash → nil.
- **§B2 Psych 4 → 5:** kein App-Code (die `unsafe_load`-Fixes tragen). **Infra:** Psych 5 bündelt libyaml
  nicht mehr → Ziel-Image braucht `libyaml-dev` (im laufenden Container schon vorhanden: 0.2.5).

**Offen:** ganzer Schritt aufgeschoben; verbindliche Issue-Liste kommt erst vom echten 3.2-Lauf
(`asdf install 3.2.x` → `bundle install` → Pins → Runbook, v.a. `db:migrate:reset` auf Aborts).

---

# TEIL B — RAILS-UPGRADES

## B1. Rails 6.1.7.10 → 7.0.10  ✅ (Phasen 0–4 komplett & verifiziert)

Auf Ruby 3.1.7 (7.0 verlangt Ruby 2.7.1–3.1.x → **nicht** auf 3.2). Größter Brocken: Zeitwerk.

### Phase 0 — Vorarbeiten auf 6.1

**0a — Zeitwerk-Migration (classic → zeitwerk):** 7.0 entfernt den classic-Autoloader. `config.autoloader
= :zeitwerk` setzen, `zeitwerk:check` iterativ grün machen.
- **🔴 Kern-Blocker:** die custom `autoload_paths` (`application.rb:30–36`, überlappende/verschachtelte
  Roots `app` UND `app/api/chemotion`) — Zeitwerk verlangt einen Root pro Namespace. **Fix:** Standard-
  `app/*`-Roots — **ein** `app/api`-Root + **ein** `lib`-Root; custom-Block entfernt.
- **Acronyms** (`API`/`SFTP`) in den Application-Body (§6.7) + **Per-Basename-Inflections**
  (`ElementUIStateScopes`, `SVGProcessor`, `DCLogger`, `CollectDataFromSftpJob`, …); Namen nicht umbenannt.
- **`Usecases::` als namespaced Root** via Initializer (`push_dir(..., namespace: Usecases)`, Hook
  `before: :let_zeitwerk_take_over`) — erhält alle `Usecases::*`-Namen (64 Dateien).
- **`$LOAD_PATH.unshift(lib/export, lib/tasks)`** — für bare `require 'export_table'` (labimotion) +
  `rake_require('data/mol_structure')`.
- **`ignore`-Liste** für tote/nicht-konforme lib-Dateien (`lib/storage`, `chemotion.rb`,
  `safety_sheets_reorganizer.rb`, `lib/tasks`, `lib/generators`, `lib/omniauth`).
- **lib-Fixes (waren LoadError):** redundante `require 'export_table'`/`require 'helper'` raus;
  `meta_schmooze.rb` verschoben (Pfad↔Konstante); `OnelineLogFormatter` in `module Chemotion` gewrappt
  (+ Referenz in `production.rb`); leeres `import.rb` gelöscht.
- **🔴 Regression (Suite):** `mol_structure_spec` `LoadError` → durch `$LOAD_PATH.unshift(lib/tasks)` behoben (2/0).

**0b — `load_defaults 6.0` → `6.1`:** wichtigster Flag `active_record.has_many_inversing = true`.
- **🔴 Regression (Test-Fragilität, kein Prod-Bug):** `export_collections_spec` `NoMethodError` — die
  In-Memory-Assoziations-Navigation sieht die out-of-band per Factory erzeugte Attachment nicht. **Fix im
  Test** (Container frisch via `Container.find(id)` laden); der 6.1-Default bleibt aktiv.
- **🟠 Incident (Frontend-Infra):** blanke Login-Seite nach `bin/shakapacker` (schrieb 118-MB-Vendor-Chunk;
  Rails-Static-Server liefert >21 MB als 404). **Fix:** `public/packs/*` löschen + webpacker-Container
  neustarten. **Regel: in dev NIE `bin/shakapacker` (compile) laufen** — der webpacker-Container (`:3035`) serviert die Packs.

**0c — `Rails.application.secrets` ersetzen (6 Stellen):** deprecated in 7.1, weg in 7.2 → vorgezogen.
`json_web_token.rb`, `encryptor.rb`, `gate_api.rb` (3×) → `Rails.application.secret_key_base` (wert-identisch);
`editor_api.rb` + `application.rb` → `Rails.configuration.only_office_secret_key_base` aus `ENV`.

**0d — Deprecations auf 0:**
- **🔴 „Autoloading during initialization" (harter Fehler in 7):** 4 Initializer referenzieren App-Konstanten
  in `on_load(:active_record)` → **nach `config.after_initialize`** verschoben (`delayed_job_config`,
  `computed_props`, `inference`, `eln_features`).
- „Rendering actions with '.' in the name": `export/research_plan.haml` → `export/research_plan` (`export_research_plan.rb:78`).

### Phase 1 — Der 7.0-Bump
`gem 'rails' ~> 7.0.0` → **7.0.10**; **`turbo-sprockets-rails4` raus** (+ Prod-Block) → **Sprockets 4.2.2**;
`gem 'sprockets-rails'` explizit ergänzt; **`config.autoloader =` Zeile entfernt** (Setter in 7.0 weg);
Usecases-Hook → **`before: :setup_main_autoloader`**.
- **🔴 Incident C — Autoloading-during-init jetzt HARTER Fehler:** `devise.rb:244` (`Matrice.find_by`,
  init-time, kann nicht nach after_initialize) → **Config via Raw-SQL** lesen (kein Model-Autoload).
- **🔴 Incident D — `Hstore#deserialize` strikt (6× version_api):** Logidzes jsonb-`log_data` (JSON-Objekt)
  läuft durch `Hstore#deserialize` → `Invalid Hstore document`. **Fix:** `rescue ArgumentError → JSON.parse`
  in `base_serializer.rb` (Lambda auf `lambda do…end` umgeschrieben wegen `rescue`).

### Phase 2 — `load_defaults 6.1` → `7.0`
`cookies_serializer=:json` + SHA256-KeyGenerator (Deploy-relevant), neue Default-Header, `partial_inserts=false`.
- **🔴 Code-Breaker vorab gefixt:** `raise_on_open_redirects=true` → `radar_controller` (2 externe Redirects)
  `allow_other_host: true` (nicht suite-gedeckt, nur per Review gefunden).

### Phase 3 — Breaking-Changes-Sweep ✅ (0 Code-Änderungen)
Bestätigung: `ActiveModel::Errors#<<`/`default_timezone`/Errors-API/`ActiveSupport::Dependencies`-Private-API
alle **0× real**; `eager_load!` auf 7.0 grün.

### Phase 4 — Gem-Kompat ✅ (0 Code-Änderungen)
`bundle update rails` konfliktfrei; Funktions-Smoke (labimotion, graphql, pg_search, paranoia, rmagick,
shrine, scenic, grape, devise, logidze) grün.

**Verifikation B1:** jede Phase non-feature **`2260/11`**; `zeitwerk:check` + `eager_load!` grün; manuelle
Tests (Login/Session, Click-Through, Write-Pfad InChIKey `LFQSCWFLJHTTHZ-UHFFFAOYSA-N`) grün auf `:3000`.

**Deploy-TODOs:** **Cookie-Rotator** (§6.10, alte SHA1/Marshal-Cookies) vor Prod; **Cache-Format 7.0**
(§6.12, zweistufiger Rolling-Deploy); SHA256-Digest → Cache-Invalidierung.

## B2. Rails 7.0.10 → 7.1.6  ✅ (Phasen A–F komplett & verifiziert)

**Phase 0 — Blocker:** `paranoia 2.6.0` (cappt `activerecord < 7.1`) → `~> 3.0` (real 3.1.0);
`devise-two-factor 4.1.0` (cappt `activesupport < 7.1`) → **`4.1.1` Drop-in** (attr_encrypted/encryptor bleiben,
keine OTP-Daten-Migration).

**Phase A — Bump (`rails 7.1.6`, `paranoia 3.1.0`, `devise-two-factor 4.1.1`) + 5 Incidents:**

| # | Issue | Fix |
|---|---|---|
| A-1 | `enable_dependency_loading` deprecated (No-op unter Zeitwerk) | Zeile + TODO raus (`production.rb`) |
| A-2 | **342 Failures** — `enum` ohne Backing-Spalte (7.1 strikt): `Comment`s 9× `*_section` sind Wert-Maps ohne Spalte | je Enum virtuelles `attribute :<name>, :string` davor (`comment.rb`) |
| A-3 | hstore nil-Key (7.1 strikt): `User#counters` bekommt nil-Key via Labimotion-Element ohne Namen | **`app/types/lenient_hstore_type.rb`** (`< OID::Hstore`, `deserialize` = super mit 6.1-Fallback nur bei `ArgumentError`), gebunden an `users.counters` |
| A-4 | paranoia `really_destroy!` nutzt `.find_each` → erzwingt `ORDER BY id`, bricht Labimotion-`:segments` `DISTINCT ON` | **`config/initializers/paranoia.rb`** — `really_destroy!` verbatim aus 3.1.0, Collection-Zweig `.find_each` → `.each` |
| A-5 | Grape-`OutputBuilder`×`deep_merge`: 7.1 prüft `is_a?(DeepMergeable)` statt Hash → ersetzt statt merge | **`config/initializers/grape_entity.rb`** — `kind_of?` echte Delegation (`__getobj__.is_a?(klass) \|\| super`) |

**Phase B — `rails app:update`:** nur `new_framework_defaults_7_1.rb` behalten; `permissions_policy.rb`
+ 3× ActiveStorage-Migrations (App nutzt shrine) entfernt.

**Phase C — Deprecations weg:** C1 redundantes `require 'reporter/img/conv'` raus (`export_excel.rb`);
C2 `serialize :x, Hash/Array` → **`serialize :x, type: Hash/Array`** (12 Stellen, Coder bleibt YAMLColumn);
C3 `show_exceptions = false` → `:none` (`test.rb`).

**Phase D — `load_defaults 7.1`** + 2 bewusste Overrides:
`default_column_serializer = YAMLColumn` (C2-Safety) und `add_autoload_paths_to_load_path = true`.
- **🔴 Incident D-1:** `add_autoload_paths=false` nimmt `app/models/concerns` vom `$LOAD_PATH` → die App-
  `Encryptor`-Concern verliert gegen das `encryptor`-Gem → `Device#encrypt_value` undefiniert (device_spec 2×).
  **Fix:** Override `= true` (Concern-Umbenennung als Alternative auf Rails 8 vertagt).

**Phase E — Gesamt-Verifikation:** Full-Suite **`2303/54`** (reine Baseline), Runner **19/19**,
Browser-Click-Through, 2FA (d2f 4.1.1), serialize-Round-Trips grün.

**Phase F — From-Scratch `db:migrate`** (nur upgrade-verursachte gefixt):
- **F-1:** alte Data-Migration lädt `Attachment` bevor `edit_state`-Spalte existiert (7.1-Enum-Striktheit) →
  `attribute :edit_state, :integer, default: 0` vor dem Enum (`attachment.rb`), wirkt für ~10 Migrations.
- **F-2:** `SafetySheetsReorganizer` (Zeitwerk-ignoriert) → expliziter `require` in der Migration (`20250805…`).

**Deploy-TODOs:** Cookie-Rotator (fort); Cache-Format 7.1 invalidieren; `add_autoload_paths=true`-Override
(Encryptor-Kollision latent → Rails 8 neu bewerten); `OTP_SECRET_KEY` ≥ 32 Byte für echten 2FA-Betrieb.

## B3. Rails 7.1.6 → 7.2.3.2  ✅ (Phasen 0/A–F komplett & verifiziert)

Auf Ruby 3.1.7 (7.2 verlangt nur ≥ 3.1). **Kein Gem-Blocker** (Resolve-Check: nur die `rails`-Zeile bumpen).

**Phase 0 — secrets (auf 7.1 vorgezogen):** S1 = 3 Specs `Rails.application.secrets.secret_key_base` →
`Rails.application.secret_key_base` (7.2 entfernt `Rails.application.secrets`); S2 = `secret_key_base` von
`config/secrets.yml` auf ENV (`.env.*`) — **`config/secrets.yml` gelöscht** (7.2 liest es nicht mehr),
Werte 1:1 erhalten (Device-Verschlüsselung + JWT-Kontinuität).

**Phase A — Bump (`rails 7.2.3.2`, `pg_search 2.3.7`) + 4 Incidents:**

| # | Issue | Fix |
|---|---|---|
| A-1 | Test-Boot bricht: `factory_bot` `delegate` zur Ladezeit → `ActiveSupport::Delegation::Inflector` uninitialized (vor App-Boot) | `require 'active_support/inflector'` an den Anfang von `spec_helper.rb` |
| A-2 | **29 Failures** — 7.2s `ActiveJob::TestHelper` erzwingt `:test` nicht mehr; app-globaler `:delayed_job` leakt in die Suite | `config.active_job.queue_adapter = :test` in `test.rb` (per `ENV.fetch('TEST_QUEUE_ADAPTER','test')`); delayed_job-Initializer-Spec-Subprozess → `TEST_QUEUE_ADAPTER=delayed_job`; `init_cron_jobs_spec` → `around`-Hook auf `:delayed_job` |
| A-3 | `pg_search 2.3.6` `.new`-Arity × AR 7.2 (`search/all`) | Upstream-Bump **`pg_search 2.3.7`** |
| A-4 | 7.2 bindet `ARRAY[?]` / `= ANY(array[?])` als Param → Postgres liest `text[]` → `integer[] @> text[]` / `integer = text` (search + user_api) | expliziter Cast `::integer[]`/`::int[]` (`user.rb` Matrice, `research_plan.rb` `by_sample_ids`/`by_reaction_ids`) |

**Phase B — `rails app:update`:** nur `new_framework_defaults_7_2.rb` behalten; entfernt: 3× AS-Migrations,
`permissions_policy.rb`, `406-unsupported-browser.html`, `icon.png/svg`, `bin/rubocop`.

**Phase C — Deprecation-Sweep:** einzige 7.2-Deprecation = `enum` mit Keyword-Args →
**positionale Form** `enum :X, {…}` (13 Deklarationen, 5 Modelle; `_prefix: true` → `prefix: true`). Danach
`eager_load!` = **0 Deprecations**.

**Phase D — `load_defaults 7.1` → `7.2`** (Flip-and-Verify, **kein Incident** — beide Overrides von 7.1
behalten). Behavior-Flags aktiv: `postgresql_adapter_decode_dates` (Raw-`::date` → `Date`),
`validate_migration_timestamps` (alle Migrations in der Vergangenheit → OK),
`enqueue_after_transaction_commit=:default` (delayed_job DB-backed → safe), `yjit` (no-op auf 3.1.7).

**Phase E — Gesamt-Verifikation (from-fresh-boot):** Full-Suite **`2303/54`**, non-feature `2260/11`,
Runner **19/19**, Browser (Screen/Wellplate serialize-`201`), Sample-mit-Molekül, 2FA — grün.

**Phase F — Full-From-Zero-Rebuild (`down -v`):** Ruby 3.1.7 kompiliert, `bundle install` (324 Gems aus
7.2-Lock) sauber; **2 neue 7.2-From-Scratch-Blocker gefixt:**
- **F-3:** Migration mit inline `serialize :description, Hash` (positional) — 7.2 **entfernt** Positional-Form
  (7.1 nur deprecated) → `serialize :description, type: Hash` (`20190716092051…`).
- **F-4:** `moleculeViewer`-Matrice-Migration ohne `configs` → jsonb-Default landet im Migrations-Kontext als
  String `"{}"` → `ui/initialize` 500 (`.merge(String)`) → `configs: {}` explizit (`20230323160712…`).

**Zusätzliche Gap-Tests (auf 7.2):** delayed_job-Worker end-to-end (`work_off`=[1,0] + Transaktions-Rollback);
Production-Mode-Boot (`zeitwerk:check`/`eager_load!` grün, `defaults=7.2`); File-Upload end-to-end (shrine +
`edit_state`-Enum/AASM); Container/Analyse-Baum + Attachment; CRUD (Create/Edit-Sample via UI), Navigation-Sweep
aller SPA-Bereiche (`HTTP5xx=[]`). `db/schema.rb` in 7.2-Dumper-Format regeneriert (kosmetisch, 0 strukturelle Änderung).

---

# Wiederkehrende Muster & Lehren

- **Infra/Image (jeder Ruby-Schritt):** Pins liegen nur im laufenden Container — Rebuild aus altem Base-Image
  findet das neue Ruby nicht → Boot-Break. Deploy-TODO je Schritt: Target-Ruby-Image bauen/pushen, CI umstellen, dann committen.
- **`db:migrate:reset` am Ziel-Ruby/-Rails immer auf harte Aborts prüfen**, nicht nur Deprecation-Warnungen
  (A6 `index_exists?` und die From-Scratch-Blocker F-1..F-4 tauchen nur so auf).
- **Nie mehrere Baustellen gleichzeitig:** Vorarbeiten einzeln grün → ein Bump → Defaults einzeln.
- **In dev NIE `bin/shakapacker` (compile)** — bricht das Login (webpacker-Container `:3035` serviert Packs).
- **Suite-Baseline `2260/11` / `2303/54`** ist über alle Schritte der Referenzwert (die 11 sind environmental).

# Deploy-TODOs (gesammelt, für Prod-Rollout)

1. **Cookie-Rotator** (seit 7.0: `cookies_serializer=:json` + SHA256) — sonst alle User ausgeloggt.
2. **Cache-Format invalidieren** (7.0 → 7.1 → 7.2 Format-Änderungen), ggf. zweistufiger Rolling-Deploy.
3. **`OTP_SECRET_KEY` ≥ 32 Byte** in dev/prod für echten 2FA-Betrieb (aktuell 6 Zeichen = environmental).
4. **`add_autoload_paths_to_load_path=true`** (Override) — `Encryptor`-Concern/Gem-Kollision latent; bei
   **Rails 8** neu bewerten (Concern → `ValueEncryptor` umbenennen).
5. **`SECRET_KEY_BASE`** in prod via ENV sicherstellen (secrets.yml-Fallback ist weg).
6. **Native Gems je Ruby-ABI im Image neu bauen** (openbabel/inchi/rinchi/semacode/nokogiri/rmagick).

# Teil C — Ruby 3.1.7 → 3.2.11 (✅ ausgeführt 2026-08)

Trittstein zu Rails 8.0 (≥ 3.2.2). Im Kern **Pin-Bump + native Gems für 3.2-ABI neu bauen** — die harten
3.2-Removals sind im App-Code 0×, der Ruby-Breaker auf dem Weg (Psych 4) war seit 3.1 gefixt, `libyaml-dev`
(Psych 5) lag in beiden Dockerfiles vor, `nokogiri 1.18.10` trägt 3.2/3.3/3.4. Boot `Rails 7.2.3.2 / Ruby
3.2.11 / Psych 5.4.0`; alle 431 Migrations grün.

**Ein realer Run-Breaker** (nicht statisch vorhersehbar, weil in einer Gem-Abhängigkeit): das unmaintainte
`thumbnailer`-Gem nutzt intern `File.exists?`/`Dir.exists?` (in 3.2 entfernt) → Thumbnails brachen still
(9 Failures). **Gelöst durch Ersatz des Gems durch `image_processing`** (MiniMagick-Backend, bereits vorhandene
Dep; gleiche Binaries convert/gs, Verhalten identisch: 800 px, weiß gepaddet, JPEG q75, PDF @ 200 dpi). Suite
zurück auf Baseline: **`2267/11`** non-feature (2260 + 7 neue Generator-Specs). Details:
`DEV_RAILS_UPGRADE_3-2.md` (§A2 + §D/§E).

**Deploy-TODO:** Base-/Runner-Image auf 3.2.11 bauen + CI umstellen. ⚠️ Ruby 3.2.11 ist bereits EOL (bewusst als
Trittstein) — nach Rails 8.0 zeitnah auf 3.3/3.4 (gemsseitig via nokogiri 1.18.10 frei).

# Ausblick

**Rails 8.0** (verlangt Ruby ≥ 3.2.2 — mit 3.2.11 erfüllt; dort d2f 6.x / AR-Encryption prüfen, `nokogiri ≥ 1.16`
ist mit 1.18.10 schon erfüllt), danach **Ruby 3.3/3.4**. Details künftig in einem 8.0-Doc.
</content>
