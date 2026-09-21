import expect from 'expect';
import { describe, it } from 'mocha';

import {
  MaterialAmountMol,
  MaterialActivity,
} from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';

// Bug 2 fix: lockEquivColumn must NOT disable mol or activity fields for products.
// lockEquivColumn freezes reactant equivalents — product amounts must stay editable.
// Ported from main after the Material rewrite: the fields are function components now,
// reading everything off a MaterialHandler; a plain stand-in object works as `mh`.
describe('Material — lockEquivColumn does not disable product mol/activity', () => {
  const buildMaterial = (overrides = {}) => ({
    amount_mol: 0.5,
    amount_unit: 'mol',
    amountType: 'target',
    reference: false,
    weight_percentage: 0,
    weight_percentage_reference: false,
    gas_type: null,
    activity_value: null,
    activity_unit: 'U',
    _amount_unit: null,
    metrics: 'mmmm',
    reactionSchemeMetricPrefix: () => 'n',
    ...overrides,
  });

  const buildMh = ({ materialGroup, lockEquivColumn = false, material }) => ({
    material,
    reaction: { can_update: true, weight_percentage: false },
    materialGroup,
    lockEquivColumn,
    isSbmm: false,
    findMinMayUnit: () => ({
      min: null, max: null, unit: 'mol', isRangeField: false
    }),
    handler: {
      amountUnitChange: () => {},
      metricsChange: () => {},
    },
  });

  const getDisabled = (Component, { materialGroup, lockEquivColumn, material }) => {
    const mh = buildMh({ materialGroup, lockEquivColumn, material });
    const el = Component({ mh });
    return el.props.disabled;
  };

  describe('MaterialAmountMol', () => {
    it('is NOT disabled for a product when lockEquivColumn=true', () => {
      expect(getDisabled(MaterialAmountMol, {
        materialGroup: 'products', lockEquivColumn: true, material: buildMaterial()
      })).toBe(false);
    });

    it('IS disabled for a non-reference reactant when lockEquivColumn=true', () => {
      expect(getDisabled(MaterialAmountMol, {
        materialGroup: 'starting_materials', lockEquivColumn: true, material: buildMaterial()
      })).toBe(true);
    });

    it('is NOT disabled for the reference reactant even when lockEquivColumn=true', () => {
      expect(getDisabled(MaterialAmountMol, {
        materialGroup: 'starting_materials', lockEquivColumn: true, material: buildMaterial({ reference: true })
      })).toBe(false);
    });

    it('is NOT disabled for a product when lockEquivColumn=false', () => {
      expect(getDisabled(MaterialAmountMol, {
        materialGroup: 'products', lockEquivColumn: false, material: buildMaterial()
      })).toBe(false);
    });
  });

  describe('MaterialActivity', () => {
    it('is NOT disabled for a product when lockEquivColumn=true', () => {
      expect(getDisabled(MaterialActivity, {
        materialGroup: 'products', lockEquivColumn: true, material: buildMaterial()
      })).toBe(false);
    });

    it('IS disabled for a non-reference reactant when lockEquivColumn=true', () => {
      expect(getDisabled(MaterialActivity, {
        materialGroup: 'starting_materials', lockEquivColumn: true, material: buildMaterial()
      })).toBe(true);
    });

    it('is NOT disabled for the reference reactant even when lockEquivColumn=true', () => {
      expect(getDisabled(MaterialActivity, {
        materialGroup: 'starting_materials', lockEquivColumn: true, material: buildMaterial({ reference: true })
      })).toBe(false);
    });
  });
});
