# DEV_UPGRADING_ASSET_PIPELINE.md

Ist-Aufnahme der **Frontend-Asset-Architektur** im Chemotion ELN. Das Projekt
betreibt **zwei nebeneinander laufende, unabhängige Asset-Pipelines** — sauber
nach Asset-Typ getrennt. Dieses Dokument nimmt **beide** auf: woraus sie
bestehen, wo sie aufgerufen werden, was sie ausliefern und wie sie zusammenspielen.

Stand 2026-07, Branch `rails-upgrade-6-1-7-10`, per `grep`/`cat` am aktuellen
Code verifiziert.

> **Begriffsklärung:** „Asset Pipeline" ist im engen Rails-Sinn ein Eigenname für
> **Sprockets**. Im weiteren Sinn ist auch **Shakapacker/Webpack** eine
> Asset-(Bundling-)Pipeline. In diesem Repo existieren **beide** — daher deckt
> dieses Dokument bewusst beide ab.

---

## 1. Überblick — die zwei Pipelines

| | **Sprockets** (klassische „Asset Pipeline") | **Shakapacker / Webpack 5** |
|---|---|---|
| Baut | **Alles CSS** | **Alles JS** der React-SPA |
| Quelle | `app/assets/stylesheets/application.scss` (97 SCSS-Dateien) | `app/javascript` (**820** JS/JSX), Entry `app/javascript/packs/application.js` |
| Deps | `sprockets 3.7.5`, `sprockets-rails 3.5.2`, `sassc-rails 2.1.2`, `turbo-sprockets-rails4` | `shakapacker 9.5` (Gem + npm), `webpack 5`, `babel-loader`, `mini-css-extract-plugin` |
| View-Tag | `stylesheet_link_tag 'application'` (`application.haml:6`) | `javascript_pack_tag 'application'` (`application.haml:9`) |
| Config | `config/initializers/assets.rb`, `config.assets.*` | `config/shakapacker.yml`, `config/webpack/*` |
| Output | `public/assets` | `public/packs` (git-ignored) |
| Aufruf | `assets:precompile` | `bin/shakapacker`, `bin/shakapacker-dev-server` |
| Geladen aus | `config/application.rb:5` → `require 'rails/all'` (`sprockets/railtie`) | dasselbe Layout, Zeile 9 |

Beide werden aus **demselben** Layout geladen — `layouts/application.haml` gibt
beide Tags nebeneinander aus (Zeile 6 = CSS, Zeile 9 = JS).

**Mentales Modell:** CSS-Pipeline = Sprockets, JS-Pipeline = Shakapacker. Zwei
Pipelines, klar nach Asset-Typ geteilt, mit `node_modules` als geteilter Quelle
(§4).

---

## 2. Sprockets (CSS-Pipeline)

### 2.1 Bestandteile (Gems)

| Gem | Version (Lock) | Rolle |
|---|---|---|
| `sprockets` | **3.7.5** | Pipeline-Kern. **Sprockets 3, nicht 4.** |
| `sprockets-rails` | 3.5.2 | Rails-Integration: `stylesheet_link_tag`, Precompile-Task, `sprockets/railtie`. |
| `sassc-rails` | 2.1.2 (→ `sassc` 2.4.0) | SCSS-Kompilierung. `sassc` = libsass, deprecated/EOL. |
| `turbo-sprockets-rails4` | (siehe Lock) | Rails-**4**-Alt-Gem für paralleles Precompile. |

**Zuliefernde Gems:** `bootstrap ~> 5.3` (`@import "bootstrap/..."`),
`font-awesome-rails` (4.7, `@import "font-awesome"`), `jquery-rails` (nur im
**toten** JS-Manifest, s. 2.5).

### 2.2 Config-Fußabdruck

| Datei | Sprockets-Bezug |
|---|---|
| `config/application.rb:5` | `require 'rails/all'` → lädt `sprockets/railtie` |
| `config/initializers/assets.rb` | Version, **`node_modules` + `vendor/assets/javascript` auf den Loadpath**, Precompile-Liste (`manifest.js`, `autocomplete.min.js`, `grape_swagger_rails/application.{css,js}`) |
| `app/assets/config/manifest.js` | `link_tree ../fonts`, `link_tree ../images`, `link_directory ../javascripts .js`, `link_directory ../stylesheets .css` |
| `config/environments/production.rb:39,43,50` | `css_compressor = :sass`, `assets.compile = true`, `TurboSprockets.configure` (Precompiler/Preloader **deaktiviert**) |
| `config/environments/development.rb:50,53` | `assets.debug = true`, `assets.quiet = true` |
| `config/initializers/cors.rb` | `resource '/assets/*'`-Regel hängt am Sprockets-Pfad |

### 2.3 Inputs — was die Pipeline verarbeitet

Zentraler Einstieg: `app/assets/stylesheets/application.scss` — manuell
geordneter `@import`-Baum (bewusst **kein** `require_tree`).

**SCSS-Baum** (`app/assets/stylesheets/`: 97 Dateien, ~440 KB):

| Ebene | Verzeichnis | Umfang |
|---|---|---|
| Global | `global-styles/` | 25 Dateien, 7 Top-Level-`@import` (Tokens, Bootstrap-Config/-Mods, Utilities, Vendor, Icons, Tags) |
| Komponenten | `components/` | **37** `.scss` (`AppModal`, `ElementsTable`, `ReactionMaterial`, `CollectionTree`, …) |
| Legacy | `legacy/` | **30** `.scss` (`sample`, `reaction`, `wellplate`, `spectra`, `structur_editor`, …) |

**Externe Styles durch die Sprockets-Loadpath** (via `assets.rb` → `node_modules`):

```
@import "ag-grid-community/styles/..." · "react-vis/dist/style" · "reactflow/dist/style"
@import "react-big-calendar/lib/css/..." · "react-calendar/dist/Calendar"
@import "bootstrap" (+ functions/mixins/variables) · "font-awesome"
```

**Weitere Assets im selben Baum:** Fonts (`app/assets/fonts/`, 39 Dateien
~848 KB, via `url("…woff2")`), Bilder (`app/assets/images/`, 44 Dateien ~236 KB,
u. a. Sprockets-Helper `asset_url("nmrdb_logo.jpg")` in `legacy/nmrdb-logo.scss`),
Vendor (`vendor/assets/autocomplete.{css,min.js}`).

### 2.4 Konsumenten — wo Sprockets aufgerufen wird

| # | Ort | Aufruf | Bedient |
|---|---|---|---|
| 1 | `layouts/application.haml:6` | `stylesheet_link_tag 'application'` | Haupt-Layout (via `PagesController`) |
| 2 | `layouts/two_factor_auth.haml:6` | `stylesheet_link_tag 'application'` | 2FA-Seite |
| 3 | `devise/shared/_affiliations.html.haml:1-2` | `asset_path('autocomplete.min.js')`, `asset_path('affiliations.js')` | Registrierungs-JS |
| 4 | `config/routes.rb:79` | `mount GrapeSwaggerRails::Engine` | Swagger-UI (Engine hängt **hart** an `sprockets-rails`) |

Dazu `favicon_link_tag` in beiden Layouts. Beide `stylesheet_link_tag` zeigen
auf **dieselbe** `application.scss`.

### 2.5 Tote / vestigiale Teile

| Artefakt | Status | Beleg |
|---|---|---|
| `app/assets/javascripts/application.js` (jQuery/Bootstrap-Manifest) | **TOT** | Kein `javascript_include_tag` im Repo — nie geladen. |
| `turbo-sprockets-rails4` | Fremdkörper | Rails-4-Gem; Precompiler/Preloader in `production.rb` auf `enabled = false`. |

---

## 3. Shakapacker / Webpack (JS-Pipeline)

### 3.1 Bestandteile

- **Gem:** `shakapacker ~> 9.5.0` (`Gemfile`) — Rails-Integration + `javascript_pack_tag`.
- **npm** (`package.json`): `shakapacker ~9.5.0`, `webpack 5`, `webpack-cli 6`,
  `babel-loader 8`, `mini-css-extract-plugin`, `terser-webpack-plugin`,
  `compression-webpack-plugin`, `webpack-subresource-integrity`,
  `@sentry/webpack-plugin`, `webpack-dev-server 5`, `@pmmmwh/react-refresh-webpack-plugin` (dev).

### 3.2 Config

| Datei | Inhalt |
|---|---|
| `config/shakapacker.yml` | `source_path: app/javascript`, `source_entry_path: packs`, `public_output_path: packs`, `compiler_strategy: digest` (prod: `compile: false`; dev: `compile: false`, `hmr: true`, `inline_css: true`) |
| `config/webpack/webpack.config.js` | Env-Dispatcher → `{development,production,test}.js` |
| `config/webpack/base.js` | `generateWebpackConfig()` (Shakapacker-Default) **merge** `custom.js` |
| `config/webpack/custom.js` | Nur: `raw-loader` für `.md`, `process/browser`-Polyfill, `DefinePlugin` (Sentry-DSN), `fallback` (util/querystring/stream) |
| `config/webpack/development.js` | `devtool: eval-source-map`, `watchOptions.poll` |

### 3.3 Source, Output, Aufruf

- **Source:** `app/javascript/` (**820** JS/JSX-Dateien in `src/`: `components`,
  `apps`, `stores`, `models`, `fetchers`, `api_clients`, `utilities`).
- **Entry:** `app/javascript/packs/application.js` (das einzige Pack;
  registriert die React-Apps `home`, `mydb`, `admin`, `chemspectra`, …).
- **Output:** `public/packs` (**git-ignored** → Build-Artefakt, nicht eingecheckt).
- **Aufruf:** `bin/shakapacker` (Build), `bin/shakapacker-dev-server` (Dev/HMR).
- **View-Tag:** `javascript_pack_tag 'application', nonce: …` (`application.haml:9`).

### 3.4 CSS-Fähigkeit vorhanden, aber ungenutzt

Shakapackers Default-Config (`generateWebpackConfig()`) **bringt css/sass/style-
Loader + `mini-css-extract-plugin` mit** — Webpack *könnte* also CSS bündeln.
**Real tut es das nicht:** die 820 JS/JSX-Dateien enthalten **0** Stylesheet-
Importe und **0** CSS-in-JS (styled-components/emotion/jss). `custom.js` fügt
keine CSS-Regeln hinzu (nur `raw-loader` für `.md`). Damit sind die CSS-Optionen
in `shakapacker.yml` (`inline_css`, `css_modules_export_mode`, …) **vestigial**.

---

## 4. Zusammenspiel & Grenze

- **Gemeinsames Layout:** `layouts/application.haml` lädt **beide** Tags — CSS
  (Sprockets, Z. 6) und JS (Shakapacker, Z. 9) — für dieselbe React-SPA.
- **Geteilte Quelle `node_modules`:** Sprockets legt `node_modules` auf seinen
  **Loadpath** (`assets.rb`) und zieht daraus Bibliotheks-**CSS** (ag-grid,
  reactflow, react-vis, …); Webpack resolved `node_modules` für **JS**. Derselbe
  Ordner, geteilt nach Asset-Typ.
- **Saubere Grenze (verifiziert):** CSS → **100 % Sprockets** (React-Source: 0
  Style-Importe). JS → **100 % Shakapacker** (Sprockets-JS-Manifest ist tot,
  §2.5). Keine Überschneidung.
- **Storybook** nutzt ebenfalls Webpack 5 (`@storybook/react-webpack5`,
  `build-storybook`) — eigener Build, verwandt, aber nicht Teil der App-Auslieferung.

---

## 5. Was KEINE Pipeline nutzt (Backend)

Kein Mailer, PDF, Export oder Runtime-Code nutzt kompilierte Pipeline-Assets:

| Bereich | Befund |
|---|---|
| **Mailer** (9 Klassen, 13 Views) | Kein `asset_path`/`image_tag`/`stylesheet_link_tag`. Styling = inline `style=` (2FA-Button); `calendar_mailer` hängt `.ics` an. |
| **PDFs** (`app/pdfs/`: code/analysis/analysis_nmr) | Lesen SVGs aus **`Rails.public_path.join('images/...')`** + Dummy aus `public/images/wild_card/` — der **`public/`-Pfad**, nicht Sprockets. Prawn bringt Fonts selbst mit. |
| **`lib/` / Export** | `export_collections.rb` liest `public/images/...`. |
| **Modelle** (`reaction`/`sample`/`molecule`) | Schreiben/lesen SVGs unter `public/images/...`. |
| **Sprockets-Runtime-API** (`Rails.application.assets`, …) | Nirgends aufgerufen. |

> **Zwei getrennte Bild-Welten:** die **Sprockets-Bilder** (`app/assets/images`,
> nur via `asset_url` in *einer* SCSS-Datei) und der **`public/`-Runtime-Store**
> (Reaction/Sample/Molecule/Dummy-SVGs), den das gesamte Backend tatsächlich
> nutzt. Sie überlappen nicht.

---

## 6. Teardown — Deaktivierung nach Frontend-Entfernung

Das React-Frontend wird in einem **separaten Branch entfernt** (nicht in ein
eigenes Repo gesplittet). Damit verlieren **beide** Pipelines ihren einzigen
echten Konsumenten — `layouts/application.haml` (Z. 6 = CSS via Sprockets,
Z. 9 = JS via Shakapacker). Die eigentliche Löschung von `app/javascript` kommt
über jenen Branch; hier zu tun ist der **Rails-seitige Rückbau** der
Pipeline-Verdrahtung, der sonst nach dem Merge ins Leere zeigt.

### 6.1 Zwei getrennte Arbeitsstränge (empfohlen)

Beide Pipelines hängen am **selben Gate** (dem Frontend-Entfernungs-Branch) und
am **selben Layout** — die Deaktivierung sollte deshalb **koordiniert / zusammen
landen**, damit das Layout nie auf eine tote Pipeline zeigt. Die **Arbeit** ist
aber verschieden genug, dass Shakapacker einen **eigenen Strang** verdient:

| Kriterium | **Sprockets (CSS)** | **Shakapacker (JS)** |
|---|---|---|
| Toolchain | Ruby-only (Gems, `assets.rb`, `app/assets`, 2 Layouts) | Node/Yarn/Webpack (npm-Deps, `config/webpack/*`, `shakapacker.yml`, `bin/`, CI-Workflow, Docker-Service) |
| Verifikation | `assets:precompile` / `stylesheet_link_tag` | `bin/shakapacker`-Build / `javascript_pack_tag` / `public/packs`-Manifest |
| Residual nach Frontend-Weg | **Server-Views bleiben** (2FA-CSS, Swagger-Engine, Devise-`_affiliations`) → Entscheidung nötig | **Null** — der einzige `javascript_pack_tag` ist die SPA-Shell → **restlose** Entfernung |
| Charakter | verzahnter Rückbau (Rest-Views) | sauberer Total-Rückbau |

**Kernasymmetrie:** Shakapacker ist der **einfachere** Rückbau (nach Frontend-Weg
bleibt **nichts** übrig). Sprockets bleibt mit server-gerenderten Seiten verzahnt.

### 6.2 Sprockets-Rückbau (Rest-Views entscheiden)

Weil 2FA-Seite, Swagger-UI und Devise-`_affiliations` weiter `application.scss`
bzw. `asset_path` nutzen (§2.4), ist Sprockets **nicht** restlos entfernbar,
solange diese Views server-gerendert bleiben. Pro Rest-View:

- [ ] **2FA / Devise-Views:** mit dem Frontend mitentfernt (Auth zieht ins
      Frontend) **oder** ungestylt weiterbetrieben (`stylesheet_link_tag`
      raus → nacktes HTML, funktional intakt).
- [ ] **Swagger (`grape_swagger_rails`, hängt an `sprockets-rails`):** UI entfernen
      und nur `/api/v1/swagger_doc` behalten, **oder** UI Sprockets-frei ausliefern.
- [ ] Danach: `require 'rails/all'` → explizite Railties **ohne** `sprockets/railtie`;
      `config/initializers/assets.rb`, `app/assets/config/manifest.js`,
      `config.assets.*` (`production.rb`/`development.rb`), `TurboSprockets`-Block,
      `cors.rb`-`/assets/*`-Regel entfernen; `app/assets/`, `vendor/assets/` löschen.
- [ ] Gems raus: `sprockets`, `sprockets-rails`, `sassc-rails`,
      `turbo-sprockets-rails4` (+ `bootstrap`/`jquery-rails`/`font-awesome-rails`,
      sobald die gestylten Views weg/ungestylt sind).

### 6.3 Shakapacker-Rückbau (restlos, nach Frontend-Weg)

Sobald `app/javascript` über den Frontend-Branch weg ist, hat Shakapacker **null**
Konsumenten → komplett entfernbar:

- [ ] `layouts/application.haml:9`: `javascript_pack_tag 'application'` entfernen.
- [ ] **Gem:** `shakapacker` aus `Gemfile` (`bundle`).
- [ ] **npm/`package.json` + `yarn.lock`:** `webpack*`, `babel-loader`,
      `mini-css-extract-plugin`, `terser/compression-webpack-plugin`,
      `@sentry/webpack-plugin`, `react-refresh`, `shakapacker` (JS) entfernen —
      bzw. `package.json`/`yarn.lock` ganz weg, falls kein JS-Build mehr bleibt.
- [ ] `config/shakapacker.yml` + `config/webpack/*` (6 Dateien) löschen.
- [ ] `bin/shakapacker`, `bin/shakapacker-dev-server` löschen.
- [ ] `public/packs` (Build-Artefakt, bereits git-ignored) — kein Repo-Eingriff.
- [ ] **CI:** `.github/workflows/asset-precompilation.yml` löschen; Node-Setup +
      yarn-Cache/-Install in `ci-rb.yml` und `ci-js.yml` entfernen.
- [ ] **Docker:** `webpacker`-Service + `SHAKAPACKER_DEV_SERVER_*`-Env in
      `docker-compose.dev.yml` entfernen; `yarn install` in `Dockerfile.p2d` raus.
- [ ] **Storybook** (`@storybook/react-webpack5`, `storybook`/`build-storybook`,
      der `storybook`-Docker-Service) — eigener Webpack-Build; geht mit dem
      Frontend mit weg.

### 6.4 Verifikation (Teardown)

- [ ] `grep -rniE "javascript_pack_tag|shakapacker|webpack" app config .github` leer
      (bis auf bewusste Reste); App bootet ohne Pack-Manifest-Fehler.
- [ ] `grep -ri sprockets config/ app/ Gemfile.lock` leer (bis auf Rest-View-Entscheidung).
- [ ] `stylesheet_link_tag`/`javascript_pack_tag` erzeugen **keine** 404 auf
      `/assets/…` bzw. `/packs/…` mehr (Referenzen sauber entfernt).
- [ ] Rest-Views (falls behalten) rendern (kein 500), ggf. bewusst ungestylt.

---

## 7. Verifikations-Kommandos (reproduzierbar)

```bash
# CSS-Quelle: 0 = alles CSS via Sprockets, nichts via Webpack
grep -rniE "(import|require|from)[^\n]*\.(css|scss|sass|less)\b" app/javascript | grep -v node_modules | wc -l
grep -rniE "styled-components|@emotion|react-jss" app/javascript | wc -l   # 0 = kein css-in-js

# React-Source-Umfang
find app/javascript/src -name '*.js' -o -name '*.jsx' | wc -l   # ~820

# Sprockets-Einstiegspunkte + totes JS-Manifest
grep -rniE "stylesheet_link_tag|asset_path|asset_url|favicon_link_tag" app/views
grep -rniE "javascript_include_tag" app/ config/            # leer = JS-Manifest tot

# Shakapacker: Entry, Output, Config
cat config/shakapacker.yml | grep -E "source_path|source_entry_path|public_output_path"
ls public/packs                                             # Build-Output (git-ignored)

# config.assets-Fußabdruck (Sprockets)
grep -rniE "config\.assets|TurboSprockets" config/
```
