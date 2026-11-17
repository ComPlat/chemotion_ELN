import expect from 'expect';
import sinon from 'sinon';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'mocha';

import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';

describe('Material mixture product theoretical masses', () => {
  const tooltipFor = (row, sample, reaction) => {
    const element = document.createElement('div');
    element.innerHTML = renderToStaticMarkup(row.molarWeightTooltip(sample, reaction, 'mass-test'));
    return element;
  };

  const build = () => {
    const reaction = new Reaction({
      starting_materials: [{
        id: 'reference', reference: true, coefficient: 1, amountType: 'target',
        target_amount_value: 0.01, target_amount_unit: 'mol',
        molecule: { molecular_weight: 100 }, purity: 1,
      }],
      reactants: [], solvents: [], products: [{
        id: 'mixture', sample_type: 'Mixture', coefficient: 1, amountType: 'real',
        real_amount_value: 5, real_amount_unit: 'g', sample_details: { total_mixture_mass_g: 5 },
      }],
    });
    const mixture = reaction.products[0];
    mixture.initialComponents([100, 200].map((weight, index) => new Component({
      id: index + 1, position: index, reference: index === 0, material_group: 'solid', purity: 1,
      equivalent: index + 1, amount_mol: 0.01 * (index + 1), amount_g: index === 0 ? 1 : 4,
      relative_molecular_weight: 500 / (index + 1), molecule: { id: index + 1, molecular_weight: weight },
    })));
    return { reaction, mixture, row: new Material({}) };
  };

  it('shows four separate lines with one heading and generic component labels', () => {
    const { reaction, mixture, row } = build();
    const lines = tooltipFor(row, mixture, reaction).querySelector('.text-start').children;

    expect(Array.from(lines, (line) => line.textContent)).toEqual([
      'Molar mass: 500 g/mol',
      'Max. theoretical mass',
      'Reference component: 1000 mg',
      'Mixture: 5000 mg',
    ]);
  });

  it('rounds tooltip molar mass once to two decimals while keeping the column at four', () => {
    const { reaction, mixture, row } = build();
    [[2188.146543, '2188.15', '2188.1465'], [2188.14499, '2188.14', '2188.145']].forEach(
      ([weight, tooltipWeight, columnWeight]) => {
        mixture.reference_component.relative_molecular_weight = weight;

        expect(tooltipFor(row, mixture, reaction).textContent).toContain(`Molar mass: ${tooltipWeight} g/mol`);
        expect(row.molarWeightValue(mixture, reaction, true)).toBe(`${columnWeight} g/mol`);
      }
    );
  });

  it('uses the shared multiline content for the mass input tooltip', () => {
    const { reaction, mixture, row } = build();
    const overlay = row.massField(mixture, [], reaction, 'm').props.overlay;
    const element = document.createElement('div');
    element.innerHTML = renderToStaticMarkup(overlay);

    expect(element.querySelector('.text-start').innerHTML)
      .toBe(tooltipFor(row, mixture, reaction).querySelector('.text-start').innerHTML);
  });

  it('shows both masses independently of a missing or stale cached maximum', () => {
    const { reaction, mixture, row } = build();
    [undefined, 0, 1, 5, 999, NaN].forEach((cachedMaximum) => {
      mixture.maxAmount = cachedMaximum;
      const tooltip = tooltipFor(row, mixture, reaction).textContent;

      expect(tooltip).toContain('Reference component: 1000 mg');
      expect(tooltip).toContain('Mixture: 5000 mg');
      expect(mixture.maxAmount).toBe(cachedMaximum);
    });
  });

  it('keeps both masses consistent across scheme and reaction-level recalculation', () => {
    const { reaction, mixture, row } = build();
    const scheme = Object.create(ReactionDetailsScheme.prototype);
    scheme.props = { reaction };
    scheme.state = { lockEquivColumn: false };
    const originalTooltip = tooltipFor(row, mixture, reaction).textContent;

    scheme.updatedSamplesForAmountChange(reaction.products, mixture, 'products');
    expect(mixture.maxAmount).toBe(5);
    expect(tooltipFor(row, mixture, reaction).textContent).toBe(originalTooltip);

    reaction.updateMaxAmountOfProducts();
    expect(mixture.maxAmount).toBe(1);
    expect(tooltipFor(row, mixture, reaction).textContent).toBe(originalTooltip);
  });

  it('uses both product and reaction-reference coefficients', () => {
    const { reaction, mixture, row } = build();
    [[2, 1, 2000, 10000], [1, 2, 500, 2500], [2, 2, 1000, 5000]].forEach(
      ([productCoefficient, referenceCoefficient, componentMass, mixtureMass]) => {
        mixture.coefficient = productCoefficient;
        reaction.referenceMaterial.coefficient = referenceCoefficient;
        const tooltip = tooltipFor(row, mixture, reaction).textContent;

        expect(tooltip).toContain(`Reference component: ${componentMass} mg`);
        expect(tooltip).toContain(`Mixture: ${mixtureMass} mg`);
      }
    );
  });

  it('updates both masses when the reaction reference amount changes', () => {
    const { reaction, mixture, row } = build();
    reaction.referenceMaterial.target_amount_value = 0.02;

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: 2000 mg');
    expect(tooltip).toContain('Mixture: 10000 mg');
  });

  it('updates the mixture mass after a fixed-mass component ratio edit', () => {
    const { reaction, mixture, row } = build();
    mixture.belongTo = reaction;
    expect(mixture.updateComponentRatio(mixture.components[1], 4, 'solid')).toBe(true);

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: 1000 mg');
    expect(tooltip).toContain('Mixture: 9000 mg');
  });

  it('uses the newly selected mixture reference component', () => {
    const { reaction, mixture, row } = build();
    mixture.setReferenceComponent(1, { preserveRatios: true, fromReactionScheme: true });

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: 2000 mg');
    expect(tooltip).toContain('Mixture: 2500 mg');
  });

  it('preserves both masses after serialization and reloading component data', () => {
    const { reaction, mixture, row } = build();
    const originalTooltip = tooltipFor(row, mixture, reaction).textContent;
    const payload = JSON.parse(JSON.stringify(mixture.serializeMaterial()));
    payload.components.forEach((component, index) => {
      component.molecule = mixture.components[index].molecule;
    });
    reaction.products = [payload];
    const reloaded = reaction.products[0];
    reloaded.initialComponents(payload.components.map(Component.deserializeData));
    reaction.updateMaxAmountOfProducts();

    expect(tooltipFor(row, reloaded, reaction).textContent).toBe(originalTooltip);
  });

  it('shows both masses as unknown without a reaction reference', () => {
    const { reaction, mixture, row } = build();
    reaction.starting_materials = [];
    mixture.maxAmount = 1;

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: n.d.');
    expect(tooltip).toContain('Mixture: n.d.');
  });

  [null, NaN, Infinity, 'n.d'].forEach((amount) => {
    it(`keeps both masses unknown for an unavailable reaction reference amount ${String(amount)}`, () => {
      const { reaction, mixture, row } = build();
      const stub = sinon.stub(reaction.referenceMaterial, 'amount_mol').get(() => amount);
      try {
        const tooltip = tooltipFor(row, mixture, reaction).textContent;
        expect(tooltip).toContain('Reference component: n.d.');
        expect(tooltip).toContain('Mixture: n.d.');
      } finally {
        stub.restore();
      }
    });
  });

  it('preserves a known zero theoretical amount', () => {
    const { reaction, mixture, row } = build();
    reaction.referenceMaterial.target_amount_value = 0;

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: 0 mg');
    expect(tooltip).toContain('Mixture: 0 mg');
  });

  it('rounds both theoretical masses to one decimal place in mg', () => {
    const { reaction, mixture, row } = build();
    reaction.referenceMaterial.target_amount_value = 0.0012346;

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: 123.5 mg');
    expect(tooltip).toContain('Mixture: 617.3 mg');
  });

  it('keeps only the mixture mass unknown when composition is unquantified', () => {
    const { reaction, mixture, row } = build();
    mixture.reference_component.relative_molecular_weight = 0;

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: 1000 mg');
    expect(tooltip).toContain('Mixture: n.d.');
  });

  it('keeps only the reference-component mass unknown when its molecular weight is missing', () => {
    const { reaction, mixture, row } = build();
    mixture.reference_component.molecule.molecular_weight = null;

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: n.d.');
    expect(tooltip).toContain('Mixture: 5000 mg');
  });

  it('keeps both masses unknown without a selected mixture reference component', () => {
    const { reaction, mixture, row } = build();
    mixture.reference_component.reference = false;

    const tooltip = tooltipFor(row, mixture, reaction).textContent;

    expect(tooltip).toContain('Reference component: n.d.');
    expect(tooltip).toContain('Mixture: n.d.');
  });

  it('does not add theoretical masses to the inline molar mass or a reactant tooltip', () => {
    const { reaction, mixture, row } = build();
    expect(row.molarWeightValue(mixture, reaction, true)).not.toContain('Max. theoretical mass');
    reaction.products = [];
    reaction.reactants = [mixture];
    expect(tooltipFor(row, mixture, reaction).textContent).not.toContain('Max. theoretical mass');
  });

  it('uses matching wording for the ordinary-product tooltip', () => {
    const { reaction, row } = build();
    reaction.products = [new Sample({ molecule: { molecular_weight: 100 } })];
    const product = reaction.products[0];
    product.maxAmount = 1;

    const lines = tooltipFor(row, product, reaction).querySelector('.text-start').children;
    expect(Array.from(lines, (line) => line.textContent)).toEqual([
      'Molar mass: 100 g/mol', 'Max. theoretical mass: 1000 mg',
    ]);
  });
});

