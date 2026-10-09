import expect from 'expect';
import sinon from 'sinon';

import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';
import Component from 'src/models/Component';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';

describe('ReactionDetailsScheme#onChangeRole', () => {
  it("forwards '' (not null) to onInputChange when the dropdown is cleared", () => {
    const onInputChange = sinon.spy();
    const instance = { props: { onInputChange } };

    ReactionDetailsScheme.prototype.onChangeRole.call(instance, null);

    expect(onInputChange.calledOnceWith('role', '')).toBe(true);
  });

  it("forwards '' to onInputChange when called with { value: null }", () => {
    const onInputChange = sinon.spy();
    const instance = { props: { onInputChange } };

    ReactionDetailsScheme.prototype.onChangeRole.call(instance, { value: null });

    expect(onInputChange.calledOnceWith('role', '')).toBe(true);
  });

  it("forwards '' to onInputChange when called with { value: undefined }", () => {
    const onInputChange = sinon.spy();
    const instance = { props: { onInputChange } };

    ReactionDetailsScheme.prototype.onChangeRole.call(instance, { value: undefined });

    expect(onInputChange.calledOnceWith('role', '')).toBe(true);
  });

  it('forwards the selected value to onInputChange on a normal pick', () => {
    const onInputChange = sinon.spy();
    const instance = { props: { onInputChange } };

    ReactionDetailsScheme.prototype.onChangeRole.call(instance, { value: 'gp' });

    expect(onInputChange.calledOnceWith('role', 'gp')).toBe(true);
  });
});

// Regression tests for Bug 7:
// Yield corrupted when a non-reference reactant amount changes in a polymer surface-chemistry reaction.
// Fix: updatedSamplesForAmountChange() now routes polymer products through checkMassPolymer
//      instead of the MW-based maxAmount formula when the product is NOT the updated sample.
describe('ReactionDetailsScheme#updatedSamplesForAmountChange — polymer product guard', () => {
  let gasStoreStub;

  // Polymer reference: surface-loaded starting material (is_partial=true)
  const makePolymerReference = () => ({
    id: 'ref-1',
    reference: true,
    amount_mol: 0.025,    // 0.5 mmol/g × 50 mg
    amount_g: 50,
    amount_value: 50,
    coefficient: 1,
    molecule: { molecular_weight: 100 },
    residues: [{ custom_info: { loading: 0.5 } }],
    contains_residues: true,
    loading: 0.5,
    decoupled: false,
    gas_type: 'off',
  });

  // Polymer product: resin-bound product with loading and a real yield
  const makePolymerProduct = (overrides = {}) => ({
    id: 'prod-1',
    contains_residues: true,
    gas_type: 'off',
    coefficient: 1,
    equivalent: 0.5,
    amount_g: 27,
    amount_mol: 0.012,
    molecule_molecular_weight: 2000,
    molecule: { molecular_weight: 2000 },
    purity: 1,
    residues: [{ custom_info: { loading: 0.4, loading_type: null } }],
    decoupled: false,
    reference: false,
    ...overrides,
  });

  // Non-polymer reactant whose amount the user changed
  const makeReactant = () => ({
    id: 'react-1',
    gas_type: 'off',
    amount_value: 200,
    amount_mol: 200,
    coefficient: 1,
    molecule_molecular_weight: 36.5,
    molecule: { molecular_weight: 36.5 },
    purity: 1,
    decoupled: false,
    reference: false,
    equivalent: 8000,
    contains_residues: false,
  });

  // Build a minimal fake component instance for the method's this-context
  const buildCtx = (referenceMaterial, { lockEquivColumn = false } = {}) => {
    const checkMassPolymer = sinon.spy();
    const checkMassMolecule = sinon.stub().returns({ mFull: 55, errorMsg: null });
    const triggerNotification = sinon.spy();
    return {
      props: {
        reaction: {
          referenceMaterial,
          updateReferenceAmountForLockedEquivalents: sinon.stub(),
        },
      },
      state: { lockEquivColumn },
      checkMassMolecule,
      checkMassPolymer,
      triggerNotification,
    };
  };

  beforeEach(() => {
    gasStoreStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({
      reactionVesselSizeValue: 0,
    });
  });

  afterEach(() => {
    gasStoreStub.restore();
  });

  it('calls checkMassPolymer for a polymer product that is NOT the updated sample', () => {
    const ref = makePolymerReference();
    const ctx = buildCtx(ref);
    const product = makePolymerProduct();
    const reactant = makeReactant();

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [product],
      reactant,
      'products'
    );

    expect(ctx.checkMassPolymer.calledOnce).toBe(true);
  });

  it('does not call triggerNotification for a polymer product when a reactant amount changes', () => {
    const ref = makePolymerReference();
    const ctx = buildCtx(ref);
    const product = makePolymerProduct();
    const reactant = makeReactant();

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [product],
      reactant,
      'products'
    );

    expect(ctx.triggerNotification.called).toBe(false);
  });

  it('does not call checkMassPolymer for a non-polymer product (no regression)', () => {
    const ref = makePolymerReference();
    const ctx = buildCtx(ref);
    const normalProduct = makePolymerProduct({
      id: 'prod-2',
      contains_residues: false,
      molecule_molecular_weight: 150,
      molecule: { molecular_weight: 150 },
      residues: [],
    });
    const reactant = makeReactant();

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [normalProduct],
      reactant,
      'products'
    );

    expect(ctx.checkMassPolymer.called).toBe(false);
  });

  it('calls checkMassPolymer when the polymer product IS the updated sample', () => {
    // Ensures the pre-existing if-branch (sample.id === updatedSample.id) still works
    const ref = makePolymerReference();
    const ctx = buildCtx(ref);
    const product = makePolymerProduct();

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [product],
      product,  // updatedSample IS the polymer product
      'products'
    );

    expect(ctx.checkMassPolymer.calledOnce).toBe(true);
  });
});

describe('ReactionDetailsScheme — SBMM event resolution with colliding IDs', () => {
  it('updates only the SBMM sample when a regular sample has the same ID', () => {
    const regularSample = { id: 'shared-id', external_label: 'regular' };
    const sbmmSample = {
      id: 'shared-id',
      type: 'sequence_based_macromolecule_sample',
      external_label: 'old SBMM label',
    };
    const reaction = {
      starting_materials: [],
      reactants: [regularSample],
      reactant_sbmm_samples: [sbmmSample],
      solvents: [],
      products: [],
      findReactionSample: sinon.stub().callsFake((sampleId, isSbmm) => (
        isSbmm ? sbmmSample : regularSample
      )),
    };
    const ctx = {
      props: { reaction },
      updatedReactionWithSample: ReactionDetailsScheme.prototype.updatedReactionWithSample,
      updatedSamplesForExternalLabelChange:
        ReactionDetailsScheme.prototype.updatedSamplesForExternalLabelChange,
    };

    ReactionDetailsScheme.prototype.updatedReactionForExternalLabelChange.call(ctx, {
      sampleID: 'shared-id',
      externalLabel: 'new SBMM label',
      isSbmm: true,
    });

    expect(reaction.findReactionSample.calledWith('shared-id', true)).toBe(true);
    expect(regularSample.external_label).toBe('regular');
    expect(sbmmSample.external_label).toBe('new SBMM label');
  });

  it('resolves an SBMM amount-type change without mutating the regular sample', () => {
    const regularSample = { id: 'shared-id', amountType: 'target' };
    const sbmmSample = {
      id: 'shared-id',
      type: 'sequence_based_macromolecule_sample',
      amountType: 'target',
    };
    const reaction = {
      findReactionSample: sinon.stub().callsFake((sampleId, isSbmm) => (
        isSbmm ? sbmmSample : regularSample
      )),
    };
    const updatedReactionWithSample = sinon.stub().returns(reaction);
    const ctx = {
      props: { reaction },
      updatedReactionWithSample,
      updatedSamplesForAmountChange:
        ReactionDetailsScheme.prototype.updatedSamplesForAmountChange,
    };

    ReactionDetailsScheme.prototype.updatedReactionForAmountTypeChange.call(ctx, {
      sampleID: 'shared-id',
      amountType: 'real',
      isSbmm: true,
    });

    expect(reaction.findReactionSample.calledWith('shared-id', true)).toBe(true);
    expect(regularSample.amountType).toBe('target');
    expect(sbmmSample.amountType).toBe('real');
    expect(updatedReactionWithSample.firstCall.args[3]).toBe(true);
  });
});

describe('ReactionDetailsScheme#updatedSamplesForAmountChange — sample type collision', () => {
  let gasStoreStub;

  const buildCtx = () => ({
    props: {
      reaction: {
        referenceMaterial: { amount_value: 1, amount_mol: 1, coefficient: 1 },
        updateReferenceAmountForLockedEquivalents: sinon.stub(),
      },
    },
    state: { lockEquivColumn: false },
  });

  const makeCandidate = (isSbmm) => ({
    id: 'shared-id',
    ...(isSbmm ? { type: 'sequence_based_macromolecule_sample' } : {}),
    reference: true,
    amount_value: 10,
    amount_g: 10,
    amount_mol: 2,
    maxAmount: 100,
    equivalent: 0.5,
    coefficient: 1,
    gas_type: 'off',
    molecule_molecular_weight: 100,
    purity: 1,
    isMixture: () => false,
  });

  const makeEditedSample = (isSbmm) => ({
    id: 'shared-id',
    ...(isSbmm ? { type: 'sequence_based_macromolecule_sample' } : {}),
    reference: false,
    gas_type: 'off',
  });

  beforeEach(() => {
    gasStoreStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({
      reactionVesselSizeValue: 0,
    });
  });

  afterEach(() => {
    gasStoreStub.restore();
  });

  it('matches distinct sample copies when both ID and kind match', () => {
    const sample = makeCandidate(false);

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      buildCtx(),
      [sample],
      makeEditedSample(false),
      'reactants'
    );

    expect(sample.equivalent).toBe(0.1);
  });

  it('does not treat a regular sample as the edited SBMM when their IDs collide', () => {
    const sample = makeCandidate(false);

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      buildCtx(),
      [sample],
      makeEditedSample(true),
      'reactants'
    );

    expect(sample.equivalent).toBe(2);
  });

  it('does not treat an SBMM sample as the edited regular sample when their IDs collide', () => {
    const sample = makeCandidate(true);

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      buildCtx(),
      [sample],
      makeEditedSample(false),
      'reactants'
    );

    expect(sample.equivalent).toBe(2);
  });
});

