/* eslint-disable no-undef */
import assert from 'assert';
import { describe, it, beforeEach } from 'mocha';
import { arrangePolymers } from 'src/utilities/ketcherSurfaceChemistry/canvasOperations';
import {
  imagesListSetter,
  molsSetter,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import { KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const alias = (templateId, imageCounter) => `t_${templateId}_${imageCounter}`;

const makeImageEntry = (h = 1.0, w = 1.0) => ({ boundingBox: { height: h, width: w } });

// Minimal editor mock: getKet() returns KET JSON with mol0 having the given atoms.
const makeEditor = (molAtoms) => ({
  structureDef: {
    editor: {
      getKet: async () => JSON.stringify({ mol0: { atoms: molAtoms } }),
    },
  },
});

const CANVAS_DATA = 'molfile-header\natom-block\nM  END';

// ─────────────────────────────────────────────────────────────────────────────
// arrangePolymers
// ─────────────────────────────────────────────────────────────────────────────
describe('canvasOperations — arrangePolymers', () => {
  beforeEach(() => {
    molsSetter(['mol0']);
  });

  it('returns split lines unchanged when imagesList is empty', async () => {
    imagesListSetter([]);
    const result = await arrangePolymers(CANVAS_DATA, makeEditor([]));
    assert.deepStrictEqual(result, CANVAS_DATA.split('\n'));
  });

  // Ball drawn FIRST: atom 0 is the polymer ball → atomIndex stored as 0
  it('ball-first: stores atom index 0 for ball at position 0', async () => {
    imagesListSetter([makeImageEntry()]);
    const atoms = [
      { alias: alias(95, 0) }, // ball at KET index 0
    ];
    const result = await arrangePolymers(CANVAS_DATA, makeEditor(atoms));

    assert.ok(result.includes(KET_TAGS.polymerIdentifier), 'PolymersList header appended');
    const polymerLine = result[result.length - 1];
    assert.ok(polymerLine.startsWith('0/95/'), `expected index 0 but got: ${polymerLine}`);
  });

  // Bug A scenario: structure drawn FIRST (3 carbons, atoms 0-2), then ball at atom 3
  it('structure-first: stores actual atom index N for ball after N-atom structure', async () => {
    imagesListSetter([makeImageEntry()]);
    const atoms = [
      { alias: null },         // atom 0: C
      { alias: null },         // atom 1: C
      { alias: null },         // atom 2: C
      { alias: alias(95, 0) }, // atom 3: polymer ball (image counter still 0)
    ];
    const result = await arrangePolymers(CANVAS_DATA, makeEditor(atoms));

    const polymerLine = result[result.length - 1];
    assert.ok(polymerLine.startsWith('3/95/'), `expected index 3 but got: ${polymerLine}`);
  });

  // Two balls: each must carry the correct atom index
  it('two balls: each ball gets its own correct atom index', async () => {
    imagesListSetter([makeImageEntry(1.0, 1.0), makeImageEntry(2.0, 2.0)]);
    molsSetter(['mol0']);
    const atoms = [
      { alias: alias(95, 0) }, // atom 0: first ball
      { alias: null },         // atom 1: C
      { alias: alias(95, 1) }, // atom 2: second ball
    ];
    const result = await arrangePolymers(CANVAS_DATA, makeEditor(atoms));

    const polymerLine = result[result.length - 1];
    assert.ok(polymerLine.includes('0/95/'), `first ball index missing in: ${polymerLine}`);
    assert.ok(polymerLine.includes('2/95/'), `second ball index missing in: ${polymerLine}`);
  });

  // Multi-mol canvas: ball in mol1 after mol0 has its own atoms — global index = mol0 size + local index
  it('multi-mol: ball in mol1 uses global atom index (mol0 size + local index)', async () => {
    imagesListSetter([makeImageEntry()]);
    molsSetter(['mol0', 'mol1']);
    const editor = {
      structureDef: {
        editor: {
          getKet: async () => JSON.stringify({
            mol0: { atoms: [{ alias: null }, { alias: null }] }, // 2 carbons — global 0,1
            mol1: { atoms: [{ alias: null }, { alias: alias(95, 0) }] }, // C + ball at local 1 → global 3
          }),
        },
      },
    };
    const result = await arrangePolymers(CANVAS_DATA, editor);
    const polymerLine = result[result.length - 1];
    assert.ok(polymerLine.startsWith('3/95/'), `expected global index 3 but got: ${polymerLine}`);
  });

  // Bug 1 regression: 6 single-atom polymer mols — before fix all had local index 0 → collision
  it('Bug 1 regression: 6 single-atom polymer mols each get a distinct global atom index', async () => {
    imagesListSetter([
      makeImageEntry(), makeImageEntry(), makeImageEntry(),
      makeImageEntry(), makeImageEntry(), makeImageEntry(),
    ]);
    molsSetter(['mol0', 'mol1', 'mol2', 'mol3', 'mol4', 'mol5']);
    const editor = {
      structureDef: {
        editor: {
          getKet: async () => JSON.stringify({
            mol0: { atoms: [{ alias: alias(52, 0) }] },
            mol1: { atoms: [{ alias: alias(52, 1) }] },
            mol2: { atoms: [{ alias: alias(52, 2) }] },
            mol3: { atoms: [{ alias: alias(24, 3) }] },
            mol4: { atoms: [{ alias: alias(53, 4) }] },
            mol5: { atoms: [{ alias: alias(35, 5) }] },
          }),
        },
      },
    };
    const result = await arrangePolymers(CANVAS_DATA, editor);
    const polymerLine = result[result.length - 1];
    // All six entries must exist with distinct indices 0-5
    assert.ok(polymerLine.includes('0/52/'), `missing index 0: ${polymerLine}`);
    assert.ok(polymerLine.includes('1/52/'), `missing index 1: ${polymerLine}`);
    assert.ok(polymerLine.includes('2/52/'), `missing index 2: ${polymerLine}`);
    assert.ok(polymerLine.includes('3/24/'), `missing index 3: ${polymerLine}`);
    assert.ok(polymerLine.includes('4/53/'), `missing index 4: ${polymerLine}`);
    assert.ok(polymerLine.includes('5/35/'), `missing index 5: ${polymerLine}`);
    // None should be duplicate index 0 (the pre-fix bug)
    const entries = polymerLine.trim().split(/\s+/);
    const indices = entries.map((e) => e.split('/')[0]);
    assert.strictEqual(new Set(indices).size, 6, `expected 6 distinct indices, got: ${indices}`);
  });

  // Mixed mol: structure (7 atoms) + 2 single-atom R# mols → global indices 7 and 8
  it('mixed mol: structure (7 atoms) + 2 single-atom R# mols → indices 7 and 8', async () => {
    imagesListSetter([makeImageEntry(), makeImageEntry()]);
    molsSetter(['mol0', 'mol1', 'mol2']);
    const structureAtoms = Array(7).fill({ alias: null });
    const editor = {
      structureDef: {
        editor: {
          getKet: async () => JSON.stringify({
            mol0: { atoms: structureAtoms },
            mol1: { atoms: [{ alias: alias(52, 0) }] },
            mol2: { atoms: [{ alias: alias(24, 1) }] },
          }),
        },
      },
    };
    const result = await arrangePolymers(CANVAS_DATA, editor);
    const polymerLine = result[result.length - 1];
    assert.ok(polymerLine.includes('7/52/'), `expected index 7: ${polymerLine}`);
    assert.ok(polymerLine.includes('8/24/'), `expected index 8: ${polymerLine}`);
  });

  it('returns canvasData split into lines plus PolymersList header and data', async () => {
    imagesListSetter([makeImageEntry()]);
    const result = await arrangePolymers(CANVAS_DATA, makeEditor([{ alias: alias(95, 0) }]));
    assert.ok(Array.isArray(result));
    assert.ok(result.includes(KET_TAGS.polymerIdentifier));
  });
});
