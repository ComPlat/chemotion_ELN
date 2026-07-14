import expect from 'expect';
import sinon from 'sinon';
import { describe, it } from 'mocha';

import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';

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
