# DEV_RAILS_UPGRADE_3-0.md

Konkrete Code-Änderungen für **Ruby 2.7.8 → 3.0** im Chemotion ELN.

Basis: vollständiger Static-Sweep der **gesamten** Ruby-Fläche (app 480 `.rb` +
44 `.haml` + 3 `.erb`, db 447, lib 114, config 57, spec 354, `bin/`, `config.ru`,
`Rakefile`) gegen die dokumentierten Ruby-3.0-Breaking-Changes. Stand 2026-08,
Branch `rails-upgrade-6-1-7-10`.

> **Einordnung:** 3.0 ist nur ein **Zwischenschritt** (selbst EOL seit ~04/2024).
> Ziel bleibt 3.3 (labimotion-Cap `< 3.4`), mit 3.1 als Haupt-Checkpoint — aber die
> **kwargs-Kosten** fallen genau am 2.7→3.0-Übergang an, darum eigener Pass.
> Rails 6.1.7.10 unterstützt Ruby 3.0, labimotion erlaubt `>= 2.7` → **kein
> Dependency-Blocker**.

> ## ✅ UPGRADE ANGEWANDT & verifiziert (2026-08)
> Der Umstieg ist **im Working-Tree vollzogen** (Pins gesetzt) und auf echtem
> Ruby 3.0.7 grün:
> - **Pins gesetzt:** `.tool-versions` → `ruby 3.0.7`, `Gemfile` → `ruby '3.0.7'`,
>   `Gemfile.lock` → `RUBY VERSION: ruby 3.0.7p220` (Lock-Diff **nur** diese Sektion).
> - **Alle 307 Gems** bauen auf der 3.0-ABI — **inkl. der git-basierten nativen
>   Chemie-Gems** (openbabel C++/SWIG, inchi/rinchi, semacode). → größtes
>   Rest-Risiko (§G) **entkräftet**.
> - **App bootet** auf 3.0.7 (`Rails 6.1.7.10 on Ruby 3.0.7`, Classic-Autoloader intakt).
> - **Volle Spec-Suite (ohne features): `2260 examples, 11 failures, 48 pending`
>   auf 3.0.7 — IDENTISCH zur 2.7-Baseline** (die 11 sind die bekannten
>   umgebungsbedingten; **keine** neue/3.0-spezifische Fehlschläge, keine Regression).
> - Migrationen liefen sauber; die von Lars vermutete „kaputte Migration" **brach nicht**
>   (sie bricht erst bei **Psych 4 / Ruby 3.1** — siehe `DEV_RAILS_UPGRADE_3-1.md`).
>
> **⚠️ Noch offen (INFRA, außerhalb des Containers):** Das **Base-/Runner-Image
> liefert weiterhin nur 2.7.8**. `.tool-versions` zeigt jetzt auf 3.0.7, das im
> **laufenden** Container installiert ist — ein **`docker compose up --build`
> (Neubau aus dem Image) würde 3.0.7 NICHT finden → Boot-Bruch**. Vor einem Rebuild
> also: **Image auf 3.0.7 bauen & pushen + CI-Runner umstellen**. Danach committen.
> Ebenfalls offen: **manuelle UI-QA** der Domänen-Pfade.

---

## A. Harte Breaker — MÜSSEN vor 3.0 gefixt werden (3 Stellen) — ✅ GEFIXT

Diese rufen in 3.0 **entfernte** Methoden auf → `NoMethodError`/`ArgumentError`
zur Laufzeit (keine Warnung). Es sind die **einzigen** drei im ganzen Projekt.
**Alle drei sind angewandt** (2026-08, 2.7-und-3.0-kompatibel, Suite-Baseline hält).

### A1 — `URI.escape` (entfernt in 3.0)
**Datei:** `app/api/chemotion/attachment_api.rb:66`
**Kontext:** Dateiname für `Content-Disposition`-Header beim Attachment-Download.
```ruby
# vorher
filename = URI.escape(ds_filename)
# nachher (exakter Drop-in, gleiches Escaping-Verhalten)
filename = URI::DEFAULT_PARSER.escape(ds_filename)
```
`URI.escape` war intern genau `URI::DEFAULT_PARSER.escape` → verhaltensgleich.
(Sauberere Langzeit-Variante wäre RFC-5987-`filename*`; optional, nicht nötig.)

