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

  describe('existing return values still present', () => {
    it('still returns rowsData array', () => {
      const { rowsData } = buildHierarchicalMaterialRows([]);
      assert.ok(Array.isArray(rowsData));
    });

    it('still returns totalMolarCalc', () => {
      const { totalMolarCalc } = buildHierarchicalMaterialRows([]);
      assert.strictEqual(typeof totalMolarCalc, 'number');
    });
  });
});
