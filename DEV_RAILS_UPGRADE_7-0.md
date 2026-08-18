# DEV_RAILS_UPGRADE_7-0.md

Schritt-für-Schritt-Plan für **Rails 6.1.7.10 → 7.0** im Chemotion ELN.

**Status: PHASE 0–2 KOMPLETT ✅ — läuft voll auf RAILS 7.0.10 / Ruby 3.1.7 mit
`load_defaults 7.0`** (Working-Tree, noch nicht committet). **Phase 0** (0a Zeitwerk ·
0b `load_defaults 6.1` · 0c secrets · 0d 0 Deprecations) → **Phase 1** (Gem-Bump
**Rails 7.0.10**, Sprockets 4, `config.autoloader` raus, Usecases-Hook, devise+versioning-Fixes)
→ **Phase 2** (`load_defaults 7.0`, `raise_on_open_redirects`-Fix in radar_controller).
**Suite durchgehend `2260/11` (Basis)** auf 7.0/7.0-Defaults, Boot + `zeitwerk:check` grün,
manuelle Tests (Login/Session, Click-Through, Write-Pfad, InChIKey) grün auf `:3000`.
Behobene Regressionen: mol_structure/$LOAD_PATH (0a), export_collections/has_many_inversing (0b),
devise-Matrice-autoload + version_api-Hstore (P1), radar-open-redirects (P2).
**Phase 3** (Breaking-Changes-Sweep) ✅ + **Phase 4** (Gem-Kompat, 0 Code-Änderungen) ✅.
**→ Das 6.1→7.0-Upgrade (Phasen 0–4) ist funktional KOMPLETT & verifiziert.**
⚠️ **Deploy-TODO:** Cookie-Rotator (§6.10) vor Prod-Rollout. **Danach separat: Rails 7.1.**
Details je Phase unten.

> **Reihenfolge-Kontext:** Ruby 3.0 ✓ → Ruby 3.1.7 ✓ → **DIESER Schritt (Rails 7.0)**
> → 7.1 → Ruby 3.2 → Rails 7.2. **Rails 7.0 verlangt Ruby 2.7.1–3.1.x → 3.1.7 passt**
> (nicht auf 3.2 gehen). Verifikation je Schritt über `DEV_UPGRADE_TEST_RUNBOOK.md`
> (Baseline: `2260 examples, 11 failures`, Seed 57765).

> **Grundprinzip (wie bei den Ruby-Steps):** erst **alle Vorarbeiten auf 6.1**
> (Phase 0, jede einzeln grün), dann der **eine** Versions-Bump (Phase 1), dann die
> **Framework-Defaults einzeln** durchschalten (Phase 2). Nie mehrere Baustellen
> gleichzeitig. Alles im Container auf **3.1.7** (`export PATH=$HOME/.asdf/installs/ruby/3.1.7/bin:$PATH`).

---

## Phase 0 — Vorarbeiten auf Rails 6.1 (VOR dem 7.0-Bump)

Alles hier läuft **noch auf Rails 6.1** und ist einzeln verifizierbar. Das
entschärft den eigentlichen Bump massiv.

### 0a — 🎯 Zeitwerk-Migration (classic → zeitwerk) — DER dicke Brocken

**Warum jetzt:** `config/application.rb:18` setzt `config.autoloader = :classic`.
**Rails 7.0 entfernt den Classic-Modus komplett** — Zeitwerk ist Pflicht. Rails 6.1
unterstützt **beide** → deshalb **zuerst auf 6.1 migrieren**, solange Rollback geht.

**Ablauf:**
1. `config.autoloader = :zeitwerk` setzen (in `application.rb`).
2. `bin/rails zeitwerk:check` laufen lassen:
   ```bash
   docker exec chemotion_eln-app-1 bash -lc 'export PATH=$HOME/.asdf/installs/ruby/3.1.7/bin:$PATH && cd /home/ubuntu/app && RAILS_ENV=development bundle _2.4.22_ exec rails zeitwerk:check'
   ```
