import { describe, it } from 'mocha';
import assert from 'assert';

import buildHierarchicalMaterialRows from '../../../app/javascript/src/utilities/sampleHierarchicalCompositions';

// A plain object that mirrors what ElementStore produces after spreading component_properties
// to the top level (const sampleData = { ...rest, ...component_properties }).
function makeHMComponent(overrides = {}) {
  return {
    id: 1,
    name: 'HierarchicalMaterial',
    position: 1,
    source: '1wt% PtPd',
    molar_mass: 300.0,
    weight_ratio_exp: 1.0,
    template_category: 'semantic',
    component_properties: {},
    ...overrides,
  };
}

describe('buildHierarchicalMaterialRows', () => {
  // TC1: happy path — component with correct name and percent-format source produces one row
  it('TC1: produces a row for a component with name=HierarchicalMaterial and percent-format source', () => {
    const components = [makeHMComponent({ source: '10% Al2O3', molar_mass: 102.0, weight_ratio_exp: 10.0 })];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 1);
    assert.ok(rowsData[0].component, 'row.component should be truthy');
    assert.ok(rowsData[0].sourceAlias, 'row.sourceAlias should be truthy');
  });

  // TC2: component with wrong name is filtered out — table stays empty
  it('TC2: filters out components whose name is not HierarchicalMaterial', () => {
    const components = [makeHMComponent({ name: 'Micromolecule' })];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 0, 'rows must be empty when name != HierarchicalMaterial');
  });

  // TC3: component with null source → parseComponentSource returns empty compContent → filtered
  it('TC3: filters out a component whose source is null — composition table stays empty', () => {
    const components = [makeHMComponent({ source: null })];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 0, 'rows must be empty when source is null');
  });

  // TC4: component with empty-string source → same filter
  it('TC4: filters out a component whose source is an empty string', () => {
    const components = [makeHMComponent({ source: '' })];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 0);
  });

  // TC5: dash-format source (no %) → component and sourceAlias are both truthy → row produced
  it('TC5: produces a row for a dash-format source (e.g. "support-PtPd")', () => {
    const components = [makeHMComponent({ source: 'support-PtPd', weight_ratio_exp: 5.0 })];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 1);
    assert.ok(rowsData[0].component, 'component should be extracted from dash-format source');
  });

  // TC6: percent-format source extracts the numeric weight ratio from the leading digits
  it('TC6: extracts weightRatioCalc from percent-format source (e.g. "5% Al2O3" → 5)', () => {
    const components = [makeHMComponent({ source: '5% Al2O3', molar_mass: 100.0, weight_ratio_exp: 5.0 })];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 1);
    assert.strictEqual(rowsData[0].weightRatioCalcProcessed, 5);
  });

  // TC7: multiple valid components all produce rows
  it('TC7: produces one row per valid component when multiple exist', () => {
    const components = [
      makeHMComponent({ id: 1, source: '10% PtPd', molar_mass: 300.0, weight_ratio_exp: 10.0 }),
      makeHMComponent({ id: 2, source: '5% Al2O3', molar_mass: 100.0, weight_ratio_exp: 5.0 }),
      makeHMComponent({ id: 3, source: '85% support', molar_mass: 60.0, weight_ratio_exp: 85.0 }),
    ];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 3);
  });

  // TC8: mixed valid/invalid — only valid ones appear
  it('TC8: skips invalid rows (wrong name, null source) and shows only valid ones', () => {
    const components = [
      makeHMComponent({ id: 1, source: '10% PtPd' }),
      makeHMComponent({ id: 2, name: 'Micromolecule' }),
      makeHMComponent({ id: 3, source: null }),
    ];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 1);
  });

  // TC9: rows are sorted by weightRatioCalcProcessed ascending (smallest on top)
  it('TC9: sorts rows by calculated weight ratio ascending', () => {
    const components = [
      makeHMComponent({ id: 1, source: '85% support', molar_mass: 60.0, weight_ratio_exp: 85.0 }),
      makeHMComponent({ id: 2, source: '5% Al2O3', molar_mass: 100.0, weight_ratio_exp: 5.0 }),
      makeHMComponent({ id: 3, source: '10% PtPd', molar_mass: 300.0, weight_ratio_exp: 10.0 }),
    ];
    const { rowsData } = buildHierarchicalMaterialRows(components);

    assert.strictEqual(rowsData.length, 3);
    const ratios = rowsData.map((r) => r.weightRatioCalcProcessed);
    assert.deepStrictEqual(ratios, [...ratios].sort((a, b) => a - b));
  });

  // TC10: empty components array produces empty rowsData — no crash
  it('TC10: returns empty rowsData without throwing when components array is empty', () => {
    assert.doesNotThrow(() => {
      const { rowsData } = buildHierarchicalMaterialRows([]);
      assert.strictEqual(rowsData.length, 0);
    });
  });
});
