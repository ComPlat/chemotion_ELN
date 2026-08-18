# DEV_RAILS_UPGRADE_3-1.md

Konkrete Code-Änderungen für **Ruby 3.0 → 3.1** im Chemotion ELN.

Basis: Web-Recherche der Ruby-3.1-Änderungen + vollständiger Static-Sweep der
gesamten Ruby-Fläche (literal-Pfade, verifiziert). Stand 2026-08, Branch
`rails-upgrade-6-1-7-10`.

> **Kernbefund:** Der einzige projektrelevante Breaker von 3.0 → 3.1 ist **Psych 4**
> (`YAML.load` ist ab Ruby 3.1 **safe-by-default**). Alles andere aus 3.1 ist
> additiv/unkritisch (siehe §C). 3.1 ist der Schritt, der **vor** 3.2 kommt und den
> Weg über 3.0 hinaus überhaupt erst freigibt.

---

## Hintergrund: Was Psych 4 ändert (Psych 3 → 4)

Psych 4.0 kommt gebündelt mit **Ruby 3.1** (Dez 2021). Auf Ruby ≤ 3.0 gilt Psych 3.x
(unsicheres `load`) — genau deshalb lief der Code auf dem 3.0.7-Test grün und bricht
erst ab 3.1.

**Die eine Kern-Änderung:** `YAML.load` wechselt von **unsicher → sicher**.
- **Psych 3:** `YAML.load(str)` = volle Deserialisierung — instanziiert nahezu alles
  (Symbols, Date/Time, beliebige `!ruby/object:…`, löst YAML-Aliases auf).
- **Psych 4:** `YAML.load(str)` ist Alias für **`safe_load`** — erlaubt nur die
  Basistypen (`nil`, `true`/`false`, `Integer`, `Float`, `String`, `Array`, `Hash`)
  und **lehnt alles andere ab**, wenn nicht explizit erlaubt.

**Vollständige Liste der Änderungen:**
1. **`YAML.load` → `safe_load`** (dito **`YAML.load_file` → sicher**).
2. **Neu: `YAML.unsafe_load` / `unsafe_load_file`** — stellt das ALTE `load`-Verhalten
   bereit. Migrationspfad: `YAML.load` (alt) → `YAML.unsafe_load` (neu). *(Kam in
   **Psych 3.3.2**, also **schon in Ruby 3.0.7** vorhanden; fehlt nur in 2.7.8/Psych 3.1
   → siehe Fix-Wahl unten.)*
3. **`safe_load`-Signatur auf Keyword-Args umgestellt:** Psych 3
   `safe_load(yaml, whitelist_classes=[], whitelist_symbols=[], aliases=false, …)`
   (positional) → Psych 4 `safe_load(yaml, permitted_classes: [], permitted_symbols:
   [], aliases: false, …)` (keyword; `whitelist_*` → `permitted_*`). *(Deshalb wirft
   `YAML.load(str, permitted_classes:)` auf Psych 3.1 `ArgumentError`.)*
4. **Per Default abgelehnt** (die praktische Breaker-Liste): **`Symbol`**, `Date`/
   `Time`, `Struct`, jede custom-/`!ruby/object`-Klasse → **`Psych::DisallowedClass`**.
   YAML-**Aliases/Anchors** (`aliases: false`) → **`Psych::AliasesNotEnabled`**.

**Live verifiziert** (Container, Psych 3.1.0) — YAML mit Symbol-Key `:valueUnit`:
```
Psych 3 (jetzt):   YAML.load  → {:valueUnit=>"C", "data"=>[]}      # funktioniert
Psych 4 (ab 3.1):  YAML.load (== safe_load) → Psych::DisallowedClass: … Symbol
                   YAML.safe_load(y, [Symbol]) → {:valueUnit=>"C", …}  # mit Erlaubnis ok
```

**Escape-Hatches / Kontext:**
- `gem 'psych', '~> 3.3'` pinnen hält das Alt-Verhalten — **Stopgap**, kein Fix.
- **Rails 6.1.5+** bietet `config.active_record.yaml_column_permitted_classes` (im
  Projekt gesetzt, `application.rb:92`) → deckt **AR-serialisierte Spalten**
  (inkl. Delayed-Job-`handler`) ab. Nur **direkte `YAML.load`-Aufrufe** bleiben offen
  (§A). Rails 7.0 integriert Psych 4 vollständig.

