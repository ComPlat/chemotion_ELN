import expect from 'expect';
import sinon from 'sinon';

import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import Component from 'src/models/Component';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';

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
    // Ensures the edited-object branch still works.
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
    const propagateReferenceAmountChange = sinon.stub().returns(reaction);
    const ctx = {
      props: { reaction },
      propagateReferenceAmountChange,
    };

    ReactionDetailsScheme.prototype.updatedReactionForAmountTypeChange.call(ctx, {
      sampleID: 'shared-id',
      amountType: 'real',
      isSbmm: true,
    });

    expect(reaction.findReactionSample.calledWith('shared-id', true)).toBe(true);
    expect(regularSample.amountType).toBe('target');
    expect(sbmmSample.amountType).toBe('real');
    expect(propagateReferenceAmountChange.calledOnceWithExactly(sbmmSample)).toBe(true);
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

  it('rebases a distinct SBMM material whose ID matches the edited regular reference', () => {
    const referenceMaterial = {
      id: 'shared-id',
      reference: true,
      amount_value: 100,
      amount_mol: 0.1,
      coefficient: 1,
    };
    const sbmmMaterial = {
      id: 'shared-id',
      type: 'sequence_based_macromolecule_sample',
      reference: false,
      equivalent: 2,
      coefficient: 1,
      applyAmountFromEquivalent: sinon.spy(),
    };
    const ctx = {
      props: {
        reaction: {
          referenceMaterial,
          updateReferenceAmountForLockedEquivalents: sinon.stub(),
        },
      },
      state: { lockEquivColumn: true },
      handleEquivalentBasedAmountUpdate:
        ReactionDetailsScheme.prototype.handleEquivalentBasedAmountUpdate,
    };

    const result = ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [sbmmMaterial],
      referenceMaterial,
      'reactants'
    );

    expect(sbmmMaterial.applyAmountFromEquivalent.calledOnceWith(0.2)).toBe(true);
    expect(result[0]).toBe(sbmmMaterial);
  });
});