// Regression tests for the solvent volume calculation:
// - Eq unlocked: a solvent's volume stays fixed; only its (derived) equivalent updates.
// - Eq locked: a solvent's volume scales with the reference (equivalent * ref.amount_mol).
// The historical glitch: editing a solvent volume set its equivalent via amount_g / maxAmount
// (NaN, because a solvent has no maxAmount), and the correction block excluded solvents, so
// the first locked scale-up multiplied NaN by the reference and showed the volume as "n.d.".
// The correction block now includes solvents, so the equivalent is always a valid
// amount_mol / reference.amount_mol ratio before it is used to scale.
describe('ReactionDetailsScheme#updatedSamplesForAmountChange — solvent volume', () => {
  let gasStoreStub;

  const buildCtx = ({ lockEquivColumn = false } = {}) => ({
    props: {
      reaction: {
        referenceMaterial: { amount_value: 200, amount_mol: 0.1, coefficient: 1 },
        updateReferenceAmountForLockedEquivalents: sinon.stub(),
      },
    },
    state: { lockEquivColumn },
    handleEquivalentBasedAmountUpdate:
      ReactionDetailsScheme.prototype.handleEquivalentBasedAmountUpdate,
  });

  const makeSolvent = (overrides = {}) => ({
    id: 'solv-1',
    amount_value: 0.01,
    amount_unit: 'l',
    amount_l: 0.01,
    amount_g: 1.58,
    amount_mol: 0.02,
    coefficient: 1,
    gas_type: 'off',
    reference: false,
    isMixture: () => false,
    isGas: () => false,
    setAmount: sinon.spy(),
    setAmountAndNormalizeToGram: sinon.spy(),
    ...overrides,
  });

  const updatedReference = { id: 'ref-1', gas_type: 'off', amount_mol: 0.1 };

  beforeEach(() => {
    gasStoreStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({ reactionVesselSizeValue: 0 });
  });

  afterEach(() => {
    gasStoreStub.restore();
  });

  it('scales a solvent volume from its equivalent when Eq is locked and the reference changes', () => {
    const ctx = buildCtx({ lockEquivColumn: true });
    const solvent = makeSolvent({ equivalent: 0.5 });

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [solvent],
      updatedReference,
      'solvents'
    );

    // equivalent (0.5) * reference amount_mol (0.1) = 0.05 mol
    expect(solvent.setAmountAndNormalizeToGram.calledOnce).toBe(true);
    const arg = solvent.setAmountAndNormalizeToGram.firstCall.args[0];
    expect(arg.unit).toBe('mol');
    expect(Math.abs(arg.value - 0.05) < 1e-9).toBe(true);
  });

  it('keeps a solvent volume fixed but refreshes its equivalent when Eq is unlocked and the reference changes', () => {
    const ctx = buildCtx({ lockEquivColumn: false });
    const solvent = makeSolvent({ equivalent: 999 });

    const result = ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [solvent],
      updatedReference,
      'solvents'
    );

    expect(solvent.setAmountAndNormalizeToGram.called).toBe(false);
    expect(result[0].amount_value).toBe(0.01);
    // amount_mol (0.02) / reference amount_mol (0.1) = 0.2
    expect(Math.abs(result[0].equivalent - 0.2) < 1e-9).toBe(true);
  });

  it('derives a valid equivalent (not NaN) when a solvent volume is edited while Eq is unlocked', () => {
    // Reproduces the "n.d." glitch at its source: without the fix the equivalent is set to
    // amount_g / maxAmount = NaN (a solvent has no maxAmount), which the next locked
    // scale-up turns into "n.d.".
    const ctx = buildCtx({ lockEquivColumn: false });
    const solvent = makeSolvent({ equivalent: NaN, maxAmount: undefined });

    const result = ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [solvent],
      solvent, // the solvent itself is the updated sample (its own volume was edited)
      'solvents'
    );

    expect(Number.isNaN(result[0].equivalent)).toBe(false);
    expect(Math.abs(result[0].equivalent - 0.2) < 1e-9).toBe(true);
    // Volume stays fixed while unlocked.
    expect(solvent.setAmountAndNormalizeToGram.called).toBe(false);
    expect(result[0].amount_value).toBe(0.01);
  });
});

