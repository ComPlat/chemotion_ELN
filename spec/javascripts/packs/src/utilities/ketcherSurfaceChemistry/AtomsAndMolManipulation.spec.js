/* eslint-disable no-undef */
import assert from 'assert';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import { addingPolymersToKetcher } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { molsSetter } from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import * as InitAndParse from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import * as KetcherEditor from 'src/components/structureEditor/KetcherEditor';

const fakeTemplate = { boundingBox: { height: 1, width: 1 }, svg: '<svg/>' };
const rGroupAtom = (location = [0, 0, 0]) => ({ type: 'rg-label', location });

describe('AtomsAndMolManipulation — addingPolymersToKetcher', () => {
  beforeEach(() => {
    sinon.stub(InitAndParse, 'initializeKetcherData').resolves();
    sinon.stub(InitAndParse, 'templateWithBoundingBox').resolves(fakeTemplate);
    sinon.stub(KetcherEditor, 'imageUsedCounterSetter');
    KetcherEditor.imageNodeCounter = 0;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('6 unique global indices → each mol gets its own distinct template (Bug 1 load fix)', async () => {
    molsSetter(['mol0', 'mol1', 'mol2', 'mol3', 'mol4', 'mol5']);
    const data = {
      mol0: { atoms: [rGroupAtom()] },
      mol1: { atoms: [rGroupAtom()] },
      mol2: { atoms: [rGroupAtom()] },
      mol3: { atoms: [rGroupAtom()] },
      mol4: { atoms: [rGroupAtom()] },
      mol5: { atoms: [rGroupAtom()] },
    };
    const polymersList = '0/52/1.50-2.00 1/52/1.50-2.00 2/52/1.50-2.00 3/24/1.00-1.00 4/53/1.50-2.00 5/35/2.00-2.00';
    const { c_images } = await addingPolymersToKetcher(polymersList, data);
    assert.strictEqual(c_images.length, 6, `expected 6 images, got ${c_images.length}`);
    // Each atom alias must encode a different seq counter (0..5)
    const aliases = ['mol0', 'mol1', 'mol2', 'mol3', 'mol4', 'mol5'].map((m) => data[m].atoms[0].alias);
    const seqNums = aliases.map((a) => parseInt(a.split('_')[2], 10));
    assert.strictEqual(new Set(seqNums).size, 6, `duplicate seq counters: ${seqNums}`);
  });

  it('colliding indices (all 0) → falls back to consumption order, all 6 mols get a template', async () => {
    molsSetter(['mol0', 'mol1', 'mol2', 'mol3', 'mol4', 'mol5']);
    const data = {
      mol0: { atoms: [rGroupAtom()] },
      mol1: { atoms: [rGroupAtom()] },
      mol2: { atoms: [rGroupAtom()] },
      mol3: { atoms: [rGroupAtom()] },
      mol4: { atoms: [rGroupAtom()] },
      mol5: { atoms: [rGroupAtom()] },
    };
    const polymersList = '0/52/1.50-2.00 0/52/1.50-2.00 0/52/1.50-2.00 0/24/1.00-1.00 0/53/1.50-2.00 0/35/2.00-2.00';
    const { c_images } = await addingPolymersToKetcher(polymersList, data);
    // Consumption-order fallback visits all 6 atoms
    assert.strictEqual(c_images.length, 6, `expected 6 images via fallback, got ${c_images.length}`);
  });

  it('single R# in single mol → correct template assigned', async () => {
    molsSetter(['mol0']);
    const data = { mol0: { atoms: [rGroupAtom([1, 2, 0])] } };
    const polymersList = '0/95/1.00-1.00';
    const { c_images, molfileData } = await addingPolymersToKetcher(polymersList, data);
    assert.strictEqual(c_images.length, 1);
    assert.ok(molfileData.mol0.atoms[0].alias.startsWith('t_95_'), `unexpected alias: ${molfileData.mol0.atoms[0].alias}`);
  });

  it('legacy format tokens (no slash) → consumption-order path, no crash', async () => {
    molsSetter(['mol0']);
    const data = { mol0: { atoms: [rGroupAtom()] } };
    const polymersList = '0'; // legacy: index only, no template/size
    const result = await addingPolymersToKetcher(polymersList, data);
    assert.ok(result, 'should return without throwing');
  });

  it('R# atom matched by label === "R#" works (aliasPass via label)', async () => {
    molsSetter(['mol0']);
    const data = { mol0: { atoms: [{ label: 'R#', location: [0, 0, 0] }] } };
    const polymersList = '0/52/1.00-1.00';
    const { c_images } = await addingPolymersToKetcher(polymersList, data);
    assert.strictEqual(c_images.length, 1);
  });
});
