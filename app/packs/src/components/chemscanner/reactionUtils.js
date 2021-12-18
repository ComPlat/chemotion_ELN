export const getSchemeMolecules = (reaction, molecules) => {
  const fileUid = reaction.get('fileUuid');
  const schemeIdx = reaction.get('schemeIdx');

  return molecules.filter(m => (
    m.get('schemeIdx') === schemeIdx && m.get('fileUuid') === fileUid
  ));
};

export const getReactionReactants = (reaction, reactionMolecules) => {
  const ids = reaction.get('reactantExtIds');
  return reactionMolecules.filter(m => ids.includes(m.get('externalId'))) || [];
};

export const getReactionReagents = (reaction, reactionMolecules) => {
  const ids = reaction.get('reagentExtIds');
  return reactionMolecules.filter(m => ids.includes(m.get('externalId'))) || [];
};

export const getReactionSolvents = (reaction, reactionMolecules) => {
  const ids = reaction.get('solventExtIds');
  return reactionMolecules.filter(m => ids.includes(m.get('externalId'))) || [];
};

export const getReactionProducts = (reaction, reactionMolecules) => {
  const ids = reaction.get('productExtIds');
  return reactionMolecules.filter(m => ids.includes(m.get('externalId'))) || [];
};

export const getReactionGroups = (reaction, molecules) => {
  const reactionMolecules = getSchemeMolecules(reaction, molecules);

  const reactants = getReactionReactants(reaction, reactionMolecules);
  const reagents = getReactionReagents(reaction, reactionMolecules);
  const solvents = getReactionSolvents(reaction, reactionMolecules);
  const products = getReactionProducts(reaction, reactionMolecules);

  return {
    reactants, reagents, solvents, products
  };
};