// Regression tests for the Eq-edit highlight bug:
// When the Eq of a starting material/reactant is edited, the recalculation is molar-amount
// based, so the sample's amount_unit must stay 'mol' (which highlights the Amount field),
// NOT be normalized to 'g' (which would highlight the Mass field). Gas and reference-less
// mixture samples keep the old gram-normalized behavior so their calculations are unchanged.
describe('ReactionDetailsScheme#updatedSamplesForEquivalentChange — recalculated field is Amount', () => {
  const buildCtx = (referenceMaterial = { amount_mol: 0.1, coefficient: 1 }) => ({
    props: { reaction: { referenceMaterial } },
    handleEquivalentBasedAmountUpdate:
      ReactionDetailsScheme.prototype.handleEquivalentBasedAmountUpdate,
    warnIfMixtureMassExceeded: sinon.spy(),
  });

  const makeMaterial = (overrides = {}) => ({
    id: 'mat-1',
    reference: false,
    gas_type: 'off',
    equivalent: 1,
    amount_mol: 0.05,
    amount_g: 5,
    amount_unit: 'g',
    coefficient: 1,
    isMixture: () => false,
    hasComponents: () => false,
    isGas: () => false,
    setAmount: sinon.spy(),
    setAmountAndNormalizeToGram: sinon.spy(),
    ...overrides,
  });

  const makeSbmm = (overrides = {}) => ({
    id: 'mat-1',
    type: 'sequence_based_macromolecule_sample',
    reference: false,
    gas_type: 'off',
    equivalent: 1,
    amount_mol: 0.05,
    amount_g: 5,
    coefficient: 1,
    applyAmountFromEquivalent: sinon.spy(),
    ...overrides,
  });

  const makeRealGas = () => new Sample({
    id: 'mat-1',
    amountType: 'target',
    target_amount_value: 5,
    target_amount_unit: 'g',
    purity: 1,
    molecule: { molecular_weight: 100 },
    coefficient: 1,
    gas_type: 'gas',
    gas_phase_data: {
      time: { unit: 'h', value: null },
      temperature: { unit: 'K', value: 298.15 },
      turnover_number: null,
      part_per_million: 0,
      turnover_frequency: { unit: 'TON/h', value: null },
    },
    sample_type: 'Micromolecule',
    reference: false,
    equivalent: 1,
  });

  const makeRealMixture = () => {
    const mixture = new Sample({
      id: 'mat-1',
      amountType: 'target',
      target_amount_value: 5,
      target_amount_unit: 'g',
      coefficient: 1,
      gas_type: 'off',
      sample_type: 'Mixture',
      reference: false,
      equivalent: 1,
    });
    const referenceComponent = new Component({});
    referenceComponent.reference = true;
    referenceComponent.amount_mol = 0.1;
    referenceComponent.component_properties = { relative_molecular_weight: 50 };
    referenceComponent.relative_molecular_weight = 50;
    mixture.initialComponents([referenceComponent]);
    mixture.sample_details = { reference_component_changed: false };
    return mixture;
  };

  const applyDirectEquivalentEdit = (material, equivalent = 0) => {
    const reference = {
      id: 'ref-1',
      reference: true,
      amount_value: 0,
      amount_mol: 0,
      coefficient: 1,
      gas_type: 'off',
    };
    const reaction = {
      referenceMaterial: reference,
      starting_materials: [reference],
      reactants: [material],
      reactant_sbmm_samples: [],
      solvents: [],
      products: [],
      findReactionSample: sinon.stub().returns(material),
    };
    const ctx = {
      props: { reaction },
      updatedReactionWithSample: ReactionDetailsScheme.prototype.updatedReactionWithSample,
      updatedSamplesForEquivalentChange:
        ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange,
      handleEquivalentBasedAmountUpdate:
        ReactionDetailsScheme.prototype.handleEquivalentBasedAmountUpdate,
      warnIfMixtureMassExceeded: sinon.spy(),
    };

    ReactionDetailsScheme.prototype.updatedReactionForEquivalentChange.call(ctx, {
      sampleID: material.id,
      equivalent,
      isSbmm: false,
    });

    return material;
  };

  it('does not run mixture user-edit handling during a locked-Eq rescale', () => {
    const reference = {
      id: 'ref-1',
      reference: true,
      amount_value: 0.2,
      amount_mol: 0.002,
      coefficient: 1,
      gas_type: 'off',
    };
    const mixture = makeRealMixture();
    mixture.equivalent = 2;
    mixture.sample_details = {
      reference_component_changed: true,
      previous_amount_mol: 0.07,
      previous_amount_g: 4,
    };
    mixture.getLockReactionEquivColumn = () => true;
    const reaction = {
      referenceMaterial: reference,
      updateReferenceAmountForLockedEquivalents: sinon.stub(),
    };
    const ctx = {
      props: { reaction },
      state: { lockEquivColumn: true },
      handleEquivalentBasedAmountUpdate:
        ReactionDetailsScheme.prototype.handleEquivalentBasedAmountUpdate,
    };

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [mixture],
      reference,
      'reactants'
    );

    expect(mixture.amount_unit).toBe('g');
    expect(mixture.amount_g).toBeCloseTo(0.2, 10);
    expect(mixture.sample_details.reference_component_changed).toBe(true);
    expect(mixture.sample_details.previous_amount_mol).toBe(0.07);
    expect(mixture.sample_details.previous_amount_g).toBe(4);
    expect(mixture.reference_component.amount_mol).toBeCloseTo(0.004, 10);
  });

  it('keeps a zero-amount regular sample mol-primary after a direct zero Eq edit', () => {
    const material = new Sample({
      id: 'mat-1',
      amountType: 'target',
      target_amount_value: 0,
      target_amount_unit: 'g',
      purity: 1,
      molecule: { molecular_weight: 100 },
      coefficient: 1,
      gas_type: 'off',
      sample_type: 'Micromolecule',
      reference: false,
    });

    applyDirectEquivalentEdit(material);

    expect(material.amount_unit).toBe('mol');
    expect(material.amount_value).toBe(0);
    expect(material.equivalent).toBe(0);
  });

  it('keeps a zero-amount gas sample gram-primary after a direct zero Eq edit', () => {
    const gas = makeRealGas();
    gas.setAmountAndNormalizeToGram({ value: 0, unit: 'mol' });

    applyDirectEquivalentEdit(gas);

    expect(gas.amount_unit).toBe('g');
    expect(gas.amount_value).toBe(0);
    expect(gas.equivalent).toBe(0);
  });

  it('keeps a zero-amount mixture gram-primary after a direct zero Eq edit', () => {
    const mixture = makeRealMixture();
    mixture.setAmountAndNormalizeToGram({ value: 0, unit: 'mol' });

    applyDirectEquivalentEdit(mixture);

    expect(mixture.amount_unit).toBe('g');
    expect(mixture.amount_g).toBe(0);
    expect(mixture.amount_mol).toBe(0);
    expect(mixture.equivalent).toBe(0);
  });

  it('keeps Amount active when a locked Eq is rescaled from the reference', () => {
    const reference = new Sample({
      id: 'ref-1',
      amountType: 'target',
      target_amount_value: 0.1,
      target_amount_unit: 'g',
      purity: 1,
      molecule: { molecular_weight: 100 },
      coefficient: 1,
      gas_type: 'off',
      sample_type: 'Micromolecule',
      reference: true,
    });
    const material = new Sample({
      id: 'mat-1',
      amountType: 'target',
      target_amount_value: 0.2,
      target_amount_unit: 'g',
      purity: 1,
      molecule: { molecular_weight: 100 },
      coefficient: 1,
      gas_type: 'off',
      sample_type: 'Micromolecule',
      reference: false,
      equivalent: 2,
    });
    const reaction = {
      referenceMaterial: reference,
      starting_materials: [reference],
      reactants: [material],
      reactant_sbmm_samples: [],
      solvents: [],
      products: [],
      findReactionSample: sinon.stub().callsFake((sampleId) => (
        sampleId === reference.id ? reference : material
      )),
      updateReferenceAmountForLockedEquivalents: sinon.stub(),
    };
    const ctx = {
      props: { reaction },
      state: { lockEquivColumn: true },
      updatedReactionWithSample: ReactionDetailsScheme.prototype.updatedReactionWithSample,
      updatedSamplesForEquivalentChange:
        ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange,
      handleEquivalentBasedAmountUpdate:
        ReactionDetailsScheme.prototype.handleEquivalentBasedAmountUpdate,
      warnIfMixtureMassExceeded: sinon.spy(),
    };

    ReactionDetailsScheme.prototype.updatedReactionForEquivalentChange.call(ctx, {
      sampleID: 'ref-1',
      equivalent: 1,
      isSbmm: false,
      isEquivalentEdit: false,
    });

    expect(reference.amount_unit).toBe('g');
    expect(reference.amount_g).toBeCloseTo(0.1, 10);
    expect(reference.amount_mol).toBeCloseTo(0.001, 10);
    expect(reference.equivalent).toBeCloseTo(1, 10);

    ReactionDetailsScheme.prototype.updatedReactionForEquivalentChange.call(ctx, {
      sampleID: 'mat-1',
      equivalent: 3,
      isSbmm: false,
    });

    expect(material.amount_unit).toBe('mol');
    expect(material.amount_g).toBeCloseTo(0.3, 10);
    expect(material.amount_mol).toBeCloseTo(0.003, 10);
    expect(material.equivalent).toBeCloseTo(3, 10);

    reference.setAmount({ value: 0.2, unit: 'g' });
    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [material],
      reference,
      'reactants'
    );

    expect(material.amount_unit).toBe('mol');
    expect(material.amount_g).toBeCloseTo(0.6, 10);
    expect(material.amount_mol).toBeCloseTo(0.006, 10);
    expect(material.equivalent).toBeCloseTo(3, 10);
  });

  it('does not write an amount when the equivalent produces NaN', () => {
    const ctx = buildCtx();
    const material = makeMaterial();

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [material],
      { id: 'mat-1', equivalent: 'n.d', gas_type: 'off' },
      'reactants',
      { isEquivalentEdit: true }
    );

    expect(material.setAmount.called).toBe(false);
    expect(material.setAmountAndNormalizeToGram.called).toBe(false);
    expect(material.amount_mol).toBe(0.05);
    expect(material.amount_g).toBe(5);
  });

  it('sets a regular material amount in mol (unit=mol) so the Amount field is highlighted', () => {
    const ctx = buildCtx();
    const material = makeMaterial();

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [material],
      { id: 'mat-1', equivalent: 3, gas_type: 'off' },
      'reactants',
      { isEquivalentEdit: true }
    );

    // equivalent (3) * reference amount_mol (0.1) = 0.3 mol
    expect(material.setAmountAndNormalizeToGram.called).toBe(false);
    expect(material.setAmount.calledOnce).toBe(true);
    const arg = material.setAmount.firstCall.args[0];
    expect(arg.unit).toBe('mol');
    expect(Math.abs(arg.value - 0.3) < 1e-9).toBe(true);
  });

  it('keeps the gram-normalized path for a real gas material', () => {
    const ctx = buildCtx();
    const gas = makeRealGas();

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [gas],
      { id: 'mat-1', equivalent: 3, gas_type: 'gas' },
      'reactants',
      { isEquivalentEdit: true }
    );

    expect(gas.target_amount_unit).toBe('g');
    expect(gas.target_amount_value).toBeCloseTo(30, 10);
  });

  // Fallback branch: when the reference has no usable amount_mol, the new amount is derived
  // from the sample's own amount_mol (equivalent * sample.amount_mol) rather than from the
  // reference. It delegates to the same amount-update policy as the primary branch: a regular
  // material must stay in 'mol' (Amount highlighted), while gas/mixture samples retain their
  // specialized behavior.
  it('sets a regular material amount in mol via the fallback when the reference has no amount', () => {
    const ctx = buildCtx({ amount_mol: 0, coefficient: 1 });
    const material = makeMaterial({ amount_value: 5, amount_mol: 0.05 });

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [material],
      { id: 'mat-1', equivalent: 3, gas_type: 'off' },
      'reactants',
      { isEquivalentEdit: true }
    );

    // equivalent (3) * sample amount_mol (0.05) = 0.15 mol
    expect(material.setAmountAndNormalizeToGram.called).toBe(false);
    expect(material.setAmount.calledOnce).toBe(true);
    const arg = material.setAmount.firstCall.args[0];
    expect(arg.unit).toBe('mol');
    expect(Math.abs(arg.value - 0.15) < 1e-9).toBe(true);
  });

  it('keeps a real gas material gram-normalized in the no-reference fallback', () => {
    const ctx = buildCtx({ amount_mol: 0, coefficient: 1 });
    const gas = makeRealGas();

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [gas],
      { id: 'mat-1', equivalent: 3, gas_type: 'gas' },
      'reactants',
      { isEquivalentEdit: true }
    );

    expect(gas.target_amount_unit).toBe('g');
    expect(gas.target_amount_value).toBe(0);
  });

  it('updates a real mixture from its reference component MW in the fallback', () => {
    const ctx = buildCtx({ amount_mol: 0, coefficient: 1 });
    const mixture = makeRealMixture();

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [mixture],
      { id: 'mat-1', equivalent: 3, gas_type: 'off' },
      'reactants',
      { isEquivalentEdit: true }
    );

    expect(mixture.amount_unit).toBe('g');
    expect(mixture.amount_g).toBeCloseTo(15, 10);
    expect(mixture.amount_mol).toBeCloseTo(0.3, 10);
    expect(mixture.equivalent).toBe(0);
  });

  it('keeps a real gas sample gram-normalized during a render-time refresh', () => {
    const ctx = buildCtx();
    const gas = makeRealGas();

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [gas],
      { id: 'mat-1', equivalent: 3, gas_type: 'gas' },
      'reactants'
    );

    expect(gas.target_amount_unit).toBe('g');
    expect(gas.target_amount_value).toBeCloseTo(30, 10);
  });

  it('updates a real mixture from its reference component MW during a render-time refresh', () => {
    const ctx = buildCtx();
    const mixture = makeRealMixture();

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [mixture],
      { id: 'mat-1', equivalent: 3, gas_type: 'off' },
      'reactants'
    );

    expect(mixture.amount_unit).toBe('g');
    expect(mixture.amount_g).toBeCloseTo(15, 10);
    expect(mixture.amount_mol).toBeCloseTo(0.3, 10);
    expect(mixture.equivalent).toBeCloseTo(3, 10);
  });

  it('preserves the Mass highlight during a render-time refresh after a sample-detail save', () => {
    const ctx = buildCtx();
    const material = makeMaterial({ amount_unit: 'g' });

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [material],
      { id: 'mat-1', equivalent: 3, gas_type: 'off' },
      'reactants'
    );

    expect(material.setAmount.called).toBe(false);
    expect(material.setAmountAndNormalizeToGram.calledOnce).toBe(true);
  });

  it('preserves the Mass highlight in the no-reference fallback after a sample-detail save', () => {
    const ctx = buildCtx({ amount_mol: 0, coefficient: 1 });
    const material = makeMaterial({ amount_unit: 'g', amount_value: 5, amount_mol: 0.05 });

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [material],
      { id: 'mat-1', equivalent: 3, gas_type: 'off' },
      'reactants'
    );

    expect(material.setAmount.called).toBe(false);
    expect(material.setAmountAndNormalizeToGram.calledOnce).toBe(true);
  });

  it('preserves the Amount highlight during a render-time refresh when it is already active', () => {
    const ctx = buildCtx();
    const material = makeMaterial({ amount_unit: 'mol' });

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [material],
      { id: 'mat-1', equivalent: 3, gas_type: 'off' },
      'reactants'
    );

    expect(material.setAmountAndNormalizeToGram.called).toBe(false);
    expect(material.setAmount.calledOnce).toBe(true);
  });

  it('recalculates mass after a Sample Details purity change under locked Eq', () => {
    const ctx = buildCtx({ amount_mol: 0.001, coefficient: 1 });
    const sampleAttributes = {
      id: 'mat-1',
      amountType: 'target',
      target_amount_value: 0.2,
      target_amount_unit: 'g',
      purity: 1,
      molecule: { molecular_weight: 100 },
      coefficient: 1,
      gas_type: 'off',
      sample_type: 'Micromolecule',
      reference: false,
    };
    const material = new Sample(sampleAttributes);
    const editedSample = new Sample({ ...sampleAttributes, purity: 0.5, equivalent: 2 });

    expect(material.amount_mol).toBeCloseTo(0.002, 10);
    material.purity = editedSample.purity;
    expect(material.amount_mol).toBeCloseTo(0.001, 10);

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [material],
      editedSample,
      'reactants'
    );

    expect(material.amount_unit).toBe('g');
    expect(material.amount_g).toBeCloseTo(0.4, 10);
    expect(material.amount_mol).toBeCloseTo(0.002, 10);
    expect(material.equivalent).toBeCloseTo(2, 10);
  });

  it('does not update a regular sample when an SBMM sample has the same ID', () => {
    const ctx = buildCtx();
    const regularSample = makeMaterial();
    const editedSbmm = makeSbmm({ equivalent: 3 });

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [regularSample],
      editedSbmm,
      'reactants',
      { isEquivalentEdit: true }
    );

    expect(regularSample.setAmount.called).toBe(false);
    expect(regularSample.setAmountAndNormalizeToGram.called).toBe(false);
    expect(ctx.warnIfMixtureMassExceeded.called).toBe(false);
  });

  it('does not update an SBMM sample when a regular sample has the same ID', () => {
    const ctx = buildCtx();
    const sbmmSample = makeSbmm();
    const editedRegularSample = makeMaterial({ equivalent: 3 });

    ReactionDetailsScheme.prototype.updatedSamplesForEquivalentChange.call(
      ctx,
      [sbmmSample],
      editedRegularSample,
      'reactants',
      { isEquivalentEdit: true }
    );

    expect(sbmmSample.applyAmountFromEquivalent.called).toBe(false);
    expect(ctx.warnIfMixtureMassExceeded.called).toBe(false);
  });
});

