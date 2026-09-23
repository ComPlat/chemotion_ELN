import expect from 'expect';
import sinon from 'sinon';

import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import Component from 'src/models/Component';
import Sample from 'src/models/Sample';
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
    expect(propagateReferenceAmountChange.calledOnceWith(
      sbmmSample, undefined, true
    )).toBe(true);
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

  it('leaves locked solvent scaling to the reference-ratio scaler', () => {
    const ctx = buildCtx({ lockEquivColumn: true });
    const solvent = makeSolvent({ equivalent: 0.5 });

    ReactionDetailsScheme.prototype.updatedSamplesForAmountChange.call(
      ctx,
      [solvent],
      updatedReference,
      'solvents'
    );

    // Reaction#scaleSolventVolumesForReferenceChange handles locked solvents by volume ratio;
    // this mole-based collection pass must not update them a second time.
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
// The model-level scaler (Reaction#scaleSolventVolumesForReferenceChange) is unit-tested in
// Reaction.spec.js; these prove the two amount-change handlers feed it correctly:
//   - snapshot the reference amount BEFORE the edit mutates it, and
//   - invoke the scaler only under locked equivalents, and only after locked propagation.
describe('ReactionDetailsScheme amount-change handlers — solvent volume scaling wiring', () => {
  // editMethod is the sample mutator each handler calls (setAmountAndNormalizeToGram vs setAmount);
  // it bumps the reference amount so a mistimed snapshot would read 0.2 instead of 0.1.
  const buildCtx = ({ lockEquivColumn, editMethod }) => {
    const referenceMaterial = { amount_mol: 0.1 };
    const updatedReaction = {
      scaleSolventVolumesForReferenceChange: sinon.spy(),
      resetPreservedConcentrationExcept: sinon.spy(),
      updateAllConcentrations: sinon.spy(),
      gaseous: false,
    };
    const updatedSample = {
      sample_details: {},
      initializeSampleDetails: sinon.spy(),
      [editMethod]: sinon.spy(() => { referenceMaterial.amount_mol = 0.2; }),
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
      // Use the real helper so these tests exercise the handler -> helper -> scaler path.
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
      it('scales solvent volume by the pre-edit reference ratio when equivalents are locked', () => {
        const { ctx, updatedReaction, updatedSample } = buildCtx({ lockEquivColumn: true, editMethod });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        const scaler = updatedReaction.scaleSolventVolumesForReferenceChange;
        // The snapshotted reference amount (0.1) is passed, not the value after the edit (0.2):
        // proof the snapshot precedes the mutation.
        expect(scaler.calledOnceWith(0.1)).toBe(true);
        // The edit and locked propagation both precede the scaler call.
        expect(updatedSample[editMethod].calledBefore(scaler)).toBe(true);
        expect(ctx.updatedReactionWithSample.calledBefore(scaler)).toBe(true);
      });

      it('leaves solvent volume untouched when equivalents are unlocked', () => {
        const { ctx, updatedReaction } = buildCtx({ lockEquivColumn: false, editMethod });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        expect(updatedReaction.scaleSolventVolumesForReferenceChange.called).toBe(false);
      });
    });
  });
});

