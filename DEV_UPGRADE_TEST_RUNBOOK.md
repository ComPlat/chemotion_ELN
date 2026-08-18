# DEV_UPGRADE_TEST_RUNBOOK.md

**Wiederholbare Verifikations-Suite für Ruby-/Rails-Upgrades.** Genau diese Tests
wurden für das **Ruby-3.0-Upgrade** gefahren (alle grün); beim nächsten Upgrade
(3.1, 3.2, …) **identisch erneut** ausführen und gegen die hier dokumentierten
Baselines halten → so ist sichtbar, ob etwas regressiert.

Prinzip: die Tests decken **beide** Auth-Wege (Session/Devise + JWT), die **Grape-
API** (nicht Rails-Controller — Grape ist die primäre API), die **Chemie-Pipelines**
(Sample-Anlage), und die **React-SPA** end-to-end im echten Browser ab.

---

## 0. Umgebung unter Test aufsetzen

> **Versions-Regel: immer den NEUESTEN Patch der Ziel-Minor pinnen, nie `.0`.**
> (`asdf list all ruby | grep '^3.2\.'` → letzten nehmen.) Patches rollen Security-/
> Bugfixes auf, ändern aber **kein** Sprach-Verhalten (Psych 4, kwargs etc. sind über
> alle `3.x.y` identisch). Bisher genutzt: **3.0.7**, **3.1.7** (nicht .0). Ebenso:
> Native-Gems müssen auf der Ziel-ABI **neu kompiliert** werden (Image-Rebuild) —
> gleiche Versionen, kein Bump (bis 3.3: dann `nokogiri ≥ 1.16`).

Alles läuft **im Container** `chemotion_eln-app-1`. Die zu testende Ruby-Version
isoliert neben 2.7.8 installieren (stört den laufenden 2.7-Dev-Server nicht):

```bash
# Ruby X.Y.Z installieren (Beispiel 3.0.7)
docker exec chemotion_eln-app-1 bash -lc 'asdf install ruby 3.0.7'
# passende Bundler-Version (aus Gemfile.lock BUNDLED WITH) für diese Ruby
docker exec chemotion_eln-app-1 bash -lc 'export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH && gem install bundler -v 2.4.22'
# Gems auf der Ziel-ABI bauen (native chem-Gems!). --frozen schützt den Lock.
docker exec chemotion_eln-app-1 bash -lc 'export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH && cd /home/ubuntu/app && bundle _2.4.22_ install --frozen'
```

> In allen Befehlen unten: `export PATH=$HOME/.asdf/installs/ruby/<VER>/bin:$PATH`
> voranstellen, damit die **Ziel-Ruby** genutzt wird. Für die aktuelle 2.7-Baseline
> das Präfix weglassen. Voraussetzungen (sonst bricht die Suite): `klasses.json`
> existiert, Test-DB migriert (`rake db:migrate`) — Details in `DEV_UPGRADING.md`.

---

## 1. RSpec-Suite — primärer Regressions-Anker

**Deckt ab:** ~alle Models, Grape-APIs, Usecases, Services, lib (unit + request).

```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH; cd /home/ubuntu/app &&
  RAILS_ENV=test bundle _2.4.22_ exec rspec \
    --exclude-pattern "spec/{features}/**/*_spec.rb" spec --seed 57765'
```

**Baseline (MUSS identisch sein):** `2260 examples, 11 failures, 48 pending`.
Die **11 Fehlschläge sind rein umgebungsbedingt** (kein Code-Fehler) und müssen
**exakt diese** sein — Seed **fixiert auf 57765**:

| # | Spec | Ursache (Umgebung) |
|---|------|--------------------|
| 7× | `spec/lib/datacollector/collector_spec.rb` (SSH/SFTP-Cases) | kein `ssh-agent`/Keys lokal |
| 3× | `spec/services/rdkit_extension_service_spec.rb` (:15/:21/:35) | lokales Postgres ohne RDKit-Extension |
| 1× | `spec/api/chemotion/admin_device_api_spec.rb:76` | SFTP-Verbindung nicht herstellbar |