// A saved mixture may carry the legacy reference_component_changed flag. Switching the reference
// component must clear that transient state BEFORE dependents are rebased (so they rebase on the
// settled molar amount), include SBMM reactants in the rebase like every sibling amount path, derive
// the new amount from the unchanged mixture mass, and refresh concentrations under
// lock. Real Sample and Component instances exercise amount conversions and component updates.
describe('ReactionDetailsScheme reference mixture component switch (real Sample)', () => {
  const massG = 1000.124;
  const icosaneRelMW = 2825825.158875;
  const octaneRelMW = 921311.970455;

  const build = (unit, lockEquivColumn) => {
    const sample = (id, value, amountUnit, extra = {}) => ({
      id,
      amountType: 'target',
      target_amount_value: value,
      target_amount_unit: amountUnit,
      molecule: { molecular_weight: 100 },
      purity: 1,
      density: 0,
      molarity_value: 0,
      gas_type: 'off',
      coefficient: 1,
      ...extra,
    });
    const reaction = new Reaction({
      starting_materials: [sample('ref-1', unit === 'mol' ? massG / icosaneRelMW : massG, unit, {
        sample_type: 'Mixture', reference: true, sample_details: { reference_component_changed: false },
      })],
      reactants: [sample('dependent-1', 0.04, 'mol', { equivalent: 2 })],
      products: [],
      solvents: [],
    });
    const mixture = reaction.referenceMaterial;
    mixture.initialComponents([
      new Component({
        id: 'c-1', position: 0, reference: true,
        amount_mol: massG / icosaneRelMW, relative_molecular_weight: icosaneRelMW,
      }),
      new Component({
        id: 'c-2', position: 1, reference: false,
        amount_mol: massG / octaneRelMW, relative_molecular_weight: octaneRelMW,
      }),
    ]);
    mixture.getLockReactionEquivColumn = () => lockEquivColumn;

    const scheme = Object.create(ReactionDetailsScheme.prototype);
    scheme.props = { reaction };
    scheme.state = { lockEquivColumn };
    scheme.getReactionEquivLockState = () => lockEquivColumn;

    // Wrap the real rebase to record its SBMM argument and the flag value at the moment it runs,
    // then call straight through so the production code path is what actually executes.
    const rebaseCalls = [];
    const realUpdatedReactionWithSample = ReactionDetailsScheme.prototype.updatedReactionWithSample;
    scheme.updatedReactionWithSample = function wrapped(updateFunction, referenceSample, type, includeSbmm) {
      rebaseCalls.push({
        includeSbmm,
        flagAtRebase: referenceSample?.sample_details?.reference_component_changed,
      });
      return realUpdatedReactionWithSample.call(this, updateFunction, referenceSample, type, includeSbmm);
    };
    const resetConcentrations = sinon.spy(reaction, 'resetPreservedConcentrationExcept');
    const refreshConcentrations = sinon.spy(reaction, 'updateAllConcentrations');

    return {
      reaction, mixture, scheme, rebaseCalls, resetConcentrations, refreshConcentrations,
    };
  };

  ['g', 'mol'].forEach((unit) => {
    it(`preserves ${unit} mixture mass, derives octane amount, and rebases dependents under lock`, () => {
      const {
        reaction, mixture, scheme, rebaseCalls, resetConcentrations, refreshConcentrations,
      } = build(unit, true);

      scheme.updatedReactionForComponentReferenceChange({ sampleID: 'ref-1', componentId: 'c-2' });

      // Settled state: the transient flag is cleared and the amount comes from the unchanged mass.
      expect(mixture.sample_details.reference_component_changed).toBe(false);
      expect(mixture.amount_g).toBeCloseTo(massG, 10);
      expect(mixture.amount_mol).toBeCloseTo(massG / octaneRelMW, 12);
      expect(mixture.sample_details.previous_amount_g).toBeCloseTo(massG, 10);

      // The rebase ran against the settled amount (flag already cleared) and included SBMM reactants.
      expect(rebaseCalls.length).toBeGreaterThan(0);
      expect(rebaseCalls[0].flagAtRebase).toBe(false);
      expect(rebaseCalls[0].includeSbmm).toBe(true);

      // Dependents rebase on the new reference amount.
      expect(reaction.reactants[0].amount_mol).toBeCloseTo(2 * (massG / octaneRelMW), 12);

      // Concentrations are refreshed under lock (the gap this covers).
      expect(resetConcentrations.called).toBe(true);
      expect(refreshConcentrations.called).toBe(true);
    });

    it(`restores the icosane amount on the reverse ${unit} switch`, () => {
      const { reaction, scheme } = build(unit, true);

      scheme.updatedReactionForComponentReferenceChange({ sampleID: 'ref-1', componentId: 'c-2' });
      scheme.updatedReactionForComponentReferenceChange({ sampleID: 'ref-1', componentId: 'c-1' });

      // Propagation replaces Sample instances; check the current sample's settled amount.
      const mixture = reaction.referenceMaterial;
      expect(mixture.amount_unit).toBe(unit);
      expect(mixture.amount_g).toBeCloseTo(massG, 10);
      expect(mixture.amount_mol).toBeCloseTo(massG / icosaneRelMW, 12);
    });

    it(`derives the ${unit} amount but leaves concentrations untouched when unlocked`, () => {
      const {
        reaction, mixture, scheme, rebaseCalls, resetConcentrations, refreshConcentrations,
      } = build(unit, false);

      scheme.updatedReactionForComponentReferenceChange({ sampleID: 'ref-1', componentId: 'c-2' });

      expect(mixture.sample_details.reference_component_changed).toBe(false);
      expect(mixture.amount_g).toBeCloseTo(massG, 10);
      expect(mixture.amount_mol).toBeCloseTo(massG / octaneRelMW, 12);
      expect(rebaseCalls[0].flagAtRebase).toBe(false);
      expect(rebaseCalls[0].includeSbmm).toBe(true);
      expect(resetConcentrations.called).toBe(false);
      expect(refreshConcentrations.called).toBe(false);
    });
  });
});

describe('ReactionDetailsScheme non-reference mixture concentration', () => {
  const massG = 0.006 * 182.22 + 0.012 * 94.11;

  const build = (unit, lockEquivColumn, materialGroup = 'starting_materials') => {
    const sample = (id, value, amountUnit, extra = {}) => ({
      id,
      amountType: 'target',
      target_amount_value: value,
      target_amount_unit: amountUnit,
      molecule: { molecular_weight: 100 },
      purity: 1,
      density: 0,
      molarity_value: 0,
      gas_type: 'off',
      coefficient: 1,
      ...extra,
    });
    const mixtureData = sample('mixture', unit === 'mol' ? 0.012 : massG, unit, {
      sample_type: 'Mixture', reference: false, equivalent: 1.2,
      sample_details: { reference_component_changed: false },
    });
    const reaction = new Reaction({
      id: 101,
      changed: true,
      starting_materials: [sample('reference', 0.01, 'mol', { reference: true, equivalent: 1 })],
      reactants: [sample('other', 0.02, 'mol', { equivalent: 2 })],
      products: [],
      solvents: [sample('solvent', 0.01, 'l', { density: 1 })],
    });
    reaction[materialGroup].push(new Sample(mixtureData));
    const mixture = reaction.sampleById('mixture');
    mixture.initialComponents([
      new Component({
        id: 'benzophenone', position: 0, reference: false,
        amount_mol: 0.006, relative_molecular_weight: massG / 0.006,
        molecule: { molecular_weight: 182.22 }, material_group: 'solid', purity: 1,
      }),
      new Component({
        id: 'phenol', position: 1, reference: true,
        amount_mol: 0.012, relative_molecular_weight: massG / 0.012,
        molecule: { molecular_weight: 94.11 }, material_group: 'solid', purity: 1,
      }),
    ]);
    mixture.getLockReactionEquivColumn = () => lockEquivColumn;
    reaction.updateAllConcentrations();

    const scheme = Object.create(ReactionDetailsScheme.prototype);
    scheme.props = { reaction };
    scheme.state = { lockEquivColumn };
    scheme.getReactionEquivLockState = () => lockEquivColumn;
    return { reaction, mixture, scheme };
  };

  ['starting_materials', 'reactants'].forEach((materialGroup) => {
    ['g', 'mol'].forEach((unit) => {
      [true, false].forEach((lockEquivColumn) => {
        it(`refreshes both ${unit} switches in ${materialGroup} with lock=${lockEquivColumn}`, () => {
          const { reaction, mixture, scheme } = build(unit, lockEquivColumn, materialGroup);
          const other = reaction.sampleById('other');
          other.concn = 3;
          other.preserveConcentration = true;
          expect(mixture.concn).toBeCloseTo(1.2, 12);

          scheme.updatedReactionForComponentReferenceChange({
            sampleID: 'mixture', componentId: 'benzophenone',
          });

          expect(mixture.amount_mol).toBeCloseTo(0.006, 12);
          expect(mixture.equivalent).toBeCloseTo(0.6, 12);
          expect(mixture.concn).toBeCloseTo(0.6, 12);
          expect(mixture.amount_g).toBeCloseTo(massG, 12);

          scheme.updatedReactionForComponentReferenceChange({
            sampleID: 'mixture', componentId: 'phenol',
          });

          expect(mixture.amount_mol).toBeCloseTo(0.012, 12);
          expect(mixture.equivalent).toBeCloseTo(1.2, 12);
          expect(mixture.concn).toBeCloseTo(1.2, 12);
          expect(mixture.amount_g).toBeCloseTo(massG, 12);
          expect(mixture.amount_unit).toBe(unit);
          expect(reaction.referenceMaterial.id).toBe('reference');
          expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.01, 12);
          expect(reaction.referenceMaterial.equivalent).toBe(1);
          expect(reaction.solventVolume).toBeCloseTo(0.01, 12);
          expect(other.amount_mol).toBeCloseTo(0.02, 12);
          expect(other.equivalent).toBe(2);
          expect(other.concn).toBe(3);
          expect(other.preserveConcentration).toBe(true);
        });
      });
    });
  });

  it('refreshes an explicitly preserved concentration when its component basis changes', () => {
    const { mixture, scheme } = build('g', true);
    mixture.preserveConcentration = true;

    scheme.updatedReactionForComponentReferenceChange({
      sampleID: 'mixture', componentId: 'benzophenone',
    });

    expect(mixture.concn).toBeCloseTo(0.6, 12);
    expect(mixture.preserveConcentration).toBe(false);
  });

  it('clears the stale concentration when the reaction volume is unavailable', () => {
    const { reaction, mixture, scheme } = build('g', true);
    reaction.solvents = [];

    scheme.updatedReactionForComponentReferenceChange({
      sampleID: 'mixture', componentId: 'benzophenone',
    });

    expect(mixture.amount_mol).toBeCloseTo(0.006, 12);
    expect(mixture.concn).toBe(null);
  });
});

