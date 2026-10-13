import { describe, it } from 'mocha';
import assert from 'assert';
import { parseFormulaLabel, getMaterialTypeSync } from 'src/utilities/hierarchicalFormulaParser';

// Inline the shapes JSON so tests are self-contained (no fetch needed in jsdom)
// eslint-disable-next-line import/no-unresolved
const shapesJson = require('../../../public/json/surfaceChemistryShapes.json');

describe('parseFormulaLabel', () => {
  describe('basic formulas', () => {
    it('"H2O" → 1 segment, elements [H, O]', () => {
      const r = parseFormulaLabel('H2O');
      assert.strictEqual(r.length, 1);
      assert.deepStrictEqual([...r[0].elements].sort(), ['H', 'O']);
    });

    it('"NH3" → elements [N, H]', () => {
      const r = parseFormulaLabel('NH3');
      assert.deepStrictEqual([...r[0].elements].sort(), ['H', 'N']);
    });

    it('"Fe2O3" → elements [Fe, O]', () => {
      const r = parseFormulaLabel('Fe2O3');
      assert.deepStrictEqual([...r[0].elements].sort(), ['Fe', 'O']);
    });

    it('"C60" → elements [C]', () => {
      const r = parseFormulaLabel('C60');
      assert.deepStrictEqual(r[0].elements, ['C']);
    });
  });

  describe('slash splitting', () => {
    it('"SiO2/Al2O3" → 2 segments', () => {
      const r = parseFormulaLabel('SiO2/Al2O3');
      assert.strictEqual(r.length, 2);
      assert.deepStrictEqual([...r[0].elements].sort(), ['O', 'Si']);
      assert.deepStrictEqual([...r[1].elements].sort(), ['Al', 'O']);
    });

    it('"Pd/C" → 2 segments [Pd] and [C]', () => {
      const r = parseFormulaLabel('Pd/C');
      assert.strictEqual(r.length, 2);
      assert.deepStrictEqual(r[0].elements, ['Pd']);
      assert.deepStrictEqual(r[1].elements, ['C']);
    });
  });

  describe('Roman-numeral oxidation state fix (entry 7 regression)', () => {
    it('"Fe(III)" → only [Fe], no iodine', () => {
      const r = parseFormulaLabel('Fe(III)');
      assert.deepStrictEqual(r[0].elements, ['Fe']);
    });

    it('"Fe(II)" → only [Fe]', () => {
      const r = parseFormulaLabel('Fe(II)');
      assert.deepStrictEqual(r[0].elements, ['Fe']);
    });

    it('"Fe(IV)/SiO2" → [Fe] and [Si, O]', () => {
      const r = parseFormulaLabel('Fe(IV)/SiO2');
      assert.deepStrictEqual(r[0].elements, ['Fe']);
      assert.deepStrictEqual([...r[1].elements].sort(), ['O', 'Si']);
    });

    it('"Co(III)" → only [Co], no iodine', () => {
      const r = parseFormulaLabel('Co(III)');
      assert.deepStrictEqual(r[0].elements, ['Co']);
    });
  });

  describe('crystal water fix (entry 13 regression)', () => {
    it('"NaCl·2H2O" → elements include O', () => {
      const r = parseFormulaLabel('NaCl·2H2O');
      const all = r.flatMap((s) => s.elements);
      assert.ok(all.includes('O'), 'O from crystal water not found');
      assert.ok(all.includes('Na'));
      assert.ok(all.includes('Cl'));
      assert.ok(all.includes('H'));
    });

    it('"CuSO4·5H2O" → elements include Cu, S, O, H', () => {
      const r = parseFormulaLabel('CuSO4·5H2O');
      const all = r.flatMap((s) => s.elements);
      ['Cu', 'S', 'O', 'H'].forEach((el) => assert.ok(all.includes(el), `missing ${el}`));
    });

    it('"NaCl·2H2O" (unicode middle dot) → O detected', () => {
      const r = parseFormulaLabel('NaCl·2H2O');
      const all = r.flatMap((s) => s.elements);
      assert.ok(all.includes('O'));
    });
  });

  describe('weight prefix stripping', () => {
    it('"50% SiO2" → elements [Si, O]', () => {
      const r = parseFormulaLabel('50% SiO2');
      assert.deepStrictEqual([...r[0].elements].sort(), ['O', 'Si']);
    });

    it('"5wt%NiO" → elements [Ni, O]', () => {
      const r = parseFormulaLabel('5wt%NiO');
      assert.deepStrictEqual([...r[0].elements].sort(), ['Ni', 'O']);
    });

    it('"1wt.% PdPt" → elements [Pd, Pt]', () => {
      const r = parseFormulaLabel('1wt.% PdPt');
      assert.deepStrictEqual([...r[0].elements].sort(), ['Pd', 'Pt']);
    });
  });

  describe('edge cases', () => {
    it('"pdpt" (all lowercase) → empty elements', () => {
      const r = parseFormulaLabel('pdpt');
      assert.deepStrictEqual(r[0].elements, []);
    });

    it('"Mg2+" (charge stripped) → [Mg]', () => {
      const r = parseFormulaLabel('Mg2+');
      assert.deepStrictEqual(r[0].elements, ['Mg']);
    });

    it('empty string → 1 segment with empty elements', () => {
      const r = parseFormulaLabel('');
      assert.strictEqual(r.length, 1);
      assert.deepStrictEqual(r[0].elements, []);
    });

    it('null/undefined → 1 segment with empty elements', () => {
      const r = parseFormulaLabel(null);
      assert.strictEqual(r.length, 1);
      assert.deepStrictEqual(r[0].elements, []);
    });
  });
});

