const mappedIdPattern = /glyph-\d+-\d+_[0-9a-f]{8}/;

function generateSuffix4() {
  return Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
}

const transformSvgIdsAndReferences = async (svgText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgText, 'image/svg+xml');
  const defs = xmlDoc.querySelector('defs');

  if (!defs) return svgText;
  const idMap = {};
  const elementsWithId = defs.querySelectorAll('[id]');

  const uniqueSuffix = generateSuffix4();

  elementsWithId.forEach((el) => {
    const originalId = el.getAttribute('id');
    if (mappedIdPattern.test(originalId)) return svgText;
    const uniqueId = `${originalId}_${uniqueSuffix}`;
    idMap[originalId] = uniqueId;
    el.setAttribute('id', uniqueId);
  });

  let svg = svgText;
  Object.entries(idMap).forEach(([originalId, uniqueId]) => {
    const idRegex = new RegExp(`id="${originalId}"`, 'g');
    const hrefRegex = new RegExp(`xlink:href="#${originalId}"`, 'g');
    svg = svg
      .replace(idRegex, `id="${uniqueId}"`)
      .replace(hrefRegex, `xlink:href="#${uniqueId}"`);
  });

  return svg;
};

export { transformSvgIdsAndReferences, mappedIdPattern };
