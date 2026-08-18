# DEV_RAILS_UPGRADE_3-2.md

Konkrete Schritte & Code-Änderungen für **Ruby 3.1 → 3.2** im Chemotion ELN.

Basis: Web-Recherche der Ruby-3.2-Änderungen + vollständiger Static-Sweep der
gesamten Ruby-Fläche (literal-Pfade, verifiziert gegen den aktuellen Baum). Stand
2026-08, Branch `rails-upgrade-6-1-7-10`.

> **Status: ✅ AUSGEFÜHRT & VERIFIZIERT (2026-08, Ruby 3.2.11).** Suite zurück auf
> Baseline (`2267/11` non-feature, Seed 57765 — 2260 Alt + 7 neue Generator-Specs;
> die 11 sind die bekannten umgebungsbedingten). Ein realer Run-Breaker
> (`thumbnailer`-Gem, siehe §A2) tauchte auf und ist gefixt. Offen: nur noch
> Image-/CI-Rebuild (§D-8) + Commit (§D-9).
>
> **Vorbedingung war erfüllt:** Die Reihenfolge-Entscheidung (2026-08) war „3.2 erst
> für Rails 7.2". Die App lief auf **Rails 7.2.3.2 / Ruby 3.1.7** → die Stufe war
> fällig. Rails 7.2 verlangt Ruby ≥ 3.1 (3.1.7 reichte, 3.2 zulässig); **Ruby 3.2.2+
> ist die Pflicht-Vorstufe für Rails 8.0** — daher ist 3.2 der passende Schritt.
>
> Interleaved-Pfad: Ruby 3.1 ✓ → Rails 7.0 ✓ → 7.1 ✓ → **Rails 7.2 ✓** →
> **Ruby 3.2 ✓ ← hier** → (Rails 8.0 braucht ≥ 3.2.2) → …
>
> **⚠️ Ziel-Patch 3.2.11 ist bereits EOL:** `ruby-build` meldet beim Install „past
> its end of life". 3.2 ist als **Trittstein zu Rails 8.0** (≥ 3.2.2) gewählt; sobald
> 8.0 steht, zeitnah auf eine gepflegte Ruby-Serie (3.3/3.4) weiter. `nokogiri
> 1.18.10` trägt bereits 3.3/3.4 → der Sprung ist gemswseitig frei.

> **Kernbefund:** 3.2 bringt für dieses Projekt **fast keine Code-Arbeit** (static).
> Die harten 3.2-Entfernungen sind im Code **0× vorhanden** (unten gegen den
> aktuellen Baum re-verifiziert). Der eigentliche Breaker auf dem Weg hierher lag
> eine Stufe früher (**Psych 4 / Ruby 3.1**, siehe `DEV_RAILS_UPGRADE_3-1.md`) und
> ist bereits gefixt. Der Rest von 3.2 ist ein **Pin-Bump + Image-Rebuild**.

> ⚠️ **Static ≠ definitiv — beim 3.2-Lauf erneut bestätigt:** Wie schon bei 3.1
> (Migrations-Arität) tauchte ein Breaker auf, den der Static-Sweep von §A **nicht**
> zeigen konnte, weil er **in einer Gem-Abhängigkeit** liegt, nicht im App-Code: das
> `thumbnailer`-Gem nutzt intern `File.exists?`/`Dir.exists?` (in 3.2 entfernt) →
> Thumbnails brachen still (9 Spec-Failures). Siehe **§A2**. Lehre: Static-Sweeps
> decken `app/lib/config/db/spec` ab, **nicht** die Interna von Gems — die verbindliche
> Liste liefert erst der echte Lauf (Suite + `db:migrate:reset` auf Abbrüche prüfen).

