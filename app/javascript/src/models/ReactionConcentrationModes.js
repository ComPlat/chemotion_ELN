// Keep in sync with Reaction::CONCENTRATION_MODES, the server-side validation allowlist.
const REACTION_CONCENTRATION_MODES = Object.freeze({
  SOLVENTS_ONLY: 'solvents_only',
  COMBINED: 'combined',
  REACTION_VOLUME: 'reaction_volume',
});

const isReactionConcentrationMode = (value) => Object.values(REACTION_CONCENTRATION_MODES).includes(value);

export { isReactionConcentrationMode };
export default REACTION_CONCENTRATION_MODES;
