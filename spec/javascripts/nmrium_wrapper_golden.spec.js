import fs from 'fs';
import http from 'http';
import path from 'path';
import expect from 'expect';
import { chromium } from 'playwright';
import { describe, it, before, after } from 'mocha';
import { cleaningNMRiumData } from 'src/utilities/SpectraHelper';

const WRAPPER_URL = 'https://nmrium.chemserv.scc.kit.edu/';
const FIXTURES_ROOT = path.join(process.cwd(), 'spec', 'fixtures');
const NMRIUM_FIXTURES = path.join(FIXTURES_ROOT, 'nmrium');

const DROP_KEYS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'date',
  'localeDate',
  'epoch',
  'source',
  'sourceSelector',
  'originalData',
  'baseURL',
  'relativePath',
  'files',
  'token',
  'data',
  'originalInfo',
  'actionType',
]);

const DROP_KEYS_IN_OPTIONS = new Set(['sum', 'sumAuto']);
const DROP_KEYS_IN_INTEGRALS_OPTIONS = new Set(['mf', 'moleculeId']);

function isSpectrumInfoLike(obj) {
  return obj && typeof obj === 'object' && (obj.nucleus !== undefined || obj.dimension !== undefined || obj.baseFrequency !== undefined);
}

function isSpectrumLike(obj) {
  return obj && typeof obj === 'object' && obj.display && obj.info;
}

function isDisplayLike(obj) {
  return obj && typeof obj === 'object' && (obj.color !== undefined || obj.name !== undefined) && obj.isVisible !== undefined;
}

function isFilterItemLike(obj) {
  return (
    obj
    && typeof obj === 'object'
    && 'name' in obj
    && 'value' in obj
    && (obj.error !== undefined || obj.enabled !== undefined || obj.label !== undefined || obj.flag !== undefined)
  );
}

function isEmptyCorrelations(obj) {
  return (
    obj
    && typeof obj === 'object'
    && Array.isArray(obj.values) && obj.values.length === 0
    && (!obj.state || (typeof obj.state === 'object' && Object.keys(obj.state).length === 0))
  );
}

