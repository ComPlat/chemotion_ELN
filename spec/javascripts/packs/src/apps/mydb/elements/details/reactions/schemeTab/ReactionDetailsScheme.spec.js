import expect from 'expect';
import sinon from 'sinon';

import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

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
  let notifStub;

  beforeEach(() => {
    notifStub = sinon.stub(NotificationActions, 'add');
  });

  afterEach(() => {
    notifStub.restore();
  });

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
  let notifStub;

  beforeEach(() => {
    gasStoreStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({ reactionVesselSizeValue: 0 });
    notifStub = sinon.stub(NotificationActions, 'add');
  });

  afterEach(() => {
    gasStoreStub.restore();
    notifStub.restore();
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

  beforeEach(() => {
    notificationStub = sinon.stub(NotificationActions, 'add');
  });

  afterEach(() => {
    notificationStub.restore();
  });

  const buildInstance = () => {
    const instance = Object.create(ReactionDetailsScheme.prototype);
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
