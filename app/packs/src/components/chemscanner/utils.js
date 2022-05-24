/* eslint-disable no-prototype-builtins */
import { fromJS } from 'immutable';

export const generateExcelReactionRow = (reaction) => {
  const {
    reactants, reagents, solvents, products
  } = reaction;

  const reactantSmiles = reactants.map(m => m.get('canoSmiles')).join('.');
  const productSmiles = products.map(m => m.get('canoSmiles')).join('.');

  const reagentSmiles = reagents.concat(solvents).map(m => (
    m.get('canoSmiles')
  )).join('.');

  const reactionSmiles = [
    reactantSmiles,
    reagentSmiles,
    productSmiles,
  ].join('>');

  const reactantsSdf = reactants.map(m => m.get('mdl')).join('\n$$$$\n');
  const reagentsSdf = reagents.map(m => m.get('mdl')).join('\n$$$$\n');
  const productsSdf = products.map(m => m.get('mdl')).join('\n$$$$\n');

  const assembleDesc = (arr, m, idx) => {
    if (!m.description) return arr;

    return arr.concat([
      `reactant ${idx + 1}`,
      `  ${m.description}`
    ]);
  };

  const reactantsDesc = reactants.reduce(assembleDesc, []).join('\n');
  const productsDesc = products.reduce(assembleDesc, []).join('\n');

  const reactionSteps = reaction.steps.reduce((arr, step) => {
    const lines = ['description', 'temperature', 'time'].reduce((lineArr, prop) => {
      const val = step[prop];
      if (!val || val === '\n') return lineArr;
      lineArr.push(`  ${prop}: ${val}`);

      return lineArr;
    }, []);

    lines.unshift(`step ${step.number}`);
    lines.push(`  reagents: ${step.reagentSmiles.join(',')}`);

    return arr.concat(lines);
  }, []).join('\n');

  return [
    reactionSmiles,
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
  mol.inchistring,
  mol.inchikey,
  mol.description
]);

export const extractMoleculeFromGroup = molGroup => molGroup.map(m => ({
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

export const createReducer = (initialState, handlers) => (
  function reducer(state = initialState, action) {
    if (handlers.hasOwnProperty(action.type)) {
      return handlers[action.type](state, action);
    }

    return state;
  }
);

export const sortMoleculesByClone = (molecules) => {
  const cloneMap = {};
  const cloneCountMap = {};

  const rootMolecules = [];
  const childrenMolecules = [];

  molecules.forEach((m, idx) => {
    const cloneFrom = m.get('cloneFrom');

    if (cloneFrom) {
      cloneMap[idx] = cloneFrom;
      const count = cloneCountMap[cloneFrom] || 0;
      cloneCountMap[cloneFrom] = count + 1;
      childrenMolecules.push(m);
    } else {
      rootMolecules.push(m);
    }
  });

  const newMolecules = new Array(molecules.size).fill(0);

  let pos = 0;
  const positionMap = {};
  rootMolecules.forEach((m) => {
    const extId = m.get('externalId');
    newMolecules[pos] = m;
    positionMap[extId] = pos;
    pos += (cloneCountMap[extId] || 0) + 1;
  });

  const positionCountMap = {};
  childrenMolecules.forEach((m) => {
    const cloneFrom = m.get('cloneFrom');
    pos = positionCountMap[cloneFrom] || 0;
    newMolecules[positionMap[cloneFrom] + pos + 1] = m;
    positionCountMap[cloneFrom] = pos + 1;
  });

  return fromJS(newMolecules);
};

export const isPngImage = (imageData) => {
  const pngB64Begin = 'data:image/png;base64';
  return RegExp(`${pngB64Begin},.*`).test(imageData);
};

export const isSvgImage = imageData => (
  RegExp('.*<svg').test(imageData.slice(0, 200))
);