// Switching between target and real amounts can change the active amount without an amount-field
// edit. These handlers must therefore use the same reference propagation path as direct edits.
describe('ReactionDetailsScheme amount-type handlers — solvent volume scaling wiring', () => {
  const handlers = [
    'updatedReactionForLoadingChange',
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
    const updatedReaction = { scaleSolventVolumesForReferenceChange: sinon.spy() };
    const reaction = {
      referenceMaterial,
      findReactionSample: sinon.stub().returns(updatedSample),
    };
    const updatedSamplesForAmountChange = sinon.spy(() => {
      // A locked edit to a dependent material rebases the reaction reference amount inside
      // updatedSamplesForAmountChange. Simulate that before the centralized scaler runs.
      if (!updatedSampleIsReference) referenceMaterial.amount_mol = 0.2;
      return [];
    });
    const updatedReactionWithSample = sinon.stub().callsFake((updateFunction, sample) => {
      // Keep the stub faithful to production: execute the supplied rebase callback before
      // returning the reaction that the centralized helper passes to the solvent scaler.
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
      it('scales solvents from the pre-switch amount when the reference sample changes', () => {
        const { ctx, updatedReaction, updatedSample, updatedReactionWithSample } = buildCtx({
          lockEquivColumn: true,
          updatedSampleIsReference: true,
        });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        const scaler = updatedReaction.scaleSolventVolumesForReferenceChange;
        expect(updatedSample.amountType).toBe('real');
        expect(scaler.calledOnceWith(0.1)).toBe(true);
        expect(updatedReactionWithSample.calledBefore(scaler)).toBe(true);
        expect(updatedReactionWithSample.firstCall.args[3]).toBe(true);
      });

      it('scales solvents from the old reference amount when a dependent sample rebases it', () => {
        const { ctx, updatedReaction, updatedSamplesForAmountChange } = buildCtx({
          lockEquivColumn: true,
          updatedSampleIsReference: false,
        });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        const scaler = updatedReaction.scaleSolventVolumesForReferenceChange;
        expect(updatedSamplesForAmountChange.calledOnce).toBe(true);
        expect(updatedSamplesForAmountChange.calledBefore(scaler)).toBe(true);
        expect(scaler.calledOnceWith(0.1)).toBe(true);
      });

      it('leaves solvent volumes untouched when equivalents are unlocked', () => {
        const { ctx, updatedReaction } = buildCtx({
          lockEquivColumn: false,
          updatedSampleIsReference: true,
        });

        ReactionDetailsScheme.prototype[handler].call(ctx, changeEvent);

        expect(updatedReaction.scaleSolventVolumesForReferenceChange.called).toBe(false);
      });
    });
  });
});

// Unit tests for the centralized propagation helper. Every reference-changing edit
// routes through this method so solvent scaling can never be forgotten at a call site.
describe('ReactionDetailsScheme#propagateReferenceAmountChange', () => {
  const buildCtx = ({ lockEquivColumn }) => {
    const updatedReaction = { scaleSolventVolumesForReferenceChange: sinon.spy() };
    const ctx = {
      state: { lockEquivColumn },
      updatedReactionWithSample: sinon.stub().returns(updatedReaction),
      updatedSamplesForAmountChange: sinon.spy(),
    };
    return { ctx, updatedReaction };
  };

  const updatedSample = { id: 's-1' };

  it('scales solvent volumes by the given reference amount when equivalents are locked', () => {
    const { ctx, updatedReaction } = buildCtx({ lockEquivColumn: true });

    const result = ReactionDetailsScheme.prototype.propagateReferenceAmountChange.call(
      ctx, updatedSample, 0.1, true
    );

    expect(updatedReaction.scaleSolventVolumesForReferenceChange.calledOnceWith(0.1)).toBe(true);
    expect(result).toBe(updatedReaction);
  });

  it('does not scale solvent volumes when equivalents are unlocked', () => {
    const { ctx, updatedReaction } = buildCtx({ lockEquivColumn: false });

    ReactionDetailsScheme.prototype.propagateReferenceAmountChange.call(
      ctx, updatedSample, 0.1, true
    );

    expect(updatedReaction.scaleSolventVolumesForReferenceChange.called).toBe(false);
  });

  it('forwards includeSbmm to updatedReactionWithSample', () => {
    const { ctx } = buildCtx({ lockEquivColumn: true });

    ReactionDetailsScheme.prototype.propagateReferenceAmountChange.call(
      ctx, updatedSample, 0.1, true
    );

    // signature: updatedReactionWithSample(updateFunction, updatedSample, type, includeSbmm)
    const call = ctx.updatedReactionWithSample.firstCall;
    expect(call.args[1]).toBe(updatedSample);
    expect(call.args[3]).toBe(true);
  });
});