> **Regel:** Regression = jede **abweichende** Fail-Menge (vorher grün → jetzt rot
> oder neu/unerklärt). Die Beispiel-**Zahl** darf driften (neue Specs); Anker ist
> die **11er-Fail-Menge**, nicht die Zahl.

---

## 2. Boot-Check

**Deckt ab:** App-Load, Initializer, Autoloader, Framework-Boot auf der Ziel-Ruby.

```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH; cd /home/ubuntu/app &&
  RAILS_ENV=test bundle _2.4.22_ exec rails runner \
    "puts %(BOOT: Rails #{Rails.version} on Ruby #{RUBY_VERSION})"'
```
**Erwartet:** `BOOT: Rails 6.1.7.10 on Ruby <VER>` ohne Load-Fehler.

---

## 3. Migrationen von Grund auf

**Deckt ab:** alle 431 Migrationen (Data-Migrations mit `YAML.load` etc. — der
Psych-4-Knackpunkt ab Ruby 3.1, siehe `DEV_RAILS_UPGRADE_3-1.md`).

```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH; cd /home/ubuntu/app &&
  RAILS_ENV=test bundle _2.4.22_ exec rake db:migrate:reset 2>&1 | tail -5'
```
**Erwartet:** läuft durch, kein `Psych::DisallowedClass`/Abbruch.

---

## 4. Deprecation-Sweep (kwargs & Co.)

**Deckt ab:** Ruby-Verhaltensänderungen, die als Warnung auftauchen bevor sie zum
harten Fehler werden (v. a. kwargs 2.7→3.0).

```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH; cd /home/ubuntu/app &&
  RUBYOPT="-W:deprecated" RAILS_ENV=test bundle _2.4.22_ exec rspec \
    --exclude-pattern "spec/{features}/**/*_spec.rb" spec --seed 57765 2>&1 \
  | grep -E "Using the last argument as keyword|maybe \*\* should" | grep "/home/ubuntu/app/" \
  | sed -E "s#.*/home/ubuntu/app/##; s/: warning.*//" | sort -u'
```
**Erwartet (nach den 3.0-Fixes):** **leer** (0 App/Lib-Warnungen). Gefundene
Stellen sind neue Fix-Kandidaten.

---

## 5. API-Smoke-Test (JWT-Auth) — Grape-Resources

**Deckt ab (Grape-APIs in `app/api/chemotion/`):**
`user_api` · `collection_api` · `sample_api` · `reaction_api` · `molecule_api` ·
JWT-Auth (`app/api/api.rb` `detect_current_user_from_jwt`, `app/models/json_web_token.rb`).
**Collections:** Default-Collection **All** + Collection-Liste.

Braucht einen laufenden Server unter der Ziel-Ruby (siehe §6 Schritt A für den
Server-Start) auf `:3001`, dann:

```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH; cd /home/ubuntu/app
  TOKEN=$(bundle _2.4.22_ exec rails runner -e development "puts JsonWebToken.encode(user_id: User.first.id)" 2>/dev/null | tail -1)
  for p in users/current.json collections.json collections/all.json samples.json reactions.json; do
    echo "$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/v1/$p" -H "Authorization: Bearer $TOKEN")  $p"
  done
  echo "$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/v1/collections.json")  collections.json (kein Token)"'
```
**Erwartet:** alle authentifizierten → **200**; ohne Token → **401**.
(`molecules.json` → **405** ist ok: Route existiert, GET nicht erlaubt.)

---

## 6. Browser-Click-Through der React-SPA (end-to-end)

