# DEV_RAILS_UPGRADE_7-2.md

Schritt-für-Schritt-Plan für **Rails 7.1.6 → 7.2** im Chemotion ELN.

**Status: UPGRADE KOMPLETT ✅ (Phasen 0/A–E, 2026-08-10/11) — App läuft voll auf RAILS 7.2.3.2 / Ruby 3.1.7
mit **`config.load_defaults 7.2`**, **0 Deprecations**. Full-Suite `2303/54` (reine Baseline) + alle
Manual-Tests grün (from-fresh-boot). Working-Tree uncommittet (bereit zum Commit).**
Bundler 2.4.22. Ausgangspunkt: Working-Tree = Ergebnis des 7.1-Upgrades (Phasen A–F, s.
`DEV_RAILS_UPGRADE_7-1.md`). Suite-Baseline non-feature `2260/11` (Seed 57765), Full-Suite `2303/54`.
**Phase 0 (secrets-Vorarbeiten) erledigt:** `Rails.application.secrets` aus 3 Specs raus,
`secret_key_base` von `config/secrets.yml` auf ENV (`.env.*`) umgezogen, `config/secrets.yml` gelöscht.
**Phase A (Gem-Bump) erledigt:** `rails ~> 7.2.0` → **7.2.3.2**, Lock-Diff exakt wie erwartet,
Boot + Login + `zeitwerk:check` grün (s. Ausführungs-Logs unten).

> **Reihenfolge-Kontext (korrigiert):** Ruby 3.0 ✓ → Ruby 3.1.7 ✓ → Rails 7.0 ✓ → Rails 7.1 ✓ →
> **DIESER Schritt (Rails 7.2)** → Ruby 3.2 → Rails 8.0.
>
> **⚠️ Korrektur zur 7.1-Doc-Annahme „Ruby 3.2 → Rails 7.2":** **Rails 7.2 verlangt nur Ruby ≥ 3.1.0**
> (2.7/3.0 gedroppt). **Ruby 3.1.7 reicht → KEIN Ruby-Bump für 7.2 nötig.** Ruby 3.2.2+ wird erst
> für **Rails 8.0** verlangt. → Reihenfolge: **erst Rails 7.2 auf 3.1.7**, dann Ruby-Bump 3.2, dann Rails 8.

> **Grundprinzip (wie 7.0/7.1):** erst **alle Vorarbeiten auf 7.1** (Phase 0, einzeln grün), dann der
> **eine** Versions-Bump (Phase A), dann `app:update` + **Framework-Defaults** durchschalten (B–D),
> dann Gesamt-Verifikation (E). Nie mehrere Baustellen gleichzeitig. Alles im Container:
> ```bash
> docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && bundle _2.4.22_ exec rails <...>'
> ```

**Offizielle Referenz:** Rails-Guide „Upgrading from Rails 7.1 to Rails 7.2"
<https://guides.rubyonrails.org/upgrading_ruby_on_rails.html#upgrading-from-rails-7-1-to-rails-7-2>

---

## Überblick — was 7.2 für DIESE App bedeutet

Konkrete Treffer aus dem Codebase-Scan (2026-08), nicht generischer Guide-Text:

| # | 7.2-Änderung | Treffer im Code | Aufwand |
|---|---|---|---|
| **G** | **Gem-Blocker** cappt `activerecord/activesupport < 7.2` | **KEINE** (empirisch verifiziert, s. u.). Engste Caps im Lock: `paranoia` `activerecord < 8.2`, `activerecord-nulldb-adapter < 8.1`, Rest `< 9.0`. `devise-two-factor 4.1.1` = `activesupport ~> 7.0` / `railties ~> 7.0` (beide inkl. 7.2). → **nur die `rails`-Zeile bumpen, sonst nichts.** | **niedrig** ✅ |
| **R** | **Ruby-Mindestversion** | 7.2 verlangt Ruby ≥ 3.1.0 → **3.1.7 reicht, kein Bump** | entfällt |
| **S1** | **`Rails.application.secrets` ENTFERNT** (in 7.1 deprecated) | **3 Spec-Stellen** (App-Code nutzt bereits `secret_key_base`): `spec/api/chemotion/gate_api_spec.rb:25,53`, `spec/api/chemotion/third_party_app_api_spec.rb:261` | klein, konkret |
| **S2** | **`config/secrets.yml` wird NICHT mehr geladen** | `config/secrets.yml` liefert nur noch dev/test-`secret_key_base` (prod liest `ENV["SECRET_KEY_BASE"]`; `only_office_secret_key_base` schon auf `ENV` migriert). Ohne die Datei generiert 7.2 in dev/test ein zufälliges `tmp/local_secret.txt` → **Key-Wechsel** trifft `encryptor`-Concern + JWT-Kontinuität | klein, mit Sorgfalt |
| **D-def** | Neue Framework-Defaults via `new_framework_defaults_7_2.rb` (einzeln durchschalten) | `postgresql_adapter_decode_dates`, `validate_migration_timestamps`, `enqueue_after_transaction_commit`, YJIT (nur Ruby 3.3+, hier no-op) | s. Phase D |
| **✓** | **Kein Treffer:** `config.read_encrypted_secrets`, `secrets.yml.enc`, `suppress_multiple_database_warning`, Ruby-Bundled-Gem-Requires (`bigdecimal`/`mutex_m`/`drb` — erst Ruby 3.4 relevant) | — | entfällt |

**Kern-Risiko = S1/S2 (secrets)** — beide sind klein und **bereits auf 7.1 vorziehbar** (Phase 0).
Danach ist der eigentliche 7.2-Bump nahezu ein reiner Versions-Flip. **Deutlich kleiner als das 7.1-Upgrade**
(keine Gem-Blocker, keine enum/hstore/paranoia/grape-Incidents zu erwarten).

### Empirischer Resolve-Check (2026-08, im Container, non-mutating)

`bundle lock --update rails --print` gegen eine **Wegwerf-Kopie** des Gemfiles (`gem 'rails', '~> 7.2.0'`)
in `/tmp` — die echte `Gemfile`/`Gemfile.lock` blieben unberührt (danach verifiziert: Lock weiter 7.1.6).
Ergebnis (Ruby 3.1.7, Bundler 2.4.22 — beide **unverändert**):

| Gem | 7.1.6-Stand | 7.2-Resolve | Anmerkung |
|---|---|---|---|
| **rails + 12× active*/action*/railties** | `7.1.6` | **`7.2.3.2`** | `~> 7.2.0` zieht den neuesten 7.2-Patch (7.2.3.2 < 7.3.0) |
| `useragent` | — | **`0.16.11` (NEU)** | neue transitive Dep von `actionpack 7.2` (Backend für `allow_browser`) — unkritisch |
| `mutex_m` | `0.3.0` | **entfernt** | 7.2-`activesupport` braucht es nicht mehr |
| `io-console` | `0.8.2` | `0.9.1` | Default-Gem, mitgezogen |
| `prism` | `1.7.0` | `1.9.0` | Ruby-Parser, mitgezogen |
| `reline` | `0.6.3` | `0.7.0` | Default-Gem, mitgezogen |
| **paranoia / devise-two-factor / logidze / scenic / fx / encryptor / attr_encrypted / alle übrigen** | — | **UNVERÄNDERT** | **kein** Cap-Konflikt, **kein** Bump nötig |