3. Jede gemeldete Inkonsistenz beheben. **Vorab-Sizing (Probe 2026-07): ~148
   Meldungen → ~5 systematische Ursachen** (überwiegend mechanisch):

   | Ursache | Ist-Zustand | Fix | ~Dateien |
   |---|---|---|---|
   | Akronym **`API`** | `class API`, `Chemotion::CollectionAPI` | `inflect.acronym 'API'` in `config/initializers/inflections.rb` | ~68 |
   | Namespace **`Usecases::`** | `app/usecases/*` definieren `module Usecases; …`, aber `app/usecases` ist Autoload-Root | `app/usecases` als **namespaced root** (`push_dir(..., namespace: Usecases)`) **oder** `Usecases`-Wrapper entfernen | ~50 |
   | Namespace **`Helpers::`/`Modules::`** | `app/api/helpers/*` → top-level `AttachmentHelpers` | `collapse('app/api/helpers')` **oder** in Module wrappen | ~15 |
   | Akronym **`SFTP`** | `SFTPClient` | `inflect.acronym 'SFTP'` | 2 |
   | Akronym **`UI`** | `ElementUIStateScopes` | `inflect.acronym 'UI'` | ~2 |

   → real: **3 Akronym-Inflections + 2 Struktur-Entscheidungen** + kurzer Rest an
   Einzelfällen. Die **~148 waren eine Approximation** (nicht-invasives Probe-Skript).

   **✅ `zeitwerk:check` TATSÄCHLICH gefahren (2026-08, Ruby 3.1.7) — Befund:**
   Der Check bricht **iterativ am ersten Fehler ab** (er lädt die Environment; jeder
   Fix legt den nächsten frei). Verbindliche Erkenntnis aus dem echten Lauf:
   1. **Akronyme (mechanisch, sofort):** ohne Inflection bricht er zuerst an
      `config/routes.rb:77` (`mount API` → `NameError: uninitialized constant API`,
      „Did you mean? Api"). Nach `inflect.acronym 'API'/'SFTP'/'UI'` kommt er durch die
      Routes bis in `app/api/api.rb`.
   2. **🔴 DER eigentliche Blocker = die custom Autoload-Paths (`application.rb:30–36`)**,
      **nicht** einzelne Konstanten:
      ```ruby
      config.autoload_paths += Dir[Rails.root.join('app', 'api', '*')]  # app/api/chemotion,/helpers,… als EIGENE Roots
      config.autoload_paths += Dir["#{config.root}/lib/**/"]            # jedes lib-Unterverz. als Root
      config.autoload_paths += Dir[Rails.root.join('app')]             # app SELBST als Root
      config.autoload_paths += Dir[Rails.root.join('lib')]
      ```
      → **überlappende/verschachtelte Roots** (`app` **und** `app/api/chemotion`), was
      Zeitwerk (ein Root pro Namespace) nicht erlaubt. Deshalb scheitert
      `Chemotion::LiteratureAPI` (`api.rb:167`): unter dem Root `app/api/chemotion`
      würde `literature_api.rb` → `LiteratureAPI` (ohne `Chemotion::`) erwartet, die
      Datei definiert aber `Chemotion::LiteratureAPI`.
   3. **Fix-Richtung (Struktur-Entscheidung, App-weit):** die custom Roots durch die
      **Standard-`app/*`-Roots** ersetzen —
      - `app/api` als **einen** Root (Rails fügt `app/*` ohnehin auto hinzu) → dann
        `app/api/chemotion/collection_api.rb` → `Chemotion::CollectionAPI` ✓.
      - `Dir[Rails.root.join('app')]` (Root `app`) **entfernen** (bricht die
        Standard-Zuordnung).
      - `lib/**/`-Roots durch **einen** `lib`-Root ersetzen (+ ggf. Inflections/
        `Usecases`-Namespace) — Konstanten-Auflösung danach neu prüfen.
      Danach `zeitwerk:check` erneut → nächste Batch (erwartet `Usecases::`/`Helpers::`).
   **Fazit:** Akronyme = trivial; **die Autoload-Path-Umstrukturierung ist die
   eigentliche Arbeit** und eine bewusste Design-Entscheidung (App-weit) — NICHT blind
   hacken. Nächster Schritt braucht Freigabe für den Umbau von `application.rb:30–36`.

   #### 0a — Lauf-Protokoll & Nebenbefunde (2026-08)
   - **So gefahren:** `config.autoloader = :classic` **temporär** auf `:zeitwerk`
     gesetzt (der Check läuft nur im Zeitwerk-Modus), dann
     `RAILS_ENV=development bundle exec rails zeitwerk:check`. **Beide Provisorien
     (Autoloader-Flip + Test-Akronyme in `inflections.rb`) wieder revertet** →
     Working-Tree sauber, committet-Stand unverändert. Der Check-Fehler landet beim
     **Environment-Load** (`environment.rb:6` → `routes.rb`), nicht als sauberer Report.
   - **Problem — kein Full-List in einem Lauf:** `zeitwerk:check` bricht am **ersten**
     `NameError` ab. Man muss **fix → re-run → fix** iterieren; die vollständige Liste
     entsteht erst schrittweise. (Der ~148-Probe-Wert von früher war eine
     Approximation ohne Boot; der echte Check boottet und stoppt eher.)
   - **`config.paths.add File.join('app', 'api'), glob: '**/*.rb'`** (`application.rb:30`)
     gehört mit zum custom `app/api`-Setup → beim Umbau (0a-Schritt 3) mit betrachten,
     nicht nur die `autoload_paths`-Zeilen 31–36.
   - **🟡 Nebenbefund (nicht Teil von 0a): Tippfehler-Konstante** `DataCite::LiteraturePaser`
     (statt `…Parser`) — genutzt in `lib/reporter/docx/detail_sample.rb:56–57`. Tauchte
     als `did_you_mean`-Vorschlag auf. Vermutlich **konsistent** falsch geschrieben
     (Definition + Nutzung) → funktioniert, ist aber ein Code-Smell. **Separat**
     aufräumen, blockt das Upgrade nicht.
4. **Verifikation:** `zeitwerk:check` **fehlerfrei** + Boot + Suite-Baseline (die 11).
   **Zusätzlich `eager_load` testen** (Zeitwerk prüft Namen erst beim Eager-Load /
   in Produktion, nicht im Dev-Lazy-Modus):
   ```bash
   docker exec chemotion_eln-app-1 bash -lc 'export PATH=$HOME/.asdf/installs/ruby/3.1.7/bin:$PATH && cd /home/ubuntu/app && RAILS_ENV=production bundle _2.4.22_ exec rails runner "Rails.application.eager_load!; puts :eager_ok"'
   ```
   **Erst wenn Zeitwerk auf 6.1 grün ist**, überhaupt an 7.0 denken.

   #### 0a — ✅ DURCHGEFÜHRT (2026-08, Ruby 3.1.7) — vollständige Änderungsliste

   `zeitwerk:check` läuft **grün** (App-Tree „all is good!"), Boot grün
   (`zeitwerk_enabled=true`). Zusätzlich wurde `lib` **temporär** eager-geladen und
   der Check **komplett über `lib` grün gefahren** („All is good!") — d. h. alle
   lib-Konstanten lösen korrekt auf; danach `lib` wieder auf **autoload-only**
   (Ausgangsverhalten) zurückgesetzt.

   **A. `config/application.rb`:**
   - `config.autoloader = :classic` → `:zeitwerk`.
   - Custom Autoload-Block (`app/api/*`, `app`, `lib/**/`, `config.paths.add 'app/api'`)
     **entfernt** → **ein** `app/api`-Root (Rails' `app/*`-Automatik) + **ein**
     `lib`-Root.
   - **Akronyme `API`/`SFTP`** von `config/initializers/inflections.rb` in die
     **Application-Body** verschoben (Guide §6.7).
   - `collapse('app/api/helpers', 'app/api/modules')` — deren Dateien definieren
     top-level Konstanten (`AttachmentHelpers`, `LogidzeModule`), bare genutzt.
   - **Per-Basename Zeitwerk-Inflections** (`Rails.autoloaders.main.inflector.inflect`):
     `element_ui_state_scopes→ElementUIStateScopes`, `cell_line_api_params_helpers→CellLineApiParamsHelpers`,
     `by_ui_state→ByUIState`, `collect_data_from_sftp_job→CollectDataFromSftpJob`,
     `collect_file_from_sftp_job→CollectFileFromSftpJob`, `svg→SVG`,
     `svg_processor→SVGProcessor`, `dc_logger→DCLogger`. (Grund: gemischte Akronym-
     Schreibweisen im Code — `UiAPI` vs `ElementUIStateScopes`, `SFTPClient` vs
     `CollectDataFromSftpJob`, `SVG::Processor` vs `SvgSanitizer`. **Namen bleiben
     unverändert**, nur die Zuordnung wird gemappt.)
   - **`Usecases::` als namespaced Root**: Initializer `before: :let_zeitwerk_take_over`
     entfernt `app/usecases` aus den Plain-Autoload-Paths und `push_dir(..., namespace: Usecases)`.
     Erhält alle `Usecases::*`-Namen (64 Dateien, ~119 Call-Sites). Rails 7.1+ kann
     das nativ → dann vereinfachen.
   - `$LOAD_PATH.unshift(lib/export, lib/tasks)` — die alte `lib/**/`-Glob hatte
     jede lib-Subdir im $LOAD_PATH; einige bare `require`/`rake_require` brauchen das
     noch: **lib/export** (labimotion-Gem `require 'export_table'`), **lib/tasks**
     (`Rake.application.rake_require('data/mol_structure')` löst relativ zu lib/tasks
     via $LOAD_PATH — siehe Regression in der Verifikation).
   - **`ignore`** (dead/legacy/nicht-autoloadbar): `lib/storage` (tote Klassen,
     `RemoteSFTP < storage` würde crashen), `lib/chemotion/chemotion.rb` (toter
     Monkey-Patch, 0 Caller seit 2018), `lib/chemotion/safety_sheets_reorganizer.rb`
     (manuelles Skript), `lib/tasks`, `lib/generators`, `lib/omniauth` (ORCID-Strategy
     wird in `devise.rb` explizit `require`d, erweitert das OmniAuth-Gem-Namespace).

   **B. `config/initializers/inflections.rb`:** Akronym-Block entfernt (→ Body, §6.7).

   **C. `app/usecases/` (3 konventionswidrige Dateien angepasst — Namen erhalten):**
   - `reactions/update_materials.rb`: top-level `OSample`/`OSbmmSample` → eigene
     Dateien `reactions/update_materials/o_sample.rb` + `o_sbmm_sample.rb` als
     `Usecases::Reactions::UpdateMaterials::OSample/OSbmmSample` (nested, Zeitwerk-idiomatic).
   - `search/shared_methods.rb`: `class SharedMethods` → `class Usecases::Search::SharedMethods` (compact, Body unverändert).
   - `attachments/annotation/mini_magick_image_analyser.rb`: analog compact-namespaced.

   **D. `lib/` (Live-Breakages behoben — alle vor dem Fix `LoadError`, verifiziert):**
   - `lib/export/export_excel.rb` + `lib/export/export_sdf.rb`: bare `require 'export_table'`
     **entfernt** — `Export::ExportExcel`/`ExportSdf` erben von `Export::ExportTable`
     (Zeitwerk autoloadt die Superklasse aus dem lib-Root). Der bare Require hing an
     der alten `lib/**/`-$LOAD_PATH-Glob. (Das labimotion-Gem braucht `export_table`
     weiter im $LOAD_PATH → s. A: `$LOAD_PATH.unshift(lib/export)`.)
   - `lib/cdx/creator.rb`: bare `require "helper"` entfernt (Zeitwerk autoloadt
     `Cdx::Helper` via `include`). End-to-end getestet (`Cdx::Creator.new` läuft).
   - **`lib/chemotion/meta_schmooze/meta_schmooze.rb` → `lib/chemotion/meta_schmooze.rb`**
     (verschoben, damit Pfad→`Chemotion::MetaSchmooze` passt; die Subdir-Variante
     kollidierte Namespace-Modul vs. Klasse). `require 'meta_schmooze'` aus
     `quill_to_html.rb`/`quill_to_plain_text.rb` entfernt (Autoload via Superklasse).
     `meta_schmooze` ist **kein Gem**, sondern lokaler Wrapper um das `schmooze`-Gem.
   - `lib/chemotion/oneline_log_formatter.rb`: orphan top-level `OnelineLogFormatter`
     → `module Chemotion` gewrappt; **Referenz in `config/environments/production.rb`**
     auf `Chemotion::OnelineLogFormatter` angepasst (war live = Prod-Log-Formatter!).
   - `lib/import/import.rb` (leeres `module Import; end`) **gelöscht** — redundant,
     Zeitwerk liefert den Namespace implizit.

   **E. Naming-Entscheidungen (Namen NICHT umbenannt, auf User-Wunsch):**
   - `Chemotion::UiAPI` bleibt `UiAPI` (kein globales `UI`-Akronym) — passt zur
     Konvention Wort+`API` (wie `CollectionAPI`).
   - `API`/`SFTP`/`SVG` bleiben als (Quasi-)Akronyme; die abweichenden Einzelfälle
     via Per-Basename-Inflection statt Umbenennung.

   **Verifikation (0a) — Stand 2026-08:**
   | Check | Kommando (Container, Ruby 3.1.7) | Ergebnis |
   |---|---|---|
   | `zeitwerk:check` (App-Tree) | `rails zeitwerk:check` | ✅ „Otherwise, all is good!" (lib-Warnung erwartet, da autoload-only) |
   | `zeitwerk:check` **inkl. lib** (temporär eager) | `lib` in `eager_load_paths` + `rails zeitwerk:check` | ✅ „All is good!" — alle lib-Konstanten lösen auf; danach revertet |
   | Boot (dev) | `rails runner "puts Rails.version, Rails.autoloaders.zeitwerk_enabled?"` | ✅ `6.1.7.10 / 3.1.7 / zeitwerk=true` |
   | `Cdx::Creator` (Live-Fix) | `rails runner` → `.name` + `.new({cdxml: nil})` | ✅ lädt **und** instanziiert (exerciert `CdxStatic.init`) |
   | `Chemotion::QuillToHtml`/`QuillToPlainText` (meta_schmooze-Fix) | `rails runner` → `.name` + `.superclass` | ✅ laden, `superclass = Chemotion::MetaSchmooze` |
   | Full-Suite (inkl. features) | `RAILS_ENV=test rspec --seed 57765` | `2303 examples, 56 failures`. Davon **43 = Browser-Env** (`Webdrivers::BrowserNotFound` — alle `spec/features/*`, In-Container-Chrome fehlt, wie dokumentiert; **keine** Zeitwerk-`NameError`). |
   | **Non-Feature-Baseline** (Vergleich zur 11er-Basis) | `rspec --exclude-pattern "spec/features/**/*" --seed 57765` | ✅ **`2260 examples, 11 failures, 48 pending` — IDENTISCH zur Basis.** Die 11 = 3 rdkit + 1 admin_device sftp + 7 datacollector sftp (alle Env, keine Regression). |
   | Full-Eager-Load | `RAILS_ENV=development rails runner "Rails.application.eager_load!; puts :EAGER_OK"` | ✅ `EAGER_OK` — erzwungenes Eager-Load aller `eager_load_paths` grün (DB erreichbar → alle Initializer laufen). |
   | Prod-Bare-Runner (Randnotiz) | `RAILS_ENV=production rails runner …` | ⚠️ Bricht in `config/initializers/computed_props.rb:11` (`nil['server']`) — **pre-existing** (Datei unverändert, git): der `rescue` fängt nicht alle DB-unreachable-Fehler; ohne Prod-DB bleibt `compute_config` nil. **Kein Zeitwerk-Bezug.** Eager-Load-Korrektheit ist via `zeitwerk:check`+lib und `eager_load!` (oben) bewiesen. |

   **🔴 Regression gefunden & behoben (durch die Suite):** `spec/lib/tasks/data/mol_structure_spec.rb`
   (2 Beispiele) brach mit `LoadError: Can't find data/mol_structure` —
   `Rake.application.rake_require('data/mol_structure')` sucht die `.rake` relativ zu
   **lib/tasks im $LOAD_PATH**, das die alte `lib/**/`-Glob lieferte. **Fix:** `lib/tasks`
   (und `lib/export`) explizit in `$LOAD_PATH` (s. Änderungsliste A). Danach Spec grün
   (`2 examples, 0 failures`). *Der `ignore(lib/tasks)` war NICHT die Ursache — der
   betrifft nur Zeitwerk-Autoloading, nicht $LOAD_PATH.*

   **Nebenbefunde / TODO (blocken 0a nicht):** `DataCite::LiteraturePaser`-Tippfehler
   (s. o.); die 3 `ignore`-ten dead-Files (`lib/storage`, `chemotion.rb`,
   `safety_sheets_reorganizer.rb`) sind **Löschkandidaten**.

### 0b — Framework-Defaults 6.0 → 6.1 — ✅ DURCHGEFÜHRT & grün (2026-08)

`config.load_defaults` stand auf **`6.0`**, obwohl der 6.1-Gem läuft — ein
6.0/6.1-Mischzustand. **`load_defaults` ist unabhängig von der Gem-Version**: es
wählt nur, welche Framework-**Default-Settings** die App übernimmt. 0b schließt die
Lücke auf dem 6.1-Gem, damit der spätere 7.0-Sprung auf sauberer 6.1-Basis startet.

**Änderung:** `config/application.rb:17` `config.load_defaults 6.0` → **`6.1`**.
(`config.autoloader = :zeitwerk` bleibt explizit — wird von `load_defaults 6.1`
ohnehin gesetzt; **beim 7.0-Bump entfernen**, Setter ist in 7.0 gelöscht, Guide §6.5.)

**Was `load_defaults 6.1` real flippt** (Quelle: railties 6.1.7.10; ruft intern erst
`load_defaults "6.0"`, dann die 6.1-Deltas — additiv). Projekt-Relevanz gegroundet:

| Flag (neu ab 6.1) | Relevanz Chemotion |
|---|---|
| `active_record.has_many_inversing = true` | **wichtigster Punkt** — assoziationslastige App; In-Memory-Inverse bei unsaved nested records → Suite deckt das ab (`has_many_inversing=true` verifiziert) |
| `action_dispatch.cookies_same_site_protection = :lax` | Session/CSRF-Cookies `SameSite=Lax`; ORCID-OAuth ist Top-Level-GET → ok (`same_site=lax` verifiziert) |
| `action_view.form_with_generates_remote_forms = false` | nur **1** View betroffen (`users/two_factor_auth/request_enable.haml`) |
| `action_view.preload_links_header = true` | `Link:`-Preload-Header via Sprockets-Asset-Tags |
| `active_job.skip_after_callbacks_if_terminated = true` | nur bei haltenden Job-Callbacks relevant |
| `action_mailer.deliver_later_queue_name = nil` | nur **1** `deliver_later` (`sequence_based_macromolecule_api.rb`) |
| `ActiveSupport.utc_to_local_returns_utc_offset_times = true` | subtile Zeit-Konvertierung; i. d. R. transparent |
| `active_record.legacy_connection_handling = false` | **Single-DB → transparent**; ohnehin Voraussetzung für 7.0 |
| `action_controller.urlsafe_csrf_tokens = true` | alte Tokens weiterhin akzeptiert → transparent |
| `ssl_default_redirect_status = 308` | `force_ssl` auskommentiert → **N/A** |

**N/A für dieses Projekt:** alle **ActiveStorage**-Flags (App nutzt **shrine**),
alle **ActionMailbox**-Flags (nicht genutzt).

**Verifikation (0b):**
| Check | Ergebnis |
|---|---|
| Boot (dev) | ✅ `loaded_config_version=6.1`, `has_many_inversing=true`, `same_site=lax`, `form_with_remote=false` |
| Non-Feature-Suite (1. Lauf) | `2260 examples, **12 failures**` — die 11 Basis + **1 neue** (`export_collections_spec` Cell-Line/jpg). |
| Non-Feature-Suite (nach Fix, Seed 57765) | ✅ **`2260 examples, 11 failures, 48 pending`** — zurück auf Basis; die 11 = unveränderte Env-Failures (3 rdkit + 1 admin_device + 7 datacollector sftp), `export_collections_spec` grün. |

**🔴 Regression gefunden & behoben — `has_many_inversing`-induziert (Test-Fragilität, kein Prod-Bug):**
`spec/lib/export/export_collections_spec.rb:184` (`expected_attachment_name`) navigierte
`cell_line_sample.container.children[0].children[0].children[0].attachments[0]` und bekam
`NoMethodError: undefined method 'identifier' for nil`. Ursache **bestätigt per Experiment**
(mit `has_many_inversing=false` grün): Unter dem 6.1-Default liefert die Navigation
**gecachte In-Memory-Assoziationen**; die Factory `:with_jpg_in_dataset` legt das Attachment
aber **out-of-band** an (`create(:attachment, attachable_id: dataset.id, …)`, nicht via
`dataset.attachments <<`) → im Cache unsichtbar. **Der Export selbst ist korrekt** (lädt frisch
aus der DB). **Fix im Test** (nicht im Default!): Container frisch via `Container.find(id)` holen,
dann navigieren → persistierte Daten. Danach `28 examples, 0 failures`. *Der 6.1-Default
`has_many_inversing=true` bleibt aktiv — genau den wollen wir.*

**Neue Deprecations (6.1) — für 0d vorgemerkt (blocken 0b nicht):**
- `Rendering actions with '.' in the name is deprecated: export/research_plan.haml` (aus
  `lib/export/export_research_plan.rb:77`) — Template mit Punkt im Namen; in 0d beheben.
- *(RSpec, nicht Rails: „implicit block expectation syntax is deprecated" — Test-Style, separat.)*

**Manuelle End-to-End-Tests (Runbook §6, validieren 0a+0b zusammen; Ruby 3.1.7):**
| Check | Ergebnis |
|---|---|
| Dev-Server-Boot (Zeitwerk, lazy autoload) | ✅ `Listening on 0.0.0.0:3001`, **keine** Boot-Fehler |
| Devise-Sign-in-Seite | ✅ `HTTP 200` |
| JWT-API über HTTP (Grape/Zeitwerk) | ✅ `collections/samples/reactions/profiles → 200`, **`ui/initialize → 200` (bestätigt 0a-Entscheidung `Chemotion::UiAPI`)**, **`401` ohne Token** (Auth-Kette intakt) |
| Write-Pfad + Chemie (§C2) | ✅ `WROTE label=tu3-1 inchikey=LFQSCWFLJHTTHZ-UHFFFAOYSA-N` (Ethanol) — exakt Baseline |
| Browser-SPA-**Render** (Login-Form) | ✅ **rendert auf `:3000`** (Haupt-App): `login`/`password`/`remember_me` + „Log in", **0 Page-Errors, 0 Failed-Requests**; nach dem `app`-Neustart läuft der Live-Server auf `zeitwerk=true` + `load_defaults=6.1`. |
| Aufräumen | ✅ write-test-Sample + Throwaway-User gelöscht, `:3001`-Test-Server + socat gestoppt |

**🟠 Zwischenfall & Fix — blanke Login-Seite (Frontend-Infra, KEINE Ruby/Rails-Regression):**
Während des Browser-Tests wurde `bin/shakapacker` (Compile) ausgeführt → schrieb statische
Packs + `public/packs/manifest.json` auf Platte, der auf einen **118 MB Vendor-Chunk**
(`citation-js`+`chem-spectra`) zeigt. Die `app` liest den **Disk-Manifest**; der
**Rails-Static-Server (`Rack::Sendfile`) liefert Dateien > ~21 MB als `404`** → React
`#LoginOptions` bleibt leer → **blanke Login-Seite**.
**Eigentliches Dev-Setup:** Der **`webpacker`-Container** (`:3035`, `bin/shakapacker-dev-server`)
liefert die Packs; die `app` erkennt ihn (`dev_server.running?=true`, Host via
`SHAKAPACKER_DEV_SERVER_HOST=webpacker`) und **proxied `/packs/*` an `:3035`** — der Proxy
liefert auch den 120 MB-Chunk problemlos (200).
**Fix (angewandt):** `public/packs/{js,css,manifest.json}` gelöscht → `docker restart chemotion_eln-webpacker-1`
(regeneriert korrekten Disk-Manifest) → `app`-Neustart (dabei `rm tmp/pids/server.pid`, sonst
„A server is already running / Exiting"). Danach Login grün.
**Lehre / Regel:** Im Dev-Setup **NIEMALS `bin/shakapacker` (Compile) laufen lassen** — Packs
kommen aus dem `webpacker`-Dev-Server. Details in `DEV_UPGRADE_TEST_RUNBOOK.md §6`.

### 0c — `Rails.application.secrets` ablösen (6 Stellen) — ✅ DURCHGEFÜHRT (2026-08)

`Rails.application.secrets` ist in **7.1 deprecated, 7.2 entfernt** — jetzt auf 6.1
gefahrlos vorgezogen. **6 Fundstellen, alle ersetzt:**
| Datei:Zeile | vorher → nachher |
|---|---|
| `app/models/json_web_token.rb:10` | `secrets.secret_key_base` → `Rails.application.secret_key_base` (JWT-Decode) |
| `app/models/concerns/encryptor.rb:19` | `secrets.secret_key_base[0..31]` → `Rails.application.secret_key_base[0..31]` |
| `app/api/chemotion/gate_api.rb:27/125/224` | `secrets.secret_key_base` → `Rails.application.secret_key_base` (3×) |
| `app/api/chemotion/editor_api.rb:87` | `secrets.only_office_secret_key_base` → `Rails.configuration.only_office_secret_key_base` |
| `config/application.rb` (neu) | `config.only_office_secret_key_base = ENV['ONLY_OFFICE_SECRET_KEY_BASE']` |

**Warum sicher:** `Rails.application.secrets.secret_key_base == Rails.application.secret_key_base`
ist **verifiziert `true`** (beide lesen `config/secrets.yml`) → wertidentischer Swap, JWT-Token
+ Encryptor-Keys unverändert. `JsonWebToken.encode` nutzte `secret_key_base` **schon vorher**
(nur `decode` war auf `.secrets` — jetzt konsistent).

**`only_office_secret_key_base`:** kein `Rails.application.`-Äquivalent. Production las den Wert
ohnehin aus `ENV['ONLY_OFFICE_SECRET_KEY_BASE']` (via secrets.yml) → jetzt als
`config.only_office_secret_key_base` aus ENV (Muster wie `config.otp_secret_encryption_key`).
Der OnlyOffice-Pfad (`editor_api`) ist **nicht getestet** und optional (braucht externen
Docserver). ⚠️ **Verhaltensänderung dev/test:** Der bisher in `secrets.yml` hartkodierte Wert
muss lokal als ENV gesetzt werden, falls OnlyOffice genutzt wird. `config/secrets.yml`
(nur noch `secret_key_base`-Quelle via `Rails.application.secret_key_base`) unverändert gelassen.

**Verifikation (0c):**
| Check | Ergebnis |
|---|---|
| Restliche `.secrets`-Nutzung | ✅ **0** (nur noch ein Kommentar) |
| JWT encode→decode Round-Trip | ✅ `user_id=42 ok=true` |
| `Rails.configuration.only_office_secret_key_base` | ✅ resolves (dev `nil` — ENV nicht gesetzt, erwartet) |
| Auth-Specs (`gate_api_spec`, `json_web_token_spec`) | ✅ `12 examples, 0 failures` |
| Non-Feature-Suite (Seed 57765) | ✅ **`2260 examples, 11 failures, 48 pending`** — identisch zur Basis, keine neuen Failures (Encryptor-Key wertidentisch → bestehende verschlüsselte Daten weiter entschlüsselbar). |

### 0d — Deprecation-Baseline auf NULL — ✅ DURCHGEFÜHRT (2026-08)

Deprecations aus echten Läufen inventarisiert (0c-Suite-Log + Dev-Boot-Log). **Zwei
Rails-Deprecations gefunden, beide behoben:**

**1. 🔴 „Autoloading during initialization" (Guide §6.7 — in Rails 7 harter Fehler):**
Vier Initializer referenzierten App-Konstanten im `ActiveSupport.on_load(:active_record)`-Block
→ Autoload **während** der Initialisierung (Deprecation listete `ApplicationRecord,
SequenceUtilities, Matrice, ApplicationJob` + alle Cron-Jobs). **Fix: verlagert nach
`Rails.application.config.after_initialize`** (läuft NACH dem Setup der Autoloader → keine
Deprecation; einmal pro Boot):
| Datei | Konstanten | Warum after_initialize (nicht `to_prepare`) |
|---|---|---|
| `config/initializers/delayed_job_config.rb` | alle Cron-Jobs, `ApplicationJob`, `InitCronJobsJob` | `to_prepare` liefe bei jedem Reload → Jobs mehrfach geplant; `after_initialize` = einmalig (genau die vom Autor gewünschte Idempotenz) |
| `config/initializers/computed_props.rb` | `Matrice` (→ setzt `config.compute_config`) | Config nur zur Request-Zeit gelesen (app/api/*) → einmal-nach-Boot äquivalent |
| `config/initializers/inference.rb` | `Matrice` (→ `config.inference`) | dito |
| `config/initializers/eln_features.rb` (Block 2) | `Matrice`, `Labimotion::ElementKlass` (JSON-Cache) | nur JSON-Regenerierung, einmal/Boot |
(`SequenceUtilities`/`ApplicationRecord` kamen transitiv über `Matrice`/die Jobs.
`eln_features` Block 1 (pg_cartridge) lädt **keine** App-Konstante → unverändert.)
**Verifiziert:** Boot ohne „autoloaded the constants"-Deprecation; `compute_config`,
`inference`, `pg_cartridge` weiterhin gesetzt.

**2. „Rendering actions with '.' in the name":** `lib/export/export_research_plan.rb:78`
`ApplicationController.render(template: 'export/research_plan.haml')` → Handler-Suffix im
Namen ist deprecated. **Fix:** `template: 'export/research_plan'` (Rails leitet den Handler ab).
**Verifiziert:** Template rendert (`RENDER_OK`), keine Deprecation.

**Verifikation (0d):**
| Check | Ergebnis |
|---|---|
| Boot-Deprecations | ✅ **0** (kein „autoloaded during initialization" mehr) |
| research_plan-Template | ✅ rendert ohne Deprecation |
| Non-Feature-Suite (Seed 57765) | ✅ **`2260 examples, 11 failures, 48 pending`** — identisch zur Basis; **0 Ziel-Deprecations im Log** (weder „Rendering actions with '.'" noch „Autoloading during init"). |

**Exit Phase 0:** Zeitwerk grün (inkl. eager_load), `load_defaults 6.1`, secrets
abgelöst, **0 Deprecations** — Suite weiterhin `11`-Baseline. → **Phase 1 (7.0-Bump) frei.**

---

## Phase 1 — Der 7.0-Bump — ✅ DURCHGEFÜHRT & grün (2026-08)

**Rails 7.0.10** läuft auf **Ruby 3.1.7**, `load_defaults` weiterhin **6.1** (7.0-Gem
mit 6.1-Semantik). Suite `2260/11` (Basis), Boot + `zeitwerk:check` grün, manuelle
Tests grün. **`bin/rails app:update` NICHT gefahren** (interaktiv + überschreibt Configs)
— die nötigen Config-Änderungen manuell gemacht; `new_framework_defaults_7_0.rb` ist
erst für **Phase 2** nötig (dann `load_defaults 7.0`).

**A. Gemfile / Bundle:**
- `gem 'rails', '~> 6.1.7.10'` → `'~> 7.0.0'` → `bundle update rails` = **Rails 7.0.10**
  (neuester 7.0-Patch), **0 Konflikte**, 32 Gems bewegt, **Ruby bleibt 3.1.7**.
- **`turbo-sprockets-rails4` entfernt** (+ dessen `production.rb`-Block): pinnte
  `sprockets ~> 3.0` (blockierte Sprockets 4) und war eh deaktiviert → **Sprockets 4.2.2**.
- **`gem 'sprockets-rails'` explizit** ergänzt (Guide §6.3 — rails hängt nicht mehr dran).

**B. Config-Breaker (Boot schlug fehl → gefixt):**
- **`config.autoloader = :zeitwerk` entfernt** (`application.rb`) — Setter in 7.0
  **gelöscht** (Guide §6.5), sonst `NoMethodError`.
- **Usecases-Namespaced-Root-Initializer:** Hook `before: :let_zeitwerk_take_over`
  existiert in 7.0 nicht mehr → **`before: :setup_main_autoloader`** (der 7.0-Finisher,
  der `Dependencies.autoload_paths` push_dir't + `setup`); `_eager_load_paths.delete`
  mit `respond_to?` abgesichert.

**C. 🔴 Zentrale 7.0-Verhaltensänderung — Autoloading-during-init ist jetzt HARTER
FEHLER** (der 6.1-Kompat-Shim ist weg). 0d fixte die im 6.1-Log sichtbaren Fälle;
**`config/initializers/devise.rb:244`** (`Matrice.find_by(name:'userProvider')`) tauchte
dort NICHT auf und brach erst auf 7.0 (`uninitialized constant Matrice`). Da die
OmniAuth-Provider in `Devise.setup` (Init-Zeit, vor Middleware) registriert werden müssen
und **nicht** nach after_initialize verschiebbar sind: **Config via Raw-SQL gelesen**
(`conn.select_value("SELECT configs FROM matrices WHERE name = …")` + `JSON.parse`) →
kein Autoload des Models.

**D. 🔴 Suite-Regression (6×) — `Hstore#deserialize` in 7.0 strikt.**
`spec/api/chemotion/version_api_spec.rb` (samples/screens/wellplates-History) brach mit
`ArgumentError: Invalid Hstore document`. Ursache: `Versioning::Serializers::BaseSerializer#default_formatter`
ruft `@attributes[key].type.deserialize(value)` — für `Container#extended_metadata`
(**hstore**) steht in Logidzes `log_data` (jsonb) aber ein **JSON-Objekt**; 7.0s
`Hstore#deserialize` weist das nun zurück (6.1 war lax). **Fix:** `rescue ArgumentError`
→ `JSON.parse(value)` (nur der hstore-aus-jsonb-Fall nimmt den Fallback; der Happy-Path
bleibt). Die Stabby-Lambda `->(k,v){…}` wurde dafür in `lambda do …end` umgeschrieben,
da ein `{ }`-Body kein `rescue` erlaubt. (logidze unverändert 1.4.1; rein Rails-7.0-Verhalten.)
→ `version_api_spec` `12/0`.

**Verifikation (Phase 1):**
| Check | Ergebnis |
|---|---|
| `bundle update rails` | ✅ Rails 7.0.10, 0 Konflikte, Ruby 3.1.7 |
| Boot (dev) | ✅ `rails=7.0.10 zeitwerk=true defaults=6.1` |
| `zeitwerk:check` | ✅ „all is good!"; Usecases-Root + `UiAPI`/`Cdx`/`SVG` lösen auf |
| Non-Feature-Suite (Seed 57765) | ✅ **`2260 / 11`** (Basis), 0 Deprecations |
| Live-Server `:3000` neu gestartet | ✅ läuft auf **Rails 7.0.10** |
| Manuell: Login / Nav / CREATE / Sample-Form | ✅ 0 Failed-API, 0 Page-Errors, `tu3-1` |
| Manuell: Write-Pfad (§C2) | ✅ InChIKey `LFQSCWFLJHTTHZ` (Ethanol) |

**Geänderte Dateien (Phase 1):** `Gemfile`, `Gemfile.lock`, `config/application.rb`,
`config/environments/production.rb`, `config/initializers/devise.rb`,
`app/services/versioning/serializers/base_serializer.rb`.

> **Hinweis app:update / new_framework_defaults_7_0.rb:** bewusst übersprungen. Für
> Phase 2 (`load_defaults 6.1 → 7.0`) die Datei generieren **oder** die 7.0-Defaults
> einzeln aus `application/configuration.rb` (Block `when "7.0"`) durchschalten.

---

## Phase 2 — Framework-Defaults 6.1 → 7.0 — ✅ DURCHGEFÜHRT & grün (2026-08)

**`config.load_defaults 6.1` → `7.0`** gesetzt. Statt der `new_framework_defaults_7_0.rb`-
Iteration wurden die ~20 Flips des `when "7.0"`-Blocks (railties 7.0.10) **vorab einzeln
gegen den Code geprüft**, der eine echte Code-Breaker vorab gefixt, dann `load_defaults 7.0`
in einem Schritt aktiviert und Suite + manuell verifiziert.

**Bewertung der 7.0-Defaults für dieses Projekt:**
| Default | Bewertung |
|---|---|
| `action_dispatch.cookies_serializer = :json` | Funktional ok (Login/Session grün). ⚠️ **Deploy:** invalidiert bestehende Marshal-Cookies |
| `active_support.hash_digest_class` / `key_generator_hash_digest_class = SHA256` | Cache/ETags + Cookie-Signatur → ⚠️ **Deploy:** bestehende Sessions/Cookies ungültig |
| `action_controller.raise_on_open_redirects = true` | 🔴 **Code-Breaker vorab gefixt:** `oauth/radar_controller` (2× externe Redirects: Authorize-URL + `datasetUrl`) → `allow_other_host: true` (nicht suite-abgedeckt → nur per Review gefunden) |
| `action_dispatch.default_headers` (X-Frame SAMEORIGIN, Referrer-Policy, …) | neue Security-Header; Suite+SPA grün |
| `action_view.button_to_generates_button_tag = true` | nur 1 View (2FA); grün |
| `active_support.disable_to_s_conversion = true` | **safe** — keine `.to_s(:format)`-Nutzung |
| `active_support.use_rfc4122_namespaced_uuids = true` | **safe** — App nutzt nur `Digest::UUID.uuid_v4` |
| `active_record.partial_inserts = false` / `automatic_scope_inversing` / `verify_foreign_keys_for_fixtures` | Suite grün (keine AR-Fixtures, nur FactoryBot) |
| `active_storage.*` (vips, video, multiple_file) | **N/A** — App nutzt shrine |
| `action_controller.wrap_parameters_by_default` | API ist Grape (kein Rails-`wrap_parameters`) → grün |
| `active_support.cache_format_version = 7.0` | ⚠️ Rolling-Deploy-Cache-Format (§6.12) |

**🟠 Deploy-Sicherheit (§6.10 — nicht im Branch, sondern beim Prod-Rollout):**
`cookies_serializer=:json` + SHA256-KeyGenerator machen bestehende signierte/verschlüsselte
Cookies (Sessions) ungültig → User würden ausgeloggt. Für Zero-Downtime einen **Cookie-Rotator**
registrieren (alte SHA1/Marshal lesen, neu schreiben) ODER bewusst „alle ausloggen" akzeptieren.
Im Dev/Test irrelevant (frische Sessions) — Login verifiziert grün.

**Verifikation (Phase 2):**
| Check | Ergebnis |
|---|---|
| Boot | ✅ `defaults=7.0`, `cookies=json`, `hash_digest=SHA256`, `raise_on_open_redirects=true`, `partial_inserts=false` |
| Non-Feature-Suite (Seed 57765) | ✅ **`2260 / 11`** (Basis), **keine** neuen Failures |
| Live-Server `:3000` | ✅ läuft auf `defaults=7.0` |
| Manuell: Login/Session (Cookie-`:json` + SHA256) | ✅ Login persistiert → `/mydb/collection/all`, 0 Failed-API |
| Manuell: CREATE / Sample-Form / Write-Pfad | ✅ `tu3-1`, InChIKey `LFQSCWFLJHTTHZ` |

**Geänderte Dateien (Phase 2):** `config/application.rb` (`load_defaults 7.0`),
`app/controllers/oauth/radar_controller.rb` (`allow_other_host`).

---

## Phase 3 — 7.0-Breaking-Changes (auf dieses Projekt gemünzt) — ✅ CONFIRMATION-SWEEP grün (2026-08)

Die eigentlichen 7.0-Breaking-Changes sind bereits über 0d/1/2 aufgetaucht & gefixt
(Autoloading-during-init, `Hstore#deserialize`, `config.autoloader=`, open redirects).
Phase 3 war ein **Bestätigungs-Sweep** (Greps auf dem 7.0-Stand + Eager-Load) —
**0 neue Code-Änderungen**.

| Change | Status im Projekt |
|---|---|
| **Zeitwerk-Pflicht** | ✅ 0a; `eager_load!` auf 7.0 grün (`EAGER_OK`) |
| **`ActiveModel::Errors#<<` entfernt** (→ `#add`) | ✅ **0× echte Nutzung** — alle `errors <<`-Treffer sind lokale `errors = []`-Arrays (u. a. Hash-Push), kein `model.errors` |
| **`ActiveRecord::Base.default_timezone` verschoben** | ✅ **0×** |
| **Errors-API** (`.errors.keys/.values`, `errors.each \|attr, msg\|`) | ✅ **0×** |
| **`ActiveSupport::Dependencies` Private-API** (`.constantize/.mechanism/.verbose`, §6.6) | ✅ **0×** (nur der Usecases-Root in application.rb, weiter gültig) |
| **`Rails.application.secrets`** | ✅ 0c; Grep **0×** |
| **`button_to`-Block-Form** / `update_attributes` | ✅ **0×** |
| **Spring** aus 7.0-Default raus | bleibt Opt-in-Dev-Gem — kein Handlungsbedarf |
| **Asset-Pipeline** (`turbo-sprockets-rails4`) | ✅ in Phase 1 abgelöst (Sprockets 4) |

**Verifikation (Phase 3):** Alle obigen Greps 0× (bzw. nur false positives),
`Rails.application.eager_load!` auf Rails 7.0.10 / `defaults=7.0` grün. Keine Datei geändert.

---

## Phase 4 — Gem-Kompatibilität für Rails 7.0 — ✅ DURCHGEFÜHRT & grün (2026-08)

**Alle Kandidaten-Gems 7.0-kompatibel, 0 Code-Änderungen.** `bundle update rails`
löste **konfliktfrei** auf Rails 7.0.10 auf → kein Gem cappt Rails < 7. Installierte
Versionen: grape 1.8.0, grape-entity 1.0.0, devise 4.9.4, paranoia 2.6.0,
delayed_job 4.1.13, graphql 2.1.15, logidze 1.4.1, pg_search 2.3.6, shrine 3.6.0,
rmagick 5.5.0, nokogiri 1.18.10, sassc-rails 2.1.2, scenic 1.8.0, kaminari 1.2.2,
sprockets 4.2.2 / sprockets-rails 3.5.2, **Engines** labimotion 2.2.0.rc5 +
chemical_elements 0.1.0, turbo-sprockets-rails4 **entfernt**.

**Funktions-Smoke auf 7.0 (über die grüne Suite hinaus):**
| Gem | Smoke | Ergebnis |
|---|---|---|
| labimotion / chemical_elements (Engines) | `Labimotion::VERSION`, `ChemicalElements::PeriodicTable` | ✅ laden |
| graphql | `ChemotionSchema.execute('{ __typename }')` | ✅ `{"__typename"=>"Query"}` |
| pg_search | `Reaction.search_by_reaction_name(...)` | ✅ Query läuft |
| paranoia | `with_deleted` / `restore` / Scope-Query | ✅ |
| rmagick | `Magick::Image.new(3,3)` | ✅ Bild erzeugt |
| shrine / scenic | `defined?(Shrine)` / DB-Views | ✅ geladen (2 Views) |
| grape / devise / logidze / kaminari | Suite + manuelle Tests (API, Login, version_api) | ✅ (2260/11) |

**Scan-Referenz** (Kandidaten + 7.0-Hinweise, zur Nachvollziehbarkeit):

| Gem | Aktuell | 7.0-Hinweis |
|---|---|---|
| `rails` | ~> 6.1.7.10 | → `~> 7.0.0` |
| `grape` / `grape-entity` | 1.8.0 / 1.0.0 | 7-kompatibel; jede gemountete Resource + Entity-Level smoke-testen |
| `devise` | 4.9.4 | ✅ 7-kompatibel |
| `paranoia` | 2.6.0 | 2.6 ist 7.0-kompatibel; `.destroy`/`.restore`/Default-Scopes **hart** regressionstesten |
| `delayed_job` | 4.1.13 | 7-kompatibel; behalten |
| `sassc-rails` | vorhanden | 7.0-Kompat prüfen (libsass EOL — evtl. später ersetzen) |
| **`turbo-sprockets-rails4`** | vorhanden | 🔴 **Rails-4-Gem** — höchst wahrscheinlich **inkompatibel mit 7.0**; entfernen/ersetzen. Nur in `production.rb` (`TurboSprockets.configure`) genutzt → parallele Precompile-Optimierung, verzichtbar |
| `sprockets` / `sprockets-rails` | transitiv | 7.0 braucht `sprockets-rails` ≥ 3.x + evtl. `sprockets` 4 — Boot-/Asset-Precompile gegenprüfen |
| **`labimotion`** | 2.2.0.rc5 | erlaubt `rails >=6.1, <8.0` → **7.0 frei** (bekannt) |
| **`chemical_elements`** + weitere Engines | — | 7.0-Kompat vor dem Bump gegenprüfen (kritischer Pfad, falls eine Engine hinterherhinkt) |
| `logidze`, `pg_search`, `graphql`, `shrine`, `rmagick`, `nokogiri` | — | 7.0-kompatibel; nach dem Bump smoke-testen |

> **Asset-Hinweis:** Die **Sprockets-Deaktivierung ist eine EIGENE Baustelle**
> (`DEV_UPGRADING_ASSET_PIPELINE.md`, geblockt auf Frontend-Split) — **nicht** Teil
> dieses 7.0-Steps. Für 7.0 reicht: Sprockets/sprockets-rails 7-kompatibel machen +
> `turbo-sprockets-rails4` ablösen. Der große Umbau kommt separat.

---

## Phase 5 — Verifikation (Runbook + Rails-spezifisch)

Vollständiges `DEV_UPGRADE_TEST_RUNBOOK.md` §1–6 auf **Rails 7.0 / Ruby 3.1.7**, plus:
- [ ] `zeitwerk:check` grün **und** Prod-`eager_load!` ohne Fehler.
- [ ] Boot: `Rails.version` = 7.0.x auf Ruby 3.1.7.
- [ ] Suite: **identische Fail-Menge** (die 11, Seed 57765).
- [ ] `db:migrate:reset` läuft durch (auf **Abbrüche** prüfen, nicht nur Warnungen).
- [ ] API-Smoke (JWT 200/401) + Browser-Click-Through + Write-Pfad (§6/C2) — v. a.
      wegen 0c (secrets → JWT) und den Default-Flips.
- [ ] `assets:precompile` (falls Sprockets noch aktiv) läuft ohne Fehler.
- [ ] Deprecation-Log: keine **neuen** 7.0-Deprecations unerklärt.

---

## Risiken & offene Fragen

- **Zeitwerk (0a)** — größter Einzelposten; Umfang erst mit echtem `zeitwerk:check`
  final. Struktur-Entscheidung `usecases` (namespaced root vs. `Usecases`-Wrapper
  entfernen) hat App-weite Auswirkung → bewusst entscheiden.
- **`turbo-sprockets-rails4`** — Rails-4-Gem, sehr wahrscheinlich der einzige echte
  Gem-Blocker; Ablösung/Entfernung einplanen.
- **Engines** (labimotion ✓, `chemical_elements`, ggf. weitere) — vor dem Bump auf
  7.0-Kompat prüfen; ein nachhinkendes Engine ist der kritische Pfad.
- **Framework-Defaults** — die eigentliche Fleißarbeit; **einzeln** flippen, nicht in
  einem Rutsch `load_defaults 7.0`.
- **Ziel-Patch:** neuester 7.0-Patch (z. B. `7.0.8.x`), nicht `7.0.0` (Regel „newest
  patch", siehe Runbook §0).

---

## Danach: 7.0 → 7.1 (separater Step)

Nach grünem 7.0: **Rails 7.1** (eigener PR). Bekannte 7.1-Deploy-Fallen (für später):
Autoload-Dirs nicht mehr im `$LOAD_PATH` (blankes `require` bricht), Cache-Format-
Wechsel (Rolling-Deploy-Zwei-Schritt). `devise ≥ 4.9.3` nötig (haben wir: 4.9.4).
**Ruby 3.2** kommt erst **vor Rails 7.2** (7.2 verlangt ≥ 3.1, 8.0 ≥ 3.2.2).

## Abgleich mit dem offiziellen Upgrade-Guide (§6.1–6.15)

Vollständiger Abgleich der 15 Guide-Unterpunkte gegen dieses Projekt (2026-08):

| § | Guide-Punkt | Projekt-Relevanz / Aktion | Wo im Plan |
|---|---|---|---|
| 6.1 | `button_to` rendert bei persistiertem AR-Objekt jetzt `patch`-Form | server-gerenderte Views (Devise/2FA) gegenprüfen; Default-Flip `button_to_generates_button_tag` | Phase 2 |
| 6.2 | Spring ≥ 3.0.0 + `cache_classes=false` in `test.rb` | **Spring ist 4.3.0 (erfüllt)**; `config/environments/test.rb` auf `cache_classes=false` prüfen | Phase 3 |
| 6.3 | `sprockets-rails` jetzt optionale Dependency | `gem 'sprockets-rails'` explizit ins Gemfile, wenn Sprockets bleibt | Phase 4 |
| 6.4 | zeitwerk-Modus Pflicht | **Kernstück 0a** | 0a |
| 6.5 | **Setter `config.autoloader=` ist in 7.0 GELÖSCHT** | 🔴 Die in 0a gesetzte Zeile `config.autoloader = :zeitwerk` **beim 7.0-Bump WIEDER ENTFERNEN** (sonst `NoMethodError`). Nur für die 6.1-Übergangsphase nötig. | **Phase 1** |
| 6.6 | `ActiveSupport::Dependencies` Private-API gelöscht (`.constantize`, `.mechanism`, `.verbose=`) | grep im Projekt: keine Nutzung erwartet (classic-Autoloader-Interna) → vor Bump verifizieren | Phase 3 |
| 6.7 | **Custom Inflections in die Application-Body verschieben** | ✅ **ERLEDIGT (0a):** API/SFTP-Akronyme von `config/initializers/inflections.rb` → `config/application.rb` (Body) verschoben; greifen so vor Autoloading während der Initialisierung | 0a |
| 6.8 | `config.autoload_once_paths` nur vor Environment-Processing setzen (sonst `FrozenError`) | Projekt setzt `autoload_once_paths` nicht → N/A (bewusst prüfen) | — |
| 6.9 | `request.content_type` liefert jetzt vollen Header (inkl. charset) → ggf. `media_type` | **0 Fundstellen** (`request.content_type`) → **N/A** | — |
| 6.10 | **Cookie-Rotator** für alten SHA1-KeyGenerator (sonst Session-Invalidierung beim Deploy) | ⚠️ Bei Aktivierung der 7.0-Defaults: Rotator registrieren, damit bestehende Sessions/Cookies gültig bleiben. Für ELN (Devise-Sessions) im Deploy relevant. | Phase 2 |
| 6.11 | `ActiveSupport::Digest` SHA1 → SHA256 (ETags/Cache-Keys) | Default-Flip `hash_digest_class`; Cache ggf. invalidieren, Cache-Hit-Rate beobachten | Phase 2 |
| 6.12 | Neues `ActiveSupport::Cache`-Serialisierungsformat 7.0 | Rolling-Deploy: erst 6.1-Format, dann 7.0 (`cache_format_version`) | Phase 2 |
| 6.13 | ActiveStorage Video-Preview via FFmpeg-Scene-Detection | **N/A** — App nutzt **shrine** (`gem 'shrine', '~> 3.0'`), keine ActiveStorage-Attachments (nur `ActiveStorage::Filename` als String-Util) | — |
| 6.14 | ActiveStorage Default-Variant-Processor → `:vips` | **N/A** — s. 6.13 (shrine + rmagick, keine AS-Variants) | — |
| 6.15 | **Rails-Version steht jetzt im Schema-Dump** | Bei `bin/rails app:update` (Phase 1) `db/schema.rb` neu prüfen & committen (enthält künftig `[7.0]`-Migrationsversion) | Phase 1 |

**Fazit des Abgleichs:** Der bestehende Plan deckt die Guide-Punkte ab. **Neu ergänzt:**
6.5 (Autoloader-Zeile beim Bump wieder raus), 6.7 (Inflections-Umzug — bereits erledigt),
6.10 (Cookie-Rotator im Deploy). **Als N/A verifiziert:** 6.9, 6.13, 6.14.

## Quellen
- [Rails Upgrade Guide 6.1 → 7.0](https://guides.rubyonrails.org/upgrading_ruby_on_rails.html#upgrading-from-rails-6-1-to-rails-7-0)
- [Zeitwerk / classic mode removal](https://guides.rubyonrails.org/upgrading_ruby_on_rails.html#autoloading)
- [RailsDiff 6.1.7 → 7.0](https://railsdiff.org/6.1.7/7.0.0)
