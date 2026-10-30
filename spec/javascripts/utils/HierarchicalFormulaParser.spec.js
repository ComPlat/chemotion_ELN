import { describe, it } from 'mocha';
import assert from 'assert';
import {
  parseFormulaLabel,
  parseFormulaToElements,
  extractWeightPrefix,
  getMaterialTypeSync,
} from 'src/utilities/hierarchicalFormulaParser';

// eslint-disable-next-line import/no-unresolved
const shapesJson = require('../../../public/json/surfaceChemistryShapes.json');

// ─── Helper ────────────────────────────────────────────────────────────────
// Collect unique element symbols produced by parsing all segments of a label.
function uniqueElementsOf(source) {
  const segs = parseFormulaLabel(source);
  return [...new Set(segs.flatMap((s) => parseFormulaToElements(s.segment).map((e) => e.element)))].sort();
}

// ─── parseFormulaLabel (segment splitting only) ─────────────────────────────

describe('parseFormulaLabel — 20 examples', () => {
  // ── Basic single formulas ─────────────────────────────────────────────────

  it('01 "H2O" → 1 segment "H2O"', () => {
    const r = parseFormulaLabel('H2O');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].segment, 'H2O');
  });

  it('02 "Fe2O3" → 1 segment "Fe2O3"', () => {
    const r = parseFormulaLabel('Fe2O3');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].segment, 'Fe2O3');
  });

  it('03 "C60" → 1 segment "C60"', () => {
    const r = parseFormulaLabel('C60');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].segment, 'C60');
  });

  // ── Slash splitting ───────────────────────────────────────────────────────

  it('04 "SiO2/Al2O3" → 2 segments ["SiO2", "Al2O3"]', () => {
    const r = parseFormulaLabel('SiO2/Al2O3');
    assert.strictEqual(r.length, 2);
    assert.strictEqual(r[0].segment, 'SiO2');
    assert.strictEqual(r[1].segment, 'Al2O3');
  });

  it('05 "Pd/C" → 2 segments ["Pd", "C"]', () => {
    const r = parseFormulaLabel('Pd/C');
    assert.strictEqual(r.length, 2);
    assert.strictEqual(r[0].segment, 'Pd');
    assert.strictEqual(r[1].segment, 'C');
  });

  it('06 "TiO2/SiO2/Al2O3" → 3 segments', () => {
    const r = parseFormulaLabel('TiO2/SiO2/Al2O3');
    assert.strictEqual(r.length, 3);
    assert.strictEqual(r[0].segment, 'TiO2');
    assert.strictEqual(r[1].segment, 'SiO2');
    assert.strictEqual(r[2].segment, 'Al2O3');
  });

  // ── Roman-numeral oxidation state stripping ───────────────────────────────

  it('07 "Fe(III)" → segment contains no Roman numeral, still parses as 1 segment', () => {
    const r = parseFormulaLabel('Fe(III)');
    assert.strictEqual(r.length, 1);
    // After stripping (III), segment is "Fe"
    assert.strictEqual(r[0].segment, 'Fe');
    // Unique elements: only Fe, no false I (iodine)
    assert.deepStrictEqual(uniqueElementsOf('Fe(III)'), ['Fe']);
  });

  it('08 "Co(II)/SiO2" → 2 segments, no iodine in Co segment', () => {
    const r = parseFormulaLabel('Co(II)/SiO2');
    assert.strictEqual(r.length, 2);
    assert.strictEqual(r[0].segment, 'Co');
    assert.strictEqual(r[1].segment, 'SiO2');
    assert.deepStrictEqual(uniqueElementsOf('Co(II)/SiO2'), ['Co', 'O', 'Si']);
  });

  it('09 "MnO2(IV)/Al2O3" → 2 segments, IV stripped', () => {
    const r = parseFormulaLabel('MnO2(IV)/Al2O3');
    assert.strictEqual(r.length, 2);
    assert.strictEqual(r[0].segment, 'MnO2');
    assert.strictEqual(r[1].segment, 'Al2O3');
  });

  // ── Crystal water (middle-dot hydrate) ───────────────────────────────────

  it('10 "NaCl·2H2O" → 2 segments ["NaCl", "2H2O"]', () => {
    const r = parseFormulaLabel('NaCl·2H2O');
    assert.strictEqual(r.length, 2);
    assert.strictEqual(r[0].segment, 'NaCl');
    assert.strictEqual(r[1].segment, '2H2O');
  });

  it('11 "CuSO4·5H2O" → 2 segments, elements include Cu,S,O,H', () => {
    const r = parseFormulaLabel('CuSO4·5H2O');
    assert.strictEqual(r.length, 2);
    const els = uniqueElementsOf('CuSO4·5H2O');
    ['Cu', 'H', 'O', 'S'].forEach((el) => assert.ok(els.includes(el), `missing ${el}`));
  });

  it('12 "MgSO4·7H2O" (bullet dot •) → 2 segments', () => {
    const r = parseFormulaLabel('MgSO4•7H2O');
    assert.strictEqual(r.length, 2);
    assert.strictEqual(r[0].segment, 'MgSO4');
  });

  // ── Weight prefix stripping ───────────────────────────────────────────────

  it('13 "50% SiO2" → 1 segment "SiO2", elements [O, Si]', () => {
    const r = parseFormulaLabel('50% SiO2');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].segment, 'SiO2');
    assert.deepStrictEqual(uniqueElementsOf('50% SiO2'), ['O', 'Si']);
  });

  it('14 "5wt%NiO" → 1 segment "NiO"', () => {
    const r = parseFormulaLabel('5wt%NiO');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].segment, 'NiO');
  });

  it('15 "10 wt.% Al2O3/SiO2" → 2 segments after prefix strip', () => {
    const r = parseFormulaLabel('10 wt.% Al2O3/SiO2');
    assert.strictEqual(r.length, 2);
    assert.strictEqual(r[0].segment, 'Al2O3');
    assert.strictEqual(r[1].segment, 'SiO2');
  });

  it('16 "1wt.% PdPt/SiO2" → 2 segments, Pd+Pt+Si+O unique', () => {
    const r = parseFormulaLabel('1wt.% PdPt/SiO2');
    assert.strictEqual(r.length, 2);
    assert.deepStrictEqual(uniqueElementsOf('1wt.% PdPt/SiO2'), ['O', 'Pd', 'Pt', 'Si']);
  });

  // ── Unique element deduplication across "/" segments ──────────────────────

  it('17 "SiO2/Al2O3" unique elements = [Al, O, Si] (O shared, not doubled)', () => {
    // This is the core deduplication test — the bug that was fixed
    assert.deepStrictEqual(uniqueElementsOf('SiO2/Al2O3'), ['Al', 'O', 'Si']);
  });

  it('18 "RhGaO3/SiO2" unique elements = [Ga, O, Rh, Si]', () => {
    assert.deepStrictEqual(uniqueElementsOf('RhGaO3/SiO2'), ['Ga', 'O', 'Rh', 'Si']);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('19 empty string → 1 segment with empty string', () => {
    const r = parseFormulaLabel('');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].segment, '');
  });

  it('20 null → 1 segment with empty string', () => {
    const r = parseFormulaLabel(null);
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].segment, '');
  });
});