**Fazit:** Der 7.2-Resolve ist minimal und konfliktfrei. **Es muss ausschließlich die `rails`-Zeile
gebumpt werden**; alle App-relevanten Gems (paranoia, devise-two-factor, …) bleiben auf ihren Versionen.
`useragent` (neu) + `mutex_m` (weg) + 3 Default-Gem-Patches sind reine Rails-7.2-Baum-Mitzüge.

---

## Phase 0 — Vorarbeiten (VOR dem Bump, noch auf Rails 7.1)

Beide secrets-Punkte lassen sich **auf 7.1** erledigen (`Rails.application.secrets` ist dort noch
gültig, nur deprecated) → entkoppelt sie vom Versions-Flip.

### 0-S1 — Spec-Nutzung von `Rails.application.secrets` umstellen

`Rails.application.secrets` ist in 7.2 **weg** (NoMethodError). Betroffen sind **nur Specs** — der
App-Code liest überall bereits `Rails.application.secret_key_base` (Methode, in 7.2 erhalten):

| Datei | Zeile | von → nach |
|---|---|---|
| `spec/api/chemotion/gate_api_spec.rb` | 25 | `Rails.application.secrets.secret_key_base` → `Rails.application.secret_key_base` |
| `spec/api/chemotion/gate_api_spec.rb` | 53 | dito |
| `spec/api/chemotion/third_party_app_api_spec.rb` | 261 | dito |

Rein mechanisch, kein Verhaltenswechsel (dieselbe Byte-Quelle). **Auf 7.1 sofort machbar & grün.**

### 0-S2 — `secret_key_base` von `config/secrets.yml` entkoppeln

**Ist-Zustand:** `config/secrets.yml` setzt `secret_key_base` für **dev** und **test** (feste Werte);
`production:` liest ohnehin `ENV["SECRET_KEY_BASE"]`. In Rails 7.2 wird `config/secrets.yml`
**nicht mehr geladen** → `secret_key_base` in dev/test käme sonst aus einem **zufällig generierten**
`tmp/local_secret.txt` (pro Maschine neu).

**Warum das nicht egal ist:**
- `app/models/concerns/encryptor.rb:19` nutzt `Rails.application.secret_key_base[0..31]` als AES-Key
  für `Device`-novnc-Passwörter → ein **wechselnder** dev-Key macht bereits verschlüsselte Bestandsdaten
  in einer persistenten dev-DB unlesbar.
- `app/models/json_web_token.rb` + `gate_api.rb` signieren JWTs mit `secret_key_base`. Innerhalb eines
  Boots stabil (der generierte Key wird einmalig in `tmp/local_secret.txt` gecacht) → Encode/Decode-
  Round-Trips in der Suite bleiben grün. Nur **cross-Prozess/cross-Run**-Stabilität ginge verloren.

**Empfohlener Fix (deterministisch, spiegelt den prod-ENV-Weg):**
1. Die **bestehenden** dev/test-`secret_key_base`-Werte aus `config/secrets.yml` als `SECRET_KEY_BASE`
   nach `.env.development` bzw. `.env.test` übernehmen (Werte 1:1 kopieren → **Bestandsdaten + JWT-
   Kontinuität bleiben erhalten**). `application.rb:8` ruft `Dotenv.load` **vor** dem App-Class-Body →
   `ENV["SECRET_KEY_BASE"]` ist gesetzt, bevor Rails `secret_key_base` liest.
2. `config/secrets.yml` **löschen** (die `production:`- und `only_office`-Zweige sind bereits über
   `ENV` bzw. `application.rb:176` abgedeckt → kein Informationsverlust).
3. Verifizieren: dev + test booten, `Rails.application.secret_key_base` == alter Wert, JWT-Round-Trip
   grün, `Device`-Encrypt/Decrypt grün.

**Alternative (Zero-Config):** `config/secrets.yml` löschen und den generierten `tmp/local_secret.txt`
akzeptieren — nur wenn **keine** persistente dev-DB mit verschlüsselten `Device`-Daten erhalten bleiben
muss. Für Reproduzierbarkeit ist Weg 1 (ENV) vorzuziehen.

> **Prod-Hinweis:** Produktion ist von S2 **nicht** betroffen (`SECRET_KEY_BASE` kommt aus `ENV`,
> nicht aus secrets.yml). Aber: `.env.production.example` / Deploy-Doku prüfen, dass `SECRET_KEY_BASE`
> dort gesetzt wird (ist es), da der secrets.yml-Fallback wegfällt.

**Verifikation Phase 0:** Suite-Baseline unverändert (`2260/11`), Boot dev+test grün, JWT/Device-Smokes
grün — alles noch auf **Rails 7.1**.

### 0 — Ausführungs-Log ✅ (2026-08-10, noch Rails 7.1.6)

**S1 — Specs (3 Stellen, mechanisch):** `Rails.application.secrets.secret_key_base` →
`Rails.application.secret_key_base` in `spec/api/chemotion/gate_api_spec.rb` (Z. 25, 53) +
`spec/api/chemotion/third_party_app_api_spec.rb` (Z. 261). Danach **0** `application.secrets`-Treffer
in `app/ lib/ config/ spec/` (nur noch der erklärende Kommentar `application.rb:175`).

**S2 — `secret_key_base` von secrets.yml auf ENV:**
- **`.env.development`** (git-tracked): `SECRET_KEY_BASE=<dev-Wert>` ergänzt (1:1 der frühere secrets.yml-dev-Wert).
- **`.env.test`** (git-ignored, neu angelegt): `SECRET_KEY_BASE=<test-Wert>` (1:1 secrets.yml-test).
- **`.env.test.example`** (git-tracked Template): denselben `SECRET_KEY_BASE`-Eintrag + Erklär-Kommentar
  ergänzt (damit frische Setups den Key kennen; sonst Auto-`tmp/local_secret.txt`).
- **`config/secrets.yml`** (war git-tracked): **gelöscht**.

**🔑 Empirisch geklärtes Rails-Internum (vorab getestet, bevor gelöscht):** In *local* Envs (dev/test)
resolved Rails `secret_key_base` über `secrets.secret_key_base ||= generate_development_secret` — Sorge
war, dass `ENV["SECRET_KEY_BASE"]` in dev/test **ignoriert** wird. **Test (secrets.yml beiseite +
SECRET_KEY_BASE in `.env.*`):** `RAILS_ENV=development` → `2de67b6ea84b3dbe…`, `RAILS_ENV=test` →
`b1b52f3f9c805540…` — **beide exakt die alten Werte**, d. h. **7.1 honoriert `ENV["SECRET_KEY_BASE"]`
auch in dev/test.** (In 7.2 ebenso — der secrets.yml-Zweig entfällt dort ohnehin.) Damit ist der Umzug
verlustfrei: Device-novnc-Verschlüsselung + JWT-Kontinuität bleiben gültig (gleicher Key).

**Verifikation (alles noch Rails 7.1.6):**
- Baseline `secret_key_base` (mit secrets.yml) = DEV `2de6…` / TEST `b1b5…` erfasst; nach Umzug identisch.
- **Betroffene Specs grün:** `gate_api_spec` + `third_party_app_api_spec` = **34 examples, 0 failures.**
- **Dev-Smoke (frischer Boot, ohne secrets.yml):** `secret_key_base` len=128 unverändert,
  `JsonWebToken` encode/decode-Round-Trip = true, `Encryptor#encrypt_value/decrypt_value`-Round-Trip = true.