describe('ReactionDetailsScheme mixture reference switch — stored units and shared UI components', () => {
  const build = (unit, lockEquivColumn) => {
    const sample = (id, value, amountUnit, extra = {}) => ({
      id,
      amountType: 'target',
      target_amount_value: value,
      target_amount_unit: amountUnit,
      molecule: { molecular_weight: 100 },
      purity: 1,
      density: 0,
      molarity_value: 0,
      gas_type: 'off',
      coefficient: 1,
      ...extra,
    });
    const reaction = new Reaction({
      starting_materials: [sample('mixture', unit === 'mol' ? 0.02 : 1, unit, {
        sample_type: 'Mixture', reference: true, sample_details: { reference_component_changed: false },
      })],
      reactants: [sample('dependent', 0.04, 'mol', { equivalent: 2 })],
      products: [],
      solvents: [],
    });
    const mixture = reaction.referenceMaterial;
    mixture.initialComponents([
      new Component({
        id: 'r1', position: 0, reference: true, amount_mol: 0.02, relative_molecular_weight: 50,
      }),
      new Component({
        id: 'r2', position: 1, reference: false, amount_mol: 0.01, relative_molecular_weight: 100,
      }),
    ]);
    mixture.getLockReactionEquivColumn = () => lockEquivColumn;
    const scheme = Object.create(ReactionDetailsScheme.prototype);
    scheme.props = { reaction };
    scheme.state = { lockEquivColumn };
    scheme.getReactionEquivLockState = () => lockEquivColumn;
    return { reaction, scheme };
  };

  ['g', 'mol'].forEach((unit) => {
    [true, false].forEach((lockEquivColumn) => {
      ['handler', 'UI'].forEach((path) => {
        it(`preserves mass and reverses a ${unit} mixture switch via ${path} with lock=${lockEquivColumn}`, () => {
          const { reaction, scheme } = build(unit, lockEquivColumn);
          const switchReference = (componentId) => {
            const mixture = reaction.referenceMaterial;
            const changeEvent = { type: 'componentReferenceChanged', sampleID: mixture.id, componentId };
            if (path === 'handler') {
              scheme.updatedReactionForComponentReferenceChange(changeEvent);
            } else {
              const oldReferenceId = mixture.reference_component.id;
              const row = new Material({
                reaction,
                material: mixture,
                materialGroup: 'starting_materials',
                onChange: (event) => {
                  expect(mixture.reference_component.id).toBe(oldReferenceId);
                  scheme.updatedReactionForComponentReferenceChange(event);
                },
              });
              row.setState = (state) => { row.state = { ...row.state, ...state }; };
              row.fetchMixtureComponentsIfNeeded(mixture);
              expect(row.state.mixtureComponents[0]).toBe(mixture.components[0]);
              row.handleComponentReferenceChange(changeEvent);
              expect(row.state.mixtureComponents.find((component) => component.reference).id).toBe(componentId);
              expect(row.materialAmountMol(mixture).props.active).toBe(unit === 'mol');
              expect(row.materialAmountMol(mixture).props.metricPrefix).toBe('m');
            }
          };

          switchReference('r2');

          expect(reaction.referenceMaterial.amount_unit).toBe(unit);
          expect(reaction.referenceMaterial.amount_g).toBeCloseTo(1, 10);
          expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.01, 10);
          expect(reaction.referenceMaterial.sample_details.previous_amount_g).toBeCloseTo(1, 10);
          expect(reaction.referenceMaterial.sample_details.previous_amount_mol).toBeCloseTo(0.01, 10);
          expect(reaction.reactants[0].amount_mol).toBeCloseTo(lockEquivColumn ? 0.02 : 0.04, 10);
          expect(reaction.reactants[0].equivalent).toBeCloseTo(lockEquivColumn ? 2 : 4, 10);

          switchReference('r1');

          expect(reaction.referenceMaterial.amount_unit).toBe(unit);
          expect(reaction.referenceMaterial.amount_g).toBeCloseTo(1, 10);
          expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.02, 10);
          expect(reaction.referenceMaterial.sample_details.previous_amount_g).toBeCloseTo(1, 10);
          expect(reaction.referenceMaterial.sample_details.previous_amount_mol).toBeCloseTo(0.02, 10);
          expect(reaction.reactants[0].amount_mol).toBeCloseTo(0.04, 10);
          expect(reaction.reactants[0].equivalent).toBeCloseTo(2, 10);
        });
      });

      it(`uses the UI lock consistently for an unsaved ${unit} reference mixture with lock=${lockEquivColumn}`, () => {
        const { reaction, scheme } = build(unit, lockEquivColumn);
        const mixture = reaction.referenceMaterial;
        // Exercise the real store and Sample getters instead of the fixture's lock overrides.
        delete mixture.getLockReactionEquivColumn;
        delete scheme.getReactionEquivLockState;
        const previousLockStates = ComponentStore.state.lockReactionEquivColumnByReaction;
        const sandbox = sinon.createSandbox();
        try {
          // A new reaction may have no store entry; also cover a stale locked entry after unlocking.
          if (!lockEquivColumn) ComponentActions.toggleReactionEquivLock(true, reaction.id);
          const updates = sandbox.spy(mixture, 'updateComponentAmounts');
          const getter = sandbox.spy(mixture, 'getLockReactionEquivColumn');
          const refresh = sandbox.spy(reaction, 'updateAllConcentrations');

          scheme.updatedReactionForComponentReferenceChange({ sampleID: mixture.id, componentId: 'r2' });

          expect(reaction.isNew).toBe(true);
          expect(updates.calledOnce).toBe(true);
          expect(mixture.amount_unit).toBe(unit);
          expect(getter.called).toBe(true);
          expect(getter.returnValues.every((value) => value === lockEquivColumn)).toBe(true);
          expect(mixture.amount_g).toBeCloseTo(1, 10);
          expect(mixture.amount_mol).toBeCloseTo(0.01, 10);
          expect(reaction.reactants[0].amount_mol).toBeCloseTo(lockEquivColumn ? 0.02 : 0.04, 10);
          expect(refresh.called).toBe(lockEquivColumn);
        } finally {
          sandbox.restore();
          ComponentStore.state.lockReactionEquivColumnByReaction = previousLockStates;
        }
      });
    });
  });
});

