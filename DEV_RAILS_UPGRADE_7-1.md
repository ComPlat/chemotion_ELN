# DEV_RAILS_UPGRADE_7-1.md

Schritt-für-Schritt-Plan für **Rails 7.0.10 → 7.1** im Chemotion ELN.

**Status: UPGRADE KOMPLETT ✅ (Phasen A–E) — läuft voll auf RAILS 7.1.6 / Ruby 3.1.7 mit `load_defaults 7.1`.**
Full-Suite `2303/54` (reine Baseline: 11 environmental + 43 feature/browser-env, 0 non-Baseline),
manuelle Tests (Runner 19/19, API-Smoke, Click-Through, Create Sample/Screen, serialize-UI-Round-Trip) grün.
Working-Tree uncommittet (bereit zum Commit). Deploy-TODOs s. Ende.
Phase A: Gem-Bump (rails 7.1.6, paranoia 3.1.0, devise-two-factor 4.1.1) + 5 Incidents (A-1…A-5).
Phase B: `rails app:update` → nur `new_framework_defaults_7_1.rb` (inert), AS-Migrationen verworfen.
Phase C: Deprecations weg (C1 `require` · C2 `serialize`→`type:` ×12 · C3 `show_exceptions`→`:none`).
Phase D: **`load_defaults 7.1`** (Flip-and-Verify) + 2 bewusste Overrides
(`default_column_serializer=YAMLColumn`, `add_autoload_paths_to_load_path=true` wg. Incident D-1
Encryptor-Kollision), `new_framework_defaults_7_1.rb` gelöscht. Non-feature-Suite **reine Baseline
2260/11** (0 non-Baseline), Boot + Login auf `:3000` grün (`defaults=7.1`). **→ Als Nächstes:
Phase E (Gesamt-Verifikation: Full-Suite + manuelle Tests) + Commit.**
Ursprünglicher Ausgangspunkt: **Rails 7.0.10 / Ruby 3.1.7**
mit `load_defaults 7.0`, Working-Tree sauber (Commit `8965d0446` „rails upgrade to 7-0"),
Suite auf Baseline `2303/54` (11 environmental + 43 feature/browser-env). Details zum
7.0-Upgrade: `DEV_RAILS_UPGRADE_7-0.md`.

> **Reihenfolge-Kontext:** Ruby 3.0 ✓ → Ruby 3.1.7 ✓ → Rails 7.0 ✓ → **DIESER Schritt
> (Rails 7.1)** → Ruby 3.2 → Rails 7.2. **Rails 7.1 verlangt Ruby ≥ 2.7 → 3.1.7 passt
> (kein Ruby-Bump nötig).** Verifikation je Schritt über `DEV_UPGRADE_TEST_RUNBOOK.md`
> (Baseline non-feature: `2260/11`, Seed 57765; Full-Suite `2303/54`).

> **Grundprinzip (wie bei 7.0):** erst **alle Blocker/Vorarbeiten auf 7.0** (Phase 0,
> einzeln grün), dann der **eine** Versions-Bump (Phase A), dann `app:update` +
> **Framework-Defaults einzeln** durchschalten (Phase B–D). Nie mehrere Baustellen
> gleichzeitig. Alles im Container `chemotion_eln-app-1` (Ruby 3.1.7, Bundler 2.4.22):
> ```bash
> docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && bundle _2.4.22_ exec rails <...>'
> ```
> (Der frühere Host-Pfad `$HOME/.asdf/installs/ruby/3.1.7/bin` ist auf diesem Rechner
> nicht mehr vorhanden — asdf-ruby-Plugin weg, nur noch 3.3.4 lokal. **Bundle/Rails-Kommandos
> laufen im Container**, wo 3.1.7 + Bundler 2.4.22 fix sitzen.)

**Offizielle Referenz:** Rails-Guide „Upgrading from Rails 7.0 to Rails 7.1"
<https://guides.rubyonrails.org/upgrading_ruby_on_rails.html#upgrading-from-rails-7-0-to-rails-7-1>

---

## Überblick — was 7.1 für DIESE App bedeutet

Konkrete Treffer aus dem Codebase-Scan (2026-08), nicht generischer Guide-Text:

| # | 7.1-Änderung | Treffer im Code | Aufwand |
|---|---|---|---|
| **B1** | **Gem-Blocker `paranoia 2.6.0`** cappt `activerecord < 7.1` | 58 Aufrufstellen `acts_as_paranoid`/`with_deleted`/`only_deleted` | Bump, niedrig |
| **B2** | **Gem-Blocker `devise-two-factor 4.1.0`** cappt `activesupport < 7.1` | OTP via `attr_encrypted`/`encryptor` + `encrypted_otp_secret*`-Spalten | ✅ **GELÖST: `4.1.1` = Drop-in** (s. u.) — niedrig |
| **C1** | `add_autoload_paths_to_load_path` default **false** → `lib` nicht mehr auf `$LOAD_PATH` | `lib/export/export_excel.rb:315` `require 'reporter/img/conv'` (LIVE); 2× `require 'storage'` (tote, ignorierte Dateien) | klein, konkret |
| **C2** | `serialize`-Signatur: positional deprecated → `type:`-Keyword | **12 Stellen** in wellplate/molecule/reaction/screen/report | mechanisch |
| **C3** | `show_exceptions` nimmt Symbole (`:all`/`:rescuable`/`:none`) statt `true`/`false` | `config/environments/test.rb:26` `= false` | 1 Zeile |
| **D-def** | Neue Framework-Defaults via `new_framework_defaults_7_1.rb` (Cache-Format 7.1, Marshalling 7.1, `to_time_preserves_timezone`, i18n-raise, Default-Header, Regexp.timeout …) | einzeln durchschalten | s. Phase D |
| **✓** | Kein Treffer: `ActiveSupport::Deprecation`-Direktnutzung, Logger-`broadcast`, `preview_path`, `@rails/ujs`, ActiveStorage-Streaming-Controller | — | entfällt |

**~~Kern-Risiko = B2~~ (devise-two-factor) — ENTSCHÄRFT durch `4.1.1` (Gem-Spec-Check
2026-08, s. 0-B2).** Nach dieser Klärung ist **kein** Punkt mehr High-Risk; alles
klein/mechanisch. Einziges Rest-Risiko: `attr_encrypted`↔AR-7.1-Kompat (empirisch beim
2FA-Login-Test in Phase A prüfen).

---

## Phase 0 — Blocker-Vorabklärung (VOR dem Bump)

### 0-B2 — 🎯 devise-two-factor: Versions-Entscheidung — DER dicke Brocken

**Problem:** `devise-two-factor 4.1.0` verlangt `activesupport < 7.1` → hartes Bump-Veto.
Aktuelles Schema: **`encryptor`-Gem** + Spalten `encrypted_otp_secret`,
`encrypted_otp_secret_iv`, `encrypted_otp_secret_salt` (User-Model), Schlüssel via
`config.otp_secret_encryption_key` (`application.rb:159`, aus `ENV['OTP_SECRET_KEY']`).
Nutzung: `app/models/user.rb:75` (`otp_secret_encryption_key: …`), `:189–190`
(`otp_secret`/`generate_otp_secret`).

**✅ GEKLÄRT (Gem-Spec-Check 2026-08, im Container) — Weg A gewählt:**

| Version | `activesupport` | OTP-Schema | Für uns |
|---|---|---|---|
| `4.1.0` (aktuell) | `< 7.1` | attr_encrypted/encryptor | **Blocker** |
| **`4.1.1`** | **`~> 7.0` (= `>= 7.0, < 8.0`, inkl. 7.1)** | **`attr_encrypted >= 1.3, != 2, < 5` (→ encryptor)** | ✅ **Drop-in** |
| `5.0.0` | `~> 7.0` | **kein** attr_encrypted → AR-Encryption | Migration nötig (Weg B) |
| `6.4.0` | `>= 7.2` | AR-Encryption | zu neu (erst ab Rails 7.2) |

**→ Weg A: Bump `4.1.0` → `4.1.1`.** Einziger Unterschied zu 4.1.0: das
`activesupport`-Cap wurde von `< 7.1` auf `~> 7.0` gelockert — **das
`attr_encrypted`-basierte Schema bleibt identisch**. Damit:
- **Keine** Daten-Migration (die `encrypted_otp_secret*`-Spalten bleiben).
- **Kein** AR-Encryption-Setup, **kein** `config.active_record.encryption.*`.
- `gem 'encryptor'` **bleibt** (attr_encrypted-Backend).
- Weitere Deps von 4.1.1: `devise ~> 4.0` (haben 4.9.4 ✓), `rotp ~> 6.0`, `railties ~> 7.0`.

**Weg B (5.x/6.x) verworfen** — bringt eine Produktions-OTP-Daten-Migration ohne Not.
`6.x` scheidet ohnehin aus (`activesupport >= 7.2`), Wiedervorlage erst bei Rails 7.2.

**Rest-Risiko:** `attr_encrypted`↔ActiveRecord-7.1-Kompatibilität (attr_encrypted patcht AR).
Da d2f 4.1.1 `activesupport ~> 7.0` deklariert, von den Maintainern abgedeckt → **empirisch
beim 2FA-Login-Test in Phase A verifizieren** (nicht blind vertrauen).

### 0-B1 — paranoia-Bump

`paranoia 2.6.0` → `< 7.1`-Cap. **Gem-Spec-Check 2026-08:** `paranoia 3.0.0` →
`activerecord >= 6, < 8.1`, ruby `>= 2.7` → **passt für 7.1 und bleibt auf 3.1.7.**
(`3.1.0` verlangt ruby `>= 3.1` + `activerecord >= 7`, ebenfalls ok, aber `3.0.x` ist die
breitere/sicherere Wahl.) Stabiles Soft-Delete-API, 58 Aufrufstellen. **Verifizieren:**
`default_scope`/`with_deleted`/`only_deleted`-Verhalten (paranoia 2.6→3.0 hatte kleinere
Scope-Änderungen) über die bestehenden Model-Specs. Niedriges Risiko, aber nicht blind —
Specs müssen grün bleiben. **Gewählt: `~> 3.0` (bundler nimmt 3.0.1).**

### 0-C-vorab — `$LOAD_PATH`-Requires entschärfen (kann schon auf 7.0)

`add_autoload_paths_to_load_path=false` (Phase D) nimmt `lib` vom `$LOAD_PATH`. Betroffen:
- `lib/export/export_excel.rb:315` → `require 'reporter/img/conv'` (**LIVE**, Excel-Export).
  `lib/reporter/img/conv.rb` ist Zeitwerk-autoloadbar als `Reporter::Img::Conv` → **redundantes
  `require` entfernen** (Konstante referenzieren reicht) **oder** `lib` explizit unshiften.
- `lib/storage/{void,remotesftp}.rb` → `require 'storage'`. Tote, Zeitwerk-**ignorierte**
  Dateien (s. `application.rb`-Ignore-Liste, `remotesftp` raised beim Load). Kein Live-Caller
  → belassen oder mit-aufräumen; blockt nicht.

Diese Entschärfung ist schon **auf Rails 7.0** möglich (`autoload_paths` liegen dort noch
auf `$LOAD_PATH`, das `require` bleibt also solange gültig) → vorziehen reduziert Phase-D-Risiko.

---

## Phase A — Dependency-Bump (der EINE Versions-Bump)

1. **Blocker gelöst** (Phase 0-B1/B2 entschieden), dann `Gemfile`:
   - `gem 'rails', '~> 7.0.0'` → `gem 'rails', '~> 7.1.0'`
   - `gem 'paranoia', '2.6.0'` → `gem 'paranoia', '~> 3.0'`
   - `gem 'devise-two-factor'` → `'~> 4.1', '>= 4.1.1'` (Weg A; `gem 'encryptor'` **bleibt**)
2. Im Container:
   ```bash
   docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && bundle _2.4.22_ update rails paranoia devise-two-factor'
   ```
   Weitere Cap-Konflikte iterativ auflösen (erwartet: keine weiteren aus dem Lock-Scan,
   aber empirisch prüfen).
3. **Lock-Check:** `rails 7.1.x`, `activesupport/activerecord 7.1.x`, keine `< 7.1`-Caps mehr.
4. **Boot-Smoke** (noch `load_defaults 7.0`): `rails runner "puts Rails.version"` → 7.1.x.

**Verifikation A:** Container-Restart, App bootet auf `:3000`, Login sichtbar,
`zeitwerk:check` grün, `eager_load!` grün. Suite-Baseline unverändert.

---

## Phase B — `rails app:update` (Config-Diffs)

```bash
docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && bundle _2.4.22_ exec rails app:update'
```
- Erzeugt **`config/initializers/new_framework_defaults_7_1.rb`** (alle 7.1-Flags
  auskommentiert/false → einzeln aktivieren in Phase D).
- Config-Diffs (`config/*`, `bin/*`) **einzeln reviewen** — NICHTS blind übernehmen.
  Bestehende bewusste Abweichungen (Zeitwerk-Setup in `application.rb`, sprockets-rails,
  Shakapacker) behalten.
- `load_defaults` bleibt in dieser Phase auf **7.0**.

**Verifikation B:** Boot + Suite-Baseline unverändert (neue Defaults noch inaktiv).

---

## Phase C — Grün auf 7.1 mit ALTEN Defaults (Deprecations abbauen)

Ziel: App läuft voll auf Rails 7.1, `load_defaults 7.0`, **0 Deprecation-Warnings**.

- **C1 — `$LOAD_PATH`-Requires** (falls nicht in Phase 0-C-vorab erledigt): s. o.
- **C2 — `serialize` → Keyword-Form** (12 Stellen). Deprecation-Fix, kein Verhaltenswechsel:
  ```ruby
  serialize :description, Hash   # alt (positional, deprecated)
  serialize :description, type: Hash   # 7.1 (Coder bleibt YAML-Default)
  ```
  Dateien: `wellplate.rb:36`, `molecule.rb:43`, `reaction.rb:66-67`, `screen.rb:33`,
  `report.rb:37-43`.
- **C3 — `show_exceptions`** in `config/environments/test.rb:26`: `= false` → `= :none`.
- **Deprecation-Sweep:** Boot/Suite mit auf-Deprecations-lauschen; jede Warnung beheben.
  (Erwartet gering — `ActiveSupport::Deprecation`-Direktnutzung/Logger-broadcast/preview_path
  haben laut Scan **0 Treffer**.)

**Verifikation C:** Boot + `zeitwerk:check` + `eager_load!` grün, Suite-Baseline,
manuelle Tests (Login/Session, Click-Through, Write-Pfad/InChIKey) grün.

---

## Phase D — `load_defaults 7.1` einzeln durchschalten

`new_framework_defaults_7_1.rb`-Flags **einzeln** aktivieren, je Flag verifizieren, dann
am Ende `config.load_defaults 7.1` und die Datei entfernen. Relevante Flags & App-Bezug:

| Flag | Bedeutung | App-Bezug / Risiko |
|---|---|---|
| `active_support.cache_format_version = 7.1` | neues Cache-Serialisierungsformat | Dev = memory_store (Boot geleert); `base_serializer` nutzt `Rails.cache` → prüfen. **Prod: Cache-Invalidierung** (Deploy-TODO). |
| `active_record.marshalling_format_version = 7.1` | neues Marshalling | niedrig |
| `active_support.to_time_preserves_timezone = :zone` | TZ-Erhalt in `to_time` | Zeit-Logik prüfen (Reports/Timestamps) |
| `action_dispatch.default_headers` | `X-Download-Options`/`X-Permitted-Cross-Domain-Policies` raus | ggf. Tests, die Header asserten |
| `active_support.raise_on_invalid_cache_expiration_time = true` | falsche Cache-TTL raised | Cache-Aufrufe prüfen |
| `active_record.run_commit_callbacks_on_first_saved_instances_in_transaction` | Callback-Reihenfolge in TX | Model-Callbacks/Specs prüfen |
| `active_record.default_column_serializer = nil` | `serialize` ohne Coder → Fehler | **NICHT aktivieren** (oder `coder:` je Spalte ergänzen): unsere 12 `serialize … type:` nutzen bewusst den Default-Coder `YAMLColumn` (wg. `yaml_column_permitted_classes`-Safety, s. C2). `nil` würde sie brechen bzw. auf unsicheres rohes `YAML` zwingen. |
| `regexp.timeout` / weitere | Regexp-DoS-Schutz | niedrig |
| `i18n.raise_on_missing_translations` | fehlende Übersetzung raised überall | im Code auskommentiert → prüfen, nicht versehentlich aktivieren |

**⚠️ Cookie-Hinweis:** `load_defaults 7.0` hat bereits `cookies_serializer :json` + SHA256.
7.1 ändert das nicht grundlegend, aber die 7.0-**Cookie-Rotator-Deploy-TODO** (s.
`DEV_RAILS_UPGRADE_7-0.md` §6.10) bleibt offen.

**Verifikation D:** nach jedem Flag Boot + Suite; final `load_defaults 7.1` gesetzt,
`new_framework_defaults_7_1.rb` gelöscht, Full-Suite + manuelle Tests grün.

---

## Phase E — Gesamt-Verifikation

- Container **Full-Rebuild** (keine stale Artefakte), Versionen prüfen
  (`rails=7.1.x ruby=3.1.7 defaults=7.1 zeitwerk=true`).
- **Full-Suite** = Baseline `2303/54` (11 environmental + 43 browser-env), keine neuen
  non-feature-Failures.
- **Manuelle Tests** (`DEV_UPGRADE_TEST_RUNBOOK.md`): Login/Session, Click-Through, CREATE-Menü,
  Sample-Form, API/JWT-Smoke, C2-Write-Pfad/InChIKey (`LFQSCWFLJHTTHZ-UHFFFAOYSA-N`),
  **2FA-Login** (wegen B2 kritisch), Gem-Smokes.

---

## Offene Punkte / Deploy-TODOs

1. ~~B2-Entscheidung~~ ✅ **erledigt: Weg A (`devise-two-factor 4.1.1`), Drop-in ohne Migration.**
2. **Cookie-Rotator** (§6.10 im 7.0-Doc) vor Prod-Rollout — trägt sich hierher fort.
3. **Cache-Format 7.1** → Prod-Cache-Invalidierung beim Deploy einplanen.
4. ~~2FA-Login empirisch testen~~ ✅ **erledigt (Phase A):** mit 32-Byte-Key provision+verify grün
   (`devise-two-factor 4.1.1` / `attr_encrypted 4.2.0` / `encryptor 3.0.0` unter 7.1). **Befund:**
   dev/test `OTP_SECRET_KEY` = 6 Zeichen (< 32 Byte für aes-256-gcm) → OTP-Encryption in dev/test
   nicht ausgeübt (`ArgumentError: key must be 32 bytes or longer`) → **environmental, identisch auf 7.0,
   kein Regress.** Für echten 2FA-Betrieb in dev/prod muss `OTP_SECRET_KEY` ≥ 32 Byte gesetzt sein.
5. Danach separat: **Ruby 3.2 → Rails 7.2** (dort d2f 6.x / AR-Encryption erneut prüfen).

---

## Änderungs- & Incident-Log

### Phase A — Dependency-Bump ✅ (2026-08-04)

**Gemfile:**
- `gem 'rails', '~> 7.0.0'` → `'~> 7.1.0'`
- `gem 'paranoia', '2.6.0'` → `'~> 3.0'`
- `gem 'devise-two-factor'` → `'~> 4.1', '>= 4.1.1'` (`encryptor`/`attr_encrypted` bleiben)

**`bundle _2.4.22_ update rails paranoia devise-two-factor` — sauber, keine Cap-Konflikte:**
- **rails/activerecord/activesupport `7.1.6`** (war 7.0.10)
- **paranoia `3.1.0`** (nicht 3.0.1 — `~> 3.0` lässt 3.1.0 zu; ruby 3.1.7 erfüllt dessen
  `>= 3.1`, activerecord `>= 7, < 8.2` erfüllt) — Doc-Kandidat war 3.0.1, real 3.1.0, ok.
- **devise-two-factor `4.1.1`** (war 4.1.0) — Drop-in wie geplant.
- Transitive Mit-Updates durch den 7.1-Baum: `responders 3.2.0`, `psych 5.4.0`,
  `stringio/bigdecimal/io-console/irb/rdoc/reline`, `rack-session 1.0.2`, `rackup 1.0.1`,
  `erb 4.0.4.1`, `pp/prettyprint/tsort`. Unkritisch (Default-Gems, die 7.1 nachzieht).
- Lock-Scan: **keine `< 7.1`-Caps mehr.**

**Verifikation:**
- Boot-Smoke (dev): `rails=7.1.6 ruby=3.1.7 defaults=7.0 zeitwerk=true` ✓
- `zeitwerk:check` → „Otherwise, all is good!" ✓ (die `lib`-Notiz ist die by-design
  Info: `lib` ist autoload-only, nicht eager-loaded).