- **App-Container-Neustart:** healthy nach ~35 s, `GET /users/sign_in → 200`,
  `rails=7.1.6 skb=2de67b6ea84b3dbe secretsyml=false`.
- **Full-Suite non-feature** (Seed 57765, `--exclude-pattern spec/features`): **`2260 examples, 11 failures,
  48 pending` = reine environmental Baseline** (3 rdkit + 1 admin_device-sftp + 7 datacollector-sftp),
  **0 non-Baseline-Failures** → kein Regress durch Phase 0.

**Hinweis:** `Rails.application.secrets` existiert auf 7.1 weiter (deprecated, liefert ohne secrets.yml
leere OrderedOptions) — wird von uns nicht mehr genutzt; in 7.2 fällt es weg (dann NoMethodError, daher
S1 nötig).

**Geänderte/neue/gelöschte Dateien Phase 0:** `spec/api/chemotion/gate_api_spec.rb`,
`spec/api/chemotion/third_party_app_api_spec.rb`, `.env.development`, `.env.test.example`,
`.env.test` (neu, git-ignored), `config/secrets.yml` (**gelöscht**).

---

## Phase A — Dependency-Bump (der EINE Versions-Bump)

1. `Gemfile`: `gem 'rails', '~> 7.1.0'` → **`gem 'rails', '~> 7.2.0'`** (Zeile 96) — **die einzige
   Gemfile-Änderung**. (paranoia, devise-two-factor, encryptor, attr_encrypted, logidze, scenic, fx
   **bleiben** — Resolve-Check bestätigt keine Caps < 7.2.)
2. Im Container:
   ```bash
   docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && bundle _2.4.22_ update rails'
   ```
   **Erwartetes Lock-Diff (aus dem Resolve-Check):** `rails` + 12× `active*/action*/railties`
   `7.1.6 → 7.2.3.2`; **+ `useragent 0.16.11` (neu)**, **− `mutex_m` (weg)**, `io-console 0.8.2→0.9.1`,
   `prism 1.7.0→1.9.0`, `reline 0.6.3→0.7.0`. **Sonst nichts.** Ruby 3.1.7 + Bundler 2.4.22 unverändert.
   Weicht das reale Diff hiervon ab → stoppen und prüfen (nicht erwartet).
3. **Lock-Check:** `rails (7.2.3.2)`, alle `active*`/`action*`/`railties` = `7.2.3.2`, keine `< 7.2`-Caps,
   `bundle _2.4.22_ check` grün.
4. **Boot-Smoke** (noch `load_defaults 7.1`): `rails runner "puts Rails.version"` → `7.2.3.2`.

**Verifikation A:** Container-Restart, App bootet auf `:3000`, Login sichtbar, `zeitwerk:check` grün,
`eager_load!` grün, Suite-Baseline unverändert. **0 neue Deprecations** erwartet (Deprecation-Sweep
im Boot, s. Phase C). Restrisiko-Kandidaten empirisch prüfen: 2FA-Login (d2f 4.1.1 unter AR 7.2),
paranoia-Soft-Delete (unter AR 7.2), Grape-Serialisierung.

### A — Ausführungs-Log ✅ (2026-08-10)

**Gemfile:** Z. 96 `gem 'rails', '~> 7.1.0'` → **`'~> 7.2.0'`** (einzige Gemfile-Änderung).

**`bundle _2.4.22_ update rails` — sauber, Lock-Diff exakt wie im Resolve-Check vorhergesagt:**
rails + 12× `active*/action*/railties` **7.1.6 → 7.2.3.2**; **+ `useragent 0.16.11`**, **− `mutex_m`**,
`io-console 0.8.2 → 0.9.2` (Prognose 0.9.1 — trivialer Patch-Unterschied), `prism 1.7.0 → 1.9.0`,
`reline 0.6.3 → 0.7.0`. **Sonst nichts.** `bundle check` = „dependencies are satisfied". Die drei
Lock-Zeilen mit `activesupport/railties (~> 7.0 | >= 7.0)` sind `devise-two-factor`-Deps → **inkl. 7.2,
kein Blocker.** Ruby 3.1.7 + Bundler 2.4.22 unverändert.

**Boot-Verifikation (noch `load_defaults 7.1`):**
- Boot-Smoke: `rails=7.2.3.2 defaults=7.1 ruby=3.1.7` ✓
- `zeitwerk:check` → „Otherwise, all is good!" ✓ (die `lib`-Notiz = by-design autoload-only, wie 7.1)
- App-Container-Neustart → healthy ~35 s, `GET /users/sign_in → 200`, laufende App `rails=7.2.3.2 defaults=7.1`.

**🔴 Incident A-1 (7.2) — factory_bot × `ActiveSupport::Delegation::Inflector` (Test-Boot bricht):**
Erster Full-Suite-Lauf auf 7.2.3.2 brach **vor** jedem Example:
```
NameError: uninitialized constant #<Class:ActiveSupport::Delegation>::Inflector
  activesupport-7.2.3.2/lib/active_support/delegation.rb:47 (generate)
  factory_bot-6.4.5/lib/factory_bot/definition_hierarchy.rb:3 (delegate zur Ladezeit)
  spec/spec_helper.rb:11 require 'factory_bot_rails'
```
- **Ursache:** `spec_helper.rb:11` required `factory_bot_rails` **bevor** `rails_helper` (Z. 16) die
  Rails-App bootet. `factory_bot` ruft `delegate` **zur Ladezeit**; Rails-7.2s `ActiveSupport::Delegation.generate`
  referenziert die Konstante `Inflector` (= `ActiveSupport::Inflector`). Vor der App-Initialisierung ist
  deren Autoload noch nicht registriert → `NameError`. **Nicht upgrade-datenrelevant, reines Test-Boot-
  Load-Order-Problem** (die App selbst bootet sauber — Login 200 —, weil der volle Env-Load Inflector zuerst zieht).
- **Fix (minimal, test-infra-only, kein Gem-Bump):** `require 'active_support/inflector'` an den Anfang von
  `spec/spec_helper.rb` (vor die Pre-Boot-Gem-Requires) + Erklär-Kommentar. Deklariert die real benötigte
  AS-Inflector-Abhängigkeit für die Pre-Boot-Requires. **Empirisch bestätigt:** isolierter Repro → `RESULT=OK`;
  `spec/models/comment_spec.rb` (nutzt Factories) → **7/0**.
- **Alternative verworfen:** `factory_bot` auf 6.6.0 bumpen — größere/risikoreichere Änderung für dieselbe
  Wurzel; der Ein-Zeiler ist self-contained und robuster (fixt die Wurzel „Inflector nicht geladen",
  unabhängig vom auslösenden Gem).

