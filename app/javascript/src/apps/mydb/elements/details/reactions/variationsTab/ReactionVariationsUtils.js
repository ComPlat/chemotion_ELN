import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import Container from 'src/models/Container';
import uuid from 'uuid';

const REACTION_VARIATIONS_TAB_KEY = 'reactionVariationsTab';

function getVariationsRowName(reactionLabel, variationsRowId) {
  return `${reactionLabel}-${variationsRowId}`;
}

const makeVariationReaction = (reaction, reactionData) => {
  const clonedReaction = { ...structuredClone(reaction), ...reactionData };
  clonedReaction.variations = [];
  clonedReaction.container = Container.init();
  clonedReaction.id = reactionData.id || uuid.v4();
  ['starting_materials', 'reactants', 'solvents', 'purification_solvents', 'products'].forEach((key) => {
    clonedReaction[`_${key}`] = clonedReaction[`_${key}`].map((sampleData) => {
        sampleData.container = Container.init();
        return Object.assign(
          Object.create(Sample.prototype),
          sampleData
        );
      }
    );
  });
  return Object.assign(
    Object.create(Reaction.prototype),
    clonedReaction
  );
};

const addNewVariationDataset = ({ reaction: { variations } }) => {
  const id = uuid.v4();
  const majorGroup = Math.max(0, ...variations.map(({ group }) => group[0])) + 1;
  const group = [majorGroup, 0];

  const newVariation = {
    id, group,
      analyses: [],
    notes: '',
    data: {}
  };
  variations.push(newVariation);
  return newVariation;
};

const addInternalVariationObject = (
  variations,
  reaction,
  { data = { id: uuid.v4() }, group = [0,0], analyses = [] }
) => {
  variations.push({
    analyses,
    group,
    data: makeVariationReaction(reaction, data),
    idx: variations.length
  });
};

const convertVariationDatasetToInternalVariations = (reaction) => {
  const internalVariation = [];
  reaction.variations.forEach((v) => {
    addInternalVariationObject(internalVariation, reaction, v);
  });

  return internalVariation;
};

const diffObjects = (obj1, obj2, ignoreList = []) => {
  let result, keys;
  if (Array.isArray(obj2)) {
    keys = obj2.map((x, i) => i);
    result = [];
  } else {
    keys = Object.keys(obj2);
    result = {};
  }
  for (const key of keys) {
    // Ignore configured keys
    if (ignoreList.includes(key)) {
      continue;
    }

    const value1 = obj1?.[key];
    const value2 = obj2[key];

    // Ignore functions
    if (typeof value2 === 'function') {
      continue;
    }

    // Recursively compare plain objects
    if (
      value2 !== null &&
      typeof value2 === 'object' &&
      value1 !== null &&
      typeof value1 === 'object'
    ) {
      const nestedDiff = diffObjects(value1, value2, ignoreList);

      if (Object.keys(nestedDiff).length > 0) {
        result[key] = nestedDiff;
      }
    } else if (!Object.is(value1, value2)) {
      result[key] = value2;
    }
  }

  return result;
};

export {
  convertVariationDatasetToInternalVariations,
  addInternalVariationObject,
  addNewVariationDataset,
  makeVariationReaction,
  diffObjects,
  getVariationsRowName,
  REACTION_VARIATIONS_TAB_KEY
};