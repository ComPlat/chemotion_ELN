const keepObjsAsIds = (oriSelectedObjs, newElems, ids, type, defaultTags) => {
  const allObjs = oriSelectedObjs.concat(newElems)
    .filter(obj => obj != null) || [];
  const allObjIds = allObjs.map(obj => `${obj.id}_${obj.type}`);
  return allObjs.map((obj, pos) => {
    const identifier = `${obj.id}_${obj.type}`;
    if (allObjIds.indexOf(identifier) !== pos) { // rm duplicate
      return null;
    }
    if (obj.type !== type) {
      return obj;
    }
    if (obj.type === type && ids.indexOf(obj.id) !== -1) {
      return obj;
    }
    if (defaultTags[`${obj.type}Ids`].indexOf(obj.id) !== -1) {
      return obj;
    }
    return null;
  }).filter(obj => obj != null) || [];
};

const UpdateSelectedObjs = (newTags, newObjs, defaultTags, oriObjs = []) => {
  const { sampleIds, reactionIds } = newTags;
  const { samples, reactions } = newObjs;
  let selectedObjs = keepObjsAsIds(oriObjs,
    samples, sampleIds, 'sample', defaultTags);
  selectedObjs = keepObjsAsIds(selectedObjs,
    reactions, reactionIds, 'reaction', defaultTags);
  return selectedObjs;
};

const GetTypeIds = (objs, type) => {
  return objs.map((obj) => {
    if (obj.type === type) {
      return obj.id;
    }
    return null;
  }).filter(r => r !== null);
};

module.exports = { UpdateSelectedObjs, GetTypeIds };
