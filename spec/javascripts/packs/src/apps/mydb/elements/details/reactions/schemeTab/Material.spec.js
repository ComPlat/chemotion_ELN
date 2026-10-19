import expect from 'expect';
import sinon from 'sinon';
import { describe, it } from 'mocha';

import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import Reaction from 'src/models/Reaction';

describe('Material pending amount edits on unmount', () => {
  let sandbox;
  let clock;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers();
  });
  afterEach(() => { sandbox.restore(); });

  const build = () => {
    const data = (id, value, unit, extra = {}) => ({
      id, amountType: 'target', target_amount_value: value, target_amount_unit: unit,
      molecule: { molecular_weight: 100 }, purity: 1, density: 0, molarity_value: 0,
      coefficient: 1, gas_type: 'off', ...extra,
    });
    const reaction = new Reaction({
      starting_materials: [data('reference', 1, 'g', { reference: true, equivalent: 1 })],
      reactants: [data('dependent', 0.02, 'mol', { equivalent: 2 })], solvents: [], products: [],
    });
    const material = reaction.referenceMaterial;
    const scheme = Object.create(ReactionDetailsScheme.prototype);
    scheme.props = { reaction };
    scheme.state = { lockEquivColumn: false };
    const onChange = sinon.spy((event) => scheme.updatedReactionForAmountUnitChange(event));
    const row = new Material({ reaction, material, materialGroup: 'starting_materials', onChange });
    return { reaction, material, row, onChange };
  };

  [false, true].forEach((blurred) => {
    it(`commits the latest mass and recalculates the reaction once on closing, blurred=${blurred}`, () => {
      const { reaction, material, row, onChange } = build();
      const setState = sandbox.spy(row, 'setState');
      row.debounceHandleAmountUnitChange({ value: 1.5, unit: 'g' }, 1, 'target');
      clock.tick(100);
      row.debounceHandleAmountUnitChange({ value: 2, unit: 'g' }, 1, 'target');
      if (blurred) row.debounceHandleAmountUnitChange.flush();

      row.componentWillUnmount();

      expect(material.amount_g).toBeCloseTo(2, 12);
      expect(reaction.reactants[0].amount_mol).toBeCloseTo(0.02, 12);
      expect(reaction.reactants[0].equivalent).toBeCloseTo(1, 12);
      sinon.assert.calledOnce(onChange);
      sinon.assert.notCalled(setState);
      clock.tick(1000);
      sinon.assert.calledOnce(onChange);
    });
  });

  it('does not restore or update a material removed while its mass edit was pending', () => {
    const { reaction, row, onChange } = build();
    row.debounceHandleAmountUnitChange({ value: 2, unit: 'g' }, 1, 'target');
    clock.tick(100);
    reaction.starting_materials = [];

    expect(() => row.componentWillUnmount()).not.toThrow();
    clock.tick(1000);

    expect(reaction.starting_materials).toHaveLength(0);
    expect(reaction.reactants[0].amount_mol).toBeCloseTo(0.02, 12);
    sinon.assert.calledOnce(onChange);
  });
});

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

describe('Material — external-label change source', () => {
  it('includes the SBMM discriminator in the emitted event', () => {
    const events = [];
    const instance = {
      props: { onChange: (event) => events.push(event), materialGroup: 'reactants' },
      materialId: () => 'shared-id',
      isSbmm: true,
    };

    Material.prototype.handleExternalLabelChange.call(instance, { target: { value: 'SBMM label' } });

    expect(events).toHaveLength(1);
    expect(events[0].sampleID).toBe('shared-id');
    expect(events[0].isSbmm).toBe(true);
    expect(events[0].externalLabel).toBe('SBMM label');
  });
});

describe('Material — amount-type change source', () => {
  it('includes the SBMM discriminator in the emitted event', () => {
    const events = [];
    const instance = {
      props: { onChange: (event) => events.push(event), materialGroup: 'reactants' },
      materialId: () => 'shared-id',
      isSbmm: true,
    };

    Material.prototype.handleAmountTypeChange.call(instance, 'real');

    expect(events).toHaveLength(1);
    expect(events[0].sampleID).toBe('shared-id');
    expect(events[0].isSbmm).toBe(true);
    expect(events[0].amountType).toBe('real');
  });
});

describe('Material — equivalent change source', () => {
  it('marks weight-percentage selector changes as programmatic', () => {
    const events = [];
    const instance = {
      setState: () => {},
      handleEquivalentChange: (event) => events.push(event),
    };

    Material.prototype.handleEquivalentWeightPercentageChange.call(
      instance,
      { reference: true },
      'weight percentage'
    );

    expect(events).toHaveLength(1);
    expect(events[0].value).toBe(1);
    expect(events[0].isEquivalentEdit).toBe(false);
  });

  it('propagates whether an equivalent change came from a direct edit', () => {
    const events = [];
    const instance = {
      props: { onChange: (event) => events.push(event), materialGroup: 'reactants' },
      materialId: () => 'mat-1',
      isSbmm: false,
    };

    Material.prototype.handleEquivalentChange.call(instance, { value: 2 });
    Material.prototype.handleEquivalentChange.call(instance, {
      value: 1,
      isEquivalentEdit: false,
    });

    expect(events[0].isEquivalentEdit).toBe(true);
    expect(events[1].isEquivalentEdit).toBe(false);
  });
});