> **Ziel-Version (gewählt):** **`3.2.11`** — neuester verfügbarer 3.2-Patch
> (`asdf list all ruby | grep '^3.2'`), **nicht** `3.2.0` (Regel: „pin the newest patch
> of the target minor", `DEV_UPGRADE_TEST_RUNBOOK.md`). Patch p268.

---

## A. Harte 3.2-Entfernungen — alle 0× im Projekt (nichts zu tun)

Per Static-Sweep (app/lib/config/db/spec) gegen die 3.2-Removal-Liste geprüft —
**gegen den aktuellen Baum re-verifiziert (2026-08):**

| In 3.2 entfernt | Vorkommen im Projekt |
|---|---|
| `Random::DEFAULT` (deprecated 3.0) | **0** |
| `Object#=~` (gab immer `nil` zurück) | **0** als `Object#=~` |
| `Dir.exists?` / `File.exists?` (deprecated 2.1) | **0** (nur `File.exist?`) |
| `Object#taint`/`untaint`/`tainted?`/`trust`/`untrust`/`untrusted?` | **0** |
| `Method#public?`/`protected?`/`private?` (in 3.1 kurz da, 3.2 entfernt) | **0** |
| `Fixnum` / `Bignum` | **0** |

→ **Keine Änderung nötig** — im **App-Code**. Aber: dieselbe `File.exists?`-Entfernung
schlug **in einer Gem-Abhängigkeit** zu (§A2).

---

## A2. Real-Run-Breaker: `thumbnailer`-Gem nutzt `File.exists?` (❗ NEU beim 3.2-Lauf, ✅ gefixt)

**Symptom:** Nach dem 3.2-Bump **9 neue Spec-Failures**, alle Thumbnail-bezogen
(`attachment_spec`, `attachment_api_spec`, `third_party_app_api_spec`). Kein Crash —
`attachment.thumb` blieb still `false`.

**Ursache:** Das Gem `thumbnailer` (Git-Dep `merlin-p/thumbnailer`, unmaintained) ruft
intern **`File.exists?`/`Dir.exists?`** (in Ruby 3.2 **entfernt**). In `save_exists?`
steckt der Aufruf in `… rescue nil` → der `NoMethodError` wird verschluckt →
`Thumbnailer.create` gibt `nil` zurück → kein Thumbnail, `thumb` bleibt false.
Der Static-Sweep §A fand `File.exists?` im **App-Code** korrekt 0× — **Gem-Interna
sind davon nicht erfasst**. Upstream `master` hat denselben Bug (kein Fix zum Bumpen).

**Lösung — Gem ersetzt durch `image_processing` (Entscheidung des Users):** `thumbnailer`
war nur ein dünner Shell-out-Wrapper um ImageMagick/Ghostscript. Ersetzt durch eine
eigene Engine auf Basis des bereits vorhandenen `image_processing`-Gems (MiniMagick-
Backend → nutzt dieselben Binaries `convert`/`gs`). Verhalten unverändert (800 px,
weiß gepaddet, JPEG q75, PDF @ 200 dpi = alte thumbnailer-Initializer-Werte).

| Datei | Änderung |
|---|---|
| `app/usecases/attachments/thumbnail/thumbnail_generator.rb` | **NEU** — `ThumbnailGenerator.create(path)`/`.supported_formats` (Engine, image+pdf) |
| `…/thumbnail/thumbnail_creator.rb` | `Thumbnailer.create` → `ThumbnailGenerator.create`; `supported_formats` dito |
| `…/annotation/annotation_updater.rb` | `ThumbnailerWrapper#create_thumbnail`: `Thumbnailer.create` → `ThumbnailGenerator.create` |
| `lib/storage/storage.rb` | `regenerate_thumbnail`: `Thumbnailer.create` → `ThumbnailGenerator.create` |
| `config/initializers/thumbnailer.rb` | **gelöscht** (Werte als Konstanten in die Engine gezogen) |
| `Gemfile` / `Gemfile.lock` | `gem 'thumbnailer'` entfernt (324 → 323 Gems); `image_processing` war schon direkte Dep |
| `spec/…/thumbnail/thumbnail_generator_spec.rb` | **NEU** — 7 Specs (image/pdf/nil-Fälle) |
| `spec/…/thumbnail/thumbnail_creator_spec.rb` | Mock-Ziel `Thumbnailer` → `ThumbnailGenerator` |

> **Platzierung:** Engine liegt bei `Usecases::Attachments::Thumbnail::` neben dem
> `ThumbnailCreator` (Adapter/Engine-Trennung wie `annotation/mini_magick_image_analyser.rb`).
> `lib/storage` → `Usecases::` ist zulässig (Präzedenz: `lib/import/import_collections.rb`
> nutzt `Usecases::Attachments::Annotation::AnnotationUpdater`).

---

## B. 3.2-Verhaltensänderungen — geprüft, unkritisch

- **`Struct.new` akzeptiert jetzt positional UND keyword** (Default). Bruch-Fall lt.
  Changelog: `StructKlasse.new(key: val)` auf einem **ohne** `keyword_init` definierten
  Struct → `ArgumentError: unknown keyword`. **Verifiziert (aktueller Baum) — im
  Projekt kein solcher Aufruf:** beide Structs werden **positional** instanziiert —
  `VesselStruct.new(*row)` (`app/api/chemotion/vessel_api.rb:331`) und
  `MailDevice.new('mailcollector', 'Mail Collector')` (`lib/datacollector/mail_configuration.rb:21`).
  Kein `Struct.new(key:)`-Aufruf app-weit. → **safe.** (Die `OpenStruct`-Nutzung im
  Reporter ist von der Änderung nicht betroffen.)
- **`Object#=~` entfernt:** die `=~`-Stellen im Code sind alle `string =~ /regex/`
  (= `String#=~`, **bleibt**). Restrisiko nur **zur Laufzeit**, falls ein Empfänger
  `nil`/kein String ist (`nil =~ /re/` warf früher `nil`, jetzt `NoMethodError`).
  Niedrig — die betroffenen Variablen sind i. d. R. Strings. **Falls ein Empfänger
  nil sein kann:** `str.to_s =~ /re/` oder `str&.match?(/re/)`. Kein Pflicht-Fix.
- **`Hash#shift` auf leerem Hash** gibt jetzt immer `nil` (auch mit Default). Keine
  problematische Nutzung im Projekt gefunden.
- **Konstanten-Zuweisungsreihenfolge** (`Mod::CONST = expr` wertet `Mod` zuerst):
  seltenes Muster, im Projekt nicht relevant.

---

## B2. Psych 4 → 5 (Ruby 3.1 → 3.2) — kein App-Code, Infra bereits erledigt

Ruby 3.2 bringt **Psych 5.0** (Ruby 3.1 hatte Psych 4.0). Der große Break
(`YAML.load` safe-by-default) passierte **bereits in Psych 4** (siehe
`DEV_RAILS_UPGRADE_3-1.md`) — die dortigen Fixes (`unsafe_load`, 5 Fundstellen) tragen
unverändert auch auf Psych 5. **Kein zusätzlicher App-Code-Change für 3.2 nötig.** Aus
den Psych-5.0-Release-Notes für dieses Projekt relevant:

- 🔧 **Psych 5 bündelt libyaml NICHT mehr** — braucht **System-libyaml** zum
  Kompilieren der Native-Extension. → Das **Ruby-3.2-Image** muss `libyaml-dev`
  enthalten. Reine Infra/Image-Sache, kein Code.
  **✅ Bereits erfüllt:** `libyaml-dev` ist in **beiden** relevanten Dockerfiles
  gesetzt — `Dockerfile.chemotion-dev:18` und `Dockerfile.github-ci:11`. Der
  3.2-Build der Psych-Native-Extension geht damit sowohl im Dev-Container als auch in
  CI durch. **Keine Aktion offen.**
- `load`-Alias auf `unsafe_load` final entfernt — für uns irrelevant, da wir seit
  3.1 **explizit** `unsafe_load` aufrufen (`load` bleibt safe).
- Date/DateTime dumpen jetzt als proleptisch-gregorianisch (wie `Time`) — Edge-Case
  beim YAML-**Dump**; die App nutzt für Persistenz überwiegend JSON → unkritisch,
  aber falls irgendwo YAML mit Date-Werten gedumpt/verglichen wird, gegenprüfen.
- `strict_integer`-Option neu (opt-in) — nicht breaking.

---

## C. Gem-Kompatibilität mit Ruby 3.2

**Scan aller Gems** (`required_ruby_version.satisfied_by?(3.2.0)`):
- **Kein Gem schließt Ruby 3.2 aus** — **keines** muss für 3.2 aktualisiert werden.
- Native-Extension-Gems brauchen nur **Neukompilierung** im 3.2-Image
  (Image-Rebuild), **kein** Versions-Bump — die gelockten Versionen tragen 3.2.
- **`nokogiri 1.18.10`** (im Zuge der Rails-7.2-Stufe von 1.15.7 gehoben) trägt Ruby
  3.2 **und** 3.3/3.4 problemlos. → **Der frühere 3.3-Vorbehalt aus dieser Doku
  (nokogiri 1.15.7 `< 3.3.dev`) ist damit erledigt** — kein nokogiri-Bump mehr nötig,
  weder für 3.2 noch (perspektivisch) für 3.3.
- Sonstige Upper-Bounds harmlos: `labimotion < 3.4`, `faraday-follow_redirects` /
  `unicode-emoji` je `< 4.0` (Ruby-4) — für 3.2 irrelevant.

---

## D. Durchführung — Schritt für Schritt (✅ ausgeführt 2026-08)

> Ausgeführt **im laufenden Dev-Container** (Ruby zur Laufzeit via asdf im
> persistenten `homedir`-Volume). Muster:
> `docker exec chemotion_eln-app-1 bash -lc 'cd /home/ubuntu/app && …'`.
> Vollständige Runbook-Referenz: `DEV_UPGRADE_TEST_RUNBOOK.md` §1–6. Jeder Schritt
> unten mit **→ Ergebnis**.

**D-1 — Ziel-Patch festlegen.**
`asdf list all ruby | grep '^3.2'` → neuesten 3.2-Patch wählen.
**→ Ergebnis:** neuester verfügbar = **`3.2.11`** (p268). Im Folgenden `3.2.11`.

**D-2 — Ruby 3.2.11 installieren** (im Container, ins homedir-Volume):
```
asdf install ruby 3.2.11   # ~1 min, from-source-Compile
```
**→ Ergebnis:** installiert. ⚠️ `ruby-build` warnt „3.2.11 is past its end of life"
(siehe EOL-Hinweis oben — bewusst als Trittstein akzeptiert). Danach Bundler-Pin
nachziehen: `gem install bundler -v 2.4.22` (neues Ruby bringt 2.4.19 als Default).
(Base-/Runner-**Image** separat auf 3.2.11 bauen — siehe D-8.)

**D-3 — Version-Pins bumpen** (3 Dateien):
| Datei | vorher → nachher |
|---|---|
| `.tool-versions` | `ruby 3.1.7` → `ruby 3.2.11` |
| `Gemfile` | `ruby '3.1.7'` → `ruby '3.2.11'` |
| `Gemfile.lock` (RUBY VERSION) | `ruby 3.1.7p261` → `ruby 3.2.11p268` |

**→ Ergebnis:** `RUBY_PATCHLEVEL` = 268 (`ruby -v` zeigt bei 3.2 kein `pNNN` mehr,
Bundler schreibt es aber). Kein `BUNDLED WITH`-Change — Bundler 2.4.22 bleibt.

**D-4 — Gems für die 3.2-ABI neu auflösen/bauen:**
```
bundle _2.4.22_ install     # kompiliert alle Native-Extensions gegen die 3.2-ABI (~1.5 min)
```
**→ Ergebnis:** `bundle check` grün, **keine** von 3.2 verursachten Versions-Bumps,
**keine** neuen Plattform-Gems (ffi/nokogiri lagen schon precompiled `-linux-gnu` vor).
(Der Lock-Diff vs. HEAD zeigt die 7.2-Framework-Zeilen — das ist die schon vorher
uncommittete 7.2-Arbeit, nicht 3.2.)

**D-5 — Boot-Smoke:**
```
bundle exec ruby -e 'require "./config/environment"; \
  puts "Rails #{Rails.version} on Ruby #{RUBY_VERSION} / Psych #{Psych::VERSION}"'
```
**→ Ergebnis:** `Rails 7.2.3.2 on Ruby 3.2.11 / Psych 5.4.0` — Psych 5 lädt (libyaml
gelinkt), Boot grün.

**D-6 — Migrationen von Null (der 3.1-Knackpunkt-Check):**
```
RAILS_ENV=test bundle exec rails db:migrate:reset
```
**→ Ergebnis:** **431/431 up, 0 down**, keine Abbrüche.

**D-7 — Volle Spec-Suite (Baseline-Vergleich):**
```
bundle exec rspec --seed 57765 --tag ~type:feature
```
**→ Ergebnis (Lauf 1):** `2260 / 20` — die 11 umgebungsbedingten **+ 9 neue
Thumbnail-Failures** → realer Breaker (`thumbnailer`-Gem, **§A2**). Nach Fix
**→ Ergebnis (Lauf 2):** `2267 / 11` — Baseline wiederhergestellt (2260 Alt **+ 7 neue
Generator-Specs**; die 11 = 3 rdkit + 1 admin_device-sftp + 7 datacollector-sftp),
**keine Regression**.

**D-8 — Image & CI umstellen** (Infra, außerhalb des laufenden Containers):
- Base-/Runner-Image auf **Ruby 3.2.x** bauen (native Chemie-Gems für 3.2-ABI neu
  kompilieren; `libyaml-dev` ist bereits im Dockerfile → Psych 5 baut).
- CI auf 3.2.x umstellen (`.tool-versions` zeigt dann auf 3.2.x, das ohne Image-Rebuild
  nur im laufenden Container existiert → Rebuild ohne Image bricht).

**D-9 — Committen** (durch den User; dieser Branch pusht read-only-seitig nicht
automatisch). Kern-Diff: **3 Pin-Dateien** + die **§A2-Thumbnail-Umstellung**
(thumbnailer → image_processing). Sonst **kein** App-Code-Change (Psych/Struct/Removals
alle bereits abgedeckt).

---

## E. Verifikation (nach dem 3.2-Schritt) — ✅ (bis auf Infra)

- [x] Boot grün, `RUBY_VERSION` = 3.2.11, `Psych::VERSION` = 5.4.0, `Rails.version` = 7.2.3.2.
- [x] `db:migrate:reset` grün (431/431, 0 down) — auf **Abbrüche** geprüft.
- [x] Suite: `2267/11` non-feature (Seed 57765) = Baseline (+7 neue Generator-Specs),
      keine Regression. Realer Breaker `thumbnailer` gefunden + gefixt (§A2).
- [ ] **Offen (Infra, außerhalb Container):** Base-/Runner-Image auf 3.2.11 bauen
      (native Gems für 3.2-ABI) + CI umstellen (D-8), danach committen (D-9).
- [x] Struct-Pfade (Vessel-API, Mailcollector) gegengeprüft — positional → ok.
- [x] **Browser-Click-Through (Runbook §6) auf 3.2.11:** App via socat (`:3001` →
      `chemotion_eln-app-1:3000`, weil Host-`:3000` von Fremd-App belegt) + Host-Chrome.
      Login (`/home`, tu3) → Collection „All" + Sample-Liste (Ethanol-Struktur gerendert)
      → Element-Tabs → CREATE-Menü (alle 5 Typen) → Create-Sample-Formular (Backend-
      Short-Label `tu3-5`). **0× HTTP 5xx**, 0 Page-Errors (nur die bekannten
      React-PropType-Warnungen, Ruby-unabhängig).
- [x] **Write-Pfad (Runbook §C2) auf 3.2.11:** Molfile → Molecule → InChIKey =
      `LFQSCWFLJHTTHZ-UHFFFAOYSA-N` (Ethanol) → OpenBabel/InChI-Native-Gems auf der
      3.2-ABI korrekt. (write-test-Sample danach gelöscht.)

---

## Quellen
- [Ruby 3.2 changes (rubyreferences)](https://rubyreferences.github.io/rubychanges/3.2.html)
- [Ruby 3.2.0 Release](https://www.ruby-lang.org/en/news/2022/12/25/ruby-3-2-0-released/)
- [Psych 5.0 Release-Notes](https://github.com/ruby/psych/releases)
- [ruby3-backward-compatibility (rails-lts)](https://github.com/rails-lts/ruby3-backward-compatibility)
