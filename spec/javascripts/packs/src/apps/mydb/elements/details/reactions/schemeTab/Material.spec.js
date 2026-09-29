import expect from 'expect';
import { describe, it } from 'mocha';

import {
  MaterialAmountMol,
  MaterialActivity,
} from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';

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

/*
Ported from main after the Material rewrite: the change events are built by MaterialHandler#handler
now, which the material rows share with the variations grid.
*/
const buildHandler = ({ isSbmm = false, material = {}, events }) => {
  const mh = new MaterialHandler({
    material: { id: 'shared-id', ...material },
    reaction: { reactants: [] },
    materialGroup: 'reactants',
    onChange: (event) => events.push(event),
    setFieldToShow: () => {},
    index: 0,
  });
  // What isSbmm would work out from an SBMM sample.
  // eslint-disable-next-line no-underscore-dangle
  mh._isSbmm = isSbmm;
  return mh;
};

describe('Material — external-label change source', () => {
  it('includes the SBMM discriminator in the emitted event', () => {
    const events = [];
    buildHandler({ isSbmm: true, events }).handler.externalLabelChange({ target: { value: 'SBMM label' } });

    expect(events).toHaveLength(1);
    expect(events[0].sampleID).toBe('shared-id');
    expect(events[0].isSbmm).toBe(true);
    expect(events[0].externalLabel).toBe('SBMM label');
  });
});

describe('Material — amount-type change source', () => {
  it('includes the SBMM discriminator in the emitted event', () => {
    const events = [];
    buildHandler({ isSbmm: true, events }).handler.amountTypeChange('real');

    expect(events).toHaveLength(1);
    expect(events[0].sampleID).toBe('shared-id');
    expect(events[0].isSbmm).toBe(true);
    expect(events[0].amountType).toBe('real');
  });
});

describe('Material — equivalent change source', () => {
  it('marks weight-percentage selector changes as programmatic', () => {
    const events = [];
    buildHandler({ material: { reference: true }, events }).handler
      .equivalentWeightPercentageChange('weight percentage');

    expect(events).toHaveLength(1);
    expect(events[0].equivalent).toBe(1);
    expect(events[0].isEquivalentEdit).toBe(false);
  });

  it('propagates whether an equivalent change came from a direct edit', () => {
    const events = [];
    const { handler } = buildHandler({ events });

    handler.equivalentChange({ value: 2 });
    handler.equivalentChange({ value: 1, isEquivalentEdit: false });

    expect(events[0].isEquivalentEdit).toBe(true);
    expect(events[1].isEquivalentEdit).toBe(false);
  });
});
