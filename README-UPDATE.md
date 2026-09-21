# Update auf Rails 7.2 / Ruby 3.2 — Übergabe

**Branch:** `update/a-rails72` · **Basis:** `complat/main` @ `7395f5d8c` (16.09.2026)
**Stand dieses Dokuments:** 17.09.2026 · **Sprache:** Deutsch, weil Übergabe im Team

Dieses Dokument erklärt, was in diesem Branch passiert ist, warum, und worauf
beim Review, Testen und Ausrollen zu achten ist. Die Details der einzelnen
Upgrade-Stufen stehen in [`docs/rails-upgrade/`](docs/rails-upgrade/); hier
steht, was man davon wissen muss.

> **Die Dokumente unter `docs/rails-upgrade/` sind Übergabe-Material und sollen
> nach der Übernahme wieder verschwinden** — jedes trägt oben einen
> entsprechenden Vermerk. Eine Ausnahme ist dort benannt.

---

## Worum es geht

**Der Auftrag war: Rails und Ruby aktualisieren.** Genau das — und nur das —
enthält dieser Branch. Alles, was darüber hinaus beim Arbeiten gefunden wurde,
liegt bewusst im gestapelten Branch `update/b-rails72-plus`.

Die Linie, entlang der dieses Dokument erzählt:

1. **Der Auftrag** — das eigentliche Upgrade.
2. **Was nötig war, damit es sauber läuft** — Brüche, die erst durch das
   Upgrade entstehen oder sichtbar werden.
3. *(nur in Paket b)* **Was wir auf dem Weg gefunden haben** und was mit raus
   sollte.

| | vorher (`complat/main`) | nachher |
|---|---|---|
| Ruby | 2.7.8 | **3.2.11** |
| Rails | 6.1.7.10 | **7.2.3.2** |
| `load_defaults` | 6.0 | **7.2** |
| Bundler | — | 2.4.22 |
| devise-two-factor | — | 4.1.1 |
| paranoia | — | 3.1.0 |

---

## 1. Der Auftrag — das Upgrade

Das Upgrade wurde im August in kleinen, jeweils grün verifizierten Stufen
gebaut. Grundprinzip jeder Stufe: erst alle Vorarbeiten
auf der alten Version, dann **ein** Versions-Bump, dann die Framework-Defaults
einzeln durchschalten. Nie mehrere Baustellen gleichzeitig.

| Stufe | Was sie tatsächlich gebrochen hat | Wie gelöst | Detail |
|---|---|---|---|
| Rails 6.1.7.7 → 6.1.7.10 | nichts | Gem-Bump (upstream steht inzwischen selbst auf 6.1.7.10) | — |
| Ruby 2.7.8 → 3.0.7 | `URI.escape`, `URI.encode` mit eigenem Zeichensatz, `ERB.new` mit Positionsargumenten — alle entfernt | Drop-in-Ersatz (`URI::DEFAULT_PARSER.escape`, Keyword-Signatur) | [A1](docs/rails-upgrade/DEV_UPGRADE.md) |
| Ruby 3.0 → 3.1 | **Psych 4**: `YAML.load` ist sicher per Default und bricht bei Aliases/Symbolen — u. a. in einer alten Migration und beim Laden des Periodensystems | 5 Stellen auf `YAML.unsafe_load` / `unsafe_load_file` (das alte `load`-Verhalten) | [A2](docs/rails-upgrade/DEV_UPGRADE.md) |
| Rails 6.1 → 7.0 | **Zeitwerk** statt classic autoloader (der dicke Brocken), `Rails.application.secrets`, offene Redirects im RADAR-OAuth | Zeitwerk-Migration, Secrets abgelöst, `allow_other_host` | [B1](docs/rails-upgrade/DEV_UPGRADE.md) |
| Rails 7.0 → 7.1 | `devise-two-factor` musste auf 4.x, `paranoia`-Bump, `lib` fällt vom `$LOAD_PATH` | Gem-Bumps, Override `add_autoload_paths_to_load_path = true` | [B2](docs/rails-upgrade/DEV_UPGRADE.md) |
| Rails 7.1 → 7.2 | `config/secrets.yml` entfällt, `secret_key_base` muss aus ENV kommen | Secrets entkoppelt | [B3](docs/rails-upgrade/DEV_UPGRADE.md) |
| Ruby 3.1 → 3.2 | `thumbnailer`-Gem nutzt das entfernte `File.exists?` — Thumbnails brachen **still** | Gem ersetzt durch `image_processing` (MiniMagick, gleiches Verhalten: 800 px, JPEG q75, PDF 200 dpi) | [Teil C](docs/rails-upgrade/DEV_UPGRADE.md) |

