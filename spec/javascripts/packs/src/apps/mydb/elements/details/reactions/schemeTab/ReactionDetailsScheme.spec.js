import expect from 'expect';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';

import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
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
      props: { reaction: { referenceMaterial } },
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