// ─── parseFormulaToElements ──────────────────────────────────────────────────

describe('parseFormulaToElements', () => {
  it('"H2O" → [{element:"H",count:2},{element:"O",count:1}]', () => {
    const r = parseFormulaToElements('H2O');
    assert.deepStrictEqual(r, [{ element: 'H', count: 2 }, { element: 'O', count: 1 }]);
  });

  it('"SiO2" → [{element:"Si",count:1},{element:"O",count:2}]', () => {
    const r = parseFormulaToElements('SiO2');
    assert.deepStrictEqual(r, [{ element: 'Si', count: 1 }, { element: 'O', count: 2 }]);
  });

  it('"Al2O3" → Al:2, O:3', () => {
    const r = parseFormulaToElements('Al2O3');
    const map = Object.fromEntries(r.map((e) => [e.element, e.count]));
    assert.strictEqual(map.Al, 2);
    assert.strictEqual(map.O, 3);
  });

  it('"Rh1Ga1.1O4.7" → decimal stoich supported', () => {
    const r = parseFormulaToElements('Rh1Ga1.1O4.7');
    const map = Object.fromEntries(r.map((e) => [e.element, e.count]));
    assert.ok(Math.abs(map.Ga - 1.1) < 0.001);
    assert.ok(Math.abs(map.O - 4.7) < 0.001);
  });

  it('"C6H5OH" → C:6, H:6, O:1 (duplicate symbols merged)', () => {
    const r = parseFormulaToElements('C6H5OH');
    const map = Object.fromEntries(r.map((e) => [e.element, e.count]));
    assert.strictEqual(map.C, 6);
    assert.strictEqual(map.H, 6);
    assert.strictEqual(map.O, 1);
  });

  it('empty string → []', () => {
    assert.deepStrictEqual(parseFormulaToElements(''), []);
  });

  it('null → []', () => {
    assert.deepStrictEqual(parseFormulaToElements(null), []);
  });
});