### A2 — `URI.encode` mit Custom-Charset (entfernt in 3.0) — **die heikle**
**Datei:** `lib/pub_chem.rb:87`
**Kontext:** SMILES für die PubChem-URL escapen; 2. Argument = Menge der zu
escapenden Zeichen (SMILES-Sonderzeichen).
```ruby
# vorher
encoded_smiles = URI.encode(smiles, '[]/()+-.@#=\\')
# nachher (DEFAULT_PARSER.escape akzeptiert dieselbe (string, unsafe)-Signatur)
encoded_smiles = URI::DEFAULT_PARSER.escape(smiles, '[]/()+-.@#=\\')
```
⚠️ **Kein CGI.escape/ERB::Util-Ersatz** — die escapen einen **anderen**
Zeichensatz und **korrumpieren SMILES-Queries still**. Zwingend mit bekannten
SMILES gegentesten (Chemie-Datenpfad).

### A3 — `ERB.new` alte Positional-Signatur (entfernt in 3.0)
**Datei:** `lib/reporter/html/reaction_list.rb:43`
**Kontext:** `ERB.new(str, safe_level, trim_mode)` — `safe_level` fiel in 3.0 weg;
`nil, '%<>'` würde jetzt als `(trim_mode, eoutvar)` fehlinterpretiert.
```ruby
# vorher
ERB.new(template, nil, '%<>').result(render_binding)
# nachher (Keyword-Signatur)
ERB.new(template, trim_mode: '%<>').result(render_binding)
```

---

## B. `Dir.glob` / `Dir[]` sortiert jetzt per Default — Verhaltensänderung (kein Crash)

In 3.0 liefert `Dir.glob`/`Dir[]` die Ergebnisse **sortiert** (vorher OS-Reihenfolge,
unter Linux undefiniert). **Kein Absturz** — aber Code, der sich auf die alte
Reihenfolge verlässt, verhält sich anders. Alte Reihenfolge erzwingbar via
`Dir.glob(pat, sort: false)`.

**23 Fundstellen** (app/lib/config/db/spec/bin). Bewertung: **überwiegend
order-neutral** → kein Handlungsbedarf. Zu **prüfen** sind nur wenige:

| Stelle | Reihenfolge relevant? |
|---|---|
| `lib/chemotion/generate_file_hash_utils.rb:78` | gibt Glob-Array zurück; falls Aufrufer `.first` nimmt, ändert sich die Auswahl — praktisch aber **unique** Safety-Sheets pro Produkt → geringes Risiko |
| `config/application.rb:31–36` (`autoload_paths += Dir[...]`) | Load-Reihenfolge; **Rails-verwaltet** + fällt mit Zeitwerk (Stage 4) ohnehin weg → geringes Risiko |
| `bin/delayed_job` (PID-Globs `.first`/`.map`) | `.first` auf `delayed_job*`-PIDs könnte anderen Worker treffen → operativ, gering |
| **Rest (≈20)** | order-neutral: `.empty?`/`.length`/`.reject`/`max_by`/`rm_rf`/bereits `.sort`/`.sort_by` → **safe** |

**Empfehlung:** keine Änderung nötig; die 3 Kandidaten beim 3.0-Lauf kurz
gegenprüfen. Falls Reihenfolge doch kritisch: `sort: false` (Alt-Verhalten) oder
explizites `.sort` ergänzen.

---

## C. kwargs-/Named-Parameter-Separation — Laufzeit-Pass (NICHT grep-bar)

Der **#1-Breaker** von 2.7→3.0. Static-Analyse zeigt **geringe Fläche** (kein
`ruby2_keywords`, kein `def(*args, **opts)`-Forwarding, nur 2 `method_missing`,
0 Hash-Rocket-DSL-Calls in `db/`) — **aber grep kann kwargs nicht beweisen**, und
**mindestens eine Migration ist als betroffen bekannt** (Lars).

