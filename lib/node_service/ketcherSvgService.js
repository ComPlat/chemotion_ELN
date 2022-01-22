const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

const env = process.argv[2];
const configPath = `${path.resolve(__dirname, '../..')}/config/ketcher_service.yml`;
const config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))[env] || {};
const transport = config[':transport'];
const endpoint = config[':endpoint'];
const ketcher = config[':ketcher'];
if (!transport || !endpoint) return;

const puppeteer = require('puppeteer');
const zmq = require('zeromq');

(async () => {
  const sock = new zmq.Reply;
  await sock.bind(`${transport}://${endpoint}`);

  let browser = null;

  if (env === 'production') {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--single-process']
    });
  } else {
    browser = await puppeteer.launch();
  }

  const page = await browser.newPage();
  await page.goto(ketcher);

  for await (const [msg] of sock) {
    let molfile = msg.toString();

    const response = await page.evaluate((mf) => {
      const lines = mf.split('\n');
      const molecule = chem.Molfile.parseCTFile(lines);
      ui.Action.fromNewCanvas(molecule);
      ui.render.onResize();
      ui.render.update();
      ui.setZoomCentered(null, ui.render.getStructCenter());
      return ui.client_area.innerHTML;

    }, molfile);
    console.log(response);
    await sock.send(response);
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
})();