---

## ⚠️ Fix-Wahl — hängt von der laufenden Psych-Version ab

**Psych-Versions-Matrix (verifiziert im Container gegen die Psych-Release-Notes):**

| Ruby | Psych | `unsafe_load` da? | `YAML.load` |
|---|---|---|---|
| 2.7.8 | 3.1.0 | ❌ **nein** | permissiv |
| **3.0.7** (aktueller Pin) | **3.3.2** | ✅ **ja** (in 3.3.2 nachgezogen) | **noch permissiv** |
| 3.1 | 4.0 | ✅ ja | **safe** ← der Break |
| 3.2 | 5.0 | ✅ ja | safe |

**Entscheidend:** `unsafe_load` kam in **Psych 3.3.2** — also **schon in Ruby 3.0.7**.
Da die App **jetzt auf 3.0.7 gepinnt** ist (nicht mehr 2.7), ist der einfache Fix
korrekt und ausreichend:

```ruby
# statt  YAML.load(x)         ->  YAML.unsafe_load(x)
# statt  YAML.load_file(path) ->  YAML.unsafe_load_file(path)
```

Das läuft **verhaltensgleich auf 3.0.7** (dort ist `load` noch permissiv, `unsafe_load`
ist identisch) und **forward-kompatibel auf 3.1/3.2** (Psych 4/5). **Kein Guard nötig.**
Alle Fundstellen unten laden **vertrauenswürdige** Daten (lokale Dateien + eigene
serialisierte DB-Daten) → `unsafe_load` ist die richtige, verhaltensgleiche Wahl.
(Für *unsichere* Daten wäre `safe_load(permitted_classes: […])` die strengere
Alternative — hier nirgends nötig.)

> **Nur falls der Code auch noch auf 2.7.8 laufen muss** (Psych 3.1, ohne `unsafe_load`):
> das Guard-Idiom nutzen — `YAML.respond_to?(:unsafe_load) ? YAML.unsafe_load(x) : YAML.load(x)`.
> Nach dem 3.0-Pin ist das **nicht mehr erforderlich**. **Die `after`-Blöcke unten zeigen
> die tatsächlich angewandte, nackte `unsafe_load`-Form** (das ist der committete Code).

---

## A. Zu ändernde Stellen: `YAML.load` / `YAML.load_file` (5 Fundstellen) — ✅ ANGEWANDT (2026-08)

### A1 — 🎯 Migration (der Haupt-Breaker; vermutl. Lars' „kaputte Migration")
**Datei:** `db/migrate/20171019102800_change_column_reactions_temperature.rb:10`
**Kontext:** Data-Migration liest die alte, Rails-**YAML-serialisierte**
`reactions.temperature`-Spalte (kann **Symbol**-Keys enthalten) und wandelt sie
nach JSON. Psych 4 `safe_load` verbietet `Symbol` per Default →
`Psych::DisallowedClass`. **Läuft auf 3.0 noch (Psych 3), bricht ab 3.1.** Trifft
jeden From-Scratch-Setup (alle Migrationen laufen).
```ruby
# vorher
YAML.load(tmp).to_json
# nachher (angewandt)
YAML.unsafe_load(tmp).to_json
```

### A2 — Periodensystem-Daten
**Datei:** `lib/chemotion/periodic_table.rb:3`
```ruby
# vorher
data = YAML.load File.open yml_path
# nachher (angewandt)
data = YAML.unsafe_load File.read yml_path
```
(`File.read` statt `File.open` behebt nebenbei den offenen File-Handle.)

### A3 — VERSION-Datei beim Boot
**Datei:** `config/application.rb:20`
```ruby
# vorher
config.version = (File.exist?('VERSION') && YAML.load_file('VERSION')) || { … }
# nachher (angewandt)
config.version = (File.exist?('VERSION') && YAML.unsafe_load_file('VERSION')) || { … }
```

### A4 — Spec-Bootstrap (Test-Fixture)
**Datei:** `spec/spec_helper.rb:18`
```ruby
# vorher
bad_smiles = YAML.load_file('spec/fixtures/structures/bad_smiles.yml')
# nachher (angewandt)
bad_smiles = YAML.unsafe_load_file('spec/fixtures/structures/bad_smiles.yml')
```