describe('Material unavailable product yield', () => {
  [0, 0.28].forEach((equivalent) => {
    it(`keeps yield unavailable without a reaction reference even when equivalent=${equivalent}`, () => {
      const row = new Material({});
      const reaction = { getReferenceMaterial: () => undefined, hasPolymers: () => false };
      expect(row.calculateYield({ equivalent }, reaction)).toBeUndefined();
    });
  });

  [null, undefined, '', 'n.d', NaN].forEach((equivalent) => {
    it(`does not display a numeric yield for ${String(equivalent)}`, () => {
      const row = new Material({});
      const reaction = { getReferenceMaterial: () => ({}), hasPolymers: () => false };
      expect(row.calculateYield({ equivalent }, reaction)).toBeUndefined();
    });
  });

  it('still displays a measured zero yield', () => {
    const row = new Material({});
    const reaction = { getReferenceMaterial: () => ({}), hasPolymers: () => false };
    expect(row.calculateYield({ equivalent: 0 }, reaction)).toBe('0%');
  });

  it('does not display a persisted yield when the mixture reference amount is unavailable', () => {
    const row = new Material({});
    const reaction = { getReferenceMaterial: () => ({}), hasPolymers: () => false };
    expect(row.calculateYield({ isMixture: () => true, amount_mol: 'n.d', equivalent: 1 }, reaction)).toBeUndefined();
  });
});

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
