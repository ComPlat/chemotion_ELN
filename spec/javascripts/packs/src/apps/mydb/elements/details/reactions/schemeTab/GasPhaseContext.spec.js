import expect from 'expect';
import ReactionFactory from 'factories/ReactionFactory';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import { withReactionGasPhase } from 'src/apps/mydb/elements/details/reactions/schemeTab/GasPhaseContext';
import { handleInputChange } from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import {
  makeVariationReaction, variationDiffOf
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

/*
The gas phase calculations read vessel size and catalyst amount from a global store that holds the
open reaction's values. A variation's edits have to be computed with the variation's own values, and
must not leave them behind for the parent.
*/
describe('GasPhaseContext', () => {
  let reaction;
  let variation;
  const storeState = () => GasPhaseReactionStore.getState();

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.vessel_size = { amount: 100, unit: 'ml' };
    variation = makeVariationReaction(reaction, { id: 'row-reaction', vessel_size: { amount: 250 } });
    // What ReactionDetails puts there for the open reaction.
    GasPhaseReactionActions.setReactionVesselSize(0.1);
    GasPhaseReactionActions.setCatalystReferenceMole(null);
  });

  it('computes a variation edit with the variation vessel size, and puts the parent one back', () => {
    let during;
    withReactionGasPhase(variation, () => { during = storeState().reactionVesselSizeValue; });

    expect(during).toBeCloseTo(0.25);
    expect(storeState().reactionVesselSizeValue).toBeCloseTo(0.1);
  });

  it('undoes what a variation edit writes into the store', () => {
    withReactionGasPhase(variation, () => GasPhaseReactionActions.setCatalystReferenceMole(5));

    expect(storeState().catalystReferenceMolValue).toBe(null);
  });

  it('leaves edits of the reaction itself alone, including what they write into the store', () => {
    let during;
    withReactionGasPhase(reaction, () => {
      during = storeState().reactionVesselSizeValue;
      GasPhaseReactionActions.setCatalystReferenceMole(5);
    });

    expect(during).toBeCloseTo(0.1);
    expect(storeState().catalystReferenceMolValue).toBe(5);
  });

  it('returns what the edit returns', () => {
    expect(withReactionGasPhase(variation, () => 'result')).toBe('result');
  });

  it('keeps the link to the parent out of the variation diff', () => {
    expect(Object.keys(variation)).not.toContain('variationOf');
    expect(variationDiffOf(reaction, variation)).not.toHaveProperty('variationOf');
  });

  it('keeps a vessel size edit in a variation away from the parent', () => {
    handleInputChange('vesselSizeAmount', 500, variation, () => {});

    expect(variation.vessel_size.amount).toBe(500);
    expect(storeState().reactionVesselSizeValue).toBeCloseTo(0.1);
  });
});