**Vorgehen (verbindlich, VOR dem Versions-Flip, noch auf 2.7.8):**
1. Suite + Boot mit Deprecation-Warnungen laufen lassen:
   ```bash
   docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && \
     RUBYOPT="-W:deprecated" RAILS_ENV=test bundle exec rspec \
     --exclude-pattern "spec/{features}/**/*_spec.rb" spec --seed 57765'
   ```
2. **Jede** Warnung „*Using the last argument as keyword parameters is
   deprecated*" auf **null** bringen — Fix i. d. R.: Doppel-Splat am Call-Site
   (`foo(**opts)` statt `foo(opts)`).
3. Migrationen separat gegenprüfen (die bekannte kaputte Migration lebt hier):
   ```bash
   docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && \
     RUBYOPT="-W:deprecated" RAILS_ENV=test bundle exec rake db:migrate:reset 2>&1 | grep -i keyword'
   ```
**✅ Durchgeführt (2026-08, Ruby 2.7.8, `--seed 57765`) — 7 App/Lib-Fundstellen,
alle gefixt und verifiziert:**

| Fundstelle | Aufruf | Fix |
|---|---|---|
| `app/models/sample.rb:495` | `Molecule.find_or_create_by_molfile(molfile, babel_info)` | `**babel_info` |
| `app/api/chemotion/molecule_api.rb:60` | dito | `**babel_info` |
| `lib/import/import_sdf.rb:289` | `find_or_create_by_molfile(mf, babel_info)` | `**babel_info` |
| `lib/svg/products_composer.rb:39` | `compose_material_group products, { start_at:, y_center: }` | Klammern weg (echte kwargs) |
| `app/models/message.rb:24` | `Channel.build_message(args)` | `**args` |
| `app/models/concerns/tagging.rb:50` | `update_tag!(args)` | `**args` |
| `spec/support/shared_examples/a_graphql_resolver_for_single_object.rb:18` | `resolver.resolve(params)` | `**params` |

Alle Ziel-Methoden haben `**`-Signaturen (verifiziert) → `**` am Call-Site ist der
korrekte, auf 2.7 **und** 3.0 gültige Fix.

**Verifikation:**
- **Migrationen:** `db:migrate:reset` (alle 431 Migrationen frisch) unter
  `-W:deprecated` → **0 kwargs-Warnungen**. Die von Lars vermutete „kaputte
  Migration" taucht als 2.7-Warnung **nicht** auf (entweder kein kwargs-Fall oder
  reines 3.0-Laufzeitverhalten → beim echten 3.0-Lauf gezielt gegenprüfen).
- **Suite nach Fix:** `-W:deprecated`-Lauf → **0** verbleibende App/Lib-kwargs-
  Warnungen, **0** Gem-interne kwargs-Warnungen (die 2 aus `postgresql_adapter`
  verschwanden mit den App-Fixes). Tally **2260 examples, 11 failures, 48 pending**
  = **Baseline unverändert** (die 11 umgebungsbedingten, siehe 0.2 im Haupt-Doc).
- Verbleibende Nicht-kwargs-Warnung (harmlos): `prawn-svg` „Pattern matching is
  experimental" — Gem, nicht unser Code, verschwindet auf 3.0.

> **Rest-Risiko:** Der Sweep erfasst nur **ausgeführte** Pfade (Coverage ~57 %).
> kwargs-Fälle in ungetestetem Code (v. a. Chemie-Lib) tauchen erst zur Laufzeit
> auf → beim echten 3.0-Lauf + manueller QA der Domänen-Pfade gegenprüfen.

---

## D. Geprüft & sauber (keine Änderung nötig)

Über die **gesamte** Ruby-Fläche gegen die 3.0-Change-Liste geprüft (Literal-Pfade,
`wc -l`-verifiziert — siehe Methodik-Hinweis unten) — **keine** Treffer:
- `File.exists?` / `Dir.exists?`, `Fixnum`/`Bignum`, `Object#taint`/`untaint`,
  `$SAFE`/`$KCODE`, numbered-param-Zuweisung (`_1 =`).
