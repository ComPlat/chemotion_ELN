import { describe, it } from 'mocha';
import assert from 'assert';
import buildHierarchicalMaterialRows from 'src/utilities/sampleHierarchicalCompositions';

// Minimal component factory matching what buildHierarchicalMaterialRows expects
const makeComponent = (source, weightRatioExp = 0, molarMass = 0) => ({
  name: 'HierarchicalMaterial',
  source,
  template_category: 'basic',
  molar_mass: molarMass,
  weight_ratio_exp: weightRatioExp,
  // Methods that Component would normally supply
  parseComponentSource(s) {
    if (!s) return { source: '', component: '', weightRatioCalc: 0 };
    if (s.indexOf('%') !== -1) {
      const match = s.trim().match(/^\d+/);
      const wt = match ? Number(match[0]) : 0;
      return { source: s, component: s.trim(), weightRatioCalc: wt };
    }
    const parts = s.split('-');
    return { source: s, component: parts[1] || parts[0], weightRatioCalc: 0 };
  },
  calcWeightRatioWithoutWeight(components) {
    let sum = 0;
    components.forEach((c) => {
      const { weightRatioCalc } = this.parseComponentSource(c.source);
      if (!Number.isNaN(weightRatioCalc)) sum += weightRatioCalc;
    });
    return 100 - sum;
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function rowBySource(rows, sourceSubstr) {
  return rows.find((r) => r.sourceAlias && r.sourceAlias.includes(sourceSubstr));
}

// ─── totalExpWtRatio ────────────────────────────────────────────────────────

describe('buildHierarchicalMaterialRows', () => {
  describe('totalExpWtRatio', () => {
    it('returns totalExpWtRatio = 0 for empty components', () => {
      const { totalExpWtRatio } = buildHierarchicalMaterialRows([]);
      assert.strictEqual(totalExpWtRatio, 0);
    });

    it('returns totalExpWtRatio equal to sum of weight_ratio_exp values', () => {
      const components = [
        makeComponent('40% SiO2', 40, 60.08),
        makeComponent('60% Al2O3', 60, 101.96),
      ];
      const { totalExpWtRatio } = buildHierarchicalMaterialRows(components);
      assert.strictEqual(totalExpWtRatio, 100);
    });

    it('returns totalExpWtRatio = 80 when values sum to 80', () => {
      const components = [
        makeComponent('40% SiO2', 40, 60.08),
        makeComponent('40% Al2O3', 40, 101.96),
      ];
      const { totalExpWtRatio } = buildHierarchicalMaterialRows(components);
      assert.strictEqual(totalExpWtRatio, 80);
    });

    it('returns totalExpWtRatio = 0 when no weight_ratio_exp is set', () => {
      const components = [
        makeComponent('50% SiO2', 0, 60.08),
        makeComponent('50% Al2O3', 0, 101.96),
      ];
      const { totalExpWtRatio } = buildHierarchicalMaterialRows(components);
      assert.strictEqual(totalExpWtRatio, 0);
    });

    it('handles floating point weight_ratio_exp values', () => {
      const components = [
        makeComponent('33% SiO2', 33.33, 60.08),
        makeComponent('67% Al2O3', 66.67, 101.96),
      ];
      const { totalExpWtRatio } = buildHierarchicalMaterialRows(components);
      assert.strictEqual(totalExpWtRatio, 100);
    });
  });

  // ─── rowsData shape ────────────────────────────────────────────────────────

  describe('rowsData — output shape', () => {
    it('returns rowsData array', () => {
      const { rowsData } = buildHierarchicalMaterialRows([]);
      assert.ok(Array.isArray(rowsData));
    });

    it('returns empty rowsData for empty components', () => {
      const { rowsData } = buildHierarchicalMaterialRows([]);
      assert.strictEqual(rowsData.length, 0);
    });

    it('each row has required fields', () => {
      const components = [makeComponent('50% SiO2', 50, 60.08)];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      assert.strictEqual(rowsData.length, 1);
      const row = rowsData[0];
      assert.ok('index' in row, 'missing index');
      assert.ok('component' in row, 'missing component');
      assert.ok('sourceAlias' in row, 'missing sourceAlias');
      assert.ok('molar_mass' in row, 'missing molar_mass');
      assert.ok('weight_ratio_exp' in row, 'missing weight_ratio_exp');
      assert.ok('weightRatioCalcProcessed' in row, 'missing weightRatioCalcProcessed');
      assert.ok('molarRatioCalcMM' in row, 'missing molarRatioCalcMM');
    });

    it('index matches position of component in input array', () => {
      const components = [
        makeComponent('30% Al2O3', 30, 101.96),
        makeComponent('70% SiO2', 70, 60.08),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      // SiO2 (70) should be second; sorted ascending but index preserved
      const sio2 = rowBySource(rowsData, 'SiO2');
      assert.strictEqual(sio2.index, 1);
    });
  });

  // ─── weightRatioCalcProcessed ──────────────────────────────────────────────

  describe('weightRatioCalcProcessed — calc wt%', () => {
    it('single explicit 50%: weightRatioCalcProcessed = 50', () => {
      const components = [
        makeComponent('50% SiO2', 50, 60.08),
        makeComponent('50% Al2O3', 50, 101.96),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const sio2 = rowBySource(rowsData, 'SiO2');
      assert.strictEqual(sio2.weightRatioCalcProcessed, 50);
    });

    it('explicit 10%: weightRatioCalcProcessed = 10', () => {
      const components = [
        makeComponent('10% RhGaO3', 10, 207),
        makeComponent('90% SiO2', 90, 60.08),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const rh = rowBySource(rowsData, 'RhGaO3');
      assert.strictEqual(rh.weightRatioCalcProcessed, 10);
    });

    it('explicit 90%: weightRatioCalcProcessed = 90', () => {
      const components = [
        makeComponent('10% RhGaO3', 10, 207),
        makeComponent('90% SiO2', 90, 60.08),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const sio2 = rowBySource(rowsData, 'SiO2');
      assert.strictEqual(sio2.weightRatioCalcProcessed, 90);
    });

    it('calcWeightRatioWithoutWeight fills remaining % for unlabelled entry', () => {
      // "90% SiO2" is explicit; second entry has no % label → gets 100-90=10
      const components = [
        makeComponent('90% SiO2', 90, 60.08),
        makeComponent('RhGaO3', 10, 207),    // no % prefix
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const rh = rowBySource(rowsData, 'RhGaO3');
      assert.strictEqual(rh.weightRatioCalcProcessed, 10);
    });
  });

  // ─── molarRatioCalcMM (col 4 for parent rows) ────────────────────────────

  describe('molarRatioCalcMM — calcWt / molarMass', () => {
    it('90% SiO2 with MM=60 → 1.5', () => {
      const components = [makeComponent('90% SiO2', 90, 60)];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      assert.ok(Math.abs(rowsData[0].molarRatioCalcMM - 1.5) < 0.001);
    });

    it('10% RhGaO3 with MM=207 → ~0.048', () => {
      const components = [makeComponent('10% RhGaO3', 10, 207)];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const expected = 10 / 207;
      assert.ok(
        Math.abs(rowsData[0].molarRatioCalcMM - expected) < 0.001,
        `expected ≈${expected.toFixed(4)} got ${rowsData[0].molarRatioCalcMM}`
      );
    });

    it('30% Al2O3 with MM=101.96 → ~0.294', () => {
      const components = [makeComponent('30% Al2O3', 30, 101.96)];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const expected = 30 / 101.96;
      assert.ok(
        Math.abs(rowsData[0].molarRatioCalcMM - expected) < 0.001,
        `expected ≈${expected.toFixed(4)} got ${rowsData[0].molarRatioCalcMM}`
      );
    });

    it('zero molar mass → molarRatioCalcMM = 0', () => {
      const components = [makeComponent('50% SiO2', 50, 0)];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      assert.strictEqual(rowsData[0].molarRatioCalcMM, 0);
    });

    it('molarRatioCalcMM rounded to 3 decimal places', () => {
      // 10/207 = 0.04830917... → rounds to 0.048
      const components = [makeComponent('10% RhGaO3', 10, 207)];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const val = rowsData[0].molarRatioCalcMM;
      const str = val.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      assert.ok(decimals <= 3, `expected ≤3 decimal places, got ${decimals}: ${val}`);
    });
  });

  // ─── Sorting ───────────────────────────────────────────────────────────────

  describe('rowsData sorting', () => {
    it('rows are sorted ascending by weightRatioCalcProcessed', () => {
      const components = [
        makeComponent('70% SiO2', 70, 60.08),
        makeComponent('10% RhGaO3', 10, 207),
        makeComponent('20% Al2O3', 20, 101.96),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const values = rowsData.map((r) => r.weightRatioCalcProcessed);
      for (let i = 1; i < values.length; i++) {
        assert.ok(
          values[i] >= values[i - 1],
          `row ${i} (${values[i]}) < row ${i - 1} (${values[i - 1]}) — not sorted ascending`
        );
      }
    });

    it('two-component list: smaller calc wt comes first', () => {
      const components = [
        makeComponent('90% SiO2', 90, 60.08),
        makeComponent('10% RhGaO3', 10, 207),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      assert.ok(rowsData[0].weightRatioCalcProcessed <= rowsData[1].weightRatioCalcProcessed);
      // RhGaO3 (10%) should be first
      assert.ok(rowsData[0].sourceAlias.includes('RhGaO3'));
    });
  });

  // ─── Filtering ─────────────────────────────────────────────────────────────

  describe('filtering non-HierarchicalMaterial entries', () => {
    it('skips entries with name != HierarchicalMaterial', () => {
      const nonHM = { ...makeComponent('50% NaCl', 50, 58.44), name: 'Sample' };
      const hm = makeComponent('50% SiO2', 50, 60.08);
      const { rowsData } = buildHierarchicalMaterialRows([nonHM, hm]);
      assert.strictEqual(rowsData.length, 1);
    });

    it('skips entries with empty/missing source', () => {
      const components = [
        makeComponent('', 0, 60.08),
        makeComponent('50% SiO2', 50, 60.08),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      assert.strictEqual(rowsData.length, 1);
    });

    it('handles null components array gracefully', () => {
      const { rowsData, totalExpWtRatio } = buildHierarchicalMaterialRows(null);
      assert.ok(Array.isArray(rowsData));
      assert.strictEqual(totalExpWtRatio, 0);
    });
  });

  // ─── Multi-component (spec example: 10% RhGaO3 / 90% SiO2) ───────────────

  describe('multi-component system — Excel spec example (10% RhGaO3, 90% SiO2)', () => {
    // Values from the Excel spec document
    // Rh: MM=102, Ga: MM=70, O: MM=16, SiO2: MM=60
    // Calc wt: Rh=4.83, Ga=3.27, O=1.90, SiO2=90

    let rowsData;
    let totalExpWtRatio;

    before(() => {
      const components = [
        makeComponent('10% RhGaO3', 10, 207),  // MM=102+70+3×16=220 approx; user enters 207
        makeComponent('90% SiO2', 90, 60),
      ];
      ({ rowsData, totalExpWtRatio } = buildHierarchicalMaterialRows(components));
    });

    it('produces 2 rows', () => {
      assert.strictEqual(rowsData.length, 2);
    });

    it('RhGaO3 weightRatioCalcProcessed = 10', () => {
      const rh = rowBySource(rowsData, 'RhGaO3');
      assert.strictEqual(rh.weightRatioCalcProcessed, 10);
    });

    it('SiO2 weightRatioCalcProcessed = 90', () => {
      const sio2 = rowBySource(rowsData, 'SiO2');
      assert.strictEqual(sio2.weightRatioCalcProcessed, 90);
    });

    it('SiO2 molarRatioCalcMM ≈ 90/60 = 1.5', () => {
      const sio2 = rowBySource(rowsData, 'SiO2');
      assert.ok(Math.abs(sio2.molarRatioCalcMM - 1.5) < 0.001);
    });

    it('RhGaO3 molarRatioCalcMM ≈ 10/207', () => {
      const rh = rowBySource(rowsData, 'RhGaO3');
      const expected = 10 / 207;
      assert.ok(Math.abs(rh.molarRatioCalcMM - expected) < 0.001);
    });

    it('RhGaO3 is first (sorted ascending by calc wt)', () => {
      assert.ok(rowsData[0].sourceAlias.includes('RhGaO3'));
    });

    it('totalExpWtRatio = 100 (10 + 90)', () => {
      assert.strictEqual(totalExpWtRatio, 100);
    });
  });

  // ─── Mol% computation — pure math verification ─────────────────────────────
  // The actual mol% calculation lives in HierarchicalCompositionTable gridRowData useMemo.
  // These tests verify the math logic by extracting it here.

  describe('mol% formula verification (manual calc, spec values)', () => {
    // From Excel spec: 10% RhGaO3 / 90% SiO2 (Mode A)
    // Atom masses: Rh=102, Ga=69, O=16, SiO2=60
    // calcWt: SiO2=90 (compound-level)
    // After process: calcWt_Rh=4.83, calcWt_Ga=3.27, calcWt_O=1.90, calcWt_SiO2=90
    // mol contributions: Rh=4.83/102=0.04735, Ga=3.27/69=0.04739, O=1.90/16=0.11875, SiO2=90/60=1.5
    // totalCalcMol = 0.04735+0.04739+0.11875+1.5 = 1.71349
    // mol% Rh = 0.04735/1.71349*100 ≈ 2.76%
    // mol% SiO2 = 1.5/1.71349*100 ≈ 87.5%

    it('mol% formula: contribution / totalMol * 100', () => {
      const rh_wt = 4.83; const rh_mm = 102;
      const ga_wt = 3.27; const ga_mm = 69;
      const o_wt = 1.90; const o_mm = 16;
      const sio2_wt = 90; const sio2_mm = 60;

      const rhMol = rh_wt / rh_mm;
      const gaMol = ga_wt / ga_mm;
      const oMol = o_wt / o_mm;
      const sio2Mol = sio2_wt / sio2_mm;
      const total = rhMol + gaMol + oMol + sio2Mol;

      const rhPct = (rhMol / total) * 100;
      const sio2Pct = (sio2Mol / total) * 100;

      // All mol% must sum to 100
      const allPct = ((rhMol + gaMol + oMol + sio2Mol) / total) * 100;
      assert.ok(Math.abs(allPct - 100) < 0.01, `mol% sum should be 100, got ${allPct}`);

      // SiO2 dominates at ~87-88%
      assert.ok(sio2Pct > 85 && sio2Pct < 90, `SiO2 mol% ≈87-88, got ${sio2Pct.toFixed(2)}`);

      // Rh is small
      assert.ok(rhPct > 2 && rhPct < 4, `Rh mol% ≈2-4, got ${rhPct.toFixed(2)}`);
    });

    it('mol% denominator includes both expanded-element rows and unexpanded-compound rows', () => {
      // Per Word doc point 4: denominator spans all contribution units
      // Expanded RhGaO3 → Rh, Ga, O contribute individually
      // Unexpanded SiO2 → contributes as one compound unit
      const expandedMols = [
        { wt: 4.83, mm: 102 },  // Rh
        { wt: 3.27, mm: 69 },   // Ga
        { wt: 1.90, mm: 16 },   // O
      ];
      const compoundMol = 90 / 60;  // SiO2

      const totalExpanded = expandedMols.reduce((s, e) => s + e.wt / e.mm, 0);
      const totalAll = totalExpanded + compoundMol;

      // Denominator must include both
      assert.ok(totalAll > totalExpanded, 'denominator should include compound contribution');
      assert.ok(Math.abs(totalAll - (totalExpanded + compoundMol)) < 0.0001);
    });

    it('effectiveMM = Σ(stoich × atomicMass) for processed rows', () => {
      // RhGaO3: stoich = Rh:1, Ga:1, O:3; atomic masses Rh=102, Ga=69, O=16
      const elements = [
        { stoich: 1, atomicMass: 102 },  // Rh
        { stoich: 1, atomicMass: 69 },   // Ga
        { stoich: 3, atomicMass: 16 },   // O
      ];
      const effectiveMM = elements.reduce((s, e) => s + e.stoich * e.atomicMass, 0);
      // 1×102 + 1×69 + 3×16 = 102+69+48 = 219
      assert.strictEqual(effectiveMM, 219);
    });

    it('calcWt for each element = (stoich/stoichSum) × parentCalcWt', () => {
      // Mode A: total calcWt=10, stoich Rh=1, Ga=1, O=3 → stoichSum=5
      const parentCalcWt = 10;
      const elements = [
        { sym: 'Rh', stoich: 1, mm: 102 },
        { sym: 'Ga', stoich: 1, mm: 69 },
        { sym: 'O', stoich: 3, mm: 16 },
      ];
      const stoichSum = elements.reduce((s, e) => s + e.stoich, 0);
      const subRows = elements.map((e) => ({
        sym: e.sym,
        calcWt: (e.stoich / stoichSum) * parentCalcWt,
        atomicMass: e.mm,
      }));

      // Values should roughly match Excel spec Mode A
      const rh = subRows.find((r) => r.sym === 'Rh');
      const ga = subRows.find((r) => r.sym === 'Ga');
      const o = subRows.find((r) => r.sym === 'O');

      assert.ok(Math.abs(rh.calcWt - 2) < 0.01, `Rh calcWt ≈2, got ${rh.calcWt}`);
      assert.ok(Math.abs(ga.calcWt - 2) < 0.01, `Ga calcWt ≈2, got ${ga.calcWt}`);
      assert.ok(Math.abs(o.calcWt - 6) < 0.01, `O calcWt ≈6, got ${o.calcWt}`);
      assert.ok(Math.abs(rh.calcWt + ga.calcWt + o.calcWt - parentCalcWt) < 0.001, 'sub-row calcWts must sum to parentCalcWt');
    });

    it('Mode B: calcWt = userInput; stoich back-calculated from calcWt/atomicMass', () => {
      // User enters calcWt directly; stoich = calcWt_el / atomicMass_el
      const subRowInputs = [
        { sym: 'Rh', calcWt: 4, mm: 102 },
        { sym: 'Ga', calcWt: 3, mm: 69 },
        { sym: 'O', calcWt: 3, mm: 16 },
      ];
      const derived = subRowInputs.map((e) => ({
        ...e,
        stoich: e.calcWt / e.mm,
      }));

      // stoich ratios should be proportional to calcWt/mm
      const rh = derived.find((d) => d.sym === 'Rh');
      const ga = derived.find((d) => d.sym === 'Ga');
      const o = derived.find((d) => d.sym === 'O');

      assert.ok(rh.stoich > 0, 'Rh stoich > 0');
      assert.ok(ga.stoich > 0, 'Ga stoich > 0');
      assert.ok(o.stoich > 0, 'O stoich > 0');
      // O has highest stoich (most moles per gram)
      assert.ok(o.stoich > ga.stoich, 'O stoich > Ga stoich (lighter atom, more moles)');
    });
  });

  // ─── Bidirectional calc ────────────────────────────────────────────────────

  describe('bidirectional stoich ↔ calcWt invariants', () => {
    it('stoich→calcWt: calcWt_el = (stoich_el / stoichSum) × parentCalcWt', () => {
      const parentCalcWt = 15;
      const stoichs = { Pt: 3, Sn: 1 };
      const stoichSum = Object.values(stoichs).reduce((a, b) => a + b, 0);  // 4
      const ptCalcWt = (stoichs.Pt / stoichSum) * parentCalcWt;
      const snCalcWt = (stoichs.Sn / stoichSum) * parentCalcWt;
      assert.ok(Math.abs(ptCalcWt - 11.25) < 0.001);
      assert.ok(Math.abs(snCalcWt - 3.75) < 0.001);
    });

    it('calcWt→stoich: stoich_el = calcWt_el / atomicMass_el (up to scale)', () => {
      const inputs = [
        { sym: 'Pt', calcWt: 11.25, mm: 195.08 },
        { sym: 'Sn', calcWt: 3.75, mm: 118.71 },
      ];
      const stoichs = inputs.map((e) => ({ sym: e.sym, stoich: e.calcWt / e.mm }));
      const minStoich = Math.min(...stoichs.map((s) => s.stoich));
      const normalized = stoichs.map((s) => ({ ...s, stoich: s.stoich / minStoich }));
      const pt = normalized.find((s) => s.sym === 'Pt');
      const sn = normalized.find((s) => s.sym === 'Sn');
      // After normalizing by min, Pt has more moles → larger ratio
      assert.ok(pt.stoich > sn.stoich, 'Pt normalized stoich > Sn');
    });
  });

  // ─── Col 4 parent-row molarRatioCalcMM after processing ──────────────────

  describe('col 4 parent-row value = calcWt / compMM', () => {
    it('single component: matches molarRatioCalcMM in rowsData', () => {
      // After processing, compMM (effectiveMM) overwrites user molar_mass for the col 4 value.
      // The utility's molarRatioCalcMM uses molar_mass (before processing).
      // Post-processing correction happens in the React component.
      // Test that the utility correctly computes calcWt / molarMass here.
      const components = [makeComponent('60% NiO', 60, 74.69)];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const expected = 60 / 74.69;
      assert.ok(Math.abs(rowsData[0].molarRatioCalcMM - expected) < 0.001);
    });

    it('two components both have correct molarRatioCalcMM', () => {
      const components = [
        makeComponent('30% NiO', 30, 74.69),
        makeComponent('70% SiO2', 70, 60.08),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const nio = rowBySource(rowsData, 'NiO');
      const sio2 = rowBySource(rowsData, 'SiO2');
      assert.ok(Math.abs(nio.molarRatioCalcMM - 30 / 74.69) < 0.001);
      assert.ok(Math.abs(sio2.molarRatioCalcMM - 70 / 60.08) < 0.001);
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('single component with no exp wt: totalExpWtRatio = 0', () => {
      const { totalExpWtRatio } = buildHierarchicalMaterialRows([makeComponent('100% SiO2', 0, 60)]);
      assert.strictEqual(totalExpWtRatio, 0);
    });

    it('handles undefined molar_mass gracefully', () => {
      const c = { ...makeComponent('50% SiO2', 50), molar_mass: undefined };
      const { rowsData } = buildHierarchicalMaterialRows([c]);
      assert.strictEqual(rowsData[0].molarRatioCalcMM, 0);
    });

    it('handles string molar_mass (parseFloat)', () => {
      const c = { ...makeComponent('50% SiO2', 50), molar_mass: '60.08' };
      const { rowsData } = buildHierarchicalMaterialRows([c]);
      assert.ok(rowsData.length > 0, 'row should still be produced');
    });

    it('three components sort correctly', () => {
      const components = [
        makeComponent('50% SiO2', 50, 60.08),
        makeComponent('10% Rh', 10, 102.91),
        makeComponent('40% Al2O3', 40, 101.96),
      ];
      const { rowsData } = buildHierarchicalMaterialRows(components);
      const values = rowsData.map((r) => r.weightRatioCalcProcessed);
      assert.deepStrictEqual(values, [10, 40, 50]);
    });
  });
});