### A5 — Factory (Test-Daten)
**Datei:** `spec/factories/attributes_set.rb:28`
```ruby
# vorher
when '.yml', '.yaml' then YAML.load_file(file_path)
# nachher (angewandt)
when '.yml', '.yaml' then YAML.unsafe_load_file(file_path)
```

---

## A6. Migrations-Fix — `index_exists?`-Arität (❗ NEU beim 3.1-Lauf gefunden, ✅ angewandt)

**Nicht Psych, sondern kwargs-Separation** — und **das war Lars' „mindestens eine
Migration bricht"**: sie läuft auf 2.7/3.0 durch, bricht aber **erst auf 3.1**
(strengere kwargs-Trennung in der AR-`method_missing`-Delegation).

**Datei:** `db/migrate/20250701121906_remove_ancestry_indices.rb:21`
**Fehler auf 3.1.7:** `ArgumentError: wrong number of arguments (given 1, expected 2)`
in `index_exists?`. Grund: `index_exists?(table_name, name: index_name)` übergibt nur
**1 positionales** Argument + `name:`-Keyword; AR erwartet `index_exists?(table_name,
column_name, options)`, also **2 positionale**. Auf ≤3.0 wurde `name: …` noch als
Hash in das positionale `column_name` absorbiert → lief. Auf 3.1 strikt getrennt → bricht.
```ruby
# vorher
remove_index(table_name, name: index_name) if index_exists?(table_name, name: index_name)
# nachher (angewandt) — column_name (aus der Schleife) als 2. Positional
remove_index(table_name, name: index_name) if index_exists?(table_name, column_name, name: index_name)
```
> **Warum die 2.7-`-W:deprecated`-Sweep das nicht fand:** Migrationen laufen nicht in
> der rspec-Suite; und der 3.0-`db:migrate:reset`-Lauf prüfte nur auf *keyword*-
> Warnungen, nicht auf harte Arg-Fehler — die kamen erst beim echten 3.1-Lauf.
> **Lehre für die Runbook:** `db:migrate:reset` beim Ziel-Ruby auf **Abbrüche**
> prüfen, nicht nur auf kwargs-Warnungen.

---

## B. Bereits abgesichert (keine Änderung nötig)

- **ActiveRecord-YAML-Spalten / Delayed-Job-Payloads:** `config/application.rb:92`
  setzt bereits `config.active_record.yaml_column_permitted_classes = [ … ]`. Das
  deckt die **AR-seitige** YAML-Deserialisierung (u. a. Delayed-Job-`handler`)
  gegen Psych 4 ab. → **nur die 5 direkten `YAML.load`-Aufrufe in §A** sind offen.

---

## C0. Gem-Kompatibilität mit Ruby 3.1

**Scan aller 307 Gems** (`required_ruby_version.satisfied_by?(3.1.0)`):
- **Kein Gem schließt Ruby 3.1 aus** — **keines** muss für 3.1 aktualisiert werden.
- Native-Extension-Gems (nokogiri, ffi, rmagick, sassc, msgpack, openbabel …)
  brauchen nur **Neukompilierung** im 3.1-Image (Image-Rebuild), **kein**
  Versions-Bump — die gelockten Versionen tragen 3.1 (auf 3.0.7 bereits bewiesen;
  nokogiri 1.15 trägt bis 3.2).

> ⚠️ **Forward-Look (für 3.3 relevant, NICHT für 3.1):** `nokogiri 1.15.7` deklariert
> `required_ruby_version >= 2.7, < 3.3.dev` → **läuft NICHT auf Ruby 3.3**. Beim
> 3.3-Schritt **auf ≥ 1.16 heben** (fügt 3.3-Support hinzu). Für 3.0/3.1/3.2 ok.
> Weitere Upper-Bounds harmlos: `labimotion < 3.4` (bekannter Cap; 3.4 braucht
> Bump), `faraday-follow_redirects`/`unicode-emoji` je `< 4.0` (Ruby-4, irrelevant).

## C. Übrige 3.1-Änderungen — geprüft, unkritisch

