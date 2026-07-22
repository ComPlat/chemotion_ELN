const updatedReactionWithSample = (reaction, updateFunction, updatedSample, type, includeSbmm = false) => {
  reaction.starting_materials = updateFunction(reaction.starting_materials, updatedSample, 'starting_materials', type);
  reaction.reactants = updateFunction(reaction.reactants, updatedSample, 'reactants', type);
  if (includeSbmm) {
    reaction.reactant_sbmm_samples = updateFunction(
      reaction.reactant_sbmm_samples,
      updatedSample,
      'reactants',
      type
    );
  }
  reaction.solvents = updateFunction(reaction.solvents, updatedSample, 'solvents', type);
  reaction.products = updateFunction(reaction.products, updatedSample, 'products', type);
  return reaction;
};

export {
  updatedReactionWithSample
};