- **`Random::DEFAULT`** (deprecated 3.0, entfernt 3.2) — 0.
- **`Kernel#lambda` ohne Literal-Block** (`lambda(&var)`) — 0.
- **`SortedSet`** (aus `set` entfernt) — 0.
- **`TRUE`/`FALSE`/`NIL`-Konstanten** — nur in **Schema-Annotation-Kommentaren**
  (`# default(FALSE)` = SQL, kein Ruby) → kein Code betroffen.
- **`Enumerable#grep`** (2 Stellen, `import_wellplate_spreadsheet.rb`) — lesen
  danach **kein** `Regexp.last_match`/`$~` → von der 3.0-Änderung nicht betroffen.
- Entfernte stdlib-Requires (`webrick`/`xmlrpc`/`net-telnet`/`sdbm`).
- String/Array-Subklassen (Rückgabetyp-Änderung) — keine vorhanden.
- **`open-uri`:** 4 Dateien `require 'open-uri'`, aber **kein** blankes
  `open(url)` (der in 3.0 entfernte `Kernel#open`-Patch) → Requires sind
  **vestigial**, ungefährlich (optional aufräumbar).
- **`db/` (447 Migrationen), `spec/` (354), `bin/`, Templates (`.haml`/`.erb`):**
  frei von entfernten Methoden.

> **Methodik-Hinweis:** Der Sweep deckt die **gesamte** Ruby-Fläche ab (app inkl.
> `.haml`/`.erb`-Templates, lib, config, db, spec, bin, `config.ru`, `Rakefile`;
> `app/javascript` ist reines JS). **Wichtig:** grep-Läufe **immer mit
> Literal-Pfaden** — eine Shell-Variable als Pfadliste (`grep … $DIRS`) lieferte
> in dieser Umgebung sporadisch **falsche 0-Treffer** (leere Expansion → grep liest
> stdin). Alle „0"-Angaben oben sind literal gegengeprüft.

---

## E. Abgrenzung — gehört NICHT zu 3.0 (spätere Schritte)

- **Psych 4 / `YAML.load` safe-by-default** (`lib/chemotion/periodic_table.rb:3`)
  + **Delayed-Job-Payload-Risiko** → **Ruby 3.1**. 3.0 liefert noch Psych 3.x,
  Verhalten unverändert.
- **`OpenStruct`** (4 Reporter-Dateien) → Bundled-Gem-Status erst viel später.
- **Native Extensions** (nokogiri/sassc/rmagick) → ABI-Rebuild (Image/Infra),
  kein Code.

---

## F. Verifikation nach dem Fix

- [ ] A1–A3 gepatcht; die betroffenen Pfade gezielt getestet:
      Attachment-Download (A1), PubChem-SMILES-Lookup mit bekannten SMILES (A2),
      HTML-Reaction-List-Report (A3).
- [ ] B: die 3 order-sensiblen `Dir.glob`-Kandidaten beim 3.0-Lauf gegengeprüft.
- [ ] kwargs-Pass (C): `-W:deprecated`-Lauf **ohne** keyword-Warnungen; `db:migrate`
      von Grund auf grün.
- [ ] Ruby 3.0 im Container/Runner-Image verfügbar (asdf/Image), dann Suite:
      **identische Fail-Menge** (die 11, Seed 57765; Beispiel-Zahl driftet).
- [ ] Smoke-Test (API 200/401) + Boot unverändert.
- [ ] Native Gems für 3.0-ABI neu gebaut.

### Aktivierung — ✅ ANGEWANDT (Working-Tree)

Die Versions-Pins sind **gesetzt** (nicht mehr als Patch): `.tool-versions`
(`ruby 2.7.8` → `3.0.7`), `Gemfile` (`ruby '3.0.7'`), `Gemfile.lock`
(`RUBY VERSION: ruby 3.0.7p220`). Suite auf 3.0.7 grün (Baseline). **Noch nicht
committet** (read-only-git). Der frühere `ruby-3.0-pin.patch` ist damit obsolet und
wurde entfernt.