- **`net-smtp` / `net-imap` / `net-pop`** (in 3.1 aus den Default-Gems gelöst):
  liegen **alle im `Gemfile.lock`** (`net-imap 0.4.24`, `net-smtp 0.5.1`,
  `net-pop`, `net-protocol`) — transitiv über mail/actionmailer. Der einzige
  direkte `require 'net/imap'` (`lib/datacollector/mailcollector.rb:3`) löst
  sauber auf. → **keine Aktion.**
- **Keine relevanten Entfernungen in 3.1** — die harten Removals (`Object#=~`,
  `File.exists?`, `Random::DEFAULT`, `taint`-Familie, `Fixnum`/`Bignum`) kommen
  erst in **3.2** und sind im Projekt ohnehin **0×** vorhanden (per Static-Sweep
  gegen die 3.2-Change-Liste bestätigt).
- Rest von 3.1 ist additiv (Hash-Wert-Auslassung, Pattern-Matching-Pin-Operator,
  YJIT-Vorstufe) → nicht breaking.

---

## D. Durchführung — Pins & `Gemfile.lock`-Änderungen (✅ angewandt 2026-08)

**Version-Pins auf Ruby 3.1.7** (neuester 3.1-Patch, siehe `DEV_UPGRADE_TEST_RUNBOOK.md`):
| Datei | vorher → nachher |
|---|---|
| `.tool-versions` | `ruby 3.0.7` → `ruby 3.1.7` |
| `Gemfile` | `ruby '3.0.7'` → `ruby '3.1.7'` |
| `Gemfile.lock` (RUBY VERSION) | `ruby 3.0.7p220` → `ruby 3.1.7p261` |

**`Gemfile.lock` — Plattform-Änderung bei `ffi` (erwartet, NICHT übersehen):**
```
-    ffi (1.17.2)
+    ffi (1.17.2-aarch64-linux-gnu)
+    ffi (1.17.2-x86_64-linux-gnu)
```
Grund: **Ruby 3.1 änderte das Gem-Plattform-Triple** — es enthält jetzt die libc
(`…-linux-gnu` statt `…-linux`). Bundler löst `ffi` deshalb auf die
plattformspezifischen Precompiled-Varianten auf (statt der generischen). **Kein
Problem, kein Handlungsbedarf** — der `PLATFORMS`-Block bleibt `aarch64-linux` /
`x86_64-linux` (matcht die `-gnu`-Gems). Nur bewusst dokumentiert, damit der
Lock-Diff nachvollziehbar ist (Kern = **nur** RUBY VERSION + diese ffi-Zeilen).

---

## E. Verifikations-Ergebnis (Ruby 3.1.7, 2026-08) — ✅ GRÜN

- [x] **6 Code-Fixes angewandt:** 5× `YAML.load → unsafe_load` (§A) + 1× Migrations-
      Arität (§A6).
- [x] **Ruby 3.1.7** installiert (Psych **4.0.4**), alle 307 Gems auf 3.1-ABI neu
      gebaut (inkl. native Chemie-Gems).
- [x] **Boot** grün: `Rails 6.1.7.10 on Ruby 3.1.7 / Psych 4.0.4` — der
      `application.rb`-`unsafe_load_file`-Fix läuft unter Psych 4.
- [x] **Alle 431 Migrationen** laufen durch (A1 Psych-4 + A6 kwargs waren die zwei
      Knackpunkte; `db:migrate:reset` **auf Abbrüche** geprüft, nicht nur kwargs).
- [x] **Volle Spec-Suite** (ohne features): `2260 examples, 11 failures, 48 pending`
      = **identische Baseline** (die 11 umgebungsbedingten), **keine Regression**.
- [ ] Offen (Infra, außerhalb Container): Base-/Runner-**Image auf 3.1.7** bauen +
      CI umstellen (`.tool-versions` zeigt auf 3.1.7, das nur im laufenden Container
      installiert ist → Rebuild ohne Image bricht). Danach committen.
- [ ] Optional: API-Smoke + Browser-Click-Through auf 3.1.7 (Runbook §5/§6).

---

## Quellen
- [Ruby 3.1 changes — Psych 4 (rubyreferences)](https://rubyreferences.github.io/rubychanges/3.1.html)
- [Psych 4 `load` vs `unsafe_load`](https://github.com/ruby/psych)
- [Ruby 3.1.0 Release](https://www.ruby-lang.org/en/news/2021/12/25/ruby-3-1-0-released/)