**🔴 Incident A-2 (7.2) — ActiveJob-Test-Adapter greift nicht mehr (29 Suite-Failures):**
Erster Full-Suite-Lauf auf 7.2 (nach A-1) zeigte u. a. `import_samples_job_spec` (4),
`sample_api`-Import (9), `sequence_based_macromolecule_api_spec` (1) mit:
```
perform_enqueued_jobs / have_enqueued_job requires the Active Job test adapter,
you're using ActiveJob::QueueAdapters::DelayedJobAdapter.
```
- **Ursache = echte 7.2-Verhaltensänderung:** In ≤7.1 setzte `ActiveJob::TestHelper#before_setup`
  **global** `ActiveJob::Base.queue_adapter = :test` (pro Example). **7.2** entfernt das — es aktiviert
  den Test-Adapter nur noch für Job-Klassen, deren `_queue_adapter` **`nil`** ist. Da `application.rb:123`
  `config.active_job.queue_adapter = :delayed_job` **global** setzt, ist `_queue_adapter` nicht nil →
  der reale DelayedJob-Adapter leakt in die Suite → die ActiveJob-Matcher raisen. (Empirisch bestätigt:
  auch `:active_job`-getaggte Examples bekamen `DelayedJobAdapter`; 7.2-`test_helper.rb`-Quelle geprüft.)
- **Fix (Standard-Rails-Weg): `config/environments/test.rb` → `config.active_job.queue_adapter = :test`.**
  Kein Spec dep-t auf ActiveJob-`perform_later` → `Delayed::Job`-Rows (geprüft). **Ausnahme:**
  `spec/config/initializers/delayed_job_spec.rb` bootet die App in einem **Subprozess**
  (`rake db:version`) und braucht dort den **realen** delayed_job-Adapter (schreibt `Delayed::Job`-Cron-
  Rows). → test.rb liest `ENV.fetch('TEST_QUEUE_ADAPTER', 'test')`, und der Spec startet den Subprozess
  mit `TEST_QUEUE_ADAPTER=delayed_job`. **Verifiziert:** die 5 betroffenen Spec-Dateien
  (import_samples_job / sample_api / sbmm_api / delayed_job-initializer / welcome_mailer) = **74/0**.
- **Folge-Fix (gleiche Wurzel): `spec/jobs/init_cron_jobs_job_spec.rb`** testet delayed_job-Cron-Scheduling
  **in-process**, braucht also ebenfalls den realen Adapter. → `around`-Hook im Spec: `ActiveJob::Base.
  queue_adapter = :delayed_job` für diese Examples, danach zurück. **Verifiziert: 2/0.** (Vom ersten
  Post-A-2/3/4-Full-Lauf als einzige Rest-Regression aufgedeckt.)

**🔴 Incident A-3 (7.2) — pg_search 2.3.6 × AR-7.2-Arity (`search/all`, ~2 Failures):**
`search_api` `search/all`: `ArgumentError: wrong number of arguments (given 2, expected 1)` in
`pg_search-2.3.6/lib/pg_search/scope_options.rb:96` (`.new`). Bekannte 2.3.6↔7.2-Inkompatibilität
(AR-internes `.new` erwartet in 7.2 nur 1 Arg). **Fix = Upstream-Bump `pg_search 2.3.6 → 2.3.7`**
(ungepinnt in Gemfile; `bundle update pg_search`, sauber, nur diese eine Lock-Zeile). Kein Monkeypatch.

**🔴 Incident A-4 (7.2) — Integer-Array-Bind wird `text[]` (`search/advanced|samples|structure` + `user_api`, ~13):**
```
PG::UndefinedFunction: operator does not exist: integer[] @> text[]   (Matrice)
PG::UndefinedFunction: operator does not exist: integer = text        (…= ANY(array[$1]))
```
- **Ursache = 7.2-Bind-Änderung:** `where('… ARRAY[?]', [ids])` bzw. `= ANY(array[?])` wird in 7.2 als
  **Bind-Parameter `$1`** gesendet (statt den Integer zu inlinen wie ≤7.1); ohne Typ-Info leitet Postgres
  `text[]` ab → Operator-Mismatch gegen `integer[]`/`integer`.
- **Fix = expliziter Array-Cast** (der im Codebase bereits etablierte Weg — `sequence_based_macromolecule.rb`
  nutzt schon `ARRAY[?]::varchar[]`):
  - `app/models/user.rb` `remove_from_matrices`: `ARRAY[?]` → `ARRAY[?]::integer[]` (include_ids/exclude_ids).
  - `app/models/research_plan.rb` `by_sample_ids`/`by_reaction_ids`: `ANY(array[?])` → `ANY(array[?]::int[])`.
  - **Codebase-Sweep** (`ANY(array[/ARRAY[?]` ohne Cast in `app/ lib/`): nur diese Stellen; sbmm bereits gecastet.
- **Verifiziert:** `search_api` **32/0**, `user_api` **25/0**.

**🟡 Beobachtete Warnungen/Deprecations (nicht-blockierend auf 7.2, für Rails 8.0 vormerken):**
- **`enum` mit Keyword-Argumenten deprecated → Rails 8.0** (`comment.rb` `sample_section` etc. + weitere
  Modelle): *„Defining enums with keyword arguments is deprecated … Positional arguments should be used …
  `enum :sample_section, {…}`"*. **Kein 7.2-Fehler** — 8.0-Deprecation. → Kandidat für einen 8.0-Vorlauf
  (die `enum X:`-Form auf `enum :X, {…}` umstellen).
- **`Attachment: overriding method 'not_editing?'/'editing?'`** — der `edit_state`-Enum + AASM-`document`-
  State-Column definieren beide dieselben Predicates (kollidiert schon vor 7.2 latent). Nur Warnung.

**Geänderte Dateien Phase A:** `Gemfile` (rails ~> 7.2.0), `Gemfile.lock` (rails-Baum 7.2.3.2 +
pg_search 2.3.7), `spec/spec_helper.rb` (A-1), `config/environments/test.rb` (A-2),
`spec/config/initializers/delayed_job_spec.rb` (A-2), `spec/jobs/init_cron_jobs_job_spec.rb` (A-2),
`app/models/user.rb` (A-4), `app/models/research_plan.rb` (A-4).

**Full-Suite non-feature (Seed 57765, `--exclude-pattern spec/features`):** **`2260 examples, 11 failures,
48 pending` = reine environmental Baseline** (3 rdkit + 1 admin_device-sftp + 7 datacollector-sftp),
**0 non-Baseline-Failures.** Verlauf: `342-artig? nein` — konkret `13 (A-1 behob. Boot) → 40 (Erstlauf:
+29 A-2/3/4) → 13 (nach A-2/3/4-Fix: +2 init_cron) → 11` ✅ = exakt die 7.1-Baseline.

**Gesamt-Verifikation „jeder Test + Manual-Test" (2026-08-10, `rails=7.2.3.2 defaults=7.1`):**
> Alle Manual-Tests **nach sauberem App-Container-Neustart** (from-fresh-boot) wiederholt: app healthy
> ~35 s, webpacker + postgres healthy, Login rendert (SPA, nicht blank) `http 200`,
> `rails=7.2.3.2 defaults=7.1 pg_search=2.3.7`. Danach Runner-Smoke **19/19** + Browser-Click-Through grün.
- **Full-Suite inkl. Feature/Browser (Seed 57765): `2303 examples, 54 failures, 48 pending`** = **exakt
  die 7.1-Baseline** (11 environmental + 43 Feature/Browser-Env, im Container nicht lauffähig), 0 non-Baseline.
