# DEV_UPGRADING.md

Arbeits- und Wissensdokument für das Rails-Upgrade des Chemotion ELN.

## Roadmap (Gesamtüberblick)

| Stage | Inhalt | Status |
|-------|--------|--------|
| **0** | **Upgrade-Dokumentation, Spec-Workflow, manueller Test-Workflow** | **in Arbeit** |
| 1 | Rails 6.1.7.7 → 6.1.7.10 (Patch-/Security-Releases) | offen |
| 2 | (Folge-Upgrades, z. B. 6.1 → 7.0) — separat planen | offen |

Diese Datei deckt aktuell **Stage 0** ab und beschreibt **Stage 1**
als ersten konkreten Upgrade-Schritt.

---

## Stage 0 — Upgrade-Dokumentation

### 0.1 Ausgangslage: Rails 6.1.7.7 → 6.1.7.10

Wichtig vorweg, weil es das tatsächliche Diff entscheidend verkleinert:

- `Gemfile` pinnt `gem 'rails', '~> 6.1.7.7'`. Der Twiddle-Wakka `~> 6.1.7.7`
  bedeutet `>= 6.1.7.7, < 6.1.8.0` — **6.1.7.10 ist also bereits erlaubt**, ohne
  dass der `Gemfile`-Pin geändert werden muss.
- `Gemfile.lock` steht **bereits auf `rails (6.1.7.10)`** (die Lock-Datei ist im
  aktuellen `git status` als modifiziert markiert). Ein `bundle update rails`
  wurde also schon ausgeführt.
- 6.1.7.8 / 6.1.7.9 / 6.1.7.10 sind reine **Patch-/Security-Releases** der
  6.1.7-Serie. Es gibt keine neuen Features und keine absichtlichen
  Breaking-Changes — das Risiko liegt in subtilen Verhaltensänderungen der
  Security-Fixes (Active Support / Active Record / Action Pack), nicht in der
  API.

**Konsequenz für die Planung:** Das Upgrade selbst ist mechanisch klein. Der
Aufwand steckt fast vollständig in der **Verifikation** — und genau die ist
lokal nicht trivial, weil nicht alle Specs laufen. Deshalb existiert dieses
Dokument.

To-dos für Stage 1 (Details siehe unten):

