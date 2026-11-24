/* eslint-disable no-undef */
import assert from 'assert';
import { describe, it } from 'mocha';
import { stripAutoEnhancedStereo } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';

const ketWithStereo = {
  root: { nodes: [{ $ref: 'mol0' }] },
  mol0: {
    atoms: [{ label: 'C', stereoLabel: 'and1' }, { label: 'O' }],
    bonds: [],
  },
};

describe('stripAutoEnhancedStereo', () => {
  it('removes stereoLabel from atoms', () => {
    const result = stripAutoEnhancedStereo(ketWithStereo);
    assert.strictEqual(result.mol0.atoms[0].stereoLabel, undefined);
  });

  it('leaves atoms without stereoLabel unchanged', () => {
    const result = stripAutoEnhancedStereo(ketWithStereo);
    assert.strictEqual(result.mol0.atoms[1].label, 'O');
    assert.strictEqual(result.mol0.atoms[1].stereoLabel, undefined);
  });

  it('returns null/undefined input unchanged', () => {
    assert.strictEqual(stripAutoEnhancedStereo(null), null);
    assert.strictEqual(stripAutoEnhancedStereo(undefined), undefined);
  });
});

describe('V3000 source guard in prepareKetcherData', () => {
  const V3000_REGEX = /^M {2}V30 COUNTS/m;

  it('detects M  V30 COUNTS as V3000', () => {
    const v3Mol = '\n\n\nM  V30 BEGIN CTAB\nM  V30 COUNTS 6 6 0 0 0\nM  V30 END CTAB\nM  END\n';
    assert.ok(V3000_REGEX.test(v3Mol));
  });

  it('does not match a V2000 molfile', () => {
    const v2Mol = '\n  noname\n\n  6  6  0  0  0  0  0  0  0  0999 V2000\nM  END\n';
    assert.ok(!V3000_REGEX.test(v2Mol));
  });

  it('does not match an empty string', () => {
    assert.ok(!V3000_REGEX.test(''));
  });
});