- **Non-feature-Suite: `2260/11`** (reine environmental Baseline).
- **Manueller rails-runner-Smoke (dev): 19/19 PASS** — Versionen (7.2.3.2 / defaults 7.1 / ruby 3.1.7);
  Phase-0-secrets (secret_key_base aus ENV len=128, secrets.yml weg, JWT- + Encryptor-Round-Trip);
  `dev queue_adapter=delayed_job` (test.rb-`:test` betrifft dev nicht); 7.1-Incidents halten (Comment-Enum,
  serialize-YAMLColumn, permitted_classes-Safety, LenientHstore auf `counters`, paranoia- + grape-Patch);
  **InChIKey Ethanol = `LFQSCWFLJHTTHZ-UHFFFAOYSA-N`**; **7.2-Fixes** (pg_search-`multisearch`,
  `ResearchPlan.by_sample_ids` int[], `Matrice include_ids` integer[]); 2FA-TOTP generate+verify.
- **Browser-Click-Through (`:3000`, Puppeteer/Host-Chrome, User tu3):** Login → `/mydb/collection/all` ✓;
  Element-Tabs durchgeklickt ✓; **Create Screen `POST 201`** + **Create Wellplate `POST 201`** (serialize-
  Round-Trips) ✓; Sample mit Molekül (Runner) → `tu3-1`, InChIKey korrekt ✓; **0 failed API-Calls**.
  Einzige Konsole-Fehler: „Failed to initialize editor(s) … extJs" = **OnlyOffice-Editor, in dev
  unkonfiguriert** (`only_office_secret_key_base=nil`) → pre-existing/environmental, **kein 7.2-Regress**.

**→ Phase A funktional KOMPLETT & verifiziert.** App bootet auf `rails=7.2.3.2 defaults=7.1`, Login 200,
beide Suites reine Baseline (`2260/11` · `2303/54`), Manual-Tests grün. Nächstes: Phase B (`rails app:update`),
weiterhin `load_defaults 7.1`.

---

## Phase B — `rails app:update` (Config-Diffs)

```bash
docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && yes n | bundle _2.4.22_ exec rails app:update'
```
- „**n**" auf jeden Overwrite-Prompt → bestehende (angepasste) Dateien unverändert behalten.
- Erzeugt **`config/initializers/new_framework_defaults_7_2.rb`** (alle 7.2-Flags auskommentiert →
  einzeln aktivieren in Phase D). Das ist der Phase-B-Deliverable.
- **Erzeugte Artefakte prüfen & ggf. ENTFERNEN** (wie in 7.1-Phase B, wo AS-Migrationen +
  permissions_policy raus mussten). 7.2 kann u. a. anbieten:
  - `app/views/pwa/*` (manifest/service-worker) — die App braucht kein Rails-PWA → **entfernen**.
  - `bin/brakeman`, `bin/rubocop` — optionale Dev-Wrapper; nur behalten, wenn gewünscht.
  - `.devcontainer/*`, Puma-/Docker-Templates — **nicht** übernehmen (App hat eigenes Docker-Setup).
  - **Kein** ActiveStorage-Migrations-Rauschen mehr erzwingen (App nutzt shrine).
- `load_defaults` bleibt in dieser Phase auf **7.1**.

**Verifikation B:** Boot + Suite-Baseline unverändert (neue Defaults noch inaktiv). Nur neue Datei
`new_framework_defaults_7_2.rb` im Diff.

### B — Ausführungs-Log ✅ (2026-08-11)

**So gefahren:** `yes n | rails app:update` im Container — „n" auf jeden Overwrite-Prompt → alle
bestehenden (angepassten) Dateien **unverändert** (nur neue Dateien erzeugt; `git status`: **0 tracked
config/bin geändert**).

**Erzeugt & behalten (der Deliverable):** `config/initializers/new_framework_defaults_7_2.rb` — alle
5 Flags auskommentiert (inert), Aktivierung einzeln in Phase D: `active_job.enqueue_after_transaction_commit`,
`active_storage.web_image_content_types` (AS-irrelevant, App nutzt shrine), `active_record.validate_migration_timestamps`,
`active_record.postgresql_adapter_decode_dates`, `config.yjit` (nur Ruby ≥ 3.3 → no-op auf 3.1.7).

**Erzeugte Artefakte ENTFERNT (nicht Teil des Upgrades, wie 7.1-Phase B):**
- **3× `db/migrate/*_active_storage.rb`** — `app:update` ruft automatisch `active_storage:update`; App nutzt
  **shrine**, nicht ActiveStorage (0 AS-Refs im Schema) → Migrations-Rauschen.
- `config/initializers/permissions_policy.rb` — vollständig auskommentiertes Template, hatte die App nie.
- `public/406-unsupported-browser.html` — für 7.2s `allow_browser` (App nutzt es nicht; eigene 404/422/500 behalten).
- `public/icon.png`, `public/icon.svg` — generische Rails-Default-Icons (App hat eigenes Branding).
- `bin/rubocop` — Generator-Binstub, nicht upgrade-relevant (rubocop läuft via `bundle exec`).

**Skip/conflict (unsere Version behalten):** `initializers/{assets,content_security_policy,cors,
filter_parameter_logging,inflections}.rb`, `bin/{rails,rake,setup}`, `public/{404,422,500}.html`, `public/robots.txt`.

**Verifikation B:**
- Boot-Smoke: `rails=7.2.3.2 defaults=7.1`, neue Initializer-Datei lädt sauber (inert);
  `active_job.enqueue_after_transaction_commit=nil` (auskommentiertes Flag **nicht** aktiv → bestätigt inert).
- **Geänderte/neue Dateien Phase B:** nur `config/initializers/new_framework_defaults_7_2.rb` (neu).
- Non-feature-Suite (Seed 57765): **`2260/11` = reine Baseline** (unverändert ggü. Phase A → neue Defaults inaktiv bestätigt).

**→ Phase B KOMPLETT & verifiziert.** Nächstes: Phase C (Deprecation-Sweep), weiterhin `load_defaults 7.1`.

---

## Phase C — Grün auf 7.2 mit ALTEN Defaults (Deprecations abbauen)

Ziel: App läuft voll auf Rails 7.2, `load_defaults 7.1`, **0 Deprecation-Warnings**.

- **S1/S2** sollten aus Phase 0 bereits erledigt sein. Falls nicht → hier nachziehen.
- **Deprecation-Sweep:** Boot + Suite mit Deprecation-Lauschen; jede 7.2-Warnung beheben. Erwartet
  gering (Scan fand außer `secrets` keine 7.2-Removal-Nutzung). Mögliche neue 7.2-Deprecations
  (Guide gegenprüfen): `to_time`/`to_s(:format)`-Reste, `benchmark`/`redirect_to allow_other_host`.
- **`add_autoload_paths_to_load_path = true`** (Override aus 7.1, `application.rb:33`) — in 7.2 **weiter
  vorhanden**, bleibt gültig. Die latente `Encryptor`-Concern↔Gem-Kollision (7.1 Incident D-1) besteht
  fort → **erst bei Rails 8** neu bewerten (dann Concern → `ValueEncryptor` umbenennen).