**Noch offen, BEVOR ein Container-Rebuild oder CI-Lauf gefahren wird:**
1. **Base-/Runner-Image (dev + `complat/chemotion_eln_runner`) mit Ruby 3.0.7 bauen
   & pushen** (Infra — nicht im Container machbar). ⚠️ Kritisch: `.tool-versions`
   zeigt jetzt auf 3.0.7, das nur im **laufenden** Container installiert ist. Ein
   `docker compose up --build` ohne 3.0-Image → asdf findet 3.0.7 nicht → **Boot-Bruch**.
2. CI-Runner auf das 3.0-Image umstellen (`ci-rb.yml`).
3. `.tool-versions`, `Gemfile`, `Gemfile.lock` + Code-Fixes committen.
4. Manuelle UI-QA der Domänen-Pfade.

> 3.0 ist nur der erste Halt; spätere Schritte heben den Pin auf 3.1 → 3.2 → 3.3
> (Reihenfolge & Fixes: `DEV_RAILS_UPGRADE_3-1.md` ff.).

---

## G. Gem-Kompatibilität mit Ruby 3.0

**Automatischer Check (2026-08):** alle **307** gebündelten Gems gegen Ruby 3.0.0
geprüft (`required_ruby_version.satisfied_by?(3.0.0)` über `Bundler.load.specs`):
→ **Kein Gem endet die Ruby-Unterstützung bei 3.0**, **keines** deklariert
Inkompatibilität. Kein Versions-Bump aus deklarierten Gründen nötig.

**Aber `required_ruby_version` fängt keine Compile-Brüche.** Das reale Rest-Risiko
sind **Native-Extension-Gems**, die gegen die **3.0-ABI neu kompilieren** müssen
(Image-Rebuild, kein Versions-Bump):

| Gem (Version) | 3.0-Status |
|---|---|
| `nokogiri 1.15.7` | ✅ 3.0 seit 1.11 (precompiled linux) |
| `ffi 1.17.2` | ✅ (≥1.14) |
| `sassc 2.4.0` | ✅ läuft — aber libsass ist **EOL** (Deprecation, kein Breaker) |
| `rmagick 5.5.0` / `mini_magick 5.2.0` | ✅ (System-ImageMagick nötig) |
| `msgpack 1.8.0` / `racc 1.8.1` / `json 2.19.5` / `bootsnap 1.18.6` / `byebug 11.1.3` | ✅ |
| **`openbabel 2.4.90.3` (git, C++/SWIG)** | ⚠️ **Compile-Risiko** — muss gegen Ruby-3.0-Header bauen; kein publiziertes 3.0-Testing → **beim Image-Build verifizieren** |
| **`inchi-gem` / `rinchi-gem` (git, ComPlat-Chemie)** | ⚠️ dito (native Chemie-Bindings) |
| `semacode` (git, C-Ext) | ⚠️ Compile-Risiko |
| `sablon` / `thumbnailer` (git) | 🟡 vermutl. Ruby/Shell → gering |

**Nicht-3.0-Blocker, aber ohnehin Update-würdig** (aus Gem-Audit im Haupt-Doc):
`omniauth 1.9.2` (CVE → Security-Update, läuft auf 3.0), `puma < 6.0.0`-Pin
(läuft auf 3.0), `sassc`/libsass (EOL).

> **Fazit:** Kein Gem **blockt** 3.0 und keines muss wegen 3.0 **hochgezogen**
> werden. Einzige echte Unbekannte: bauen die **git-basierten nativen Chemie-Gems**
> (openbabel/inchi/rinchi/semacode) im 3.0-Image? Das lässt sich **erst beim
> Image-Rebuild** klären (Ruby 3.0 ist im aktuellen Container nicht installiert).

---

## Quellen
- [Ruby 3.0.0 Release](https://www.ruby-lang.org/en/news/2020/12/25/ruby-3-0-0-released/)
- [Separation of positional and keyword arguments](https://www.ruby-lang.org/en/news/2019/12/12/separation-of-positional-and-keyword-arguments-in-ruby-3-0/)
- [ruby3-backward-compatibility (rails-lts)](https://github.com/rails-lts/ruby3-backward-compatibility) — Liste der in 3.x entfernten/gepatchten Methoden
- [Ruby 3.0 changes (rubyreferences)](https://rubyreferences.github.io/rubychanges/3.0.html)