**Deckt ab:** Session-Login (**Devise/Warden**, `sessions_controller`), SPA-Shell
(`PagesController`), **Collections** (Tree + „All"), Element-Tabs, **CREATE-Menü
für ALLE Element-Typen** (Sample/Reaction/Wellplate/Screen/Research Plan),
`permission_api`, **Reaction-SVG-Pipeline** (`reaction_svg`), sowie den **Write-Pfad**
(Sample-Persistenz + Molekül/InChIKey-Chemie, Schritt C2).
In-Container-Selenium geht auf arm64/Ubuntu-24.04 **nicht** (kein Chrome) → wir
fahren die **Host-Chrome** gegen einen **Server auf der Ziel-Ruby** (Port 3001,
via socat auf Host `:13001`).

**Schritt A — Server auf Ziel-Ruby starten + Host-Forward:**
```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH; cd /home/ubuntu/app
  nohup bundle _2.4.22_ exec rails server -e development -p 3001 -b 0.0.0.0 \
    -P tmp/pids/server-rubytest.pid > /tmp/servertest.log 2>&1 & echo "PID $!"'
docker run -d --name chemotion_test_fwd --network chemotion_eln_default -p 13001:13001 \
  alpine/socat tcp-listen:13001,fork,reuseaddr tcp:chemotion_eln-app-1:3001
sleep 30  # boot
```

> ✅ **Für den VISUELLEN Browser-Test die laufende Haupt-App auf `:3000` nutzen**
> (docker-compose `app`-Service) — NICHT einen selbst gestarteten `:3001`-Server.
> Grund: Im Dev-Setup liefert der **`webpacker`-Dev-Server-Container** (`:3035`,
> `bin/shakapacker-dev-server`) die SPA-Packs; die `app` erkennt ihn
> (`Shakapacker.dev_server.running? == true`, Host via `SHAKAPACKER_DEV_SERVER_HOST=webpacker`)
> und **proxied `/packs/*` an `:3035`** — der Proxy liefert auch den **~120 MB
> Vendor-Chunk** (`citation-js`+`chem-spectra`) problemlos (HTTP 200).
>
> ⚠️ **NIEMALS `bin/shakapacker` (Compile) im Dev-Setup laufen lassen!** Das schreibt
> statische Packs + `public/packs/manifest.json` auf Platte. Die `app` liest den
> **Disk-Manifest** — der zeigt dann auf einen 118 MB Static-File, den der
> **Rails-Static-Server (`Rack::Sendfile`) als `404`** abweist (Dateien > ~21 MB) →
> `#LoginOptions` bleibt leer → **blanke Login-Seite**. **Fix:** `public/packs/{js,css,manifest.json}`
> löschen **und** den `webpacker`-Container neu starten (`docker restart chemotion_eln-webpacker-1`)
> → er regeneriert den korrekten Disk-Manifest, die `app` proxied wieder an `:3035`.
> (Ein `app`-Neustart braucht ggf. `rm tmp/pids/server.pid`, sonst „A server is already running / Exiting".)
> **Dies ist ein Frontend-/Infra-Thema, KEINE Ruby/Rails-Regression.** Backend-Pfade
> (Login-Seite, JWT-API, Write-Pfad) über §5 + Schritt C2 unabhängig verifizierbar.

**Schritt B — Throwaway-User anlegen (NIE einen Seed-User umbauen!):**
```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.0.7/bin:$PATH; cd /home/ubuntu/app
  bundle _2.4.22_ exec rails runner -e development "
    User.find_by(email: %q{test-upgrade@example.com})&.destroy
    User.create!(email: %q{test-upgrade@example.com}, password: %q{TestUpgrade1!},
      password_confirmation: %q{TestUpgrade1!}, first_name: %q{Test}, last_name: %q{Upgrade},
      name_abbreviation: %q{tu3}, confirmed_at: Time.now, account_active: true)
    puts %(user angelegt)"'
```
> ⚠️ `name_abbreviation` muss **2–3 Zeichen** sein (sonst Validation-Fehler).

**Schritt C — Puppeteer-Click-Through** (läuft auf dem **Host** mit Host-node +
Host-Chrome; die beiden Skripte sind unten eingebettet — in ein Arbeitsverzeichnis
kopieren). Credentials entsprechen dem Throwaway-User aus Schritt B.
```bash
mkdir -p /tmp/upgrade-ui && cd /tmp/upgrade-ui
npm install --no-audit --no-fund puppeteer-core@23
# clickthrough.js und create_sample.js (unten) hier ablegen, dann:
OUT=$(pwd) node clickthrough.js    # Login + Nav + Fehler-/API-Sammler
OUT=$(pwd) node create_sample.js   # CREATE-Menü -> Sample-Detail-Formular
# (Screenshots landen in $OUT/ct_*.png bzw. cs_*.png zur Sichtprüfung)
```

<details><summary><b>clickthrough.js</b> — Login + Navigation, sammelt console/page-errors + failed API</summary>

```js
const puppeteer = require('puppeteer-core');
const OUT = process.env.OUT;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const errors = [], failedReqs = [];
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox','--disable-gpu','--window-size=1600,1000']
  });
  const page = await browser.newPage();
  await page.setViewport({width:1600,height:1000});
  page.on('console', m => { if (m.type()==='error') errors.push('CONSOLE: '+m.text().slice(0,160)); });
  page.on('pageerror', e => errors.push('PAGEERR: '+e.message.split('\n')[0].slice(0,160)));
  page.on('response', r => { const s=r.status(); if (s>=400 && r.url().includes('/api/')) failedReqs.push(s+' '+r.url().replace(/^https?:\/\/[^/]+/,'')); });

  // --- LOGIN ---
  await page.goto('http://localhost:13001/users/sign_in', {waitUntil:'networkidle2', timeout:30000});
  await page.type('input[type=text],input[type=email]', 'test-upgrade@example.com');
  await page.type('input[type=password]', 'TestUpgrade1!');
  await Promise.all([ page.click('input[type=submit],button[type=submit]'),
    page.waitForNavigation({waitUntil:'networkidle2', timeout:40000}).catch(()=>{}) ]);
  await sleep(6000);
  console.log('AFTER_LOGIN_URL:', page.url());
  await page.screenshot({path: OUT+'/ct_1_loaded.png'});

  // --- INVENTORY of clickable things ---
  const inv = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, a[role=button], [role=tab], .btn, span[title]').forEach(el => {
      const t = (el.innerText||el.getAttribute('title')||'').trim().replace(/\s+/g,' ').slice(0,40);
      if (t) out.push(t);
    });
    return [...new Set(out)].slice(0,60);
  });
  console.log('CLICKABLE_INVENTORY:', JSON.stringify(inv));

  async function clickByText(txt) {
    return page.evaluate((txt) => {
      const els = [...document.querySelectorAll('button, a, [role=tab], [role=button], span[title], li')];
      const el = els.find(e => ((e.innerText||e.getAttribute('title')||'').trim().toLowerCase().includes(txt.toLowerCase())) && e.offsetParent!==null);
      if (el) { el.click(); return true; } return false;
    }, txt);
  }

  // --- NAV CLICKS ---
  const steps = [];
  for (const [label, txt] of [['collection-tree','All'],['samples-tab','Sample'],['reactions-tab','Reaction']]) {
    const errBefore = errors.length, reqBefore = failedReqs.length;
    const ok = await clickByText(txt);
    await sleep(3500);
    steps.push(`${label} [text="${txt}"] clicked=${ok} newErrors=${errors.length-errBefore} newFailedApi=${failedReqs.length-reqBefore}`);
    await page.screenshot({path: `${OUT}/ct_2_${label}.png`}).catch(()=>{});
  }
  console.log('STEPS:'); steps.forEach(s=>console.log('  '+s));
  console.log('TOTAL_CONSOLE/PAGE_ERRORS:', errors.length);
  errors.slice(0,12).forEach(e=>console.log('  '+e));
  console.log('TOTAL_FAILED_API:', failedReqs.length);
  [...new Set(failedReqs)].slice(0,12).forEach(r=>console.log('  '+r));
  await browser.close();
})().catch(e=>{console.log('SCRIPT_ERR:', e.message); process.exit(1)});
```
</details>

<details><summary><b>create_sample.js</b> — CREATE-Menü -> Create Sample -> Detail-Formular, sammelt write/failed API</summary>

```js
const puppeteer = require('puppeteer-core');
const OUT=process.env.OUT; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const errors=[],api=[];
(async()=>{
  const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox','--disable-gpu','--window-size=1600,1000']});
  const p=await b.newPage(); await p.setViewport({width:1600,height:1000});
  p.on('pageerror',e=>errors.push('PAGEERR: '+e.message.split('\n')[0].slice(0,140)));
  p.on('response',r=>{if(r.url().includes('/api/')){const s=r.status(),m=r.request().method(); if(m!=='GET'||s>=400) api.push(`${s} ${m} ${r.url().replace(/^https?:\/\/[^/]+/,'').slice(0,55)}`);}});
  await p.goto('http://localhost:13001/users/sign_in',{waitUntil:'networkidle2',timeout:30000});
  await p.type('input[type=text],input[type=email]','test-upgrade@example.com');
  await p.type('input[type=password]','TestUpgrade1!');
  await Promise.all([p.click('input[type=submit],button[type=submit]'),p.waitForNavigation({waitUntil:'networkidle2',timeout:40000}).catch(()=>{})]);
  await sleep(6000);
  const exact=t=>p.evaluate(t=>{const el=[...document.querySelectorAll('a,button,li,span,[role=menuitem]')].find(e=>(e.innerText||'').trim()===t&&e.offsetParent!==null); if(el){el.click();return true;}return false;},t);
  await exact('CREATE'); await sleep(2000);
  const cs=await exact('Create Sample'); await sleep(6000);
  console.log('Create-Sample_clicked='+cs);
  await p.screenshot({path:OUT+'/cs_new_sample_form.png'});
  const panel=await p.evaluate(()=>{const txt=[...document.querySelectorAll('[role=tab],.nav-tabs a,label,button')].map(e=>(e.innerText||'').trim()).filter(t=>t&&t.length<24); return [...new Set(txt)].slice(0,30);});
  console.log('NEW_SAMPLE_PANEL_ELEMENTS:', JSON.stringify(panel));
  console.log('--- write/failed API during create-sample pipeline ---'); [...new Set(api)].slice(0,20).forEach(a=>console.log('  '+a));
  console.log('PAGE_ERRORS:',errors.length); errors.slice(0,5).forEach(e=>console.log('  '+e));
  await b.close();
})().catch(e=>{console.log('SCRIPT_ERR:',e.message);process.exit(1)});
```
</details>

**Was die Skripte prüfen & Baseline (grün auf 3.0.7 UND 3.1.7):**
- `clickthrough.js`: Login → `/mydb/collection/all`; Collection-Tree + Tabs.
  **Baseline:** `TOTAL_FAILED_API: 0`, `PAGE_ERRORS: 0`.
- `create_sample.js`: **CREATE-Menü öffnet alle Element-Typen** (Create Sample/
  Reaction/Wellplate/Screen/Research Plan — je `clicked=true`, `err+0`) → **Create
  Sample** öffnet das Detail-Formular mit **Backend-Short-Label** (`<abbr>-1`).
  **Chemie-Pipeline:** „Create Reaction" löst `201 POST /api/v1/reaction_svg` aus
  (SVG-Rendering). **Baseline:** `PAGE_ERRORS: 0`, `FAILED_API(4xx/5xx): 0`, nur
  erfolgreiche POSTs (`permissions/status`, `reaction_svg`).

> **6 Console-Warnungen** (React-PropType/DOM-nesting, z. B. `rememberable`) sind
> **Frontend-Code, Ruby-unabhängig** — auf 2.7 identisch, **kein** Regressions-Signal.
>
> ⚠️ **SPA-„Save" NICHT über den Browser automatisieren:** (a) Feld-/Button-Targeting
> im Split-Pane-SPA ist fragil (Name-Feld landet leicht im falschen Panel); (b) ein
> **leeres Sample ohne Molekül lässt sich ohnehin nicht speichern**. Den **Write-Pfad
> stattdessen über Schritt C2** (Molfile-Pipeline) verifizieren — das ist zuverlässig
> und trifft denselben Backend-Code (inkl. der `**babel_info`-kwargs-Fixes).

**Schritt C2 — Write-Pfad + Chemie definitiv testen (Sample mit Molfile persistieren):**
Prüft die **Schreib-Pipeline**: `Sample`-Anlage → `find_or_create_by_molfile`
(**`**babel_info`-kwargs-Pfad**) → Molekül-Anlage inkl. **InChIKey-Berechnung**
(OpenBabel/InChI Native-Gems auf der Ziel-ABI) → Persistenz.
```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.1.7/bin:$PATH; cd /home/ubuntu/app
  bundle _2.4.22_ exec rails runner -e development "
    u=User.find_by(email: %q{test-upgrade@example.com}); col=u.collections.first
    molfile=%(\n  Mrv  \n\n  3  2  0  0  0  0            999 V2000\n    0.0000    0.0000    0.0000 C   0  0\n    1.0000    0.0000    0.0000 C   0  0\n    2.0000    0.0000    0.0000 O   0  0\n  1  2  1  0\n  2  3  1  0\nM  END\n)
    s=Sample.new(name: %q{write-test}, target_amount_value: 0, collections: [col], creator: u); s.molfile=molfile; s.save!
    puts %(WROTE id=#{s.id} label=#{s.short_label} molecule=#{s.molecule_id} inchikey=#{s.molecule&.inchikey})"'
```
**Baseline:** `WROTE id=… label=<abbr>-1 molecule=… inchikey=LFQSCWFLJHTTHZ-UHFFFAOYSA-N`
(Ethanol) — Persistenz + InChIKey korrekt, **kein** `ArgumentError`/kwargs-Fehler.
(In Schritt D das `write-test`-Sample mitlöschen.)

**Schritt D — AUFRÄUMEN (immer!):**
```bash
docker exec chemotion_eln-app-1 bash -lc '
  export PATH=$HOME/.asdf/installs/ruby/3.1.7/bin:$PATH; cd /home/ubuntu/app
  bundle _2.4.22_ exec rails runner -e development "
    Sample.where(name: %q{write-test}).destroy_all
    u=User.find_by(email: %q{test-upgrade@example.com}); u&.samples&.destroy_all; u&.collections&.destroy_all; u&.destroy; puts %(gelöscht)"
  pids=$(ps aux | grep -E "puma.*3001|rails server.*3001" | grep -v grep | awk "{print \$2}"); for pid in $pids; do kill -9 $pid 2>/dev/null; done
  rm -f tmp/pids/server-rubytest.pid'
docker rm -f chemotion_test_fwd
```
> `fuser -k 3001/tcp` reicht oft **nicht** (Puma-Kindprozess) → per `ps`/`kill -9`
> abschießen (oben), danach `curl :3001` = kein Response prüfen.

---

## 7. Ergebnis-Matrix (Baseline, grün auf **Ruby 3.0.7 UND 3.1.7**, 2026-08)

| Test | Deckt ab | Baseline / Erwartung |
|---|---|---|
| 1 RSpec | Models/APIs/Usecases/Services/lib | 2260 ex, **11** env-Failures, 48 pending |
| 2 Boot | Load/Boot | `Rails 6.1.7.10 on Ruby X` |
| 3 Migrationen | 431 Migrationen (Psych-4 + kwargs-Pfade) | läuft durch; **auf ABBRÜCHE prüfen, nicht nur kwargs-Warnungen** |
| 4 Deprecations | kwargs & Co. | **0** App/Lib-Warnungen |
| 5 API-Smoke | Grape: user/collection/sample/reaction/molecule + JWT | 200er + 401; molecules 405 |
| 6 Browser-SPA | Devise-Login, SPA, Collections, CREATE-Menü **alle Element-Typen**, `reaction_svg`, permissions | 0 failed API, 0 page-errors, Label generiert |
| 6b Write-Pfad (C2) | Sample-Persistenz, `**babel_info`-kwargs, Molekül+InChIKey (OpenBabel/InChI) | `WROTE …` + InChIKey `LFQSCWFLJHTTHZ…` (Ethanol) |

> **Hinweis Migrationen (§3):** Die zwei bekannten 3.1-Breaker (Psych-4-`YAML.load`
> in `…temperature.rb` + `index_exists?`-Arität in `…remove_ancestry_indices.rb`)
> werfen **harte Fehler**, keine kwargs-Warnung → `db:migrate:reset` auf `rake
> aborted!`/`ArgumentError` prüfen, nicht nur grep auf „keyword".

> **Regressions-Definition:** Weicht **irgendein** Test von seiner Baseline ab
> (andere Fail-Menge, neue kwargs-/Deprecation-Warnung, failed API, page-error,
> Boot-/Migrations-Bruch), ist das ein Upgrade-Problem und muss untersucht werden.