describe('ReactionDetailsScheme non-reference mixture component switch', () => {
  const build = (unit, lockEquivColumn) => {
    const sample = (id, value, amountUnit, extra = {}) => ({
      id, amountType: 'target', target_amount_value: value, target_amount_unit: amountUnit,
      molecule: { molecular_weight: 100 }, purity: 1, density: 0,
      molarity_value: 0, gas_type: 'off', coefficient: 1, ...extra,
    });
    const reaction = new Reaction({
      starting_materials: [sample('reference', 0.01, 'mol', { reference: true })],
      reactants: [
        sample('mixture', { g: 1, mol: 0.02, l: 0.001 }[unit], unit, {
          sample_type: 'Mixture', density: 1, equivalent: 2,
          sample_details: { reference_component_changed: false },
        }),
        sample('dependent', 0.02, 'mol', { equivalent: 2 }),
      ],
      solvents: [],
      products: [], purification_solvents: [], segments: [],
    });
    const mixture = reaction.reactants[0];
    mixture.initialComponents([
      new Component({ id: 'r1', position: 0, reference: true, amount_mol: 0.02, relative_molecular_weight: 50 }),
      new Component({ id: 'r2', position: 1, reference: false, amount_mol: 0.01, relative_molecular_weight: 100 }),
    ]);
    mixture.getLockReactionEquivColumn = () => lockEquivColumn;
    const scheme = Object.create(ReactionDetailsScheme.prototype);
    scheme.props = { reaction };
    scheme.state = { lockEquivColumn };
    scheme.getReactionEquivLockState = () => lockEquivColumn;
    return { reaction, mixture, scheme };
  };

  ['g', 'mol'].forEach((unit) => {
    [true, false].forEach((lockEquivColumn) => {
      it(`persists the settled ${unit} mixture on reaction save with lock=${lockEquivColumn}`, () => {
        const { reaction, mixture, scheme } = build(unit, lockEquivColumn);
        scheme.updatedReactionForComponentReferenceChange({ sampleID: mixture.id, componentId: 'r2' });
        expect(mixture.sample_details.reference_component_changed).toBe(false);
        const checksum = mixture.checksum();

        // Save the reaction directly, without going through the sample editor.
        const payload = JSON.parse(JSON.stringify(reaction.serialize()));
        const savedMixture = payload.materials.reactants[0];
        expect(savedMixture.sample_details.reference_component_changed).toBe(false);
        expect(mixture.sample_details.reference_component_changed).toBe(false);
        expect(mixture.checksum()).toBe(checksum);

        const reopened = new Reaction({ ...payload, ...payload.materials });
        const reopenedMixture = reopened.reactants[0];
        reopenedMixture.getLockReactionEquivColumn = () => lockEquivColumn;
        reopenedMixture.initialComponents(savedMixture.components.map(Component.deserializeData));

        expect(reopenedMixture.reference_component.id).toBe('r2');
        expect(reopenedMixture.amount_unit).toBe(unit);
        expect(reopenedMixture.amount_g).toBeCloseTo(1, 10);
        expect(reopenedMixture.amount_mol).toBeCloseTo(0.01, 10);
        expect(reopenedMixture.equivalent).toBeCloseTo(1, 10);
      });

      ['handler', 'UI'].forEach((path) => {
        it(`refreshes the equivalent of a ${unit} mixture via ${path} with lock=${lockEquivColumn}`, () => {
          const { reaction, mixture, scheme } = build(unit, lockEquivColumn);
          const switchReference = (componentId) => {
            const event = { type: 'componentReferenceChanged', sampleID: mixture.id, componentId };
            if (path === 'handler') {
              scheme.updatedReactionForComponentReferenceChange(event);
            } else {
              const row = new Material({
                reaction, material: mixture, materialGroup: 'reactants',
                onChange: (change) => scheme.updatedReactionForComponentReferenceChange(change),
              });
              row.setState = (state) => { row.state = { ...row.state, ...state }; };
              row.fetchMixtureComponentsIfNeeded(mixture);
              row.handleComponentReferenceChange(event);
              expect(row.materialAmountMol(mixture).props.active).toBe(unit === 'mol');
              expect(row.materialAmountMol(mixture).props.metricPrefix).toBe('m');
            }
          };

          switchReference('r2');

          expect(mixture.amount_unit).toBe(unit);
          expect(mixture.amount_g).toBeCloseTo(1, 10);
          expect(mixture.amount_mol).toBeCloseTo(0.01, 10);
          expect(mixture.sample_details.reference_component_changed).toBe(false);
          expect(mixture.equivalent).toBeCloseTo(1, 10);
          expect(mixture.amount_mol).toBeCloseTo(mixture.equivalent * reaction.referenceMaterial.amount_mol, 10);
          expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.01, 10);
          expect(reaction.reactants[1].amount_mol).toBeCloseTo(0.02, 10);

          switchReference('r1');

          expect(mixture.amount_unit).toBe(unit);
          expect(mixture.amount_g).toBeCloseTo(1, 10);
          expect(mixture.amount_mol).toBeCloseTo(0.02, 10);
          expect(mixture.sample_details.reference_component_changed).toBe(false);
          expect(mixture.equivalent).toBeCloseTo(2, 10);
          expect(mixture.amount_mol).toBeCloseTo(mixture.equivalent * reaction.referenceMaterial.amount_mol, 10);
          expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.01, 10);
        });
      });
    });

    it(`uses the refreshed equivalent for the next locked ${unit} mixture amount edit`, () => {
      const { reaction, mixture, scheme } = build(unit, true);
      scheme.updatedReactionForComponentReferenceChange({ sampleID: mixture.id, componentId: 'r2' });

      mixture.setAmount({ value: 2, unit: 'g' });
      scheme.updatedReactionWithSample(scheme.updatedSamplesForAmountChange.bind(scheme), mixture, undefined, true);

      expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.02, 10);
      expect(reaction.reactants[0].amount_mol).toBeCloseTo(0.02, 10);
      expect(reaction.reactants[0].equivalent).toBeCloseTo(1, 10);
      expect(reaction.reactants[1].amount_mol).toBeCloseTo(0.04, 10);
    });
  });

  ['g', 'mol', 'l'].forEach((unit) => {
    [true, false].forEach((lockEquivColumn) => {
      it(`settles a ${unit} mixture once without moving internal solvent volumes with lock=${lockEquivColumn}`, () => {
        const { mixture, scheme } = build(unit, lockEquivColumn);
        // Loaded components can describe the stock while the sample is a smaller reaction portion.
        mixture.components.forEach((component) => { component.amount_mol *= 10; });
        mixture.solvent = [{ amount_l: 0.0005 }];
        const updates = sinon.spy(mixture, 'updateComponentAmounts');
        try {
          ['r2', 'r1'].forEach((componentId) => {
            updates.resetHistory();
            scheme.updatedReactionForComponentReferenceChange({ sampleID: mixture.id, componentId });

            expect(updates.calledOnce).toBe(true);
            expect(mixture.sample_details.reference_component_changed).toBe(false);
            expect(mixture.amount_unit).toBe(unit);
            expect(mixture.amount_g).toBeCloseTo(1, 10);
            expect(mixture.amount_l).toBeCloseTo(0.001, 10);
            expect(mixture.amount_mol).toBeCloseTo(componentId === 'r2' ? 0.01 : 0.02, 10);
            expect(mixture.equivalent).toBeCloseTo(componentId === 'r2' ? 1 : 2, 10);
            expect(mixture.components[0].amount_mol).toBeCloseTo(0.02, 10);
            expect(mixture.components[1].amount_mol).toBeCloseTo(0.01, 10);
            expect(mixture.solvent[0].amount_l).toBeCloseTo(0.0005, 10);
          });
        } finally {
          updates.restore();
        }
      });
    });
  });

  ['g', 'mol'].forEach((unit) => {
    [true, false].forEach((lockEquivColumn) => {
      it(`keeps a zero ${unit} amount on a component switch with lock=${lockEquivColumn}`, () => {
        const { mixture, scheme } = build(unit, lockEquivColumn);
        mixture.amount_value = 0;

        scheme.updatedReactionForComponentReferenceChange({ sampleID: mixture.id, componentId: 'r2' });

        expect(mixture.amount_g).toBe(0);
        expect(mixture.amount_mol).toBe(0);
        expect(mixture.equivalent).toBe(0);
        expect(mixture.components.every((component) => component.amount_mol === 0)).toBe(true);
        expect(mixture.sample_details.reference_component_changed).toBe(false);
      });

      it(`retains ${unit} mass with no selected component relative MW and lock=${lockEquivColumn}`, () => {
        const { mixture, scheme } = build(unit, lockEquivColumn);
        mixture.components[1].relative_molecular_weight = 0;

        scheme.updatedReactionForComponentReferenceChange({ sampleID: mixture.id, componentId: 'r2' });

        expect(mixture.reference_component.id).toBe('r2');
        expect(mixture.amount_unit).toBe('g');
        expect(mixture.amount_g).toBeCloseTo(1, 10);
        expect(mixture.amount_mol).toBeCloseTo(0.01, 10);
        expect(mixture.equivalent).toBeCloseTo(1, 10);
        expect(mixture.sample_details.reference_component_changed).toBe(false);
      });
    });
  });
});

// Regression tests for the second polymer code path:
// calculateEquivalentForProduct must route polymer products through checkMassPolymer
// instead of the MW-based equivalent formula (which gives 0 when amount_g is null).
describe('ReactionDetailsScheme#calculateEquivalentForProduct — polymer guard', () => {
  let gasStoreStub;

  const makeRef = () => ({
    amount_mol: 0.1,
    amount_g: 200,
    coefficient: 1,
    molecule: { molecular_weight: 100 },
    residues: [{ custom_info: { loading: 0.5 } }],
    contains_residues: true,
    loading: 0.5,
  });

  const buildCtx = (referenceMaterial) => {
    const checkMassPolymer = sinon.spy();
    const checkMassMolecule = sinon.stub().returns({ mFull: 55, errorMsg: null });
    const triggerNotification = sinon.spy();
    return {
      props: { reaction: { referenceMaterial } },
      checkMassMolecule,
      checkMassPolymer,
      triggerNotification,
    };
  };

  beforeEach(() => {
    gasStoreStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({
      reactionVesselSizeValue: 0,
    });
  });

  afterEach(() => {
    gasStoreStub.restore();
  });

  it('calls checkMassPolymer for a polymer product (contains_residues=true)', () => {
    const ref = makeRef();
    const ctx = buildCtx(ref);
    const polymerProduct = {
      id: 'prod-1',
      contains_residues: true,
      gas_type: 'off',
      isGas: () => false,
      amount_g: null,
      molecule_molecular_weight: 2000,
      purity: 1,
    };

    ReactionDetailsScheme.prototype.calculateEquivalentForProduct.call(
      ctx,
      polymerProduct,
      ref,
      1.0
    );

    expect(ctx.checkMassPolymer.calledOnce).toBe(true);
  });

  it('does not call checkMassPolymer for a non-polymer product (contains_residues=false)', () => {
    const ref = makeRef();
    const ctx = buildCtx(ref);
    const normalProduct = {
      id: 'prod-2',
      contains_residues: false,
      gas_type: 'off',
      isGas: () => false,
      amount_g: 50,
      molecule_molecular_weight: 150,
      purity: 1,
    };

    ReactionDetailsScheme.prototype.calculateEquivalentForProduct.call(
      ctx,
      normalProduct,
      ref,
      1.0
    );

    expect(ctx.checkMassPolymer.called).toBe(false);
  });
});

// B3 regression: checkMassPolymer must not write Infinity/NaN when product has no mass
describe('ReactionDetailsScheme#checkMassPolymer — zero amount_g guard', () => {
  const makeRef = () => ({
    amount_mol: 0.025,
    amount_g: 50,
    coefficient: 1,
    contains_residues: true,
    loading: 0.5,
    residues: [{ custom_info: { loading: 0.5 } }],
    molecule: { molecular_weight: 100 },
  });

  it('does not write Infinity or NaN to loading when amount_g is 0', () => {
    const ref = makeRef();
    const product = {
      amount_g: 0,
      amount_mol: 0,
      equivalent: 0,
      molecule: { molecular_weight: 2000 },
      residues: [{ custom_info: { loading: null, loading_type: null } }],
    };
    const ctx = {
      calculateEquivalent: sinon.stub().returns(0.0),
    };

    ReactionDetailsScheme.prototype.checkMassPolymer.call(ctx, ref, product, {});

    const loading = product.residues[0].custom_info.loading;
    expect(loading === null || loading === undefined || Number.isFinite(loading)).toBe(true);
    expect(Number.isNaN(loading)).toBe(false);
  });

  it('sets equivalent even when amount_g is 0', () => {
    const ref = makeRef();
    const product = {
      amount_g: 0,
      amount_mol: 0,
      equivalent: 0.5,
      molecule: { molecular_weight: 2000 },
      residues: [{ custom_info: { loading: null, loading_type: null } }],
    };
    const ctx = {
      calculateEquivalent: sinon.stub().returns(0.0),
    };

    ReactionDetailsScheme.prototype.checkMassPolymer.call(ctx, ref, product, {});

    expect(product.equivalent).toBe(0.0);
  });
});