describe('getMaterialTypeSync', () => {
  it('template_id 70 (basic single phase support) → "Support"', () => {
    const t = getMaterialTypeSync(70, shapesJson);
    assert.strictEqual(t, 'Support');
  });

  it('template_id 31 (semantic single phase support) → "Support"', () => {
    const t = getMaterialTypeSync(31, shapesJson);
    assert.strictEqual(t, 'Support');
  });

  it('template_id 1 (basic single-compound active phase) → "Active Phase"', () => {
    const t = getMaterialTypeSync(1, shapesJson);
    assert.strictEqual(t, 'Active Phase');
  });

  it('template_id 10 (semantic single-compound active phase) → "Active Phase"', () => {
    const t = getMaterialTypeSync(10, shapesJson);
    assert.strictEqual(t, 'Active Phase');
  });

  it('template_id 61 (basic promotor) → "Promoter"', () => {
    const t = getMaterialTypeSync(61, shapesJson);
    assert.strictEqual(t, 'Promoter');
  });

  it('template_id 23 (semantic promoter) → "Promoter"', () => {
    const t = getMaterialTypeSync(23, shapesJson);
    assert.strictEqual(t, 'Promoter');
  });

  it('template_id 93 (basic porous body) → "Body"', () => {
    const t = getMaterialTypeSync(93, shapesJson);
    assert.strictEqual(t, 'Body');
  });

  it('template_id 52 (semantic porous body) → "Body"', () => {
    const t = getMaterialTypeSync(52, shapesJson);
    assert.strictEqual(t, 'Body');
  });

  it('unknown template_id 9999 → "Unknown"', () => {
    const t = getMaterialTypeSync(9999, shapesJson);
    assert.strictEqual(t, 'Unknown');
  });

  it('null template_id → "Unknown"', () => {
    const t = getMaterialTypeSync(null, shapesJson);
    assert.strictEqual(t, 'Unknown');
  });

  it('null shapesJson → "Unknown"', () => {
    const t = getMaterialTypeSync(70, null);
    assert.strictEqual(t, 'Unknown');
  });
});