- Konstanten-Eager-Load läuft **innerhalb** `zeitwerk:check` (grün). Das separate
  `RAILS_ENV=production rails runner` scheitert **nur** an DB-Credentials
  (`username: postgres` für Prod-Env ≠ Dev-Postgres) → **environmental, kein Code-Issue.**
- App-Container neu gestartet, `:3000` Login sichtbar (HTTP 200, `<title>Chemotion dev</title>`,
  csrf-token + Passwort-Feld) ✓
- **0 Deprecation-Warnings** im minimalen Dev-Boot (`puts :boot_ok`) nach dem A-1-Fix unten.
  **Aber bekannt/aufgeschoben:** `serialize`-positional-Deprecations (12 Stellen, s. C2) feuern beim
  **Laden der betroffenen Modelle** (Reaction/Molecule/Wellplate/Screen/Report) — z. B.
  *„Passing the class as positional argument is deprecated … serialize :observation, type: Hash"*.
  Kein Fehler, kein Verhaltenswechsel; Fix in Phase C (C2). Der minimale Boot lädt diese Modelle nicht,
  daher dort 0.

**🟡 Incident A-1 — deprecated Classic-Autoloader-Flag:**
`config/environments/production.rb:14` `config.enable_dependency_loading = true` löst unter
7.1 aus: *„This flag addressed a limitation of the `classic` autoloader and has no effect
nowadays. To fix this deprecation, please just delete the reference."* Unter Zeitwerk No-op.
**Fix: Zeile + zugehörigen TODO-Kommentar (Z. 12–14) entfernt.** Danach 0 Deprecations.
(`require_relative '../../lib/chemotion/oneline_log_formatter'` in Z. 3–4 bleibt — legitimer
expliziter Require aus dem 7.0-Schritt, nicht das deprecated Flag.)

