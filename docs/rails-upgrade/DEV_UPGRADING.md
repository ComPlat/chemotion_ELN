# Fallstricke beim Arbeiten an diesem Repo

> **Übergabe-Dokument — nach der Übernahme löschen oder eingliedern.** Die
> Stolperfallen unten sind nicht upgrade-spezifisch; sie treffen jeden, der die
> Suite lokal fährt. Wenn sie bleiben sollen, gehören sie in die reguläre
> Entwickler-Dokumentation, nicht unter `rails-upgrade/`.

Gesammelt beim Rails-/Ruby-Upgrade. Der Wert dieser Liste liegt darin, dass
nichts davon **aus den Commits ersichtlich** ist: Es sind Dinge, die man einmal
schmerzhaft herausfindet und danach für selbstverständlich hält.

Die frühere Roadmap und der Spec-/Test-Workflow aus diesem Dokument sind
entfallen — sie beschrieben den Stand „Rails 6.1 → 7.0 steht noch aus". Was
davon gilt, steht jetzt in [`DEV_UPGRADE.md`](DEV_UPGRADE.md) (was passiert ist)
und [`DEV_UPGRADE_TEST_RUNBOOK.md`](DEV_UPGRADE_TEST_RUNBOOK.md) (wie man prüft).

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
laufenden `ssh-agent` und hinterlegte SSH-Keys voraus (die CI baut das in
`ci-rb.yml` eigens auf: `useradd testuser`, `ssh-keygen`, `authorized_keys`,
`service ssh restart`). Lokal ohne dieses Setup → erwartbare Fehlschläge.

> **Vorsicht mit dieser Erklärung.** Sie stimmt — sie wurde aber auch benutzt,
> um sieben Fehlschläge abzuhaken, die in Wahrheit ein echter Fehler waren:
> `net-ssh` 6.1 baut RSA-Schlüssel über eine Methode, die OpenSSL 3
> unveränderlich gemacht hat, sichtbar erst unter Ruby 3.2. Behoben mit
> `net-ssh` 7.3.3. Wer einen SFTP-Fehlschlag als „fehlt halt lokal" abtut,
> sollte ihn einmal im CI-Image gegenprüfen, wo das Setup vorhanden ist.


---

## Referenzen

- CI Ruby/RSpec: `.github/workflows/ci-rb.yml` (kanonischer Testbefehl,
  DB-Setup, SSH-Setup, RDKit-Image, Coverage-Gate 57 %).
- DB-Cleaner: `spec/support/database_cleaner.rb`.
- Test-Bootstrap: `spec/rails_helper.rb`, `spec/spec_helper.rb`.
- JWT/Auth: `app/models/json_web_token.rb`, `app/api/api.rb`,
  `app/api/chemotion/authentication_api.rb`.
- DB-Config: `config/database.yml`, `config/database.yml.ci`.
