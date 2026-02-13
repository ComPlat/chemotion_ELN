import fs from 'fs';
import http from 'http';
import path from 'path';
import expect from 'expect';
import { chromium } from 'playwright';
import { describe, it, before, after } from 'mocha';

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
]);

function normalizeNmrium(value) {
  if (Array.isArray(value)) return value.map(normalizeNmrium);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value)
      .sort()
      .forEach((k) => {
        if (DROP_KEYS.has(k)) return;
        out[k] = normalizeNmrium(value[k]);
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

  await page.waitForFunction(() => window.__nmriumState !== null, { timeout: 120000 });
  return page.evaluate(() => window.__nmriumState);
}

// Run with: RUN_NMRIUM_GOLDEN=1 yarn test
// Uses system Chrome/Chromium (no "playwright install" needed). Install with:
//   Ubuntu/Debian: sudo apt install chromium-browser
//   ou: sudo apt install chromium
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
    {
      name: 'JCAMP',
      input: 'spectra_file.jdx',
      golden: 'jdx_result_expected.nmrium',
    },
    {
      name: 'ZIP 1D',
      input: 'nmrium/zips/zip1D.zip',
      golden: 'zip_1d_result_expected.nmrium',
    },
    {
      name: 'ZIP 2D',
      input: 'nmrium/zips/zip2D.zip',
      golden: 'zip_2d_result_expected.nmrium',
    },
  ];

  cases.forEach(({ name, input, golden }) => {
    it(`converts ${name} via wrapper and matches golden`, async () => {
      const fileUrl = `${baseUrl}/${encodeURI(input)}`;
      const nmriumState = await getNmriumStateFromWrapper(page, fileUrl);
      const goldenObj = readGolden(golden);

      const actual = normalizeNmrium(nmriumState);
      const expected = normalizeNmrium(goldenObj);

      expect(actual).toEqual(expected);
    });
  });
});