// B4 regression: yield clamp must not push to 100% when reference has no amount
describe('ReactionDetailsScheme#updatedSamplesForAmountChange — yield clamp with no reference amount', () => {
  let gasStoreStub;

  beforeEach(() => {
    gasStoreStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({ reactionVesselSizeValue: 0 });
  });

  afterEach(() => {
    gasStoreStub.restore();
  });

  const makeRef = (amount_mol) => ({
    id: 'ref-1',
    reference: true,
    amount_mol,
    amount_g: amount_mol > 0 ? 50 : 0,
    amount_value: amount_mol > 0 ? 50 : 0,
    coefficient: 1,
    molecule: { molecular_weight: 100 },
    residues: [{ custom_info: { loading: 0.5 } }],
    contains_residues: true,
    loading: amount_mol > 0 ? 0.5 : 0,
    decoupled: false,
    gas_type: 'off',
  });

  const buildCtx = (ref) => {
    const checkMassPolymer = sinon.spy();
    const checkMassMolecule = sinon.stub().returns({ mFull: 55, errorMsg: null });
    const triggerNotification = sinon.spy();
    return {
      props: {
        reaction: {
          referenceMaterial: ref,
          updateReferenceAmountForLockedEquivalents: sinon.stub(),
        },
      },
      state: { lockEquivColumn: false },
      checkMassMolecule,
      checkMassPolymer,
      triggerNotification,
    };
  };

  it('sets equivalent to 0 when reference has no amount and product has real mass', () => {
    const ref = makeRef(0);
    const ctx = buildCtx(ref);
    const product = {
      id: 'prod-1',
      contains_residues: false,
      gas_type: 'off',
      coefficient: 1,
      equivalent: NaN,
      amount_g: 30,
      amount_mol: 0.2,
      molecule_molecular_weight: 150,
      molecule: { molecular_weight: 150 },
      purity: 1,
      residues: [],
      decoupled: false,
      reference: false,
    };
    const reactant = {
      id: 'react-1',
      gas_type: 'off',
      amount_value: 100,
      amount_mol: 100,
      coefficient: 1,
      molecule_molecular_weight: 36.5,
      molecule: { molecular_weight: 36.5 },
      purity: 1,
      decoupled: false,
      reference: false,
      equivalent: 1,
      contains_residues: false,
    };

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx, [product], reactant, 'products'
    );

    expect(product.equivalent).toBe(0.0);
  });

  it('sets equivalent to 1.0 when product has real mass and reference has real amount with NaN equivalent', () => {
    const ref = makeRef(0.025);
    const ctx = buildCtx(ref);
    const product = {
      id: 'prod-1',
      contains_residues: false,
      gas_type: 'off',
      coefficient: 1,
      equivalent: NaN,
      amount_g: 30,
      amount_mol: 0.2,
      maxAmount: 100,
      molecule_molecular_weight: 150,
      molecule: { molecular_weight: 150 },
      purity: 1,
      residues: [],
      decoupled: false,
      reference: false,
    };
    const reactant = {
      id: 'react-1',
      gas_type: 'off',
      amount_value: 100,
      amount_mol: 100,
      coefficient: 1,
      molecule_molecular_weight: 36.5,
      molecule: { molecular_weight: 36.5 },
      purity: 1,
      decoupled: false,
      reference: false,
      equivalent: 1,
      contains_residues: false,
    };

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx, [product], reactant, 'products'
    );

    expect(product.equivalent).toBe(1.0);
  });
});

describe('ReactionDetailsScheme#resolveReactionVolumeForConcentrationOrWarn', () => {
  it('warns and returns null when no reaction volume can be resolved', () => {
    // Locked volume + no usable concentration-basis volume + all-solid materials =>
    // reactionVolumeForConcentration() is null. The edit must surface a
    // warning rather than silently proceed with an unusable volume.
    const reaction = { reactionVolumeForConcentration: () => null };
    const instance = { showReactionVolumeRequiredWarning: sinon.spy() };

    const result = ReactionDetailsScheme.prototype
      .resolveReactionVolumeForConcentrationOrWarn.call(instance, reaction);

    expect(result).toBe(null);
    expect(instance.showReactionVolumeRequiredWarning.calledOnce).toBe(true);
  });

  it('returns the volume without warning when one is available', () => {
    const reaction = { reactionVolumeForConcentration: () => 0.01 };
    const instance = { showReactionVolumeRequiredWarning: sinon.spy() };

    const result = ReactionDetailsScheme.prototype
      .resolveReactionVolumeForConcentrationOrWarn.call(instance, reaction);

    expect(result).toBe(0.01);
    expect(instance.showReactionVolumeRequiredWarning.called).toBe(false);
  });
});

describe('ReactionDetailsScheme#updatedSamplesForVesselSizeChange', () => {
  it('releases a feedstock preserveConcentration so it recomputes on vessel change', () => {
    const feedstock = {
      isFeedstock: () => true,
      isGas: () => false,
      preserveConcentration: true,
    };
    const instance = { calculateEquivalentForGasProduct: sinon.spy() };

    const [result] = ReactionDetailsScheme.prototype
      .updatedSamplesForVesselSizeChange.call(instance, [feedstock], 0.5);

    expect(result.preserveConcentration).toBe(false);
  });

  it('does not touch preserveConcentration on non-feedstock materials', () => {
    const reactant = {
      isFeedstock: () => false,
      isGas: () => false,
      preserveConcentration: true,
    };
    const instance = { calculateEquivalentForGasProduct: sinon.spy() };

    const [result] = ReactionDetailsScheme.prototype
      .updatedSamplesForVesselSizeChange.call(instance, [reactant], 0.5);

    expect(result.preserveConcentration).toBe(true);
  });
});

describe('ReactionDetailsScheme#switchVolumeLock', () => {
  it('releases preserved concentrations and toggles the lock', () => {
    const reaction = {
      isVolumeLocked: false,
      hasValidReactionVolume: true,
      resetPreservedConcentrationExcept: sinon.spy(),
    };
    const onInputChange = sinon.spy();
    const instance = {
      props: { reaction, onInputChange },
      showReactionVolumeRequiredWarning: sinon.spy(),
    };

    ReactionDetailsScheme.prototype.switchVolumeLock.call(instance);

    expect(reaction.resetPreservedConcentrationExcept.calledOnce).toBe(true);
    expect(onInputChange.calledOnceWith('lockReactionVolume', true)).toBe(true);
  });

  it('neither locks nor clears when locking without a valid volume', () => {
    const reaction = {
      isVolumeLocked: false,
      hasValidReactionVolume: false,
      resetPreservedConcentrationExcept: sinon.spy(),
    };
    const onInputChange = sinon.spy();
    const instance = {
      props: { reaction, onInputChange },
      showReactionVolumeRequiredWarning: sinon.spy(),
    };

    ReactionDetailsScheme.prototype.switchVolumeLock.call(instance);

    expect(instance.showReactionVolumeRequiredWarning.calledOnce).toBe(true);
    expect(reaction.resetPreservedConcentrationExcept.called).toBe(false);
    expect(onInputChange.called).toBe(false);
  });
});

describe('ReactionDetailsScheme#handleConcentrationModeChange', () => {
  it('releases preserved concentrations before recalculating with the new basis', () => {
    const reaction = {
      concentration_mode: Reaction.CONCENTRATION_MODES.REACTION_VOLUME,
      hasValidReactionVolume: true,
      resetPreservedConcentrationExcept: sinon.spy(),
      updateAllConcentrations: sinon.spy(),
    };
    const onInputChange = sinon.spy();
    const instance = {
      props: { reaction, onInputChange },
      showReactionVolumeRequiredWarning: sinon.spy(),
    };

    ReactionDetailsScheme.prototype.handleConcentrationModeChange.call(
      instance, Reaction.CONCENTRATION_MODES.SOLVENTS_ONLY
    );

    expect(reaction.resetPreservedConcentrationExcept.calledOnce).toBe(true);
    expect(reaction.concentration_mode).toBe(Reaction.CONCENTRATION_MODES.SOLVENTS_ONLY);
    expect(onInputChange.calledOnce).toBe(true);
    expect(reaction.updateAllConcentrations.calledOnce).toBe(true);
  });
});

describe('ReactionDetailsScheme#updateVolume', () => {
  it('releases preserved concentrations when changing an existing reaction-volume basis', () => {
    const reaction = {
      concentration_mode: Reaction.CONCENTRATION_MODES.REACTION_VOLUME,
      resetPreservedConcentrationExcept: sinon.spy(),
      updateAllConcentrations: sinon.spy(),
    };
    const onInputChange = sinon.spy();
    const instance = { props: { reaction, onInputChange } };

    ReactionDetailsScheme.prototype.updateVolume.call(instance, { value: 0.25 });

    expect(reaction.resetPreservedConcentrationExcept.calledOnce).toBe(true);
    expect(reaction.updateAllConcentrations.calledOnce).toBe(true);
    expect(reaction.resetPreservedConcentrationExcept.calledBefore(
      reaction.updateAllConcentrations
    )).toBe(true);
    expect(onInputChange.calledWith('volume', 0.25)).toBe(true);
    expect(onInputChange.calledWith('concentrationMode')).toBe(false);
  });

  it('records the volume without changing the basis or recomputing on a non-reaction-volume basis', () => {
    const reaction = {
      concentration_mode: Reaction.CONCENTRATION_MODES.SOLVENTS_ONLY,
      resetPreservedConcentrationExcept: sinon.spy(),
      updateAllConcentrations: sinon.spy(),
    };
    const onInputChange = sinon.spy();
    const instance = { props: { reaction, onInputChange } };

    ReactionDetailsScheme.prototype.updateVolume.call(instance, { value: 0.25 });

    expect(onInputChange.calledWith('volume', 0.25)).toBe(true);
    expect(onInputChange.calledWith('concentrationMode')).toBe(false);
    expect(reaction.resetPreservedConcentrationExcept.called).toBe(false);
    expect(reaction.updateAllConcentrations.called).toBe(false);
  });

  it('recomputes and warns when a set reaction volume is cleared on the reaction-volume basis', () => {
    const reaction = {
      concentration_mode: Reaction.CONCENTRATION_MODES.REACTION_VOLUME,
      volume: 5,
      resetPreservedConcentrationExcept: sinon.spy(),
      updateAllConcentrations: sinon.spy(),
    };
    const onInputChange = sinon.spy();
    const instance = {
      props: { reaction, onInputChange },
      showReactionVolumeRequiredWarning: sinon.spy(),
    };

    // NumeralInputWithUnitsCompo reports a cleared field as numeric 0, not ''.
    ReactionDetailsScheme.prototype.updateVolume.call(instance, { value: 0 });

    expect(reaction.updateAllConcentrations.calledOnce).toBe(true);
    expect(instance.showReactionVolumeRequiredWarning.calledOnce).toBe(true);
  });

  it('does not warn on a transient zero while typing a reaction volume from empty', () => {
    const reaction = {
      concentration_mode: Reaction.CONCENTRATION_MODES.REACTION_VOLUME,
      volume: null,
      resetPreservedConcentrationExcept: sinon.spy(),
      updateAllConcentrations: sinon.spy(),
    };
    const onInputChange = sinon.spy();
    const instance = {
      props: { reaction, onInputChange },
      showReactionVolumeRequiredWarning: sinon.spy(),
    };

    // Same callback shape as clearing (value 0), but no prior volume to remove.
    ReactionDetailsScheme.prototype.updateVolume.call(instance, { value: 0 });

    expect(reaction.updateAllConcentrations.calledOnce).toBe(true);
    expect(instance.showReactionVolumeRequiredWarning.called).toBe(false);
  });
});