**🔴 Incident A-2 — `enum` ohne Backing-Spalte (7.1 strikt) — 342 Suite-Failures:**
Erster Full-Suite-Lauf (Seed 57765): **`2260 examples, 342 failures`** (statt `11`). Ursache
systemisch, **eine** Wurzel:
```
RuntimeError: Undeclared attribute type for enum 'sample_section' in Comment.
Enums must be backed by a database column or declared with an explicit type via `attribute`.
```
`app/models/comment.rb` deklariert **9 `*_section`-Enums** (`sample_section`, `reaction_section`,
… `header_section`), deren Namen **keiner Spalte entsprechen** — die `comments`-Tabelle hat nur
**eine** Spalte `section` (string). Bis Rails 7.0 war `enum` **lazy** (kein Spalten-Check);
**7.1 prüft beim Schema-Load/Instanziieren streng** → jeder Zugriff auf ein Comment
(`object.comments.count/size`, `serializable_hash`) raised → kaskadiert über alle Entities.
- **Tatsächliche Nutzung:** die Enums dienen **nur als Wert-Maps** —
  `Comment.sample_sections[:properties] → 'sample_properties'` und
  `Comment.<x>_sections.values` (in `app/api/chemotion/comment_api.rb:103–111` + Specs). **Nie**
  als Instanz-Attribut/Predicate/Scope; der echte Wert geht direkt in die `section`-Spalte.