**Verifikation C:** Boot dev+test grün, `zeitwerk:check` + `eager_load!` grün, Suite-Baseline `2260/11`,
manuelle Smokes (Login/Session, JWT, 2FA, InChIKey) grün.

### C — Ausführungs-Log ✅ (2026-08-11, weiter `load_defaults 7.1`)

**Deprecation-Sweep** (`Rails.application.deprecators.behavior = :stderr` + `eager_load!`, plus
dev/test-Logs): **genau EINE** aktive 7.2-Deprecation — **`enum` mit Keyword-Argumenten** (in 7.2
deprecated, Entfernung in 8.0). Die im Log sichtbaren `Rails.application.secrets`-Deprecations sind
**stale Alt-Einträge von VOR Phase 0** (nach der secrets-Migration feuern sie nicht mehr — Sweep = 0).
Kein `serialize`-/`show_exceptions`-/sonstiger Treffer (in 7.1 bereits erledigt).

**C-enum — `enum X: {…}` → positionale Form `enum :X, {…}` (13 Deklarationen, 5 Modelle):**
`reactions_sample.rb` (gas_type), `attachment.rb` (edit_state), `computed_prop.rb` (status, `%w[]`-Form),
`calendar_entry_notification.rb` (status), `comment.rb` (**9× `*_section`**, jeweils mit Option
`_prefix: true` → **`prefix: true`** — führende `_` fällt in der positionalen Form weg). Rein mechanisch,
kein Verhaltenswechsel. **Empirisch vorab bestätigt:** positionale Form + `prefix:` erzeugt dieselben
Predicates/Value-Maps, **0 Deprecation**.

**Verifiziert:**
- `eager_load!` → **0 DEPRECATION WARNINGs** (vorher: die enum-Warnung).
- Enum-Verhalten unverändert: `Comment.sample_sections[:properties]='sample_properties'`,
  `sample_section_properties?`-Predicate vorhanden, `Attachment.edit_states=[not_editing,editing]`,
  `ReactionsSample.gas_types[:catalyst]=2`, `ComputedProp.statuses['pending']=0`, `CalendarEntryNotification.statuses['created']=0`.
- Specs `comment_spec` + `attachment_spec` + `comment_api_spec` = **129/0**.

**🟡 Nicht behandelt (pre-existing, kein 7.2-Regress):** `Attachment: overriding method 'not_editing?'/'editing?'`
— reine Ruby-Redefinition-Warnung (enum-Predicates ↔ AASM-State-Predicates, latent auch auf 7.1); keine Deprecation.

**Geänderte Dateien Phase C:** `app/models/{reactions_sample,attachment,computed_prop,calendar_entry_notification,comment}.rb`.

**Verifikation C (Gate):** Non-feature-Suite (Seed 57765): **`2260/11` = reine Baseline.** Die
Suite-Zeile „1 deprecation warning total" ist **RSpecs eigener** Reporter (nicht ActiveSupport):
per `--deprecation-out` identifiziert = *„The implicit block expectation syntax is deprecated … pass a block
rather than an argument to `expect` … e.g. `expect { value }.to change …`"* (rspec-expectations, ein Spec
nutzt `expect(value).to change`). **Pre-existing (identisch in Phase 0/A/B), test-code-Style, kein
Rails-/7.2-Bezug.** Rails-Deprecations = **0** (eager_load).

**Gesamt-Verifikation nach Phase B+C (2026-08-11, frischer App-Neustart, `defaults=7.1`):**
Full-Suite inkl. Feature **`2303/54`** (exakt 7.1-Baseline) · Non-feature **`2260/11`** · Runner-Smoke
**19/19** · Browser (Login → alle Tabs → Create Screen/Wellplate `201` serialize-Round-Trip, **0 failed API**) ·
Sample-mit-Molekül (`tu3-2`, InChIKey korrekt). Nur bekannte OnlyOffice-`extJs`-Konsole-Warnung (dev-unkonfiguriert).

**→ Phase C KOMPLETT.** App voll auf 7.2 mit `load_defaults 7.1`, **0 Deprecations**. Nächstes: Phase D (`load_defaults 7.2`).

---

## Phase D — `load_defaults 7.2` durchschalten

Ansatz wie 7.1: **Flip-and-Verify** (`new_framework_defaults_7_2.rb`-Flags sind bekannt/überschaubar).
`config.load_defaults 7.1` → **`7.2`**, die beiden bestehenden bewussten Overrides in `application.rb`
**behalten** (beide in 7.2 weiter gültig):
- `active_record.default_column_serializer = ActiveRecord::Coders::YAMLColumn` (C2-Safety, 7.2 unverändert nötig)
- `add_autoload_paths_to_load_path = true` (D-1-Kollision, 7.2 unverändert nötig)

Relevante 7.2-Flags & App-Bezug:

| Flag | Bedeutung | App-Bezug / Risiko |
|---|---|---|
| `active_record.postgresql_adapter_decode_dates = true` | rohe PG-`date`-Spalten → `Date` statt `String` | mehrere Raw-SQL-Pfade (`calendar_entries/index`, `disk_usage_job`, `collection_api`, `report_helpers`, …) → prüfen, ob dort `date`-Spalten als String verglichen/formatiert werden. **Niedrig**, aber verifizieren. |
| `active_record.validate_migration_timestamps = true` | Migrations-Dateien mit **Zukunfts**-Timestamp werden abgelehnt | Alle Migrations ≤ `20260420…`, heute 2026-08 → **alle in der Vergangenheit → OK**. Nur relevant für neu erzeugte Migrations (echte UTC-Timestamps nutzen, kein Hand-Vordatieren). |
| `active_job.enqueue_after_transaction_commit = :default` | ActiveJob enqueued **nach** dem AR-Commit | `queue_adapter = :delayed_job` (DB-basiert). Beseitigt Enqueue-vor-Commit-Race → i. d. R. Verbesserung. **Verifizieren:** kein Code verlässt sich darauf, dass ein Job **innerhalb** der Transaktion schon sichtbar/enqueued ist (z. B. Tests, die direkt nach `create` den `Delayed::Job` erwarten). Niedrig. |
| `yjit` default an | nur Ruby ≥ 3.3 | **No-op auf 3.1.7.** |
| `Regexp.timeout`, Marshalling/Cache-Format | ohnehin schon ab 7.1 aktiv | keine Änderung |

**Verifikation D:** nach dem Flip Full-Suite + manuelle Tests; bei Failure aufs verantwortliche Flag
bisecten. Final `load_defaults 7.2` gesetzt, `new_framework_defaults_7_2.rb` gelöscht.

### D — Ausführungs-Log ✅ (2026-08-11)

