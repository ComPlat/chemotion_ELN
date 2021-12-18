const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

let env = process.argv[2];

const configPath = path.resolve(__dirname, '../..') + '/config/node_service.yml';
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
  console.log('sock initialized');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(ketcher);
  console.log('ketcher initialized');

  for await (const [msg] of sock) {
    let molfile = msg.toString();

    const response = await page.evaluate((mf) => {
      const lines = mf.split('\n');
      const molecule = chem.Molfile.parseCTFile(lines);
      ui.Action.fromNewCanvas(molecule);
      ui.render.onResize();
      ui.render.update();
      ui.setZoomCentered(null, ui.render.getStructCenter());

      // const svgEl = ui.client_area.firstElementChild;
      // const recs = svgEl.getElementsByTagName('rect');
      // while (recs.length > 0) svgEl.removeChild(recs[0]);

      // svgEl.removeAttribute('viewBox');
      // const bbox = svgEl.getBBox();
      // const { x, y, width, height } = bbox;

      // const nestedGEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // nestedGEl.setAttribute('transform', `translate(${-x}, ${-y})`);
      // const svgChildren = svgEl.childNodes;
      // for (let i = 0; i < svgChildren.length; ++i) {
      //   const child = svgChildren[i];
      //   if (child.getAttribute('stroke') === '#ff0000') continue;

      //   const clonedChild = child.cloneNode(true);
      //   nestedGEl.appendChild(clonedChild);
      // }
      // const clonedSvg = svgEl.cloneNode(false);
      // clonedSvg.appendChild(nestedGEl);
      // clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      // clonedSvg.setAttribute('width', 100);
      // clonedSvg.setAttribute('height', 100);

      // const gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // const outer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      // outer.appendChild(gEl);
      // // outer.setAttribute('viewBox', `0 0 ${width} ${height}`);
      // outer.setAttribute('viewBox', `0 0 100 100`);
      // outer.setAttribute('width', 200);
      // outer.setAttribute('height', 200);
      // gEl.appendChild(clonedSvg);

      // const svg = new XMLSerializer().serializeToString(outer);
      // return svg;

      return ui.client_area.innerHTML;
    }, molfile);

    await sock.send(response);
  }
})();
