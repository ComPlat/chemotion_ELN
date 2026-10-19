/* eslint-disable no-undef */
import assert from 'assert';
import { describe, it } from 'mocha';
import { ctabLinesOnly } from 'src/utilities/ketcherSurfaceChemistry/canvasOperations';

const SAMPLE_MOLFILE = `Ketcher 11012415072D 1   1.00000     0.00000     0

  2  1  0     0  0            999 V2000
   13.5749   -3.9000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   14.4410   -3.9000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0     0  0
M  END
> <PolymersList>
0/t_01_0/R/1
$$$$`;

describe('ctabLinesOnly', () => {
  it('returns lines up to and including M  END, excluding PolymersList block', () => {
    const result = ctabLinesOnly(SAMPLE_MOLFILE);
    const joined = result.join('\n');
    assert.ok(joined.includes('M  END'), 'Result should include M  END');
    assert.ok(!joined.includes('PolymersList'), 'Result must not include PolymersList block');
    assert.ok(!joined.includes('$$$$'), 'Result must not include $$$$ terminator');
  });

  it('includes the M  END line itself', () => {
    const result = ctabLinesOnly(SAMPLE_MOLFILE);
    assert.ok(result[result.length - 1].trim().startsWith('M'), 'Last line should be the M  END line');
  });

  it('returns all lines when no M  END is present', () => {
    const molfileNoEnd = 'line1\nline2\nline3';
    const result = ctabLinesOnly(molfileNoEnd);
    assert.strictEqual(result.length, 3, 'Should return all lines when M  END is absent');
  });

  it('returns empty array for null input', () => {
    const result = ctabLinesOnly(null);
    assert.deepStrictEqual(result, [], 'null input should return empty array');
  });

  it('returns empty array for undefined input', () => {
    const result = ctabLinesOnly(undefined);
    assert.deepStrictEqual(result, [], 'undefined input should return empty array');
  });

  it('returns empty array for non-string input', () => {
    const result = ctabLinesOnly(42);
    assert.deepStrictEqual(result, [], 'non-string input should return empty array');
  });

  it('handles molfile where M  END is the last line', () => {
    const simple = 'header\natoms\nM  END';
    const result = ctabLinesOnly(simple);
    assert.strictEqual(result[result.length - 1], 'M  END', 'M  END should be last line');
    assert.strictEqual(result.length, 3, 'Should include all 3 lines');
  });
});