**Ansatz: Flip-and-Verify.** `config/application.rb`: `config.load_defaults 7.1` → **`7.2`**; die **2
bewussten Overrides behalten** (beide in 7.2 weiter nötig, Kommentare auf „7.1+ default" präzisiert):
- `active_record.default_column_serializer = ActiveRecord::Coders::YAMLColumn` (C2-Safety)
- `add_autoload_paths_to_load_path = true` (Encryptor-Concern-Kollision, 7.1-D-1)

**Gelöscht:** `config/initializers/new_framework_defaults_7_2.rb` (redundant nach `load_defaults 7.2`).

**Boot-Verifikation (dev):**
- `loaded_config_version=7.2` ✓; Overrides aktiv (`default_column_serializer=YAMLColumn`,
  `add_autoload_paths=true`, Reaction-Coder=YAMLColumn) ✓.
- **7.2-Behavior-Flags aktiv:** `validate_migration_timestamps=true` (alle Migrations vergangen → OK),
  `postgresql_adapter_decode_dates=true` (Raw-`::date`-Query liefert jetzt **`Date`** statt String),
  `active_job.enqueue_after_transaction_commit=:default` (effektiv auf `ActiveJob::Base`; DelayedJob =
  DB-backed → Deferral no-op/safe), `yjit=true` (no-op auf Ruby 3.1.7).

**Verifikation D (Gate):** Non-feature-Suite (Seed 57765): **`2260/11` = reine Baseline** — 0 non-Baseline,
kein Regress durch `decode_dates`/`enqueue_after_transaction_commit`/sonstige 7.2-Defaults. („1 deprecation
warning total" = weiter der pre-existing RSpec-Reporter, s. Phase C.)

**Geänderte/gelöschte Dateien Phase D:** `config/application.rb`, `config/initializers/new_framework_defaults_7_2.rb` (**gelöscht**).

**→ Phase D KOMPLETT (Gate).** App auf **`load_defaults 7.2`**, Non-feature-Suite reine Baseline.
Gesamt-Verifikation (Full-Suite inkl. Feature + Manual-Tests) = Phase E.

---

## Phase E — Gesamt-Verifikation

- Container frisch neugestartet, Versionen prüfen (`rails=7.2.x ruby=3.1.7 defaults=7.2 zeitwerk=true`).
- **Full-Suite** = Baseline `2303/54` (11 environmental + 43 browser-env), **0 non-Baseline-Failures**.
- **Non-feature-Suite** = `2260/11`.
- **Manuelle Tests** (`DEV_UPGRADE_TEST_RUNBOOK.md` / Puppeteer-Runner): Login/Session, Click-Through
  (alle Element-Tabs), CREATE-Menü, Sample/Screen/Wellplate-Serialize-Round-Trip, API/JWT-Smoke,
  **2FA-Login** (d2f unter AR 7.2), C2-Write-Pfad/InChIKey (`LFQSCWFLJHTTHZ-UHFFFAOYSA-N`),
  Labimotion-Generic-Element (hstore-counters), Gate-API/JWT (S1-Fix).
- **Optional (wie 7.1 Phase F):** From-Scratch `db:migrate` gegen frische DB → 431/431 (kein neuer
  Blocker aus 7.2-Migrations-Timestamp-Validierung erwartet, da alle Timestamps in der Vergangenheit).

### E — Ausführungs-Log ✅ (2026-08-11, `load_defaults 7.2`, frischer App-Neustart)

Container frisch neugestartet: app healthy ~35 s, webpacker + postgres healthy, Login `http 200`,
`rails=7.2.3.2 defaults=7.2` (Flip überlebt Fresh-Boot).

- **Full-Suite inkl. Feature (Seed 57765): `2303 examples, 54 failures, 48 pending`** = **exakt die
  7.1-Baseline** (11 environmental + 43 Feature/Browser-Env), **0 non-Baseline**.
- **Non-feature-Suite: `2260/11`** (Phase-D-Gate).
- **Runner-Smoke: 19/19 PASS** (inkl. `load_defaults 7.2`, Comment-Enum positional, InChIKey, 2FA,
  pg_search/int[]-Fixes, serialize-YAMLColumn, LenientHstore, paranoia/grape-Patches).
- **Browser (`:3000`):** Login → `/mydb/collection/all`; **Create Screen/Wellplate `POST 201`**
  (serialize-Round-Trips); **0 failed API**; Sample-mit-Molekül `tu3-3`, InChIKey korrekt.
  Nur bekannte OnlyOffice-`extJs`-Konsole-Warnung (dev-unkonfiguriert).

**→ Phase E KOMPLETT. Das Rails 7.1 → 7.2-Upgrade (Phasen 0/A–E) ist funktional KOMPLETT & verifiziert.**
App läuft auf **Rails 7.2.3.2 / Ruby 3.1.7 / `load_defaults 7.2`**, 0 Deprecations, beide Suites reine
Baseline, alle Manual-Tests grün — from-fresh-boot.

---

## Phase F — Full-From-Zero-Rebuild (`down -v`) ✅ (2026-08-11)

Kompletter Teardown `docker compose -f docker-compose.dev.yml down -v` (beide Volumes `database`+`homedir`
weg) → alles neu. Validiert den **echten Upgrade-Kern**: frisches Ruby 3.1.7 kompiliert, **`bundle install`
= 324 Gems aus dem 7.2-Lock** sauber. Deckte **2 neue 7.2-From-Scratch-Blocker** auf (upgrade-verursacht → gefixt):

- **F-3 = `serialize`-Positional in Migration (7.2 entfernt Positional-Form):** frisches `db:migrate` bricht bei
  `20190716092051_add_body_to_research_plans` → Inline-Model `serialize :description, Hash` →
  `ArgumentError: wrong number of arguments (given 2, expected 1)`. 7.1 hatte das nur **deprecated** (daher in
  7.1-Phase-C nur die App-Modelle gefixt), 7.2 **entfernt** die Positional-Form. **Fix: `serialize :description,
  type: Hash`** (wie C2). Codebase-Sweep: nur diese eine Migration. → `db:migrate` **431/431, 0 pending, 108 Tabellen**.
- **F-4 = jsonb-Column-Default als String in Migrations-Kontext (7.2) → `ui/initialize` 500:** die Migration
  `20230323160712_matrice_molecule_viewer` erzeugt den `moleculeViewer`-Matrice **ohne** `configs` → nutzt den
  jsonb-Default `'{}'`. Auf 7.2 landet der Wert im Migrations-Kontext als **String `"{}"`** (nicht Hash `{}`;
  im normalen App-Kontext liefert der Default korrekt `{}`). `Matrice.configs_for` macht `.merge(configs)` →
  `TypeError: no implicit conversion of String into Hash` → `GET /api/v1/ui/initialize` = **500**. **Fix:
  `configs: {}` explizit in der Migration** (wie alle anderen Matrice-Migrationen). Per `db:migrate:down/up`
  der einen Migration verifiziert → `configs` jetzt Hash `{}`, `Matrice.molecule_viewer` grün.

**Bewusst NICHT gefixt (pre-existing, NICHT upgrade-verursacht — wie 7.1-Phase F):**
- `prepare-asdf.sh` — asdf-`tar`-Install scheitert an `Invalid cross-device link` auf frischem Volume.
  **Workaround (manuell, Script unangetastet):** die exakte funktionierende asdf-Binary (amd64, v0.18.0, läuft
  per Emulation auf aarch64) via `cp` in `/home/ubuntu/.asdf/bin` des frischen Volumes geseedet → `command -v asdf`
  greift, Script überspringt den Install und baut Ruby/Plugins/Gems from-zero.
- `db:schema:load` frisch — schema.rb referenziert die gedroppte `sync_collections_users` (fx-Function) →
  `db:setup` scheitert; **db:migrate-Pfad** ist der korrekte From-Scratch-Weg (431/431).
- Dev-Reload-Routing-Artefakt: nach vielen In-Process-Reloads (db:migrate:down/up + runner) 404 auf Devise-Routes
  → **App-Container-Neustart** behebt es (bekannt, kein Upgrade-Regress).

**Verifikation From-Scratch:** app healthy, Login **200**, `rails=7.2.3.2 defaults=7.2`, 108 Tabellen,
`db:seed` grün (7 Users), Test-User angelegt. **Browser-Screenshots (10 Seiten, `HTTP5xx=[]`):** Login,
Collection-„All"-Dashboard (Nav/Sidebar/Element-Tabs/Toolbar/CREATE), Element-Tabs (sample/reaction/wellplate/
screen/research_plan), CREATE-Menü (alle 8 Optionen), **Sample-Formular** (Struktur-Editor + Properties/Analyses/
QC/References/Results), Profil/MyDB — **alle rendern korrekt**.

**Geänderte Dateien Phase F:** `db/migrate/20190716092051_add_body_to_research_plans.rb` (F-3),
`db/migrate/20230323160712_matrice_molecule_viewer.rb` (F-4).

**`db/schema.rb` (nebenbei regeneriert, behalten):** das From-Scratch-`db:migrate` hat `schema.rb` ins
**7.2-Dumper-Format** überführt — `ActiveRecord::Schema[7.2].define` (Versions-Tag) + `precision: nil` auf
Legacy-datetime-Spalten. **Rein kosmetisch: 0 strukturelle Änderung** (gleiche Migrations-Version
`2026_04_20_075649`, keine neuen/gedroppten Tabellen/Spalten/Functions — verifiziert). Legitimes 7.2-Artefakt
(jeder 7.2-`db:migrate` erzeugt es), daher behalten.

---

## Zusätzliche Gap-Tests ✅ (2026-08-11) — Verhalten, das Specs/Click-Throughs nicht erreichten

- **delayed_job-Worker end-to-end (nicht nur Enqueue):** `u.delay.touch` → `Delayed::Worker#work_off`
  = **[1 success, 0 failures]**, Side-Effect ausgeführt (`updated_at` geändert), Queue leer. **Transaktion:**
  Enqueue in einer `transaction do … Rollback end` → Job-Row in-tx=1, nach Rollback=**0** (DB-backed-Adapter,
  `enqueue_after_transaction_commit=:default` → Job Teil der TX, sauber zurückgerollt).
- **Production-Mode-Boot (`RAILS_ENV=production`):** `zeitwerk:check` → „all is good!", `eager_load!` grün,
  `env=production eager=true defaults=7.2 decode_dates=true secret_key_base ok`. (Voraussetzung: erreichbare
  DB via `DATABASE_URL` — der nackte Prod-Boot scheitert nur an der DB-Config `chemotion_production`@localhost,
  environmental, kein Code-Issue.)
- **File-Upload end-to-end (shrine + `edit_state`-Enum/AASM):** 163 KB JPEG über `Attachment` → auf Platte
  gespeichert (`exists=true`), voll zurückgelesen (163233 B), `content_type=image/jpeg`, checksum+identifier
  gesetzt, `type_image?=true`; `edit_state`-Enum (positional, Phase C) + AASM koexistieren
  (`not_editing` → `editing_start!` → `editing`); paranoia `really_destroy!` + shrine-Cleanup grün.

**CRUD / Container / Comment (Model + UI, 2026-08-11):**
- **Via echte UI-Clicks:** **Create Sample** (Fast-SMILES → `POST 201 /molecules/smiles` + `POST 201 /samples`),
  **Edit Sample** (Name+Description → **`PUT 200 /samples/601`** — der komplette Update-Pfad, vorher ungetestet).
- **Via Model-Layer** (die verschachtelten SPA-Flows waren headless nicht zuverlässig klickbar; Controller-Layer
  aber von Request-Specs abgedeckt): **Reaktion mit Startmaterial-Sample** (`tu3-R1`, materials=1); **Container-/
  Analyse-Baum** (sample→root→analyses→analysis→dataset) **+ Attachment auf Dataset-Container** (shrine,
  `attachable_type=Container`, 163 KB gespeichert); **Comment mit Section-Enum** (`section=sample_properties`,
  Value-Map korrekt).

**Navigation-Sweep (alle SPA-Bereiche, `HTTP5xx=[]` + 0 page-errors überall):** Inbox, Weighing Tasks,
**Calendar** (calendar_entry-`status`-Enum, Wochen-Grid rendert), **Notifications** (Message), Info & Support,
User-Menü, **Settings/Account** (Profil + **2FA-Setup „Request 2FA"** rendert), Reporting-/Export-Menü,
Manage Collections, Element-Detail-Subtabs (Analyses / QC & curation / References / Results) — alle rendern sauber.

**Noch offen (environmental / deploy-time, hier nicht testbar):** rdkit-Structure-Search (Cartridge fehlt),
SFTP-Datacollector, die 43 Feature/Capybara-Specs (Browser-Env), echter 2FA-UI-Login (dev-`OTP_SECRET_KEY`
6 Zeichen), Prod-Cache-Invalidierung, Cookie-Rotator, Prod-Asset-Precompile (`shakapacker`, nie in dev).

---

## Offene Punkte / Deploy-TODOs

1. **`config/secrets.yml` gelöscht** (S2) → sicherstellen, dass **prod** `SECRET_KEY_BASE` via `ENV`
   gesetzt bekommt (ist über `.env.production.example` abgedeckt) — der secrets.yml-Fallback entfällt.
2. **Cookie-Rotator** (§6.10 im 7.0-Doc) — trägt sich weiter fort, vor Prod-Rollout.
3. **`add_autoload_paths_to_load_path=true`** (Override) — `Encryptor`-Concern/Gem-Kollision bleibt
   latent; **bei Rails 8** neu bewerten (Concern → `ValueEncryptor` umbenennen, falls Flag dort entfällt).
4. **`OTP_SECRET_KEY` ≥ 32 Byte** in dev/prod für echten 2FA-Betrieb (aus 7.1 offen).
5. Danach separat: **Ruby 3.2.2+ → Rails 8.0** (dort d2f 6.x / AR-Encryption + Ruby-Bump erneut prüfen).

---

## Zusammenfassung — „was ist nötig, was ändert sich"

1. **Kein Ruby-Bump** (3.1.7 reicht für 7.2). **Kein Gem-Blocker** — Resolve-Check bestätigt: nur die
   `rails`-Zeile bumpen (`~> 7.2.0` → **rails 7.2.3.2**), alle übrigen App-Gems bleiben.
2. **Zwei kleine Vorarbeiten (secrets), schon auf 7.1 machbar:**
   - 3 Specs: `Rails.application.secrets.secret_key_base` → `Rails.application.secret_key_base`.
   - dev/test-`secret_key_base` nach `.env.*` verschieben, `config/secrets.yml` löschen.
3. **Bump** `rails ~> 7.2.0` + `bundle update rails` → `app:update` (nur `new_framework_defaults_7_2.rb`
   behalten) → Deprecations abbauen → `load_defaults 7.2` (2 Overrides behalten) → verifizieren.
4. **Aufwand: deutlich kleiner als 7.1** — keine enum/hstore/paranoia/grape-Incidents zu erwarten;
   Hauptarbeit ist die saubere secrets-Migration.
</content>
</invoke>
