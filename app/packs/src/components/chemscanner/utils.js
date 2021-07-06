export const generateExcelReactionRow = (reaction) => {
  const reactionSmiles = reaction.smi.split('>').map(smis => smis.split('.'));
  reactionSmiles[1] = reactionSmiles[1].concat(
    reaction.addedReagentsSmi || [],
    reaction.addedSolventsSmi || []
  );

  const reactantsSdf = reaction.reactants.map(m => m.mdl).join('\n$$$$\n');
  const reagentsSdf = reaction.reagents.map(m => m.mdl).join('\n$$$$\n');
  const productsSdf = reaction.products.map(m => m.mdl).join('\n$$$$\n');

  const assembleDesc = (arr, m, idx) => {
    if (!m.description) return arr;

    return arr.concat([
      `reactant ${idx + 1}`,
      `  ${m.description}`
    ]);
  };

  const reactantsDesc = reaction.reactants.reduce(assembleDesc, []).join('\n');
  const productsDesc = reaction.products.reduce(assembleDesc, []).join('\n');

  const reactionSteps = reaction.steps.reduce((arr, step) => {
    const lines = ['description', 'temperature', 'time'].reduce((lineArr, prop) => {
      const val = step[prop];
      if (!val || val === '\n') return lineArr;
      lineArr.push(`  ${prop}: ${val}`);

      return lineArr;
    }, []);

    lines.unshift(`step ${step.number}`);
    lines.push(`  reagents: ${step.reagents.join(',')}`);

    return arr.concat(lines);
  }, []).join('\n');

  return [
    reactionSmiles.map(smis => smis.join('.')).join('>'),
    reaction.temperature,
    reaction.yield,
    reaction.time,
    reaction.description,
    reactionSteps,
    reactantsSdf,
    reagentsSdf,
    productsSdf,
    reactantsDesc,
    productsDesc
  ];
};

export const generateExcelMoleculeRow = mol => ([
  mol.smi,
  mol.mdl,
  mol.description
]);

const extractMoleculeFromGroup = molGroup => molGroup.map(m => ({
  id: m.id,
  mdl: m.mdl,
  description: m.description,
}));

export const extractReaction = (reaction) => {
  const reagentsSmiles = [].concat(
    (reaction.abbreviations || []).map(abb => abb.smi),
    (reaction.addedReagentsSmi || []),
    (reaction.addedSolventsSmi || []),
  ).filter(x => x);

  return {
    id: reaction.id,
    reactants: extractMoleculeFromGroup(reaction.reactants),
    reagents: extractMoleculeFromGroup(reaction.reagents),
    products: extractMoleculeFromGroup(reaction.products),
    reagents_smiles: reagentsSmiles
  };
};

export const extractReactionFromId = (reactions, rid) => {
  const reaction = reactions.findLast(r => r.get('id') === rid).toJS();
  return extractReaction(reaction);
};