// ─── extractWeightPrefix ────────────────────────────────────────────────────

describe('extractWeightPrefix', () => {
  it('"50% SiO2" → 50', () => assert.strictEqual(extractWeightPrefix('50% SiO2'), 50));
  it('"10 wt.% Al2O3" → 10', () => assert.strictEqual(extractWeightPrefix('10 wt.% Al2O3'), 10));
  it('"5wt%NiO" → 5', () => assert.strictEqual(extractWeightPrefix('5wt%NiO'), 5));
  it('"1wt.% PdPt" → 1', () => assert.strictEqual(extractWeightPrefix('1wt.% PdPt'), 1));
  it('"SiO2" (no prefix) → null', () => assert.strictEqual(extractWeightPrefix('SiO2'), null));
  it('null → null', () => assert.strictEqual(extractWeightPrefix(null), null));
});

// ─── getMaterialTypeSync ─────────────────────────────────────────────────────

describe('getMaterialTypeSync', () => {
  it('template_id 70 → { type: "Support", subType: "Single phase support" }', () => {
    const t = getMaterialTypeSync(70, shapesJson);
    assert.strictEqual(t.type, 'Support');
    assert.ok(t.subType.toLowerCase().includes('single'));
  });

  it('template_id 31 → type "Support"', () => {
    assert.strictEqual(getMaterialTypeSync(31, shapesJson).type, 'Support');
  });

  it('template_id 78 → type "Support", subType includes "multi"', () => {
    const t = getMaterialTypeSync(78, shapesJson);
    assert.strictEqual(t.type, 'Support');
    assert.ok(t.subType.toLowerCase().includes('multi'));
  });

  it('template_id 1 → type "Active Phase"', () => {
    assert.strictEqual(getMaterialTypeSync(1, shapesJson).type, 'Active Phase');
  });

  it('template_id 10 → type "Active Phase"', () => {
    assert.strictEqual(getMaterialTypeSync(10, shapesJson).type, 'Active Phase');
  });

  it('template_id 9 → type "Active Phase", subType includes "multi"', () => {
    const t = getMaterialTypeSync(9, shapesJson);
    assert.strictEqual(t.type, 'Active Phase');
    assert.ok(t.subType.toLowerCase().includes('multi'));
  });

  it('template_id 61 → type "Promoter"', () => {
    assert.strictEqual(getMaterialTypeSync(61, shapesJson).type, 'Promoter');
  });

  it('template_id 23 → type "Promoter"', () => {
    assert.strictEqual(getMaterialTypeSync(23, shapesJson).type, 'Promoter');
  });

  it('template_id 93 → type "Body"', () => {
    assert.strictEqual(getMaterialTypeSync(93, shapesJson).type, 'Body');
  });

  it('template_id 52 → type "Body"', () => {
    assert.strictEqual(getMaterialTypeSync(52, shapesJson).type, 'Body');
  });

  it('unknown template_id 9999 → { type: "Unknown", subType: "Unknown" }', () => {
    const t = getMaterialTypeSync(9999, shapesJson);
    assert.strictEqual(t.type, 'Unknown');
    assert.strictEqual(t.subType, 'Unknown');
  });

  it('null template_id → { type: "Unknown" }', () => {
    assert.strictEqual(getMaterialTypeSync(null, shapesJson).type, 'Unknown');
  });

  it('null shapesJson → { type: "Unknown" }', () => {
    assert.strictEqual(getMaterialTypeSync(70, null).type, 'Unknown');
  });
});
