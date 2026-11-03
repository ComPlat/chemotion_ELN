/*
Reactions opened for editing from the variations tab are detached clones of their parent reaction.
The sample flows that run through the global ElementStore - e.g. adding a material with the +
button of the scheme editor - only know the Reaction object they were handed. This registry lets
the store recognize such a clone by its id (a uuid, never a persisted reaction's numeric id) and
report a saved material back to the variation it belongs to, instead of treating the clone as an
open element.

A plain module instead of a property on the clone: the diff of a variation captures unknown keys
of the clone by reference, and a function anywhere in it breaks the structuredClone the variations
are rebuilt with.

Handlers are kept until overwritten, not cleaned up: a sample editor opened from the variations
tab can outlive the tab, and its save must still reach the variation. The map stays small - one
entry per opened variation clone.
*/
const handlers = new Map();

const registerVariationChangeHandler = (reactionId, handler) => {
  handlers.set(reactionId, handler);
};

const getVariationChangeHandler = (reactionId) => handlers.get(reactionId);

export { registerVariationChangeHandler, getVariationChangeHandler };