function normalizeNmrium(value, parentKey = '', parent = null) {
  if (typeof value === 'number') {
    return value === 0 && 1 / value < 0 ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((v) => normalizeNmrium(v, '', null));
  if (value && typeof value === 'object') {
    if (isFilterItemLike(value)) {
      return { name: normalizeNmrium(value.name, 'name', value), value: normalizeNmrium(value.value, 'value', value) };
    }
    const out = {};
    Object.keys(value)
      .sort()
      .forEach((k) => {
        if (DROP_KEYS.has(k)) return;
        if (parentKey === 'options' && DROP_KEYS_IN_OPTIONS.has(k)) return;
        if (parentKey === 'options' && Array.isArray(parent?.values) && DROP_KEYS_IN_INTEGRALS_OPTIONS.has(k)) return;
        const v = value[k];
        if (v === undefined) return;
        let normalized = normalizeNmrium(v, k, value);
        if (k === 'name' && isSpectrumInfoLike(value)) return; // drop spectrum info name for comparison
        if (k === 'correlations' && isEmptyCorrelations(normalized)) normalized = {};
        if (isSpectrumLike(value) && k === 'customInfo' && typeof normalized === 'object' && normalized !== null && Object.keys(normalized).length === 0) return;
        if (isSpectrumLike(value) && k === 'filters' && Array.isArray(normalized) && normalized.length === 0) return;
        if (isSpectrumLike(value) && k === 'noise') return;
        if (isSpectrumInfoLike(value) && k === 'noise') return;
        if (isSpectrumInfoLike(value) && k === 'isComplex' && normalized === false) return;
        if (isSpectrumInfoLike(value) && (k === 'phc0' || k === 'phc1') && normalized === 0) return;
        if (isDisplayLike(value) && (k === 'isPeaksMarkersVisible' || k === 'isVisibleInDomain') && normalized === true) return;
        out[k] = normalized;
      });
    return out;
  }
  if (typeof value === 'string') {
    return value
      .replace(/\/api\/v1\/public\/third_party_apps\/[^/]+/g, '/api/v1/public/third_party_apps/<TOKEN>')
      .replace(/https?:\/\/localhost:\d+/g, 'http://localhost:<PORT>')
      .replace(/https:\/\/nmrium\.chemserv\.scc\.kit\.edu\/?/g, '<NMRIUM_WRAPPER>');
  }
  return value;
}

function readGolden(name) {
  const p = path.join(NMRIUM_FIXTURES, name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function startStaticServer(rootDir) {
  const runnerHtml = (baseUrl) => `<!doctype html>
<html><body>
  <iframe id="nmrium" src="${WRAPPER_URL}" style="width:1200px;height:900px;"></iframe>
  <script>
    window.__nmriumState = null;
    window.__nmriumReady = false;
    document.getElementById('nmrium').addEventListener('load', () => { window.__nmriumReady = true; });
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'nmr-wrapper:data-change') return;
      const payload = event.data.data || {};
      window.__nmriumState = payload.state != null ? payload.state : payload;
    });
  </script>
</body></html>`;

  let serverBaseUrl;
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    const decoded = decodeURIComponent(urlPath);
    const safePath = decoded.replace(/^\//, '').replace(/\.\./g, '');
    const filePath = path.join(rootDir, safePath);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (decoded === '/runner.html' || decoded === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(runnerHtml(serverBaseUrl));
      return;
    }

    if (!path.resolve(filePath).startsWith(path.resolve(rootDir)) || !fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end();
      return;
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      res.writeHead(403);
      res.end();
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      serverBaseUrl = `http://127.0.0.1:${port}`;
      resolve({ server, baseUrl: serverBaseUrl });
    });
  });
}

async function getNmriumStateFromWrapper(page, fileUrl) {
  await page.evaluate(() => {
    window.__nmriumState = null;
  });

  await page.evaluate((url) => {
    const iframe = document.getElementById('nmrium');
    iframe.contentWindow.postMessage(
      { type: 'nmr-wrapper:load', data: { type: 'url', data: [url] } },
      '*',
    );
  }, fileUrl);

  await page.waitForFunction(
    () => {
      const s = window.__nmriumState;
      const spectra = s?.spectra ?? s?.data?.spectra;
      return Array.isArray(spectra) && spectra.length > 0;
    },
    { timeout: 120000 },
  );
  return page.evaluate(() => window.__nmriumState);
}

/** Load a .nmrium fixture and send it to the wrapper (type 'nmrium'); return the state the wrapper sends back. */
async function getNmriumStateFromWrapperLoadNmrium(page, nmriumState) {
  await page.evaluate(() => {
    window.__nmriumState = null;
  });

  await page.evaluate((state) => {
    const iframe = document.getElementById('nmrium');
    iframe.contentWindow.postMessage(
      { type: 'nmr-wrapper:load', data: { type: 'nmrium', data: state } },
      '*',
    );
  }, nmriumState);

  await page.waitForFunction(
    () => window.__nmriumState !== null,
    { timeout: 30000 },
  );
  return page.evaluate(() => window.__nmriumState);
}

function extractPayloadForComparison(state) {
  if (!state) return state;
  const data = state.data ?? state;
  const spectra = data.spectra ?? state.spectra ?? [];
  const correlations = data.correlations ?? state.correlations ?? {};
  return {
    actionType: data.actionType ?? state.actionType ?? 'INITIATE',
    spectra,
    correlations,
  };
}

function patchZipNameInState(state, zipLabel) {
  if (!state || !zipLabel) return;
  const spectra = state.data?.spectra ?? state.spectra ?? [];
  spectra.forEach((s) => {
    if (s?.info) s.info.name = zipLabel;
  });
}

function applyElnBridgePipeline(rawState, options = {}) {
  const cleaned = cleaningNMRiumData(rawState);
  if (!cleaned) return null;
  if (options.zipLabel) patchZipNameInState(cleaned, options.zipLabel);
  return cleaned;
}

describe('NMRium wrapper golden files (no Cypress)', function nmriumWrapperGolden() {
  this.timeout(180000);

  before(function () {
    if (process.env.RUN_NMRIUM_GOLDEN !== '1') {
      this.skip();
    }
  });

  let server;
  let baseUrl;
  let browser;
  let context;
  let page;

  before(async () => {
    ({ server, baseUrl } = await startStaticServer(FIXTURES_ROOT));

    const launchOpts = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
      ],
    };
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
      launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    } else {
      launchOpts.channel = 'chromium';
    }

    try {
      browser = await chromium.launch(launchOpts);
    } catch (e) {
      if (!launchOpts.executablePath && launchOpts.channel === 'chromium') {
        launchOpts.channel = 'chrome';
        browser = await chromium.launch(launchOpts);
      } else {
        throw e;
      }
    }

    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();

    await page.goto(`${baseUrl}/runner.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__nmriumReady === true, { timeout: 120000 });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  const cases = [
    { name: 'JCAMP', input: 'spectra_file.jdx', golden: 'jdx_result_expected.nmrium', zipLabel: null, loadAsNmrium: false },
    { name: 'Legacy 1D (.nmrium → wrapper → same)', input: 'spectra_file_legacy_nmr.nmrium', golden: 'legacy_embedded_1d_from_jdx.nmrium', zipLabel: null, loadAsNmrium: true },
    { name: 'ZIP 1D', input: 'nmrium/zips/zip1D.zip', golden: 'zip_1d_result_expected.nmrium', zipLabel: 'zip1D.zip', loadAsNmrium: false },
    { name: 'ZIP 2D', input: 'nmrium/zips/zip2D.zip', golden: 'zip_2d_result_expected.nmrium', zipLabel: 'zip2D.zip', loadAsNmrium: false },
    { name: 'Legacy 2D (.nmrium → wrapper → same)', input: 'nmrium/zips/legacy_2D_spectra.nmrium', golden: 'legacy_embedded_2d_from_zip.nmrium', zipLabel: null, loadAsNmrium: true },
  ];

  cases.forEach(({ name, input, golden, zipLabel, loadAsNmrium }) => {
    it(`${name}: ${loadAsNmrium ? 'load .nmrium, wrapper round-trip, compare to golden' : 'wrapper + ELN bridge, compare to golden'}`, async () => {
      let rawState;
      if (loadAsNmrium) {
        const nmriumPath = path.join(FIXTURES_ROOT, input);
        const nmriumState = JSON.parse(fs.readFileSync(nmriumPath, 'utf8'));
        rawState = await getNmriumStateFromWrapperLoadNmrium(page, nmriumState);
      } else {
        const fileUrl = `${baseUrl}/${encodeURI(input)}`;
        rawState = await getNmriumStateFromWrapper(page, fileUrl);
      }
      const cleanedState = applyElnBridgePipeline(rawState, { zipLabel });
      const payload = extractPayloadForComparison(cleanedState);
      const actual = normalizeNmrium(payload);

      const goldenObj = readGolden(golden);
      const expected = normalizeNmrium(extractPayloadForComparison(goldenObj));
      expect(actual).toEqual(expected);
    });
  });
});