// Regression: the concentration and reference-component paths also change the reference
// amount under locked equivalents, but previously never scaled solvent volumes (only the
// two direct amount handlers did). They now route through propagateReferenceAmountChange,
// so solvent volumes are scaled by the PRE-edit reference ratio on every such path.
describe('ReactionDetailsScheme reference-changing handlers — solvent volume scaling (regression)', () => {
  let gasStoreStub;

  beforeEach(() => {
    gasStoreStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({ reactionVesselSizeValue: 2 });
  });

  afterEach(() => {
    gasStoreStub.restore();
  });

  const buildUpdatedReaction = () => ({
    scaleSolventVolumesForReferenceChange: sinon.spy(),
    resetPreservedConcentrationExcept: sinon.spy(),
    updateAllConcentrations: sinon.spy(),
  });

  it('handleFixedVolumeConcentrationChange scales solvents by the pre-edit reference ratio', () => {
    const referenceMaterial = { id: 'ref-1', amount_mol: 0.1 };
    const updatedReaction = buildUpdatedReaction();
    // The edit rebases the reference amount to 0.2; a mistimed snapshot would read 0.2, not 0.1.
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

    const scaler = updatedReaction.scaleSolventVolumesForReferenceChange;
    expect(scaler.calledOnceWith(0.1)).toBe(true);
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

    expect(updatedReaction.scaleSolventVolumesForReferenceChange.called).toBe(false);
  });

  it('handleFeedstockConcentrationChange scales solvents by the pre-edit reference ratio', () => {
    const referenceMaterial = { id: 'ref-1', amount_mol: 0.1 };
    const updatedReaction = buildUpdatedReaction();
    const updatedSample = {
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

    const scaler = updatedReaction.scaleSolventVolumesForReferenceChange;
    expect(scaler.calledOnceWith(0.1)).toBe(true);
    expect(updatedSample.setAmount.calledBefore(scaler)).toBe(true);
  });
});

// A saved mixture may contain the legacy reference_component_changed flag. A component switch
// must clear that transient state, derive the new amount from the unchanged mixture mass, rebase
// dependents (including SBMM reactants), and scale solvents by the reference-amount ratio.
describe('ReactionDetailsScheme#updatedReactionForComponentReferenceChange — reference mixture recompute', () => {
  const massG = 1000.124;
  const icosaneRelMW = 2825825.158875;
  const octaneRelMW = 921311.970455;

  const build = ({ lockEquivColumn }) => {
    const sampleDetails = {
      previous_amount_mol: massG / icosaneRelMW,
      reference_relative_molecular_weight: icosaneRelMW,
      reference_component_changed: true,
    };
    const updatedSample = {
      id: 'ref-1',
      amount_g: massG,
      isMixture: () => true,
      hasComponents: () => true,
      components: [
        { id: 'c-1', reference: true, relative_molecular_weight: icosaneRelMW },
        { id: 'c-2', reference: false, relative_molecular_weight: octaneRelMW },
      ],
      sample_details: sampleDetails,
      initializeSampleDetails: sinon.spy(),
      storePreviousAmountState: sinon.spy(() => { sampleDetails.previous_amount_mol = updatedSample.amount_mol; }),
      get reference_component() { return this.components.find((c) => c.reference === true); },
      // Simulate the getter state restored from the database. Once the stale flag is cleared,
      // the selected component and unchanged mixture mass determine the amount.
      get amount_mol() {
        return sampleDetails.reference_component_changed
          ? sampleDetails.previous_amount_mol
          : this.amount_g / this.reference_component.relative_molecular_weight;
      },
    };
    const dependentSample = {
      id: 'dependent-1',
      equivalent: 2,
      amount_mol: 0,
    };
    const solventVolumes = [4, 2];
    const scaleFactors = [];
    const updatedReaction = {
      flagAtRebase: undefined,
      includeSbmmAtRebase: undefined,
      scaleSolventVolumesForReferenceChange: sinon.spy((previousAmountMol) => {
        const factor = updatedSample.amount_mol / previousAmountMol;
        scaleFactors.push(factor);
        solventVolumes.forEach((volume, index) => {
          solventVolumes[index] = volume * factor;
        });
      }),
      resetPreservedConcentrationExcept: sinon.spy(),
      updateAllConcentrations: sinon.spy(),
    };
    const reaction = {
      referenceMaterial: updatedSample,
      sampleById: sinon.stub().returns(updatedSample),
    };
    const ctx = {
      props: { reaction },
      state: { lockEquivColumn },
      // Mirror production: the locked path writes the mass represented by the newly derived
      // reference amount. That must resolve to the original mixture mass.
      calculateMixturePropertiesFromReferenceComponentChange: sinon.spy((sample, referenceComponent) => {
        if (lockEquivColumn) {
          sample.amount_g = sampleDetails.previous_amount_mol * referenceComponent.relative_molecular_weight;
        }
      }),
      propagateReferenceAmountChange: ReactionDetailsScheme.prototype.propagateReferenceAmountChange,
      // Capture the deferral flag and the includeSbmm argument at the moment amounts are rebased,
      // then execute the supplied update callback against a dependent reaction material.
      updatedReactionWithSample: sinon.stub().callsFake((updateFunction, referenceSample, _extLabel, includeSbmm) => {
        updatedReaction.flagAtRebase = sampleDetails.reference_component_changed;
        updatedReaction.includeSbmmAtRebase = includeSbmm;
        updateFunction([dependentSample], referenceSample, 'reactants');
        return updatedReaction;
      }),
      updatedSamplesForAmountChange: sinon.spy((samples, referenceSample) => {
        if (lockEquivColumn) {
          samples.forEach((sample) => {
            sample.amount_mol = sample.equivalent * referenceSample.amount_mol;
          });
        }
        return samples;
      }),
    };
    return { ctx, updatedReaction, updatedSample, dependentSample, solventVolumes, scaleFactors };
  };

  it('restores a saved mixture, derives the octane amount, and scales dependents under lock', () => {
    const {
      ctx, updatedReaction, updatedSample, dependentSample, solventVolumes, scaleFactors
    } = build({ lockEquivColumn: true });

    ReactionDetailsScheme.prototype.updatedReactionForComponentReferenceChange.call(
      ctx, { sampleID: 'ref-1', componentId: 'c-2' }
    );

    // The flag was cleared before the rebase, and SBMM samples are included like every sibling path.
    expect(updatedReaction.flagAtRebase).toBe(false);
    expect(updatedReaction.includeSbmmAtRebase).toBe(true);
    expect(ctx.updatedSamplesForAmountChange.calledOnce).toBe(true);
    const expectedScale = icosaneRelMW / octaneRelMW;
    expect(updatedSample.amount_mol).toBeCloseTo(massG / octaneRelMW, 12);
    expect(updatedSample.amount_g).toBeCloseTo(massG, 12);
    expect(dependentSample.amount_mol).toBeCloseTo(2 * massG / octaneRelMW, 12);
    expect(updatedReaction.scaleSolventVolumesForReferenceChange.calledOnceWith(
      massG / icosaneRelMW
    )).toBe(true);
    expect(scaleFactors[0]).toBeCloseTo(expectedScale, 12);
    expect(solventVolumes[0]).toBeCloseTo(4 * expectedScale, 12);
    expect(solventVolumes[1]).toBeCloseTo(2 * expectedScale, 12);
    // Concentrations refreshed under lock (the gap this fixes).
    expect(updatedReaction.resetPreservedConcentrationExcept.calledOnce).toBe(true);
    expect(updatedReaction.updateAllConcentrations.calledOnce).toBe(true);
  });

  it('restores the icosane amount and original solvent volumes on the reverse switch', () => {
    const {
      ctx, updatedReaction, updatedSample, solventVolumes, scaleFactors
    } = build({ lockEquivColumn: true });

    ReactionDetailsScheme.prototype.updatedReactionForComponentReferenceChange.call(
      ctx, { sampleID: 'ref-1', componentId: 'c-2' }
    );
    ReactionDetailsScheme.prototype.updatedReactionForComponentReferenceChange.call(
      ctx, { sampleID: 'ref-1', componentId: 'c-1' }
    );

    expect(updatedReaction.scaleSolventVolumesForReferenceChange.callCount).toBe(2);
    expect(scaleFactors[0]).toBeCloseTo(icosaneRelMW / octaneRelMW, 12);
    expect(scaleFactors[1]).toBeCloseTo(octaneRelMW / icosaneRelMW, 12);
    expect(updatedReaction.flagAtRebase).toBe(false);
    expect(updatedSample.amount_mol).toBeCloseTo(massG / icosaneRelMW, 12);
    expect(updatedSample.amount_g).toBeCloseTo(massG, 12);
    expect(solventVolumes[0]).toBeCloseTo(4, 12);
    expect(solventVolumes[1]).toBeCloseTo(2, 12);
  });

  it('does not refresh concentrations or scale solvents when equivalents are unlocked', () => {
    const { ctx, updatedReaction } = build({ lockEquivColumn: false });

    ReactionDetailsScheme.prototype.updatedReactionForComponentReferenceChange.call(
      ctx, { sampleID: 'ref-1', componentId: 'c-2' }
    );

    expect(updatedReaction.updateAllConcentrations.called).toBe(false);
    expect(updatedReaction.scaleSolventVolumesForReferenceChange.called).toBe(false);
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
    // Locked volume + use_reaction_volume off + all-solid materials =>
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