// Regression tests for the solvent volume calculation:
// - Eq unlocked: a solvent's volume stays fixed; only its (derived) equivalent updates.
// - Eq locked: this mole-based pass EXCLUDES solvents; their volumes are derived from a
//   stored reference ratio in Reaction#updateSolventVolumesForReference, not scaled here.
// The historical glitch: editing a solvent volume set its equivalent via amount_g / maxAmount
// (NaN, because a solvent has no maxAmount). The correction block (further down) still derives
// a valid amount_mol / reference.amount_mol equivalent for display, but the locked volume
// itself no longer scales through moles in this pass.
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

  it('leaves locked solvent scaling to the reference-ratio scaler', () => {
    const ctx = buildCtx({ lockEquivColumn: true });
    const solvent = makeSolvent({ equivalent: 0.5 });

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [solvent],
      updatedReference,
      'solvents'
    );

    // Reaction#updateSolventVolumesForReference derives locked solvent volumes from the reference
    // ratio; this mole-based collection pass must not update them a second time.
    expect(solvent.setAmountAndNormalizeToGram.called).toBe(false);
    expect(solvent.amount_value).toBe(0.01);
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

// Handler-level regression tests for the solvent volume scaling wiring.
// The model-level derivation (Reaction#updateSolventVolumesForReference) is unit-tested in
// Reaction.spec.js; these prove the two amount-change handlers route through the centralized
// helper so solvent volumes are derived only under locked equivalents, and only after locked
// propagation has updated the reference amount.
describe('ReactionDetailsScheme amount-change handlers — solvent volume scaling wiring', () => {
  // editMethod is the sample mutator each handler calls (setAmountAndNormalizeToGram vs setAmount).
  const buildCtx = ({ lockEquivColumn, editMethod }) => {
    const referenceMaterial = { amount_mol: 0.1 };
    const updatedReaction = {
      updateSolventVolumesForReference: sinon.spy(),
      resetPreservedConcentrationExcept: sinon.spy(),
      updateAllConcentrations: sinon.spy(),
      gaseous: false,
    };
    const updatedSample = {
      sample_details: {},
      initializeSampleDetails: sinon.spy(),
      [editMethod]: sinon.spy(),
    };
    const reaction = {
      referenceMaterial,
      gaseous: false,
      weight_percentage: false,
      findReactionSample: sinon.stub().returns(updatedSample),
    };
    const ctx = {
      props: { reaction },
      state: { lockEquivColumn },
      // Use the real helper so these tests exercise the handler -> helper -> derivation path.
      propagateReferenceAmountChange: ReactionDetailsScheme.prototype.propagateReferenceAmountChange,
      updatedReactionWithSample: sinon.stub().returns(updatedReaction),
      updatedSamplesForAmountChange: sinon.spy(),
    };
    return { ctx, updatedReaction, updatedSample };
  };

  const changeEvent = { sampleID: 'solv-1', amount: { value: 5, unit: 'mg' }, isSbmm: false };

  const cases = [
    { handler: 'updatedReactionForAmountChange', editMethod: 'setAmountAndNormalizeToGram' },
    { handler: 'updatedReactionForAmountUnitChange', editMethod: 'setAmount' },
  ];

  cases.forEach(({ handler, editMethod }) => {
    describe(`#${handler}`, () => {
      it('derives solvent volumes from the edited sample when equivalents are locked', () => {
        const { ctx, updatedReaction, updatedSample } = buildCtx({ lockEquivColumn: true, editMethod });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        const scaler = updatedReaction.updateSolventVolumesForReference;
        // The edited sample is passed so its own solvent volume is kept and other solvents derive.
        expect(scaler.calledOnceWith(updatedSample)).toBe(true);
        // The edit and locked propagation both precede the derivation call.
        expect(updatedSample[editMethod].calledBefore(scaler)).toBe(true);
        expect(ctx.updatedReactionWithSample.calledBefore(scaler)).toBe(true);
      });

      it('leaves solvent volume untouched when equivalents are unlocked', () => {
        const { ctx, updatedReaction } = buildCtx({ lockEquivColumn: false, editMethod });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        expect(updatedReaction.updateSolventVolumesForReference.called).toBe(false);
      });
    });
  });
});

// Switching between target and real amounts can change the active amount without an amount-field
// edit. This handler must therefore use the same reference propagation path as direct edits.
describe('ReactionDetailsScheme amount-type handlers — solvent volume scaling wiring', () => {
  const handlers = [
    'updatedReactionForAmountTypeChange',
  ];

  const buildCtx = ({ lockEquivColumn, updatedSampleIsReference }) => {
    const updatedSample = {
      id: 'sample-1',
      amountType: 'target',
      get amount_mol() {
        return this.amountType === 'target' ? 0.1 : 0.2;
      },
    };
    const referenceMaterial = updatedSampleIsReference ? updatedSample : { amount_mol: 0.1 };
    const updatedReaction = { updateSolventVolumesForReference: sinon.spy() };
    const reaction = {
      referenceMaterial,
      findReactionSample: sinon.stub().returns(updatedSample),
    };
    const updatedSamplesForAmountChange = sinon.spy(() => {
      // A locked edit to a dependent material rebases the reaction reference amount inside
      // updatedSamplesForAmountChange. Simulate that before the centralized derivation runs.
      if (!updatedSampleIsReference) referenceMaterial.amount_mol = 0.2;
      return [];
    });
    const updatedReactionWithSample = sinon.stub().callsFake((updateFunction, sample) => {
      // Keep the stub faithful to production: execute the supplied rebase callback before
      // returning the reaction that the centralized helper passes to the solvent derivation.
      updateFunction([], sample, 'reactants');
      return updatedReaction;
    });
    const ctx = {
      props: { reaction },
      state: { lockEquivColumn },
      propagateReferenceAmountChange: ReactionDetailsScheme.prototype.propagateReferenceAmountChange,
      updatedReactionWithSample,
      updatedSamplesForAmountChange,
    };

    return {
      ctx,
      updatedReaction,
      updatedSample,
      updatedReactionWithSample,
      updatedSamplesForAmountChange,
    };
  };

  const changeEvent = { sampleID: 'sample-1', amountType: 'real', isSbmm: false };

  handlers.forEach((handler) => {
    describe(`#${handler}`, () => {
      it('derives solvents from the edited sample when the reference sample changes', () => {
        const { ctx, updatedReaction, updatedSample, updatedReactionWithSample } = buildCtx({
          lockEquivColumn: true,
          updatedSampleIsReference: true,
        });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        const scaler = updatedReaction.updateSolventVolumesForReference;
        expect(updatedSample.amountType).toBe('real');
        expect(scaler.calledOnceWith(updatedSample)).toBe(true);
        expect(updatedReactionWithSample.calledBefore(scaler)).toBe(true);
        expect(updatedReactionWithSample.firstCall.args[3]).toBe(true);
      });

      it('derives solvents after a dependent sample rebases the reference', () => {
        const { ctx, updatedReaction, updatedSample, updatedSamplesForAmountChange } = buildCtx({
          lockEquivColumn: true,
          updatedSampleIsReference: false,
        });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        const scaler = updatedReaction.updateSolventVolumesForReference;
        expect(updatedSamplesForAmountChange.calledOnce).toBe(true);
        expect(updatedSamplesForAmountChange.calledBefore(scaler)).toBe(true);
        expect(scaler.calledOnceWith(updatedSample)).toBe(true);
      });

      it('leaves solvent volumes untouched when equivalents are unlocked', () => {
        const { ctx, updatedReaction } = buildCtx({
          lockEquivColumn: false,
          updatedSampleIsReference: true,
        });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        expect(updatedReaction.updateSolventVolumesForReference.called).toBe(false);
      });
    });
  });
});

// Unit tests for the centralized propagation helper. Every reference-changing edit
// routes through this method so solvent scaling can never be forgotten at a call site.
describe('ReactionDetailsScheme#propagateReferenceAmountChange', () => {
  const buildCtx = ({ lockEquivColumn }) => {
    const updatedReaction = { updateSolventVolumesForReference: sinon.spy() };
    const ctx = {
      state: { lockEquivColumn },
      updatedReactionWithSample: sinon.stub().returns(updatedReaction),
      updatedSamplesForAmountChange: sinon.spy(),
    };
    return { ctx, updatedReaction };
  };

  const updatedSample = { id: 's-1' };

  it('derives solvent volumes from the edited sample when equivalents are locked', () => {
    const { ctx, updatedReaction } = buildCtx({ lockEquivColumn: true });

    const result = ReactionDetailsScheme.prototype.propagateReferenceAmountChange.call(
      ctx, updatedSample
    );

    expect(updatedReaction.updateSolventVolumesForReference.calledOnceWith(updatedSample)).toBe(true);
    expect(result).toBe(updatedReaction);
  });

  it('does not derive solvent volumes when equivalents are unlocked', () => {
    const { ctx, updatedReaction } = buildCtx({ lockEquivColumn: false });

    ReactionDetailsScheme.prototype.propagateReferenceAmountChange.call(
      ctx, updatedSample
    );

    expect(updatedReaction.updateSolventVolumesForReference.called).toBe(false);
  });

  it('always includes SBMM reactant samples when rebasing', () => {
    const { ctx } = buildCtx({ lockEquivColumn: true });

    ReactionDetailsScheme.prototype.propagateReferenceAmountChange.call(
      ctx, updatedSample
    );

    // signature: updatedReactionWithSample(updateFunction, updatedSample, type, includeSbmm)
    const call = ctx.updatedReactionWithSample.firstCall;
    expect(call.args[1]).toBe(updatedSample);
    expect(call.args[3]).toBe(true);
  });
});

// Regression: the concentration handlers also change the reference amount under locked
// equivalents, but previously never scaled solvent volumes (only the two direct amount
// handlers did). They now route through propagateReferenceAmountChange, so solvent volumes
// are derived from the updated reference on these paths too.
// Not covered here: the reference-component switch (updatedReactionForComponentReferenceChange)
// still calls updatedSamplesForAmountChange directly and does NOT derive solvents under lock.
// That bypass is scoped to the stacked #3584.
describe('ReactionDetailsScheme reference-changing handlers — solvent volume scaling (regression)', () => {
  let gasStoreStub;

  beforeEach(() => {
    gasStoreStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({ reactionVesselSizeValue: 2 });
  });

  afterEach(() => {
    gasStoreStub.restore();
  });

  const buildUpdatedReaction = () => ({
    updateSolventVolumesForReference: sinon.spy(),
    resetPreservedConcentrationExcept: sinon.spy(),
    updateAllConcentrations: sinon.spy(),
  });

  it('handleFixedVolumeConcentrationChange derives solvents from the edited sample', () => {
    const referenceMaterial = { id: 'ref-1', amount_mol: 0.1 };
    const updatedReaction = buildUpdatedReaction();
    const updatedSample = {
      setAmountFromConcentrationAndPreserve: sinon.spy(() => { referenceMaterial.amount_mol = 0.2; }),
    };
    const ctx = {
      props: { reaction: { referenceMaterial } },
      state: { lockEquivColumn: true },
      resolveReactionVolumeForConcentrationOrWarn: sinon.stub().returns(0.01),
      propagateReferenceAmountChange: ReactionDetailsScheme.prototype.propagateReferenceAmountChange,
      updatedReactionWithSample: sinon.stub().returns(updatedReaction),
      updatedSamplesForAmountChange: sinon.spy(),
    };

    ReactionDetailsScheme.prototype.handleFixedVolumeConcentrationChange.call(ctx, updatedSample, 2);

    const scaler = updatedReaction.updateSolventVolumesForReference;
    expect(scaler.calledOnceWith(updatedSample)).toBe(true);
    expect(updatedSample.setAmountFromConcentrationAndPreserve.calledBefore(scaler)).toBe(true);
  });

  it('handleFixedVolumeConcentrationChange leaves solvent volumes untouched when unlocked', () => {
    const referenceMaterial = { id: 'ref-1', amount_mol: 0.1 };
    const updatedReaction = buildUpdatedReaction();
    const updatedSample = { setAmountFromConcentrationAndPreserve: sinon.spy() };
    const ctx = {
      props: { reaction: { referenceMaterial } },
      state: { lockEquivColumn: false },
      resolveReactionVolumeForConcentrationOrWarn: sinon.stub().returns(0.01),
      propagateReferenceAmountChange: ReactionDetailsScheme.prototype.propagateReferenceAmountChange,
      updatedReactionWithSample: sinon.stub().returns(updatedReaction),
      updatedSamplesForAmountChange: sinon.spy(),
    };

    ReactionDetailsScheme.prototype.handleFixedVolumeConcentrationChange.call(ctx, updatedSample, 2);

    expect(updatedReaction.updateSolventVolumesForReference.called).toBe(false);
  });

  it('handleFeedstockConcentrationChange preserves solvents like the other dependents', () => {
    const referenceMaterial = { id: 'ref-1', amount_mol: 0.1 };
    const updatedReaction = buildUpdatedReaction();
    const solvent = {
      id: 'solvent', amount_unit: 'l', amount_l: 0.01, referenceVolumeRatio: 0.1, setAmount: sinon.spy()
    };
    updatedReaction.referenceMaterial = referenceMaterial;
    updatedReaction.solvents = [solvent];
    updatedReaction.updateSolventVolumesForReference = sinon.spy(Reaction.prototype.updateSolventVolumesForReference);
    const updatedSample = {
      gas_type: 'feedstock',
      setAmount: sinon.spy(() => { referenceMaterial.amount_mol = 0.2; }),
    };
    const ctx = {
      props: { reaction: { referenceMaterial } },
      state: { lockEquivColumn: true },
      propagateReferenceAmountChange: ReactionDetailsScheme.prototype.propagateReferenceAmountChange,
      updatedReactionWithSample: sinon.stub().returns(updatedReaction),
      updatedSamplesForAmountChange: sinon.spy(),
    };

    ReactionDetailsScheme.prototype.handleFeedstockConcentrationChange.call(ctx, updatedSample, 0.5);

    const scaler = updatedReaction.updateSolventVolumesForReference;
    expect(scaler.calledOnceWith(updatedSample)).toBe(true);
    expect(updatedSample.setAmount.calledBefore(scaler)).toBe(true);
    expect(solvent.setAmount.called).toBe(false);
    expect(solvent.referenceVolumeRatio).toBe(0.1);
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
      propagateReferenceAmountChange: ReactionDetailsScheme.prototype.propagateReferenceAmountChange,
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
      propagateReferenceAmountChange: ReactionDetailsScheme.prototype.propagateReferenceAmountChange,
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


describe('ReactionDetailsScheme — concentration edits preserve their volume basis', () => {
  const buildCtx = (mode) => {
    const reaction = new Reaction({
      starting_materials: [{
        id: 'reference',
        reference: true,
        amountType: 'target',
        target_amount_value: 0.001,
        target_amount_unit: 'mol',
        molecule: { molecular_weight: 100 },
        purity: 1,
        gas_type: 'off',
      }],
      reactants: [],
      products: [],
      purification_solvents: [],
      solvents: [{ target_amount_value: 0.005, target_amount_unit: 'l' }],
      concentration_mode: mode,
      volume: 0.01,
      lock_reaction_volume: true,
    });
    reaction.captureSolventReferenceRatios();
    const ctx = Object.create(ReactionDetailsScheme.prototype);
    ctx.props = { reaction };
    ctx.state = { lockEquivColumn: true };
    ctx.showReactionVolumeRequiredWarning = sinon.spy();
    return ctx;
  };

  it('retains the typed concentration when solvent volumes scale on the explicit volume basis', () => {
    const ctx = buildCtx(Reaction.CONCENTRATION_MODES.REACTION_VOLUME);
    const { reaction } = ctx.props;
    ctx.updatedReactionForConcentrationChange({ sampleID: 'reference', concentration: { value: 0.2 } });

    expect(reaction.solvents[0].amount_l).toBeCloseTo(0.01, 10);
    expect(reaction.reactionVolumeForConcentration()).toBe(0.01);
    expect(reaction.referenceMaterial.amount_mol / reaction.reactionVolumeForConcentration()).toBeCloseTo(0.2, 10);
    expect(reaction.referenceMaterial.concn).toBeCloseTo(0.2, 10);
  });

  [Reaction.CONCENTRATION_MODES.SOLVENTS_ONLY, Reaction.CONCENTRATION_MODES.COMBINED].forEach((mode) => {
    it(`rejects concentration edits on the ${mode} basis while equivalents are locked`, () => {
      const ctx = buildCtx(mode);
      const { reaction } = ctx.props;
      ctx.updatedReactionForConcentrationChange({ sampleID: 'reference', concentration: { value: 0.2 } });

      expect(ctx.showReactionVolumeRequiredWarning.calledOnce).toBe(true);
      expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.001, 10);
      expect(reaction.solvents[0].amount_l).toBe(0.005);
    });
  });
});

describe('ReactionDetailsScheme — solvent ratio lifecycle', () => {
  const attributes = (id, value, unit, extra = {}) => ({
    id, amountType: 'target', target_amount_value: value, target_amount_unit: unit,
    molecule: { molecular_weight: 100 }, purity: 1, density: 0, molarity_value: 0,
    gas_type: 'off', coefficient: 1, equivalent: 0, ...extra,
  });
  const buildModalContext = (unit = 'l') => {
    const reaction = new Reaction({
      id: 91, short_label: 'reaction',
      starting_materials: [attributes('reference', 0.001, 'mol', { reference: true })],
      reactants: [], products: [],
      solvents: [
        attributes('solvent', unit === 'l' ? 0.01 : 1, unit, { density: unit === 'g' ? 1 : 0 }),
        attributes('other', 0.03, 'l'),
      ],
    });
    const ctx = Object.create(ReactionDetailsScheme.prototype);
    ctx.props = { reaction, onInputChange: sinon.spy(), onReactionChange: sinon.spy() };
    ctx.state = { lockEquivColumn: true, displayYieldField: false, reactionDescTemplate: {} };
    ctx.warnIfMixtureMassExceeded = sinon.spy();
    ctx.renderPhConditionProperty = () => null;
    ctx.reactionVesselSize = () => null;
    ctx.reactionVolume = () => null;
    ctx.renderRole = () => null;
    return ctx;
  };

  ['target', 'real'].forEach((amountType) => {
    ['l', 'g'].forEach((unit) => {
      it(`preserves a ${unit} solvent after a ${amountType} modal save and scales it on the next reference edit`, () => {
        const ctx = buildModalContext(unit);
        const { reaction } = ctx.props;
        reaction.captureSolventReferenceRatios();
        const edited = reaction.solvents[0];
        edited.amountType = amountType;
        edited.setAmount({ value: unit === 'l' ? 0.02 : 2, unit });
        const serverJson = JSON.parse(JSON.stringify(edited.serializeMaterial()));
        serverJson.molecule = { molecular_weight: 100 };
        serverJson.name = 'saved name';
        reaction.editedSample = edited;
        reaction.updateMaterial(new Sample(serverJson));
        ctx.render();

        const volume = unit === 'l' ? 0.02 : 0.002;
        expect(reaction.solvents[0].amount_unit).toBe(unit);
        expect(reaction.solvents[0].amount_l).toBeCloseTo(volume, 10);
        expect(reaction.solvents[0].referenceVolumeRatio).toBeCloseTo(volume / 0.001, 10);
        expect(reaction.solvents[1].referenceVolumeRatio).toBe(30);
        reaction.referenceMaterial.setAmount({ value: 0.002, unit: 'mol' });
        ctx.propagateReferenceAmountChange(reaction.referenceMaterial);
        expect(reaction.solvents[0].amount_l).toBeCloseTo(volume * 2, 10);
        expect(reaction.solvents[1].amount_l).toBeCloseTo(0.06, 10);
      });
    });
  });

  it('captures a solvent created through ElementStore and retains its volume through the target render path', () => {
    const ctx = buildModalContext();
    const { reaction } = ctx.props;
    reaction.captureSolventReferenceRatios();
    const newSample = new Sample(attributes('created', 0.005, 'l'));
    reaction.editedSample = newSample;
    const store = { handleRefreshElements: sinon.spy(), changeCurrentElement: sinon.spy() };
    const sandbox = sinon.createSandbox();
    try {
      sandbox.stub(UserActions, 'fetchCurrentUser');
      sandbox.stub(ElementActions, 'handleSvgReactionChange');
      ElementStore.StoreModel.prototype.handleCreateSampleForReaction.call(store, {
        newSample, reaction, materialGroup: 'solvents',
      });
    } finally {
      sandbox.restore();
    }
    ctx.render();
    expect(reaction.solvents.find((sample) => sample.id === newSample.id).referenceVolumeRatio).toBe(5);
    reaction.referenceMaterial.setAmount({ value: 0.002, unit: 'mol' });
    ctx.propagateReferenceAmountChange(reaction.referenceMaterial);
    expect(reaction.solvents.find((sample) => sample.id === newSample.id).amount_l).toBe(0.01);
    expect(reaction.solvents[0].amount_l).toBe(0.02);
  });

  ['mount', 'update'].forEach((lifecycle) => {
    it(`does not change a clean reaction checksum when capturing locked ratios on ${lifecycle}`, () => {
      const ctx = buildModalContext();
      const { reaction } = ctx.props;
      reaction.updateChecksum();
      const checksum = reaction.checksum();
      ctx.getReactionEquivLockState = () => true;
      ctx.setState = (state) => { ctx.state = { ...ctx.state, ...state }; };
      const sandbox = sinon.createSandbox();
      try {
        sandbox.stub(TextTemplateStore, 'listen');
        sandbox.stub(TextTemplateActions, 'fetchTextTemplates');
        if (lifecycle === 'mount') ctx.componentDidMount();
        else ctx.componentDidUpdate({ reaction: {} });
      } finally {
        sandbox.restore();
      }
      expect(reaction.solvents[0].referenceVolumeRatio).toBe(10);
      expect(reaction.checksum()).toBe(checksum);
      expect(reaction.isEdited).toBe(false);
      expect(reaction.isPendingToSave).toBe(false);
    });
  });

  [false, true].forEach((isSbmm) => {
    [0, 0.002].forEach((amount) => {
      it(`re-anchors a ${isSbmm ? 'SBMM' : 'regular'} reference at ${amount} mol through the scheme handler`, () => {
        const ctx = buildModalContext();
        const { reaction } = ctx.props;
        const sampleID = isSbmm ? 'reference' : 'new-reference';
        if (isSbmm) {
          // SBMM and regular samples can have the same ID.
          reaction.reactant_sbmm_samples = [new SequenceBasedMacromoleculeSample({
            id: sampleID, amount_as_used_mol_value: amount, amount_as_used_mol_unit: 'mol',
          })];
        } else {
          reaction.starting_materials = [
            ...reaction.starting_materials, attributes(sampleID, amount, 'mol'),
          ];
        }
        reaction.captureSolventReferenceRatios();

        ctx.updatedReactionForReferenceChange({ sampleID, isSbmm });

        expect(reaction.referenceMaterial.id).toBe(sampleID);
        expect(reaction.starting_materials[0].reference).toBe(false);
        expect(reaction.solvents[0].amount_l).toBe(0.01);
        expect(reaction.solvents[0].referenceVolumeRatioPending).toBe(amount === 0);
        if (isSbmm) reaction.referenceMaterial.amount_as_used_mol_value = 0.004;
        else reaction.referenceMaterial.setAmount({ value: 0.004, unit: 'mol' });
        ctx.propagateReferenceAmountChange(reaction.referenceMaterial);
        expect(reaction.solvents[0].amount_l).toBe(amount === 0 ? 0.01 : 0.02);

        if (isSbmm) reaction.referenceMaterial.amount_as_used_mol_value = 0.008;
        else reaction.referenceMaterial.setAmount({ value: 0.008, unit: 'mol' });
        ctx.propagateReferenceAmountChange(reaction.referenceMaterial);
        expect(reaction.solvents[0].amount_l).toBe(amount === 0 ? 0.02 : 0.04);
      });
    });
  });

  it('scales a material moved into solvents through the scheme handler', () => {
    const ctx = buildModalContext();
    const { reaction } = ctx.props;
    reaction.reactants = [attributes('moved', 0.005, 'l')];
    reaction.captureSolventReferenceRatios();
    const moved = reaction.reactants[0];

    ctx.dropMaterial(moved, 'reactants', null, 'solvents');

    const stored = reaction.solvents.find((sample) => sample.id === moved.id);
    expect(stored).not.toBe(moved);
    expect(stored.referenceVolumeRatio).toBe(5);
    expect(reaction.reactants).toHaveLength(0);
    reaction.referenceMaterial.setAmount({ value: 0.002, unit: 'mol' });
    ctx.propagateReferenceAmountChange(reaction.referenceMaterial);
    expect(reaction.solvents.map((sample) => sample.amount_l)).toEqual([0.02, 0.06, 0.01]);
  });

  it('preserves solvent ratios when reordering while the reference amount is zero', () => {
    const ctx = buildModalContext();
    const { reaction } = ctx.props;
    reaction.captureSolventReferenceRatios();
    reaction.referenceMaterial.setAmount({ value: 0, unit: 'mol' });

    ctx.dropMaterial(reaction.solvents[1], 'solvents', reaction.solvents[0], 'solvents');

    expect(reaction.solvents.map((sample) => sample.referenceVolumeRatio)).toEqual([30, 10]);
    reaction.referenceMaterial.setAmount({ value: 0.002, unit: 'mol' });
    ctx.propagateReferenceAmountChange(reaction.referenceMaterial);
    expect(reaction.solvents.map((sample) => sample.amount_l)).toEqual([0.06, 0.02]);
  });

  // End-to-end regression over a real Reaction: addMaterialAt runs the solvents setter
  // (_coerceToSamples -> new Sample), which is what detaches the added sample from the stored
  // one. Proves the added solvent actually scales on a later reference change, while an
  // existing solvent's ratio is left untouched.
  it('scales a solvent added via real addMaterialAt when the reference later changes', () => {
    const makeSample = (props) => {
      const sample = new Sample(props);
      sample.amountType = 'real';
      return sample;
    };
    // molecular_weight 1 so amount_mol (g) == amount_value: 1 g -> 1 mol, 2 g -> 2 mol.
    const reference = makeSample({
      molecule: { molecular_weight: 1 },
      reference: true,
      real_amount_value: 1,
      real_amount_unit: 'g',
    });
    const existingSolvent = makeSample({ real_amount_value: 20, real_amount_unit: 'l' });

    const reaction = new Reaction({
      starting_materials: [reference],
      reactants: [],
      products: [],
      solvents: [existingSolvent],
      purification_solvents: [],
    });

    // The solvents/starting_materials setters coerced to fresh Sample copies, so resolve the
    // stored instances by id for everything that follows.
    const storedRef = reaction.starting_materials.find((s) => s.reference);
    expect(storedRef.amount_mol).toBeCloseTo(1, 9);

    // Seed existing solvent's ratio at lock time (20 L / 1 mol).
    reaction.captureSolventReferenceRatios();
    const existingId = reaction.solvents[0].id;
    expect(reaction.solvents[0].referenceVolumeRatio).toBeCloseTo(20, 9);

    // The model captures the added solvent after storing its Sample copy.
    const addedInput = makeSample({ real_amount_value: 5, real_amount_unit: 'l' });
    reaction.addMaterialAt(addedInput, null, null, 'solvents');

    const storedAdded = reaction.solvents.find((s) => s.id === addedInput.id);
    expect(storedAdded.referenceVolumeRatio).toBeCloseTo(5, 9); // 5 L / 1 mol

    // Double the reference amount (1 -> 2 mol) and rescale.
    storedRef.real_amount_value = 2;
    reaction.updateSolventVolumesForReference();

    const existingAfter = reaction.solvents.find((s) => s.id === existingId);
    const addedAfter = reaction.solvents.find((s) => s.id === addedInput.id);
    expect(addedAfter.amount_l).toBeCloseTo(10, 9); // 5 * (2 / 1)
    expect(existingAfter.amount_l).toBeCloseTo(40, 9); // 20 * (2 / 1)
    expect(existingAfter.referenceVolumeRatio).toBeCloseTo(20, 9); // ratio unchanged
  });
});
