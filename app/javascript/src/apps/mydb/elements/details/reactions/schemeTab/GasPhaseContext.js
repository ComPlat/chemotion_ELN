/*
The gas phase calculations (gas moles, yield, turnover number and frequency) read the vessel size and
the catalyst amount from the global GasPhaseReactionStore - deep inside Sample, which does not know
the reaction it belongs to. ReactionDetails fills that store with the values of the reaction that is
open.

A variation has a copy of that reaction with a vessel size and a catalyst amount of its own. While an
edit to a variation is computed, the store therefore holds the variation's values; once it is done,
the store is put back to those of the reaction the variation belongs to - which also undoes whatever
the edit wrote into the store for the variation (a changed catalyst amount, for one), so the parent's
own calculations never see the variation's values.

Edits to the reaction itself pass straight through: the store already holds its values, and what they
write into it is meant to stay.
*/
import alt from 'src/stores/alt/alt';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';

// The reaction a variation's copy was made from - see makeVariationReaction.
const VARIATION_OF = 'variationOf';

let depth = 0;

const loadGasPhaseOf = (reaction) => {
  const { catalystMoles, vesselSize } = reaction.findReactionVesselSizeCatalystMaterialValues();
  GasPhaseReactionActions.setReactionVesselSize(vesselSize || null);
  GasPhaseReactionActions.setCatalystReferenceMole(catalystMoles || null);
};

/*
Marks `variationReaction` as a variation of `reaction`. Not enumerable, so it stays out of the
variation's diff and out of anything that copies the variation's own properties.
*/
const markAsVariationOf = (variationReaction, reaction) => {
  Object.defineProperty(variationReaction, VARIATION_OF, {
    value: reaction,
    enumerable: false,
    configurable: true,
    writable: true,
  });
  return variationReaction;
};

// Whether `reaction` is a variation's copy rather than a reaction of its own.
const isVariationReaction = (reaction) => Boolean(reaction?.[VARIATION_OF]);

// Runs `change` - an edit of `reaction` - against the gas phase values of that reaction.
const withReactionGasPhase = (reaction, change) => {
  const parent = reaction?.[VARIATION_OF];
  // Nested edits run inside the outermost one; Alt cannot dispatch in the middle of a dispatch.
  if (!parent || depth > 0 || alt.dispatcher.isDispatching()) {
    return change();
  }

  depth += 1;
  try {
    loadGasPhaseOf(reaction);
    return change();
  } finally {
    depth -= 1;
    loadGasPhaseOf(parent);
  }
};

export {
  isVariationReaction,
  markAsVariationOf,
  withReactionGasPhase,
};
