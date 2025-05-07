/* eslint-disable no-undef */
import expect from 'expect';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { transformSvgIdsAndReferences, mappedIdPattern } from 'src/utilities/SvgUtils';

global.DOMParser = new JSDOM().window.DOMParser;
const originalIdPatter = /glyph-\d+-\d/;
const loadFixture = (name) => fs.readFileSync(`spec/fixtures/svg/${name}.svg`, 'utf-8');

describe('SVG id & reference mutations', () => {
  it('should append UUID to IDs in <defs> and match with pattern', async () => {
    const svgFile = loadFixture('defMutationWithId');
    const updatedSvg = await transformSvgIdsAndReferences(svgFile);
    const allIds = new Set();

    // Extract all id="..." values
    Array.from(updatedSvg.matchAll(/id="([^"]+)"/g)).forEach((match) => {
      const id = match[1];
      expect(id).toMatch(mappedIdPattern);
      allIds.add(id);
    });

    // Extract all xlink:href or href references
    Array.from(updatedSvg.matchAll(/<use[^>]+(?:xlink:)?href="#([^"]+)"/g)).forEach((match) => {
      const refId = match[1];
      expect(refId).toMatch(mappedIdPattern);
      expect(allIds.has(refId)).toBe(true);
    });
  });

  it('should return the same svg when there are no ids', async () => {
    const svgFile = loadFixture('defMutationNoIds');
    const updatedSvg = await transformSvgIdsAndReferences(svgFile);
    expect(updatedSvg).toEqual(svgFile);
  });

  it('should return the same svg when there are no defs', async () => {
    const svgFile = loadFixture('defMutationEmptyDefs');
    const updatedSvg = await transformSvgIdsAndReferences(svgFile);
    expect(updatedSvg).toEqual(svgFile);
  });

  it('should not modify any id in use when defs are empty', async () => {
    const svgFile = loadFixture('defMutationWithUse');
    const updatedSvg = await transformSvgIdsAndReferences(svgFile);
    Array.from(updatedSvg.matchAll(/<use[^>]+(?:xlink:)?href="#([^"]+)"/g)).forEach((match) => {
      const refId = match[1];
      expect(refId).toMatch(originalIdPatter);
    });
  });

  it('should not modify, svg is already processed', async () => {
    const svgFile = loadFixture('defMutationAlreadyProcessed');
    const updatedSvg = await transformSvgIdsAndReferences(svgFile);
    expect(updatedSvg).toEqual(svgFile);
  });
});
