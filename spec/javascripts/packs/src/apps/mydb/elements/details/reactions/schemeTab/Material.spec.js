import expect from 'expect';
import { describe, it } from 'mocha';

import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';

// Bug 2 fix: lockEquivColumn must NOT disable mol or activity fields for products.
// lockEquivColumn freezes reactant equivalents — product amounts must stay editable.
describe('Material — lockEquivColumn does not disable product mol/activity', () => {
  const buildProps = ({ materialGroup, lockEquivColumn = false } = {}) => ({
    reaction: { can_update: true, weight_percentage: false },
    materialGroup,
    lockEquivColumn,
  });

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
    reactionSchemeMetricPrefix: () => 'n',
    ...overrides,
  });

  const getDisabled = (methodName, props, material) => {
    const instance = new Material(props);
    instance.props = props;
    instance.handleAmountUnitChange = () => {};
    instance.handleMetricsChange = () => {};
    const el = instance[methodName](material);
    return el.props.disabled;
  };

  describe('materialAmountMol', () => {
    it('is NOT disabled for a product when lockEquivColumn=true', () => {
      const props = buildProps({ materialGroup: 'products', lockEquivColumn: true });
      expect(getDisabled('materialAmountMol', props, buildMaterial())).toBe(false);
    });

    it('IS disabled for a non-reference reactant when lockEquivColumn=true', () => {
      const props = buildProps({ materialGroup: 'starting_materials', lockEquivColumn: true });
      expect(getDisabled('materialAmountMol', props, buildMaterial())).toBe(true);
    });

    it('is NOT disabled for the reference reactant even when lockEquivColumn=true', () => {
      const props = buildProps({ materialGroup: 'starting_materials', lockEquivColumn: true });
      expect(getDisabled('materialAmountMol', props, buildMaterial({ reference: true }))).toBe(false);
    });

    it('is NOT disabled for a product when lockEquivColumn=false', () => {
      const props = buildProps({ materialGroup: 'products', lockEquivColumn: false });
      expect(getDisabled('materialAmountMol', props, buildMaterial())).toBe(false);
    });
  });

  describe('materialActivity', () => {
    it('is NOT disabled for a product when lockEquivColumn=true', () => {
      const props = buildProps({ materialGroup: 'products', lockEquivColumn: true });
      expect(getDisabled('materialActivity', props, buildMaterial())).toBe(false);
    });

    it('IS disabled for a non-reference reactant when lockEquivColumn=true', () => {
      const props = buildProps({ materialGroup: 'starting_materials', lockEquivColumn: true });
      expect(getDisabled('materialActivity', props, buildMaterial())).toBe(true);
    });

    it('is NOT disabled for the reference reactant even when lockEquivColumn=true', () => {
      const props = buildProps({ materialGroup: 'starting_materials', lockEquivColumn: true });
      expect(getDisabled('materialActivity', props, buildMaterial({ reference: true }))).toBe(false);
    });
  });
});
