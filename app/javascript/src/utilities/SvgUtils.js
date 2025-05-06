import uuid from 'uuid';

// modify svg id, replace at instances - append a uuid with already existing glyph id eg: Glyph-0-1_####-####-####-####
const transformSvgIdsAndReferences = async (svgText) => {
  let svg = svgText;
  const idMap = {};
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgText, 'image/svg+xml');

  const defs = xmlDoc.querySelector('defs');
  if (!defs) return svgText;
  const elementsWithId = defs.querySelectorAll('[id]');

  // Step 1: Collect all IDs and assign unique suffixes
  elementsWithId.forEach((el) => {
    const originalId = el.getAttribute('id');
    const uniqueId = `${originalId}_${uuid()}`;
    idMap[originalId] = uniqueId;
    el.setAttribute('id', uniqueId);
  });

  // Step 2: Replace all IDs and references
  Object.entries(idMap).forEach(([originalId, uniqueId]) => {
    const idRegex = new RegExp(`id="${originalId}"`, 'g');
    const hrefRegex = new RegExp(`xlink:href="#${originalId}"`, 'g');
    svg = svgText
      .replace(idRegex, `id="${uniqueId}"`)
      .replace(hrefRegex, `xlink:href="#${uniqueId}"`);
  });
  return svg;
};

export default transformSvgIdsAndReferences;