- **Nur Comment betroffen** — die übrigen Enums (`attachment.edit_state`, `reactions_sample.gas_type`,
  `computed_prop.status`, `calendar_entry_notification.status`) haben Backing-Spalten (Schema geprüft).
- **Fix:** je Enum eine **virtuelle `attribute :<name>, :string`** vor der Enum-Deklaration
  (genau der vom Fehler vorgeschlagene Weg „explicit type via `attribute`"). Verhalten
  unverändert: die `<x>_sections`-Maps bleiben byte-identisch, nichts wird persistiert (es
  gibt keine Spalte). **Typ = `:string` empirisch verifiziert:** Enum-Werte sind Strings und
  die `section`-Spalte ist string; `:integer` würde den 7.1-Check zwar auch bestehen, aber die
  Enum-Predicates brechen (`sample_section_properties? → false` statt `true`). Nur `:string`
  hält den vollen Enum-Kontrakt.
- **Verifiziert:** `spec/models/comment_spec.rb` + `comment_api_spec.rb` + `research_plan_api_spec.rb`
  → **43 examples, 0 failures.** (Enum war im Vorab-Scan übersehen — `enum` nicht gegreppt;
  Lehre: bei Rails-Minor-Bumps immer `rg "^\s*enum"` gegen Spaltenexistenz prüfen.)

**🔴 Incident A-3 — hstore mit nil-Key (7.1 strikt) — `Labimotion::Element` + `User#counters`:**
Nach A-2-Fix zeigte die Suite u. a. in `calendar_entry_spec`, `calendar_entry_entity_spec`,
`sequence_based_macromolecule_sample_api_spec`:
```
ArgumentError: Invalid Hstore document: "\"samples\"=>\"0\", …, NULL=>\"0\""
labimotion/models/element.rb:93 auto_set_short_label → AR changed_in_place? → hstore#deserialize
```
- **Ursache:** Der Test-Factory-Pfad `:element` (`spec/factories/calendar_entry.rb:33`) baut
  `Labimotion::ElementKlass.create` **ohne Name**. Der Gem-Code `auto_set_short_label` schreibt
  `creator.counters[element_klass.name] = '0'` → mit `name = nil` einen **nil-Key** in die
  hstore-Spalte `users.counters` (umgeht `User#increment_counter`s Guard).
- **7.1-Verhalten:** `escape_hstore(nil) => "NULL"` (unquoted). Der hstore-Parser (StringScanner)
  ist **seit 7.0 identisch strikt** und raised auf einen unquoted NULL-**Key**. Neu in 7.1: das
  Dirty-Tracking (`update_columns` → `changed_in_place?`) **deserialisiert** diese Rails-eigene
  Serialisierung → raised. (In 6.1 tolerierte der regex-`scan`-Parser das: nil-Key → String-Key
  `"NULL"`, **kein** Drop — gegen die echte 6.1-Gem verifiziert.)
- **Prod-Relevanz:** keine — ein namenloses `element_klass` gibt es nur im Test; Prod-Klassen
  haben immer einen Namen. Aber der nil-Fall soll **einen Safeguard** haben (nicht die Test-Daten
  „glätten").
- **Fix — `app/types/lenient_hstore_type.rb` (`LenientHstoreType < OID::Hstore`):** überschreibt
  **nur** `deserialize` = `super` (7.1-strikt) und fällt **ausschließlich bei `ArgumentError`** auf
  6.1s lenient regex-`scan` zurück. Damit: normale hstore-Werte unverändert durch 7.1, 6.1-Verhalten
  **nur** für exakt den Input, den 7.1 ablehnt. Angebunden **nur** an `users.counters` via
  `attribute :counters, LenientHstoreType.new` (`app/models/user.rb`). Kein globaler Monkey-Patch.
  - **Platzierung `app/types/`** (nicht `app/models`, nicht `lib`): eigener AR-Typ = Persistenz-
    Infrastruktur, gehört neben die anderen `app/<concept>`-Verzeichnisse (decorators, policies,
    uploaders, …); `lib` beherbergt eigenständige Domänen-Libraries und wird nicht eager-geladen.
- **Verifiziert:** `calendar_entry_spec` + `calendar_entry_entity_spec` grün; die 4 hstore-Failures
  weg. (In `sequence_based_…_api_spec` blieb danach **1 unabhängiger** Failure Z. 669 → Grape-
  `OutputBuilder`×`deep_merge` — **behoben als Incident A-5**, s. u.)

**🔴 Incident A-4 — paranoia `really_destroy!` × `DISTINCT ON`-Assoziation (`really_destroy_task_spec`, 3):**
```
PG::InvalidColumnReference: SELECT DISTINCT ON expressions must match initial ORDER BY expressions
LINE 1: SELECT DISTINCT ON (element_type, segment_klass_id) * FROM …
lib/really_destroy_task.rb:7 → really_destroy! → paranoia
```
- **Ursache = der paranoia-Bump (nicht 7.1), gegen beide Gem-Quellen verifiziert:**
  | Version | Collection-Dependent-Zweig | Effekt |
  |---|---|---|
  | **2.6.0** | `association_data.with_deleted.each(&:really_destroy!)` | lädt mit der Assoziations-Order (gültig) → OK |
  | **3.1.0** | `association_data.with_deleted.find_each { … }` | `find_each` erzwingt `ORDER BY id` → `DISTINCT ON`-Prefix-Mismatch → PG-Fehler |
  Labimotions `has_many :segments` (Concern `segmentable.rb:11`) nutzt
  `select('DISTINCT ON (element_type, segment_klass_id) *').order(element_type, segment_klass_id, id)`;
  `find_each`s erzwungenes `ORDER BY id` bricht die `DISTINCT ON`-Prefix-Regel.
- **Prod-Relevanz: ja** — `ReallyDestroyTask` (Cron) really-destroyt Samples/Reactions mit Segmenten.
- **Kein Downgrade möglich:** jede 2.6.x (`.each`) cappt `activerecord < 7.1`; jede 7.1-taugliche 3.x nutzt `.find_each`.
- **Kein Model-/Column-Hook** (anders als A-3) — das Laden ist intern in `really_destroy!`. Einziger Ort = die Methode selbst.
- **Fix — `config/initializers/paranoia.rb`:** `module Paranoia` reopened, `really_destroy!` **verbatim aus 3.1.0**
  reproduziert mit **einer** Änderung: Collection-Zweig `.find_each` → `.each` (= 2.6-Verhalten, jahrelang genutzt;
  `.each` vs `.find_each` = nur Batching/Memory, für diese Cleanup-Task vernachlässigbar). Bei paranoia-Upgrade
  neu prüfen. Monkey-Patch war unvermeidbar (kein engerer Hook).
- **Verifiziert:** `really_destroy_task_spec` → **5 examples, 0 failures**.

**🔴 Incident A-5 — Grape `OutputBuilder` × `deep_merge` (`sequence_based_macromolecule_sample_api_spec:669`, 1):**
Test meldete alle required-Felder als „missing" statt nur das nil-Feld. Root-Cause tief:
- **Mechanik:** Spec-Helper `serialize_sbmm_sample_as_api_input` baut API-Input aus
  `Entity.represent(…).serializable_hash` → das ist ein **`Grape::Entity::…::OutputBuilder`**
  (`SimpleDelegator`, der einen Hash umschließt), kein echter Hash. Sein `kind_of?` faket
  Hash-Sein per **`klass == output.class`** (nur exakte Klasse) → `is_a?(Hash)` true, aber
  `is_a?(Enumerable/Comparable/DeepMergeable)` **false**.
- **Warum erst 7.1:** `ActiveSupport#deep_merge` prüfte in ≤7.0 `this_val.is_a?(Hash)` (erfüllt),
  in **7.1** (`active_support/deep_mergeable.rb`) `this_val.is_a?(DeepMergeable)` — was der
  Exact-Class-Fake nicht erfüllt → `deep_merge` **ersetzt** den OutputBuilder statt hineinzumergen
  → alle required-Felder weg. (Andere SBMM-Tests nutzen `.merge`/Index-Zuweisung → kein Recurse → ok.)
- **Prod-Relevanz: keine** — kein Prod-Code macht `serializable_hash.deep_merge` (beide Prod-`deep_merge`
  laufen auf `profile.data`, echte Hashes). **Aber** es ist ein echter latenter Grape-Bug (Halb-Impersonation).
- **Kein Gem-Update hilft:** grape-entity **1.1.0** (latest) hat dasselbe kaputte `kind_of?` (geprüft).
- **Fix (generell, gewählt statt Test-only) — `config/initializers/grape_entity.rb`:** `OutputBuilder#kind_of?`
  auf **echte Delegation** gepatcht (`__getobj__.is_a?(klass) || super`) → meldet alle Ancestors des
  umschlossenen Hash/Array, `deep_merge` funktioniert wieder überall. Hash/Array-Unterscheidung bleibt
  (`output.class` weiter Hash bzw. Array). Empirisch bewiesen (Broken→`{:c=>3}` / Fixed→`{:a,:b,:c}`).
- **Verifiziert:** SBMM-Spec **27/0**; **alle Entity-Specs 143/0** (Hot-Path-Serialisierung unverändert).

**Geänderte/neue Dateien Phase A:** `Gemfile`, `Gemfile.lock`, `config/environments/production.rb`,
`app/models/comment.rb`, `app/types/lenient_hstore_type.rb` (neu), `app/models/user.rb`,
`config/initializers/paranoia.rb` (neu), `config/initializers/grape_entity.rb` (neu).

**Suite-Verlauf non-feature (Seed 57765):** `342 → 21 (A-2) → 15 (A-3) → 12 (A-4) → 11 (A-5)` ✅.
Endstand: `2260 examples, 11 failures, 48 pending` = **reine environmental Baseline**
(7 datacollector-sftp + 3 rdkit + 1 admin_device), **0 non-Baseline-Failures.**

**Full-Suite (feature + non-feature, Seed 57765):** `2303 examples, 55 failures` = 11 environmental
+ 43 feature (Browser-Env, im Container nicht lauffähig) + **1 Flake** `import_wellplate_spreadsheet_spec`
(`ERROR: deadlock detected`, Postgres-Concurrency; **in Isolation 7/0**). ≙ 7.0-Baseline `2303/54` + 1 Flake.

**Manuelle Tests (`:3000`, Ruby 3.1.7 / Rails 7.1.6, User `tu3` id=24) — alle grün:**
| Test | Ergebnis |
|---|---|
| Login/Session | ✅ → `/mydb/collection/all` |
| Click-Through / SPA (alle Element-Typen inkl. SBMM) | ✅ 0 failed API (nur 6 bekannte React-PropType-Warnings) |
| CREATE-Menü (alle Typen) + Sample-Form (`tu3-1`, 201) | ✅ 0 page errors |
| API/JWT smoke (collections/samples/reactions/profiles/ui, 401 ohne Token) | ✅ alle 200 |
| C2-Write-Pfad / InChIKey (Ethanol) | ✅ `LFQSCWFLJHTTHZ-UHFFFAOYSA-N` |
| 2FA (devise-two-factor 4.1.1, mit 32-Byte-Key) | ✅ provision+verify (dev `OTP_SECRET_KEY`=6 Zeichen → environmental, kein Regress) |
| Labimotion Generic-Element (A-3 hstore-counters, benannte Klasse) | ✅ `tu3-PP1`, kein nil-Key |
| Comment-Enum-Maps (A-2) | ✅ `sample_sections[:properties] → sample_properties` |

**→ Phase A funktional KOMPLETT & verifiziert.**

### Phase B — `rails app:update` ✅ (2026-08-06)

**So gefahren:** `yes n | rails app:update` im Container — **„n" auf jeden Overwrite-Prompt**
→ alle bestehenden (customized) Dateien **unverändert** behalten (nur neue Dateien werden erzeugt).

**Skip/conflict (unsere Version behalten, bewusst abweichend vom 7.1-Template):**
`config/boot.rb`, `application.rb`, `environment.rb`, `environments/{development,production,test}.rb`,
`initializers/{assets,content_security_policy,cors,filter_parameter_logging,inflections}.rb`,
`bin/{rails,rake,setup}`. (Alle differieren, weil app-spezifisch angepasst — kein Handlungsbedarf.)

**Erzeugt & behalten:** `config/initializers/new_framework_defaults_7_1.rb` — der Phase-B-Deliverable.
**Alle Flags auskommentiert** (inert), Aktivierung einzeln in Phase D. `load_defaults` bleibt **7.0**.

**Erzeugte Artefakte ENTFERNT (nicht Teil des Upgrades):**
- `config/initializers/permissions_policy.rb` — vollständig auskommentiertes Template, hatte die App
  nie; kein Bedarf → entfernt.
- **3× `db/migrate/*_active_storage.rb`** — `app:update` ruft automatisch `active_storage:update`.
  **Die App nutzt shrine, NICHT ActiveStorage** (0 `active_storage`-Refs in `schema.rb`, AS-Service in
  allen envs auskommentiert) → Migrationen wären Schema-Rauschen → entfernt.

**Neu aufgetauchte 7.1-Flags (aus `new_framework_defaults_7_1.rb`, für Phase D ergänzt):**
`action_view/action_text.sanitizer_vendor = Rails::HTML::Sanitizer.best_supported_vendor` (HTML5-Sanitizer),
`dom_testing_default_html_version = :html5`, `active_support.message_serializer = :json_allow_marshal`,
`action_controller.allow_deprecated_parameters_hash_equality = false`,
`active_record.{raise_on_assign_to_attr_readonly, run_after_transaction_callbacks_in_order_defined,
before_committed_on_all_records, commit_transaction_on_non_local_return, generate_secure_token_on,
belongs_to_required_validates_foreign_key, query_log_tags_format}`, `precompile_filter_parameters`.
Hinweis aus der Datei: `add_autoload_paths_to_load_path` und `cache_format_version` gehören in
**`application.rb`**, nicht in die Defaults-Datei.

**Verifikation B:**
- Boot-Smoke: `rails=7.1.6 defaults=7.0`, neue Initializer-Datei lädt sauber (inert) ✓
- **Geänderte/neue Dateien Phase B:** nur `config/initializers/new_framework_defaults_7_1.rb` (neu).
- Suite-Baseline non-feature (Seed 57765): **`2260/11` = reine Baseline** (Re-Run bestätigt).
  Ein Lauf zeigte `17` (version_api 5 + sample_api 1 zusätzlich), **beide in Isolation grün**
  (`version_api 12/0`, `sample_api 59/0`) und im Re-Run weg → **flaky Test-Pollution, kein Regress**
  (gleiche Klasse wie der `import_wellplate`-Deadlock-Flake; Seed-57765 nicht deterministisch stabil —
  bestehende Test-Infra-Flakiness, unabhängig vom Upgrade).

**→ Phase B KOMPLETT & verifiziert.** Nächstes: Phase C (Deprecations abbauen — `serialize`→`type:`,
`show_exceptions`→`:none`, `$LOAD_PATH`-Require), weiterhin `load_defaults 7.0`.

### Phase C — Deprecations abbauen ✅ (2026-08-06, weiter `load_defaults 7.0`)

- **C1 — redundantes `require` entfernt:** `lib/export/export_excel.rb:315` `require 'reporter/img/conv'`
  gestrichen. `Reporter::Img::Conv` (Z. 322) ist Zeitwerk-autoloadbar → Require überflüssig; Prep für
  `add_autoload_paths_to_load_path = false` (Phase D). **Verifiziert:** `zeitwerk:check` grün,
  `Reporter::Img::Conv` resolvt. (Die 2 toten `require 'storage'` in `lib/storage/{void,remotesftp}.rb`
  bleiben — Zeitwerk-ignorierte Dateien ohne Live-Caller; kein Handlungsbedarf.)
- **C2 — `serialize` positional → Keyword (`type:`), 12 Stellen:** `wellplate.rb:36`, `screen.rb:33`,
  `molecule.rb:43`, `reaction.rb:66-67`, `report.rb:37-43`. `serialize :x, Hash/Array` →
  `serialize :x, type: Hash/Array`. **Bewusst NICHT `coder: YAML`** ergänzt: das würde die
  `default_column_serializer`-Wahl (`ActiveRecord::Coders::YAMLColumn`) durch rohes `YAML` (Psych)
  ersetzen und die **`yaml_column_permitted_classes`-Safety** (`application.rb`) umgehen. `type:`
  behält den Default-Coder (YAMLColumn) → Verhalten identisch. **Verifiziert:** Modelle laden ohne
  Deprecation; `Reaction.type_for_attribute('description').coder.class == ActiveRecord::Coders::YAMLColumn`.
  ⚠️ **Phase-D-Hinweis:** Flag `active_record.default_column_serializer = nil` würde `serialize` **ohne**
  expliziten Coder brechen — daher dieses Flag in Phase D **nicht** aktivieren (oder dann `coder:` je
  Spalte ergänzen), damit YAMLColumn+permitted_classes erhalten bleibt.
- **C3 — `show_exceptions`:** `config/environments/test.rb:26` `= false` → `= :none`. **Verifiziert:**
  Test-Env bootet, `show_exceptions=none`.

**Geänderte Dateien Phase C:** `app/models/{wellplate,screen,molecule,reaction,report}.rb`,
`lib/export/export_excel.rb`, `config/environments/test.rb`.

**Verifikation C:** Boot dev+test grün, `zeitwerk:check` grün, **0 `serialize`-Deprecations** (Modelle
force-geladen). Suite-Baseline non-feature (Seed 57765): **`2260/11` = reine Baseline** (0 non-Baseline,
erster Lauf sauber).

**Manueller Serialize-Test (rails runner, dev) — 14/14 PASS:**
- **12 Spalten** (Reaction desc/obs, Wellplate desc, Screen desc, Molecule cas, Report ×7):
  Type-Level `serialize → YAML → deserialize`-Round-Trip mit Symbol-Keys/Date/nested — alle
  **coder=`YAMLColumn`**, YAML-Format, Round-Trip identisch.
- **permitted_classes-Safety AKTIV:** `Set` (nicht permitted) wird bei `deserialize` mit
  `Psych::DisallowedClass` **abgelehnt** → beweist, dass `type:` (statt `coder: YAML`) die
  Safe-Load-Sicherheit erhält.
- **DB-Round-Trip:** `Molecule.cas` per `update!` geschrieben + aus Postgres reloaded → korrekt.

**UI-Klick-Test (Puppeteer, `:3000`) — Screen mit serialisierter `description` erstellt:**
CREATE → „Create Screen" → Name + **Description (Quill)** ausgefüllt → Save → **`POST 201 /api/v1/screens`**.
Aus DB gelesen: `Screen#description` = `ActiveSupport::HashWithIndifferentAccess`, Text
„Phase C serialize round-trip via UI" → **Round-Trip PASS**. Damit die `serialize :description, type: Hash`-
Änderung (C2) über den echten Create/Save/Read-Pfad verifiziert. Nur bekannte React-PropType-Warnings,
keine Fehler. (Nebenbefund: der laufende `:3000`-Prozess war nach ~3h Dev-Reloads in einem
`superclass mismatch for class DeviceDeprecated`-Zustand → Routing-404; **Container-Neustart** behebt
es, frische Boots/Specs waren durchweg grün → Dev-Reload-Artefakt, kein Upgrade-Regress.)

### Phase D — `load_defaults 7.1` ✅ (2026-08-06)

**Ansatz: Flip-and-Verify** (statt jedes Flag einzeln). App ist bereits auf 7.1.6/7.0-Defaults grün
(Baseline 11) → `load_defaults 7.1` setzen, das **eine** Flag überschreiben das wir NICHT wollen,
Full-Suite + manuelle Tests, bei Failure aufs verantwortliche Flag bisecten.

**Änderungen (`config/application.rb`):**
- `config.load_defaults 7.0` → **`7.1`**.
- **Override:** `config.active_record.default_column_serializer = ActiveRecord::Coders::YAMLColumn`
  (7.1-Default ist `nil` → würde unsere 12 `serialize … type:` mit „missing serializer" brechen bzw.
  die `yaml_column_permitted_classes`-Safety verlieren; Wert vor Flip verifiziert = `YAMLColumn`).
- **Gelöscht:** `config/initializers/new_framework_defaults_7_1.rb` (redundant nach `load_defaults 7.1`).

**Boot-Verifikation (dev):**
- `loaded_config_version=7.1`, `default_column_serializer=YAMLColumn` ✓, Reaction-Coder=YAMLColumn ✓.
- `add_autoload_paths_to_load_path=false` (7.1-Default aktiv) → `zeitwerk:check` **grün**; `lib`+`lib/export`
  weiter auf `$LOAD_PATH`, `Export::ExportExcel`/`Reporter::Img::Conv`/labimotion `require 'export_table'`
  laden → **kein LoadError** (C1-Prep + explizite `$LOAD_PATH.unshift` decken es).
- **`sanitizer_vendor=nil`** → bleibt HTML4-Sanitizer. `load_defaults 7.1` **erzwingt** den HTML5-Sanitizer
  **nicht** (separater Opt-in) → **keine Sanitize-Verhaltensänderung** (sicher; Report-Generierung unverändert).

**🔴 Incident D-1 — `Encryptor`-Concern × Gem-Kollision (`device_spec`, 2 Failures):**
Erster Full-Suite-Lauf auf `load_defaults 7.1`: `2260/13` = 11 Baseline + **2× `device_spec`**:
```
NoMethodError: undefined method `encrypt_value' for #<Device …>  (Did you mean? encrypt)
app/models/device.rb:222 encrypt_novnc_password → encrypt_value
```
- **Ursache = Namenskollision:** `app/models/concerns/encryptor.rb` definiert ein **top-level
  `module Encryptor`** (Methoden `encrypt_value`/`decrypt_value` via `ActiveSupport::MessageEncryptor`),
  das mit dem **`encryptor`-Gem** (`::Encryptor` mit `encrypt`/`decrypt`) kollidiert. Nur `Device`
  macht `include Encryptor`.
- **Warum erst 7.1:** `add_autoload_paths_to_load_path` (7.1-Default **false**) nimmt `app/models/concerns`
  vom `$LOAD_PATH`. Bis 7.0 (true) lag es drauf → die App-`Encryptor` wurde geladen/gemerged
  (`::Encryptor` hatte `encrypt_value`). Auf 7.1 gewinnt das Gem → `encrypt_value` undefiniert.
  **Bisect bestätigt:** Flag `true` → `device_spec 3/0`, `false` → `3/2`.
- **Fix (gewählt): `config.add_autoload_paths_to_load_path = true`** in `application.rb` (überschreibt den
  7.1-Default). Ein-Zeiler, kein App-Code-Change; erhält die pre-7.1-Auflösung. **Trade-off:** die
  fragile `Encryptor`/Gem-Kollision bleibt bestehen (Alternative wäre gewesen, die App-Concern in
  `ValueEncryptor` umzubenennen). ⚠️ **Wiedervorlage bei Rails 7.2**, falls das Flag dort entfällt →
  dann Concern umbenennen.
- **Verifiziert:** `device_spec 3/0`, `zeitwerk:check` grün, Boot `defaults=7.1 add_autoload_paths=true`.

**Verifikation D:** Full-Suite non-feature (Seed 57765) nach Fix: **`2260/11` = reine Baseline**
(0 non-Baseline). Alle ~24 7.1-Behavior-Flags aktiv, `load_defaults 7.1`.

**→ Phase D KOMPLETT & verifiziert.** App läuft auf **`load_defaults 7.1`** (2 bewusste Overrides:
`default_column_serializer=YAMLColumn` [C2-Safety], `add_autoload_paths_to_load_path=true` [D-1-Kollision]).

### Phase E — Gesamt-Verifikation ✅ (2026-08-06, `load_defaults 7.1`)

Container frisch neugestartet (`defaults=7.1 rails=7.1.6`, Login `:3000` HTTP 200). Kein Image-Rebuild
nötig (Container hat die gelockten Gems + frischen Code; Restart = sauberer Prozess).

- **Full-Suite (feature + non-feature, Seed 57765): `2303 examples, 54 failures, 48 pending`**
  = **11 environmental Baseline + 43 feature (Browser-Env)**, **0 non-Baseline-Failures**. ≙ exakt der
  7.0-Baseline `2303/54`, diesmal ohne Flake.
- **Manueller Runner (19/19 PASS, `defaults=7.1`):** C2-InChIKey (Ethanol), 2FA provision+verify
  (d2f 4.1.1, 32-Byte-Key), A-2 Comment-Enum-Maps, A-3 Labimotion-Element/hstore-counters (`tu3-PP2`,
  kein nil-Key), A-4 paranoia-Patch geladen, A-5 grape_entity-Patch geladen, **12 serialize-Spalten**
  (coder=YAMLColumn), permitted_classes-Safety (Set rejected).
- **API/JWT-Smoke:** collections/samples/reactions/profiles/ui = 200, 401 ohne Token.
- **Browser (`:3000`):** Login → Click-Through **alle 5 Element-Tabs** (0 errors, 0 failed API);
  Create Sample (Form `tu3-1`, 201, 0 page errors); **Create Screen mit serialisierter `description`**
  → `POST 201 /api/v1/screens`, DB-Round-Trip PASS (Hash, „Phase C serialize round-trip via UI").
- Nur bekannte React-PropType-Warnings, keine echten Fehler.

**→ Phase E KOMPLETT. Das Rails 7.0 → 7.1-Upgrade (Phasen A–E) ist funktional KOMPLETT & verifiziert.**

### Phase F — From-Scratch `db:migrate` (Container komplett von Null) ✅ (2026-08)

**Auslöser:** Full-from-nothing-Teardown (`down -v` → beide Volumes `database`+`homedir` weg → alles neu:
asdf/node/Ruby/bundle + DB). Das validierte den **eigentlichen Upgrade-Kern** (frisches `bundle install`
aus dem 7.1-Lock baut sauber: Ruby 3.1.7 kompiliert, alle Gems inkl. Native-Extensions) — und legte
mehrere **from-scratch-Infra-Probleme** offen. Davon **nur die upgrade-verursachten** gefixt (User-Scope):

- **F-1 = Incident-Klasse A-2 in alten Data-Migrations (7.1-Enum-Striktheit):** frisches `db:migrate`
  bricht bei `20190307113259_curate_attachment_content_type` → lädt das `Attachment`-Model, dessen
  `enum edit_state` **zu diesem Migrations-Zeitpunkt keine Spalte** hat → 7.1 raised „Undeclared attribute
  type for enum". **Fix (Model-Ebene, wie A-2): `app/models/attachment.rb` → `attribute :edit_state,
  :integer, default: 0`** vor dem Enum (matcht die Integer-Spalte, default 0 = `not_editing` = AASM-Initial
  → Laufzeitverhalten unverändert). Wirkt für **alle** Attachment-referenzierenden Migrations (~10 Stück)
  auf einmal, für Fresh-Install **und** Bestandsinstanz. **Kein** schema:load-Workaround.
- **F-2 = Folge der 7.0-Zeitwerk-Migration:** `20250805095133_update_safety_sheet_paths` ruft
  `SafetySheetsReorganizer.reorganize!` — die Datei `lib/chemotion/safety_sheets_reorganizer.rb`
  (top-level-Konstante an namespaced Pfad) ist **Zeitwerk-ignoriert** (7.0-Setup), also nicht mehr
  autoloadbar (unter classic-Autoloader ging es). **Fix: expliziter `require` der ignorierten Datei in
  der Migration** (Standard-Weg für ignored files).
- **Verifiziert:** frisches `RAILS_ENV=test db:drop db:create db:migrate` läuft **431/431 grün, 0 pending**;
  `attachment_spec 94/0`; Full-Suite non-feature **`2260/11` (reine Baseline)** gegen die migrations-gebaute
  Test-DB. App bootet from-scratch auf `rails=7.1.6 defaults=7.1`, Login/SPA grün.

**Bewusst NICHT gefixt (pre-existing, NICHT upgrade-verursacht — außerhalb Scope):**
- `prepare-asdf.sh` — asdf-`tar`-Install scheitert an `Invalid cross-device link` auf frischem Volume
  (Workaround: asdf-Binary lag bereits im Volume; sauberer Fix wäre temp-extract-then-`cp`).
- `db:schema:load` frisch — schema.rb hat **stale fx-Functions** (`collection_shared_names` u. a.) die
  `sync_collections_users` referenzieren (Tabelle von `20250827…remove_old_collection_tables_structure`
  gedroppt) → schema:load nur mit `check_function_bodies=off` ladbar. Schema.rb-Integritäts-Bug.
- `storybook`-Container — `yarn` nicht im PATH (Dev-Tool, App unberührt).

**Geänderte Dateien Phase F:** `app/models/attachment.rb`,
`db/migrate/20250805095133_update_safety_sheet_paths.rb`.

---

## Offene Punkte / Deploy-TODOs (Stand nach Phase E)

1. **Cookie-Rotator** (§6.10 im 7.0-Doc) vor Prod-Rollout — `cookies_serializer :json` + SHA256 seit 7.0.
2. **Cache-Format 7.1** aktiv (`load_defaults 7.1`) → **Prod-Cache beim Deploy invalidieren** einplanen.
3. **`add_autoload_paths_to_load_path=true`** (Override) — die `Encryptor`-Concern/Gem-Kollision bleibt
   latent; bei **Rails 7.2** neu bewerten (Concern → `ValueEncryptor` umbenennen, falls Flag entfällt).
4. **`default_column_serializer=YAMLColumn`** (Override) — bewusst, für `serialize`-Safety; bei künftigem
   Wunsch nach `nil`-Default je Spalte `coder:` ergänzen.
5. **`OTP_SECRET_KEY` ≥ 32 Byte** in dev/prod setzen für echten 2FA-Betrieb (aktuell 6 Zeichen → nur test/dev-Limit).
6. Danach separat: **Ruby 3.2 → Rails 7.2**.

**→ Phase C KOMPLETT & verifiziert.** Nächstes: Phase D (`load_defaults 7.1`-Flags einzeln durchschalten).