Übersicht und Reihenfolge: [`DEV_UPGRADE.md`](docs/rails-upgrade/DEV_UPGRADE.md).
Test-Runbook: [`DEV_UPGRADE_TEST_RUNBOOK.md`](docs/rails-upgrade/DEV_UPGRADE_TEST_RUNBOOK.md).

**Die Einzelschritte bleiben als Commits erhalten** (`rails-upgrade-6-1-7-10`,
10 Commits). Weil gemergt und nicht rebased wurde, sind sie in der
Historie dieses Branches unverändert nachvollziehbar; die Tabelle oben fasst sie
nur für das Lesen zusammen (siehe „Wie der Branch entstanden ist").

---

## 2. Was nötig war, damit es sauber läuft

Upstream hat seit dem Schnitt des Upgrade-Branches am 18.08. weitergearbeitet.
Neuer Code, der gegen Rails 6.1 / Ruby 2.7 geschrieben wurde, trifft hier auf
7.2 / 3.2. Dazu kommen Punkte, die für eine grüne CI zwingend sind.

Der erste CI-Lauf auf diesem Branch zeigte **15 Fehler** — jeder davon ist
unten zugeordnet und behoben.

### 2.1 Vorarbeiten aus PR #37 (per `cherry-pick -x`, Herkunft im Commit)

| Commit | Was | Warum |
|---|---|---|
| `ff559d4ee` | `libyaml-dev`, `libssl-dev`, `libffi-dev` in `Dockerfile.p2d` | Psych 5 bündelt libyaml nicht mehr, ohne das scheitert der Ruby-3.2-Build; openssl/fiddle bekamen das 2.7-Image vorher nur transitiv |
| `9d710e501` | `config/secrets.yml` als ERB-Shim zurück | Die Embed-Boot-Kette des Images liest die Datei noch; Rails 7.2 braucht sie nicht mehr |
| `3b5a704f8` | `json_web_token`-Spec gegen den effektiven `secret_key_base` | Der Spec verglich einen fest eingetragenen Token, signiert mit dem Schlüssel aus `config/secrets.yml` — die Datei ist mit 7.2 weg, die Signatur stimmte nicht mehr |

### 2.2 GitHub-CI kann das neue Ruby überhaupt erst bauen — `5ec112903`

**Das war der Grund, warum #37/#38 rot waren — nicht der Code.** Das geteilte
Runner-Image `complat/chemotion_eln_runner:latest` hat nur Ruby 2.7.8. asdf
fand für `.tool-versions` kein Ruby, `bundle install` starb mit Exit 126,
bevor ein einziger Spec lief.

Lösung: der Workflow installiert Build-Abhängigkeiten und baut das Ruby aus
`.tool-versions`, mit Cache pro Version. **Die eigentliche Lösung ist ein neues
Runner-Image von ComPlat** — das ist eine Bitte an Upstream, bis dahin trägt
dieser Schritt. Außerdem prüfte `ruby-audit` noch Ruby 2.7.8.

### 2.3 Chemikalien-Export: eingefrorenes Result — `e95838a36`

Seit Rails 7.1 friert `ActiveRecord::Result` seine Spaltenliste beim Anlegen
ein. `ExportChemicals.format_chemical_results` hat Spalten an Ort und Stelle
umbenannt und gelöscht → `FrozenError` beim SDF/Excel-Export mit
Chemikalienspalten.

Lösung: die Pipeline arbeitet auf einer veränderbaren Kopie, der Aufrufer
bekommt ein neues `Result` zurück. Die Helfer-Signaturen bleiben gleich.

### 2.4 SDF-Import-Specs unter Ruby 3 — `00e9b0218`

**Kein Fehler im Produktivcode.** Zwei Defekte in einem Upstream-Spec, die
auf Ruby 2.7 unsichtbar sind:

- **Keyword-Trennung (Ruby 3.0):** Mock-Wrapper reichten `*args` weiter; bei
  Methoden mit Keyword-Argumenten landen die als Hash in den Positionsargumenten
  → „wrong number of arguments (given 2, expected 1)".
- **Pfad-Präfix:** die Prüfung `start_with?(Rails.root.to_s)` trifft auch
  Gem-Pfade, wenn das Bundle-Verzeichnis denselben Präfix hat (z. B.
  `/workspace` und `/workspace-bundle`).

> **Korrektur:** in einer früheren Auswertung (Collector-Sync 14.09.) wurden
> diese beiden Fehler als geänderte Connection-Pool-Signatur in Rails 7.2
> gedeutet. Das war falsch.

### 2.5 SFTP unter OpenSSL 3 — `7d69078be`

Ruby 3.2 linkt gegen OpenSSL 3. `net-ssh` 6.1 baut RSA-Schlüssel über eine
Methode, die OpenSSL 3 unveränderlich gemacht hat:
`rsa#set_key= is incompatible with OpenSSL 3.0`. Das waren **alle 7
SFTP-Fehler** (Datacollector + Admin-Device). Kein fehlender Testserver, wie
die frühere Burn-down-Liste vermutete.

Lösung: `net-ssh` 7.3.3, dafür `net-scp` 3.0.0 → 4.1.0 (3.x deckelt net-ssh
unter 7). Aufgelöst mit `bundle lock --conservative`, nur diese beiden Gems
bewegen sich.

### 2.6 labimotion: falsche Klasse für `Wellplate` — `c1a823698`

**Workaround für einen Gem-Bug.** `labimotion` 2.3.0 (rc6 **und** final)
deklariert in `Labimotion::ElementsWellplate` ein `belongs_to :wellplate` ohne
`class_name`. Im Labimotion-Namespace löst das auf die gem-eigene,
Nicht-ActiveRecord-Klasse `Labimotion::Wellplate` auf → 5 Fehler in
`wellplate_api_generic_element_spec`.

Lösung: [`config/initializers/labimotion_elements_wellplate.rb`](config/initializers/labimotion_elements_wellplate.rb)
deklariert die Assoziation mit `class_name: '::Wellplate'` neu.

⚠️ **Die Datei ist ein Workaround und soll wieder weg**, sobald ein
labimotion-Release den Fix trägt. `optional: true` ist dort bewusst gesetzt —
die Begründung steht in der Datei. Bug-Report an labimotion ist vorbereitet.

### 2.7 delayed_job-Spec — `80225a2c3`

Ein Subprozess-Aufruf setzte `TEST_QUEUE_ADAPTER` nicht und lief damit gegen
den falschen Adapter. Spec-seitig, kein Produktivcode.

### 2.8 Aufräumen — `814e294c0` und Folgearbeit

Die zehn Stufen-Dokumente und die `test_fails`-Liste vom 18.08. lagen im Root
(rund 5.000 Zeilen). Sie wanderten zunächst nach
[`docs/rails-upgrade/`](docs/rails-upgrade/) und wurden vor der Übergabe auf das
eingedampft, was ein Außenstehender wirklich braucht:

| Datei | Was sie beantwortet |
|---|---|
| `DEV_UPGRADE.md` | Was wurde gemacht, Stufe für Stufe, mit jedem Bruch und seiner Lösung |
| `DEV_UPGRADE_TEST_RUNBOOK.md` | Wie prüft man es nach — inklusive der vier Abschnitte, die die automatische CI **nicht** abdeckt |
| `DEV_UPGRADING_ASSET_PIPELINE.md` | Wie der Frontend-Aufbau aussieht (zwei Pipelines nebeneinander) — keine Upgrade-Doku, sondern Bestandsaufnahme |
| `DEV_UPGRADING.md` | Acht Fallstricke beim lokalen Arbeiten, die aus keinem Commit hervorgehen |

Entfallen sind die sechs Stufen-Einzeldokumente (2.641 Zeilen; ihr Inhalt steht
konsolidiert in `DEV_UPGRADE.md`, die Langfassung in der Historie von
`rails-upgrade-6-1-7-10`) und `test_fails-2026-08-18.txt` — eine
Abarbeitungsliste, die abgearbeitet ist.

---

## Worauf man beim Ausrollen achten muss

Diese Punkte ändern nichts am Code in diesem Branch, entscheiden aber, ob ein
Deploy reibungslos läuft. Gesammelt aus den Stufen-Dokumenten.

1. **Alle Nutzer werden einmal ausgeloggt — außer mit Cookie-Rotation.**
   Upstream nutzt schon den JSON-Serializer; was die Sessions ungültig macht,
   ist `load_defaults 7.0` mit SHA256 statt SHA1 in der Schlüsselableitung.
   Entweder bewusst akzeptieren oder einen Rotator registrieren, der die alten
   SHA1-Cookies liest (Snippet im offiziellen Rails-7.0-Upgrade-Guide,
   §„Key generator digest class change"). **Offene Entscheidung.**
2. **`SECRET_KEY_BASE` muss in Produktion per ENV gesetzt sein.** Der
   `secrets.yml`-Fallback existiert nicht mehr.
3. **Cache-Format** ändert sich über 7.0 → 7.1 → 7.2. Cache vor dem Rollout
   leeren oder zweistufig deployen.
4. **Native Gems neu bauen** für die Ruby-3.2-ABI (openbabel, inchi, rinchi,
   semacode, nokogiri, rmagick). Alte Bundles laden nicht.
5. **`OTP_SECRET_KEY` mindestens 32 Byte**, sonst läuft 2FA nicht echt.
6. **Frische Datenbank:** `db:schema:load` ist upstream kaputt (die SQL-Funktion
   `collection_shared_names` verweist auf eine gelöschte Tabelle). Neue
   Instanzen mit `db:create db:migrate db:seed` aufsetzen.
7. **Ruby 3.2.11 ist EOL** — bewusst als Trittstein zu Rails 8.0 gewählt;
   danach zeitnah auf 3.3/3.4.
8. **`add_autoload_paths_to_load_path = true`** ist ein bewusster Override
   (Namenskollision `Encryptor`-Concern vs. Gem). Bei Rails 8 neu bewerten.

---

## Wie man es prüft

**Specs** laufen bei uns auf einem eigenen Runner — amd64 nativ, mit dem
echten CI-Image `complat/chemotion_eln_runner:latest` und einem
RDKit-Postgres daneben. Der Aufbau folgt `ci-rb.yml`: dieselben apt-Pakete,
Ruby aus `.tool-versions`, dann

```bash
RAILS_ENV=test bundle exec rspec --exclude-pattern "spec/{features}/**/*_spec.rb" spec
```

Das ist nichts, was ihr nachbauen müsst — GitHub Actions fährt denselben
Schnitt. Wir nennen es nur, weil die Zahlen unten von dort stammen und weil
sich auf amd64 nativ Fehler zeigen, die auf einer Entwicklermaschine nie
auftreten (der net-ssh-Bruch aus 2.5 war so einer).

**Immer nur ein Lauf gleichzeitig**, und den Branch nicht unter einem laufenden
rspec zurücksetzen.

**Ergebnis:**

| Lauf | Beispiele | Fehler | Anmerkung |
|---|---|---|---|
| vor den Fixes aus Abschnitt 2 | 3689 | 15 | 7 SFTP, 5 labimotion, 2 SDF-Import, 1 Export |
| gezielt nach den Fixes | 22 + 41 + 92 | 0 | SFTP · SDF-Import · Export/labimotion |
| voller CI-Schnitt nach den Fixes | 3689 | 0 | 44 pending, Line Coverage 72,46 % |

**Laufende Instanz:** Image aus diesem Branch, frische Instanz im Testnetz
(volle Migration beim Boot, kein Schema-Load). Ergebnis: healthy nach ~9 min,
`/api/v1/public/ping` 204, keine Boot-Fehler, Browser-Check (Login-Seite rendert, React-Pack
geladen) 3/3. Dazu ein Smoke-Skript per `rails runner` in der Instanz, alle
9 Prüfungen ok: Laufzeitversionen, Periodensystem, User + Collection, Molekül
aus Molfile (RDKit/OpenBabel), Sample mit Container, Chemikalien-Export auf
eingefrorenem `exec_query`-Ergebnis, labimotion-Reflection zeigt auf
`::Wellplate`, JWT-Roundtrip, net-ssh lädt einen RSA-Key (OpenSSL 3).

---

## Woher die Zuversicht kommt

Die Zahlen oben sind eine Momentaufnahme. Der eigentliche Grund, warum wir
diesen Stand für tragfähig halten, ist ein anderer: **Wir arbeiten seit einem
Monat darauf.**

Das Update wurde am **22.08.** in unseren Integrations-Branch übernommen.
Seitdem sind dort **rund 200 Commits** weiterer Arbeit entstanden — nicht am
Update, sondern *darauf*. Jede dieser Änderungen ist ein weiterer Beleg, dass
die Basis hält.

Im Testnetz laufen **neun Tenants** aus dieser Codebasis, drei davon unter
Dauerbeobachtung: seit dem **03.09.** haben ein Heartbeat und ein echter
Browser-Aufruf zusammen **5.111 Prüfungen** gefahren — **ein** Fehlschlag.
Der Heartbeat legt dabei jedes Mal ein Sample an, der Browser-Check lädt die
Anmeldeseite und prüft, dass das React-Pack wirklich gemountet ist.

Was auf dieser Basis inzwischen läuft:

- **Konfiguration aus der Umgebung**, pro Tenant im Admin-UI überschreibbar
  und ohne Neustart nachladbar, soweit der Schlüssel es erlaubt.
- **Rollen und Rechte** bis hin zu Gruppen-Admins und Delegation, mit Audit.
- **Gastzugriff**: Identitäten, Freigaben, Rechtedurchsetzung, UI-Kontext,
  Audit, Schreib-Eskalation.
- **Datenaustausch zwischen Tenants** — hier stehen wir am Anfang, aber
  Provenienz-IDs und das Export-Import-Format sind fertig und zwischen zwei
  Tenants live durchgespielt.
- Ein eigenes Betriebswerkzeug, das mehrere Chemotion-Instanzen im Testnetz
  verwaltet.

**Das erklärt auch, woher die Korrekturen in Abschnitt 2 stammen.** Der
eingefrorene `ActiveRecord::Result` beim Chemikalien-Export, der
net-ssh-Bruch unter OpenSSL 3, die falsch aufgelöste `Wellplate`-Assoziation
in labimotion — keiner davon fiel beim Lesen von Code auf. Sie kamen aus
laufenden Instanzen und aus vielen Durchläufen der Suite auf einem eigenen
CI-Rechner (amd64, echtes CI-Image), wo sich Fehler zeigen, die auf einer
Entwicklermaschine nie auftreten.

Zwei Dinge folgen daraus, die für euch relevant sind:

1. **Dieses Update ist bei uns keine Vorbereitung mehr, sondern Unterbau.**
   Wir bauen nicht darauf zu, sondern haben bereits darauf gebaut.
2. **Der zweite Teil dieser Vorarbeit ist der Client-Server-Split**, der
   ebenfalls noch kommt. Beides zusammen ist die Grundlage, auf der das
   Übrige steht.

---

## Wie der Branch entstanden ist

- `complat/main` @ `7395f5d8c` ist die Basis.
- Gemergt wurde **nicht** der rohe Upgrade-Branch, sondern `befdb2488`: das ist
  der Upgrade-Branch, der am 25.08. in PR #37 bereits mit `complat/main` versöhnt
  wurde. Dadurch blieb dessen Konfliktauflösung erhalten und nur die 24
  Upstream-Commits seitdem mussten neu versöhnt werden — zwei Konflikte, beide
  trivial (siehe Merge-Commit `fdd6d03d8`).
- **Merge, kein Rebase:** die Upgrade-Historie bleibt unverändert, niemand
  muss force-pushen.
- Vorher wurden alle Branch-Köpfe als Tags eingefroren:
  `backtrack/pre-update-2026-09-17/*`.

**Verhältnis zu den offenen PRs auf megorei:** #39 (`rails-upgrade-6-1-7-10` →
`main`) bleibt bewusst unverändert als Referenz. #37 und #38 waren die
Vorbereitungs-PRs; ihre Inhalte stecken jetzt in diesem Branch bzw. in
Paket b.

---

## Was bewusst NICHT in diesem Branch ist

- **Alles, was nicht zum Update gehört.** Das liegt in `update/b-rails72-plus`
  (baut auf diesem Branch auf; `compare update/a-rails72...update/b-rails72-plus`
  zeigt nur die Extras).
- **Multitenancy-Arbeit** — die läuft bei uns bereits auf dieser Basis
  (siehe „Woher die Zuversicht kommt"), gehört aber nicht in dieses Paket.
- **Der Client-Server-Split** (`make-login-api-compatible`) — der zweite Teil
  der Vorarbeit, kommt getrennt.

---

## Referenzen

- Stufen-Dokumentation: [`docs/rails-upgrade/`](docs/rails-upgrade/)
- Upgrade-Branch mit Einzelschritten: `rails-upgrade-6-1-7-10` (PR #39)
- Vorbereitung: PR #37, #38
- Planung (Planungs-Repo, Nextcloud): `docs/update-release-plan.md`,
  `korrespondenz/2026-09-03-labimotion-wellplate-bug.md`