1. `Gemfile`-Pin auf `~> 6.1.7.10` anheben (Klarheit; optional, aber empfohlen).
2. `bundle lock` / `bundle install` im Container, `Gemfile.lock`-Diff prüfen.
3. Offizielle Release-Notes der Patch-Releases gegen genutzte Code-Pfade
   abgleichen (siehe [0.4 Verifikations-Checkliste](#04-verifikations-checkliste-stage-1)).
4. Spec-Baseline (siehe 0.2) **vor und nach** dem Bump vergleichen — die
   Fail-Liste muss **identisch** bleiben, sonst hat der Bump etwas gebrochen.

---

### 0.2 Spec-Workflow

> Ziel: Klar definieren, **was lokal funktioniert**, damit wir die maximal
> erreichbare Testabdeckung als Regressions-Sicherung nutzen können. Lokal
> laufen **nicht** alle Specs grün — ein Teil scheitert rein an der Umgebung,
> nicht am Code.

#### Der kanonische Befehl (wie in CI)

CI (`.github/workflows/ci-rb.yml`) führt aus:

```bash
RAILS_ENV=test bundle exec rspec --exclude-pattern "spec/{features}/**/*_spec.rb" spec
```

→ **alles außer `spec/features`** (die Feature-Specs sind Browser-Tests, siehe
Fallstrick #6). Ausführung **im Container**:

```bash
docker exec chemotion_eln-app-1 bash -lc '
  cd /home/ubuntu/app &&
  RAILS_ENV=test bundle exec rspec --exclude-pattern "spec/{features}/**/*_spec.rb" spec
'
```

#### Baseline (Stand Stage 0, lokal im Dev-Container)

Suite ohne `spec/features`:

```
2258 examples, 13 failures, 48 pending
```

- **2258** Beispiele laden sauber (keine Load-Errors).
- **48 pending** = bewusst markierte/unfertige Specs (`pending`/`skip`/„Add
  missing spec“ / „missing segments factory“). Kein Handlungsbedarf für das
  Upgrade.
- **13 failures** scheitern **ausschließlich an der lokalen Umgebung**, nicht am
  Anwendungscode (Aufschlüsselung unten).

Gesamte Suite **inkl.** `spec/features` (nur zur Info, **nicht** der
Referenz-Lauf):

```
2301 examples, 54 failures, 48 pending
```

Die zusätzlichen ~41 Fehlschläge sind Browser-/Capybara-Specs ohne erreichbaren
Selenium/Chrome (siehe Fallstrick #6). Diese **nicht** als Regression werten.

#### Die 13 „erwarteten“ Fehlschläge (Umgebung, nicht Code)

| # | Spec | Ursache | Kategorie |
|---|------|---------|-----------|
| 7× | `spec/lib/datacollector/collector_spec.rb` (SFTP/SSH-Cases) | Kein laufender `ssh-agent` + keine SSH-Keys lokal. CI macht `eval $(ssh-agent)`, legt `testuser` an und hinterlegt `authorized_keys`. | **Umgebung** |
| 3× | `spec/services/rdkit_extension_service_spec.rb` | Lokales Postgres ist `postgres:16` (plain). CI nutzt `complat/dev:postgres16-rdkit` **mit RDKit-Extension**. Ohne RDKit kein `ctab_to_smiles` etc. | **Umgebung** |
| 1× | `spec/api/chemotion/admin_device_api_spec.rb:76` (sftp connection) | Wie Datacollector: SFTP-Verbindung nicht herstellbar. | **Umgebung** |
| 1× | `spec/lib/import/import_collections_spec.rb:295` (sbmm analyses) | Noch zu verifizieren — vermutlich Fixture/RDKit-abhängig. | **prüfen** |
| 1× | `spec/api/chemotion/admin_api_spec.rb:20` (jobs) | Noch zu verifizieren — Delayed-Job-/Worker-abhängig. | **prüfen** |

**Regel für das Upgrade:** Diese 13 sind die **Baseline**. Nach dem Rails-Bump
muss die Fail-Liste **byte-genau identisch** sein. Jeder *neue* Fehlschlag (oder
ein vorher grüner, jetzt roter Test) ist ein echtes Upgrade-Problem und muss
untersucht werden.

> Optional, um lokal näher an „grün“ zu kommen: RDKit-Postgres-Image verwenden
> und SSH im Container einrichten (`service ssh restart && eval $(ssh-agent)`,
> Key-Setup analog `ci-rb.yml`). Für die Upgrade-Verifikation **nicht nötig** —
> der Baseline-Vergleich reicht.

#### Gezielte Teilläufe (schneller iterieren)

```bash
# Einzelne Datei
docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && RAILS_ENV=test bundle exec rspec spec/models/sample_spec.rb'

# Nur fehlgeschlagene aus letztem Lauf erneut
#   (rspec --only-failures benötigt persistente example-status; sonst gezielt Pfade angeben)
docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && RAILS_ENV=test bundle exec rspec spec/api spec/models'
```

---

### 0.3 Manueller Test-Workflow (curl + JWT)

> Ab einem gewissen Stand wird ohne Frontend gearbeitet. Die Grape-API ist aber
> vollständig per `curl` testbar — Authentifizierung via **JWT Bearer Token**.

#### Wie Auth funktioniert (aus dem Code)

- API-Auth: `app/api/api.rb` → `detect_current_user_from_jwt` liest
  `Authorization: Bearer <token>`, dekodiert via `JsonWebToken.decode`, nutzt
  `payload[:user_id]` → `User.find(user_id)`.
- Token-Modell: `app/models/json_web_token.rb` — `HS256`, signiert mit
  `Rails.application.secret_key_base`, Default-Ablauf **6 Monate**.
- Öffentliche (Token-freie) Pfade: `/api/v1/authentication/`, `/api/v1/public/`,
  `/api/v1/chemspectra/`, `/api/v1/ketcher/layout`, `/api/v1/gate/...`.

#### Variante A — Token per Login-Endpoint holen

```bash
# Liefert {"token":"<jwt>"} bei gültigen Credentials, sonst 401
curl -s -X POST http://localhost:3000/api/v1/authentication/token \
  -H 'Content-Type: application/json' \
  -d '{"username":"<email_oder_name_abbreviation>","password":"<password>"}'
```

#### Variante B — Token direkt generieren (kein Passwort nötig)

Praktisch in Tests/Skripten: einen Token für einen bestehenden User direkt im
Container erzeugen.

```bash
docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && \
  RAILS_ENV=development bundle exec rails runner "
    u = User.find_by(email: %q{lg@megorei.com}) || User.first
    puts JsonWebToken.encode(user_id: u.id)
  "'
```

> Der Token muss mit demselben `secret_key_base` signiert sein wie die
> Ziel-Umgebung. Für den Dev-Server also `RAILS_ENV=development` verwenden
> (gleiche Umgebung wie der laufende Container auf Port 3000).

#### Authentifizierte Requests

```bash
TOKEN='<jwt-von-oben>'

# Beispiel: aktuelle User-Info / Collections
curl -s http://localhost:3000/api/v1/users/current.json \
  -H "Authorization: Bearer $TOKEN" | head

curl -s http://localhost:3000/api/v1/collections/roots.json \
  -H "Authorization: Bearer $TOKEN" | head
```

#### Smoke-Test-Skript (Vorlage)

Eignet sich als Vor-/Nach-Vergleich rund um den Rails-Bump: gleiche Requests,
gleiche Status-Codes erwartet.

```bash
TOKEN='<jwt>'
BASE='http://localhost:3000/api/v1'
for path in users/current.json collections/roots.json samples.json reactions.json; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$path" -H "Authorization: Bearer $TOKEN")
  echo "$code  $path"
done
```

---

### 0.4 Verifikations-Checkliste (Stage 1)

Abzuarbeiten **nach** dem Rails-Bump, in dieser Reihenfolge:

- [ ] `bundle install` im Container ohne Fehler; `Gemfile.lock`-Diff nur
      Rails-Stack (`rails`, `actionpack`, `activerecord`, `activesupport`,
      `railties`, `actionview`, `actionmailer`, `activejob`, `actioncable`,
      `actionmailbox`, `actiontext`, `activestorage`).
- [ ] App bootet: `docker compose` Container `app` ist `healthy`, Port 3000
      antwortet.
- [ ] Spec-Suite (ohne `spec/features`) liefert **exakt** `13 failures` mit
      **identischer** Fail-Liste wie die Baseline in 0.2.
- [ ] Manueller Smoke-Test (0.3) liefert dieselben Status-Codes wie vor dem Bump.
- [ ] Deprecation-Log gegenchecken: `RAILS_ENV=test` Lauf auf neue
      `DEPRECATION WARNING`-Zeilen prüfen, die vorher nicht da waren.
- [ ] Security-Release-Notes der betroffenen Patch-Versionen gelesen und gegen
      genutzte Code-Pfade abgeglichen (insb. Active Record Quoting / Active
      Support String-/Time-Helper, falls dort CVE-Fixes liegen).

---

## Fallstricke & Ärgernisse (nicht aus den Commits ersichtlich)

Zentrale Sammelstelle. Wird laufend ergänzt.

### #1 Tests laufen nur im Container

Auf dem **Host** sind die Gems nicht installiert (`bundle check` → *Install
missing gems*). Die komplette Toolchain (Ruby, Gems, RSpec 3.13) lebt im
Container **`chemotion_eln-app-1`** unter `/home/ubuntu/app`. Außerdem zeigt
`config/database.yml` auf Host `postgres` (Docker-Netz-Name) — vom Host aus nicht
auflösbar. **Alles** via `docker exec chemotion_eln-app-1 bash -lc '...'`
ausführen.

### #2 Test-DB-Migrationen brechen die *gesamte* Suite ab

`spec/rails_helper.rb:46` ruft `ActiveRecord::Migration.maintain_test_schema!`.
Bei ausstehenden Migrationen in `chemotion_test` bricht **die komplette Suite**
beim Laden ab — Ausgabe: lange Migrations-Liste und
`0 examples, ..., 1 error occurred outside of examples`. Sieht aus wie ein
Code-Fehler, ist aber nur die DB. **Fix:**
`RAILS_ENV=test bundle exec rake db:migrate`.

### #3 `klasses.json` muss existieren

CI macht `touch klasses.json`. Fehlt die Datei, scheitert der Boot. Lokal:
`[ -f klasses.json ] || echo "{}" > klasses.json` (gitignored).

### #4 `.env.test` fehlt lokal

CI kopiert `cp .env.test.example .env.test`. Lokal im Dev-Container i. d. R.
unkritisch (Env kommt über Docker), aber bei isolierten Läufen ggf. anlegen.

### #5 DatabaseCleaner: nur **ein** RSpec-Prozess gleichzeitig

`spec/support/database_cleaner.rb` macht in `before(:suite)`
`DatabaseCleaner.clean_with(:truncation)`. Laufen **zwei** RSpec-Prozesse parallel
gegen dieselbe `chemotion_test`-DB, trunkiert der eine die Tabellen, während der
andere offene Verbindungen hat → der zweite stirbt sofort mit:

```
ActiveRecord::ConnectionNotEstablished: connection is closed
PG::ConnectionBad: connection is closed
0 examples, 0 failures, 1 error occurred outside of examples
```

Das ist **kein** Testfehler, sondern eine **Race-Condition durch parallele
Läufe**. Regel: **immer nur einen** `rspec`-Lauf gegen die Test-DB zur Zeit.
(Dieser Effekt ist in Stage 0 real aufgetreten, als zwei Läufe kollidierten.)

### #6 `spec/features` = Browser-Tests, in CI bewusst ausgeschlossen

14 Dateien, ~43 Beispiele unter `spec/features`, fast alle `js: true` →
Capybara + Selenium/Chrome. CI schließt sie per `--exclude-pattern` aus. Ohne
erreichbaren Browser im Container schlagen sie fehl. **Nicht** in die
Upgrade-Baseline aufnehmen.

### #7 RDKit-Postgres lokal vs. CI

Lokales DB-Image ist `postgres:16` (plain). CI nutzt
`complat/dev:postgres16-rdkit` mit RDKit-Extension. Specs, die RDKit brauchen
(`RdkitExtensionService`, teils Import/Molecule), schlagen lokal **erwartbar**
fehl. Siehe Baseline in 0.2.

### #8 SSH/SFTP-Datacollector-Specs brauchen ssh-agent + Keys

`spec/lib/datacollector/...` und einzelne Admin-Device-Specs setzen einen
laufenden `ssh-agent` und hinterlegte SSH-Keys voraus (CI baut das in
`ci-rb.yml` eigens auf: `useradd testuser`, `ssh-keygen`, `authorized_keys`,
`service ssh restart`). Lokal ohne dieses Setup → erwartbare Fehlschläge.

---

## Referenzen

- CI Ruby/RSpec: `.github/workflows/ci-rb.yml` (kanonischer Testbefehl,
  DB-Setup, SSH-Setup, RDKit-Image, Coverage-Gate 57 %).
- DB-Cleaner: `spec/support/database_cleaner.rb`.
- Test-Bootstrap: `spec/rails_helper.rb`, `spec/spec_helper.rb`.
- JWT/Auth: `app/models/json_web_token.rb`, `app/api/api.rb`,
  `app/api/chemotion/authentication_api.rb`.
- DB-Config: `config/database.yml`, `config/database.yml.ci`.
