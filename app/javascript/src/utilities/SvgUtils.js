import { v4 as uuid } from 'uuid';

const transformSvgIdsAndReferences = async (svgText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgText, 'image/svg+xml');
  const defs = xmlDoc.querySelector('defs');
  if (!defs) return svgText;

  const idMap = {};
  const elementsWithId = defs.querySelectorAll('[id]');

  elementsWithId.forEach((el) => {
    const originalId = el.getAttribute('id');
    const uniqueId = `${originalId}_${uuid()}`;
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

export default transformSvgIdsAndReferences;