describe('ReactionDetailsScheme#handleFixedVolumeConcentrationChange', () => {
  it('makes no change when the reaction volume cannot be resolved', () => {
    const reaction = {};
    const updatedSample = {
      concn: 0.5,
      setAmountFromConcentrationAndPreserve: sinon.spy(),
    };
    const instance = {
      props: { reaction },
      state: { lockEquivColumn: false },
      resolveReactionVolumeForConcentrationOrWarn: sinon.stub().returns(null),
      updatedReactionWithSample: sinon.spy(),
      updatedSamplesForAmountChange: () => {},
    };

    const result = ReactionDetailsScheme.prototype
      .handleFixedVolumeConcentrationChange.call(instance, updatedSample, 2);

    expect(updatedSample.setAmountFromConcentrationAndPreserve.called).toBe(false);
    expect(instance.updatedReactionWithSample.called).toBe(false);
    expect(updatedSample.concn).toBe(0.5);
    expect(result).toBe(reaction);
  });

  it('applies the concentration when a reaction volume is available', () => {
    const reaction = {};
    const updatedReaction = {};
    const updatedSample = {
      concn: null,
      setAmountFromConcentrationAndPreserve: sinon.spy(),
    };
    const instance = {
      props: { reaction },
      state: { lockEquivColumn: false },
      resolveReactionVolumeForConcentrationOrWarn: sinon.stub().returns(0.01),
      updatedReactionWithSample: sinon.stub().returns(updatedReaction),
      updatedSamplesForAmountChange: () => {},
    };

    const result = ReactionDetailsScheme.prototype
      .handleFixedVolumeConcentrationChange.call(instance, updatedSample, 2);

    expect(updatedSample.concn).toBe(2);
    expect(
      updatedSample.setAmountFromConcentrationAndPreserve.calledOnceWith(2, 0.01)
    ).toBe(true);
    expect(result).toBe(updatedReaction);
  });
});

describe('ReactionDetailsScheme#updatedReactionForConcentrationChange routing', () => {
  const buildInstance = (updatedSample, reactionOverrides = {}) => {
    const reaction = {
      gaseous: false,
      isVolumeLocked: false,
      findReactionSample: () => updatedSample,
      ...reactionOverrides,
    };
    return {
      props: { reaction },
      state: { lockEquivColumn: false },
      guardConcentrationUpdate: sinon.stub().returns(true),
      handleFixedVolumeConcentrationChange: sinon.spy(),
      applyDerivedVolumeFromConcentration: sinon.spy(),
    };
  };

  it('derives the amount from a fixed volume when the sample has no amount', () => {
    const updatedSample = { amount_mol: 0, isFeedstock: () => false };
    const instance = buildInstance(updatedSample);

    ReactionDetailsScheme.prototype.updatedReactionForConcentrationChange.call(
      instance,
      { sampleID: 1, concentration: { value: 2 } }
    );

    expect(instance.handleFixedVolumeConcentrationChange.calledOnceWith(updatedSample, 2)).toBe(true);
    expect(instance.applyDerivedVolumeFromConcentration.called).toBe(false);
  });

  it('derives the reaction volume when the sample already has an amount', () => {
    const updatedSample = { amount_mol: 0.5, isFeedstock: () => false };
    const instance = buildInstance(updatedSample);

    ReactionDetailsScheme.prototype.updatedReactionForConcentrationChange.call(
      instance,
      { sampleID: 1, concentration: { value: 2 } }
    );

    expect(instance.applyDerivedVolumeFromConcentration.calledOnce).toBe(true);
    expect(instance.handleFixedVolumeConcentrationChange.called).toBe(false);
  });
});

// Bug fix: checkMassMolecule must NOT fire material-loss warning when product has no mass entered.
// When user changes reference compound value with no product mass, massExperimental=0 which is
// always < mFull, causing a false positive. Fixed by guarding with massExperimental > 0.
describe('ReactionDetailsScheme#checkMassMolecule — no false material-loss warning', () => {
  let notificationStub;

  const buildInstance = () => {
    notificationStub = sinon.stub();
    const instance = Object.create(ReactionDetailsScheme.prototype);
    instance.context = { notifications: { add: notificationStub } };
    return instance;
  };

  const buildRef = (overrides = {}) => ({
    amount_mol: 0.01,
    amount_g: 1.0,
    decoupled: false,
    molecular_mass: 0,
    molecule: { molecular_weight: 100 },
    coefficient: 1,
    ...overrides,
  });

  const buildProduct = (overrides = {}) => ({
    amount_g: 0,
    contains_residues: true,
    decoupled: false,
    molecular_mass: 0,
    molecule: { molecular_weight: 200 },
    coefficient: 1,
    ...overrides,
  });

  it('does NOT fire warning when product mass is 0 and deltaM < 0 (expect weight loss)', () => {
    const instance = buildInstance();
    // deltaM = 50 - 100 = -50 (weight loss), mFull = 1.0 + 0.01*(-50) = 0.5
    // massExperimental = 0 → should NOT warn (zero = no value entered)
    const ref = buildRef({ molecule: { molecular_weight: 100 } });
    const product = buildProduct({ amount_g: 0, molecule: { molecular_weight: 50 } });
    instance.checkMassMolecule(ref, product);
    expect(notificationStub.called).toBe(false);
  });

  it('DOES fire warning when product mass is entered and is less than possible (weight loss)', () => {
    const instance = buildInstance();
    // deltaM = 50 - 100 = -50, mFull = 0.5g; entering 0.1g < 0.5g → should warn
    const ref = buildRef({ molecule: { molecular_weight: 100 } });
    const product = buildProduct({ amount_g: 0.1, molecule: { molecular_weight: 50 } });
    instance.checkMassMolecule(ref, product);
    expect(notificationStub.calledOnce).toBe(true);
    expect(notificationStub.firstCall.args[0].level).toBe('error');
  });

  it('does NOT fire warning when product mass is 0 and deltaM > 0 (expect weight gain)', () => {
    const instance = buildInstance();
    // deltaM = 200 - 100 = 100 (weight gain)
    const ref = buildRef({ molecule: { molecular_weight: 100 } });
    const product = buildProduct({ amount_g: 0, molecule: { molecular_weight: 200 } });
    instance.checkMassMolecule(ref, product);
    expect(notificationStub.called).toBe(false);
  });
});

// S1 fix: calculateEquivalent/checkMassMolecule run once per polymer product per
// recompute pass (a single edit can touch every product in the reaction), so their
// notifications.add calls need a stable uid — otherwise react-hot-toast stacks one
// toast per product instead of collapsing repeats of the same underlying condition.
describe('ReactionDetailsScheme#checkMassMolecule / #calculateEquivalent — toast dedupe uid', () => {
  let notificationStub;

  const buildInstance = () => {
    notificationStub = sinon.stub();
    const instance = Object.create(ReactionDetailsScheme.prototype);
    instance.context = { notifications: { add: notificationStub } };
    return instance;
  };

  const buildRef = (overrides = {}) => ({
    amount_mol: 0.01,
    amount_g: 1.0,
    decoupled: false,
    molecular_mass: 0,
    molecule: { molecular_weight: 100 },
    coefficient: 1,
    ...overrides,
  });

  const buildProduct = (overrides = {}) => ({
    id: 1,
    amount_g: 0.1,
    contains_residues: true,
    decoupled: false,
    molecular_mass: 0,
    molecule: { molecular_weight: 50 },
    coefficient: 1,
    ...overrides,
  });

  it('checkMassMolecule uses distinct uids for distinct products', () => {
    const instance = buildInstance();
    const ref = buildRef({ molecule: { molecular_weight: 100 } });
    instance.checkMassMolecule(ref, buildProduct({ id: 11 }));
    instance.checkMassMolecule(ref, buildProduct({ id: 22 }));
    expect(notificationStub.calledTwice).toBe(true);
    expect(notificationStub.firstCall.args[0].uid).toBe('polymer-mass-error-11');
    expect(notificationStub.secondCall.args[0].uid).toBe('polymer-mass-error-22');
  });

  it('checkMassMolecule uses the same uid across repeat passes for the same product', () => {
    const instance = buildInstance();
    const ref = buildRef({ molecule: { molecular_weight: 100 } });
    const product = buildProduct({ id: 33 });
    instance.checkMassMolecule(ref, product);
    instance.checkMassMolecule(ref, product);
    expect(notificationStub.calledTwice).toBe(true);
    expect(notificationStub.firstCall.args[0].uid).toBe('polymer-mass-error-33');
    expect(notificationStub.secondCall.args[0].uid).toBe('polymer-mass-error-33');
  });

  it('calculateEquivalent uids the "no residues on reference" toast by reference id', () => {
    const instance = buildInstance();
    const ref = buildRef({ contains_residues: false, id: 44 });
    instance.calculateEquivalent(ref, buildProduct());
    expect(notificationStub.calledOnce).toBe(true);
    expect(notificationStub.firstCall.args[0].uid).toBe('polymer-equivalent-no-residues-44');
  });

  it('calculateEquivalent uids the "no loading on reference" toast by reference id', () => {
    const instance = buildInstance();
    const ref = buildRef({ contains_residues: true, loading: 0, id: 55 });
    instance.calculateEquivalent(ref, buildProduct());
    expect(notificationStub.calledOnce).toBe(true);
    expect(notificationStub.firstCall.args[0].uid).toBe('polymer-equivalent-no-loading-55');
  });
});
